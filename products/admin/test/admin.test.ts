import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  adminAuditLog,
  and,
  db,
  eq,
  fixedPlan,
  isNull,
  platformUsers,
  sessions,
  tenants,
  verifyPassword,
  withPlatformAdmin,
  type Db,
  type FileService,
  type PlatformAdminContext,
} from '@noroset/core';
import { AdminAuditService, AdminModulesService, AdminTenantsService, AdminUsersService } from '../api/index';

class TestAdminContext implements PlatformAdminContext {
  constructor(private readonly id: string) {}
  adminId() {
    return this.id;
  }
  ip() {
    return '127.0.0.1';
  }
  run<T>(fn: (tx: Db) => Promise<T>) {
    return withPlatformAdmin(this.id, fn);
  }
}

const files = { publicBaseUrl: () => 'https://noroset.test/api/norofile/public/files' } as unknown as FileService;

let seq = 0;
const randomMobile = () => `09${String(100000000 + Math.floor(Math.random() * 899999999) + ++seq).slice(0, 9)}`;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

async function createUser(values: Partial<typeof platformUsers.$inferInsert> = {}) {
  const [u] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, ...values }).returning();
  return u!;
}

async function setup() {
  const admin = await createUser({ platformRole: 'superadmin', fullName: 'ادمین' });
  const ctx = new TestAdminContext(admin.id);
  return {
    admin,
    ctx,
    users: new AdminUsersService(ctx, files, fixedPlan()),
    tenants: new AdminTenantsService(ctx),
    audit: new AdminAuditService(ctx),
  };
}

async function addSession(userId: string) {
  await db.insert(sessions).values({ userId, refreshTokenHash: randomUUID().replace(/-/g, '').padEnd(64, '0'), expiresAt: new Date(Date.now() + 60_000) });
}

const activeSessions = async (userId: string) =>
  (await db.select().from(sessions).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))).length;

const auditOf = (ctx: TestAdminContext, targetId: string) =>
  withPlatformAdmin(ctx.adminId(), (tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, targetId)));

describe('admin users', () => {
  it('creates a user with password and an owned tenant, audited', async () => {
    const s = await setup();
    const slug = uniq('acme');
    const mobile = randomMobile();
    const user = await s.users.create({ mobile, fullName: '  علی   رضایی ', password: 'secret-123', tenant: { name: 'Acme', slug } });

    expect(user).toMatchObject({ fullName: 'علی رضایی', status: 'active', platformRole: 'user', hasPassword: true, tenantCount: 1 });
    expect(user.mobile).toBe(`+98${mobile.slice(1)}`);
    expect(user.memberships).toEqual([expect.objectContaining({ slug, role: 'owner', status: 'active' })]);
    expect(JSON.stringify(user)).not.toContain('scrypt$');

    const [row] = await db.select().from(platformUsers).where(eq(platformUsers.id, user.id));
    expect(await verifyPassword('secret-123', row!.passwordHash!)).toBe(true);

    const log = await auditOf(s.ctx, user.id);
    expect(log).toEqual([expect.objectContaining({ action: 'user.create', actorUserId: s.admin.id, ip: '127.0.0.1' })]);
  });

  it('rejects duplicate mobiles, bad input and reserved/taken slugs without partial writes', async () => {
    const s = await setup();
    const mobile = randomMobile();
    await s.users.create({ mobile });
    await expect(s.users.create({ mobile })).rejects.toMatchObject({ message: 'mobile_taken' });
    await expect(s.users.create({ mobile: '123' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(s.users.create({ mobile: randomMobile(), password: 'short' })).rejects.toMatchObject({ message: 'weak_password' });

    const other = randomMobile();
    await expect(s.users.create({ mobile: other, tenant: { name: 'x', slug: 'admin' } })).rejects.toMatchObject({ message: 'slug_reserved' });
    const taken = uniq('taken');
    await db.insert(tenants).values({ name: 't', slug: taken });
    await expect(s.users.create({ mobile: other, tenant: { name: 'x', slug: taken } })).rejects.toMatchObject({ message: 'slug_taken' });
    // تراکنش rollback شده: کاربر هم ساخته نشده است.
    expect((await s.users.list({ q: other })).total).toBe(0);
  });

  it('lists with search by any mobile format, name, status and role', async () => {
    const s = await setup();
    const mobile = randomMobile();
    const created = await s.users.create({ mobile, fullName: uniq('ناصر') });
    const persian = mobile.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
    expect((await s.users.list({ q: persian })).items.map((u) => u.id)).toEqual([created.id]);
    expect((await s.users.list({ q: created.fullName })).items.map((u) => u.id)).toEqual([created.id]);
    expect((await s.users.list({ role: 'superadmin' })).items.some((u) => u.id === s.admin.id)).toBe(true);
    const page = await s.users.list({ limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThan(1);
  });

  it('blocking requires a reason, stores it and revokes sessions; activating clears it', async () => {
    const s = await setup();
    const user = await createUser();
    await addSession(user.id);
    await addSession(user.id);

    await expect(s.users.setStatus(user.id, 'blocked', '   ')).rejects.toMatchObject({ message: 'reason_required' });
    const blocked = await s.users.setStatus(user.id, 'blocked', 'اسپم');
    expect(blocked).toMatchObject({ status: 'blocked', statusReason: 'اسپم', activeSessions: 0 });
    expect(await activeSessions(user.id)).toBe(0);

    const active = await s.users.setStatus(user.id, 'active', undefined);
    expect(active).toMatchObject({ status: 'active', statusReason: null });

    const log = await auditOf(s.ctx, user.id);
    expect(log.map((l) => [l.action, l.reason, (l.details as { to: string }).to])).toEqual(
      expect.arrayContaining([
        ['user.status', 'اسپم', 'blocked'],
        ['user.status', null, 'active'],
      ]),
    );
  });

  it('an admin cannot change their own status, role or password', async () => {
    const s = await setup();
    await expect(s.users.setStatus(s.admin.id, 'disabled', 'x')).rejects.toBeInstanceOf(ConflictException);
    await expect(s.users.setRole(s.admin.id, 'user')).rejects.toMatchObject({ message: 'cannot_modify_self' });
    await expect(s.users.setPassword(s.admin.id, 'new-password-1')).rejects.toMatchObject({ message: 'cannot_modify_self' });
  });

  it('grants and revokes the superadmin role', async () => {
    const s = await setup();
    const user = await createUser();
    expect((await s.users.setRole(user.id, 'superadmin')).platformRole).toBe('superadmin');
    expect((await s.users.setRole(user.id, 'user')).platformRole).toBe('user');
  });

  it('sets a password and signs the user out everywhere', async () => {
    const s = await setup();
    const user = await createUser();
    await addSession(user.id);
    await expect(s.users.setPassword(user.id, 'short')).rejects.toMatchObject({ message: 'weak_password' });
    const updated = await s.users.setPassword(user.id, 'brand-new-pass');
    expect(updated.hasPassword).toBe(true);
    expect(await activeSessions(user.id)).toBe(0);
    const [row] = await db.select().from(platformUsers).where(eq(platformUsers.id, user.id));
    expect(await verifyPassword('brand-new-pass', row!.passwordHash!)).toBe(true);
    // رمز در لاگ نمی‌آید
    expect(JSON.stringify(await auditOf(s.ctx, user.id))).not.toContain('brand-new-pass');
  });

  it('a normal user cannot use the admin services even when called directly', async () => {
    const normal = await createUser();
    const ctx = new TestAdminContext(normal.id);
    const users = new AdminUsersService(ctx, files, fixedPlan());
    const target = await createUser();
    // UPDATE روی platform_users سطح پلتفرم است، ولی لاگ ممیزی (و در نتیجه کل تراکنش) رد می‌شود.
    await expect(users.updateName(target.id, 'هک')).rejects.toThrow();
    const [row] = await db.select().from(platformUsers).where(eq(platformUsers.id, target.id));
    expect(row!.fullName).toBe('');
  });

  it('unknown user → 404', async () => {
    const s = await setup();
    await expect(s.users.get(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
    await expect(s.users.setStatus(randomUUID(), 'disabled', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('admin tenants and audit', () => {
  it('suspends with a reason and lists members across tenants', async () => {
    const s = await setup();
    const owner = await s.users.create({ mobile: randomMobile(), fullName: 'مالک', tenant: { name: 'Shop', slug: uniq('shop') } });
    const tenantId = owner.memberships[0]!.tenantId;

    const detail = await s.tenants.get(tenantId);
    expect(detail.members).toEqual([expect.objectContaining({ userId: owner.id, role: 'owner', fullName: 'مالک' })]);
    expect(detail.memberCount).toBe(1);

    await expect(s.tenants.setStatus(tenantId, 'suspended', '')).rejects.toMatchObject({ message: 'reason_required' });
    expect((await s.tenants.setStatus(tenantId, 'suspended', 'شکایت')).status).toBe('suspended');
    expect((await s.tenants.list({ status: 'suspended', q: detail.slug })).items.map((t) => t.id)).toEqual([tenantId]);

    const log = await s.audit.list({ targetType: 'tenant', targetId: tenantId });
    expect(log.items).toEqual([
      expect.objectContaining({ action: 'tenant.status', reason: 'شکایت', actor: expect.objectContaining({ id: s.admin.id }) }),
    ]);
  });

  it('overview counts users and tenants', async () => {
    const s = await setup();
    const o = await s.users.overview();
    expect(o.superadmins).toBeGreaterThanOrEqual(1);
    expect(o.users.active).toBeGreaterThanOrEqual(1);
    expect(Object.keys(o.tenants)).toEqual(['active', 'suspended']);
  });
});

describe('admin modules', () => {
  it('sets a module status with a message, audits it and invalidates the cache', async () => {
    const s = await setup();
    let invalidated = 0;
    const modules = new AdminModulesService(s.ctx, {
      all: async () => [],
      get: async () => ({ key: 'norolink', status: 'active', message: null }),
      invalidate: () => void invalidated++,
    });
    try {
      const after = await modules.set('norolink', 'maintenance', '  به‌روزرسانی   تا ساعت ۱۸ ');
      expect(after.find((m) => m.key === 'norolink')).toMatchObject({
        status: 'maintenance',
        message: 'به‌روزرسانی تا ساعت ۱۸',
        updatedBy: { id: s.admin.id },
      });
      expect(after.map((m) => m.key)).toEqual(['noroform', 'norolink', 'norofile']);
      expect(invalidated).toBe(1);
      await expect(modules.set('admin', 'off', undefined)).rejects.toMatchObject({ message: 'unknown_module' });

      const log = await s.audit.list({ targetType: 'module' });
      expect(log.items[0]).toMatchObject({ action: 'module.status', details: { module: 'norolink', to: 'maintenance' } });
    } finally {
      // بقیه‌ی تست‌ها (e2e فرم‌ها) روی همین دیتابیس‌اند.
      await modules.set('norolink', 'active', undefined);
    }
    expect((await modules.list()).find((m) => m.key === 'norolink')).toMatchObject({ status: 'active', message: null });
  });
});
