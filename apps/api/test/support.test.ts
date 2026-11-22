import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  adminAuditLog,
  db,
  eq,
  PLATFORM_ROLES_KEY,
  platformUsers,
  SUPPORT_COOKIE,
  SUPPORT_FORBIDDEN_KEY,
  supportAccessGrants,
  withPlatformAdmin,
  withUser,
  type Db,
  type PlatformAdminContext,
} from '@noroset/core';
import { AdminSupportService } from '@noroset/admin';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { SupportSessionService } from '../src/auth/support-session.service';
import { getJwtSecret } from '../src/config/secrets';

// ورود پشتیبانی به حساب کاربر (docs/architecture.md §9.11).

const jwt = new JwtService({ secret: getJwtSecret(), signOptions: { expiresIn: '15m' } });
const support = new SupportSessionService(jwt);

class Ctx implements PlatformAdminContext {
  constructor(private readonly id: string) {}
  adminId() {
    return this.id;
  }
  ip() {
    return null;
  }
  run<T>(fn: (tx: Db) => Promise<T>) {
    return withPlatformAdmin(this.id, fn);
  }
}

class MockCls {
  private store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
}

const createUser = async (platformRole: 'user' | 'superadmin' = 'user') =>
  (await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole }).returning())[0]!;

const accessFor = (userId: string) => jwt.sign({ sub: userId });

function ctxFor(cookies: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ cookies, ip: '10.0.0.1' }) }),
    getHandler: () => () => undefined,
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

const reflectorWith = (key?: string, value?: unknown) =>
  ({ getAllAndOverride: (k: string) => (k === key ? value : undefined) }) as unknown as Reflector;

async function setup() {
  const admin = await createUser('superadmin');
  const user = await createUser();
  const admins = new AdminSupportService(new Ctx(admin.id));
  const { grant, token } = await admins.create(user.id, { reason: 'تیکت ۴۲', minutes: 30 });
  return { admin, user, admins, grant, token };
}

const actions = async (adminId: string, userId: string) =>
  (await withPlatformAdmin(adminId, (tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, userId)))).map((a) => a.action);

describe('support access', () => {
  it('creates a pending grant; only the token hash is stored', async () => {
    const s = await setup();
    expect(s.grant).toMatchObject({ status: 'pending', minutes: 30, reason: 'تیکت ۴۲', admin: { id: s.admin.id } });
    const [row] = await withPlatformAdmin(s.admin.id, (tx) => tx.select().from(supportAccessGrants).where(eq(supportAccessGrants.id, s.grant.id)));
    expect(row!.tokenHash).not.toBe(s.token);
    expect(row!.tokenHash).toHaveLength(64);
  });

  it('refuses admins, inactive users, self and missing reasons', async () => {
    const admin = await createUser('superadmin');
    const other = await createUser('superadmin');
    const blocked = (await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, status: 'blocked' }).returning())[0]!;
    const svc = new AdminSupportService(new Ctx(admin.id));
    await expect(svc.create(other.id, { reason: 'x', minutes: 10 })).rejects.toMatchObject({ message: 'cannot_impersonate_admin' });
    await expect(svc.create(blocked.id, { reason: 'x', minutes: 10 })).rejects.toMatchObject({ message: 'user_inactive' });
    await expect(svc.create(admin.id, { reason: 'x', minutes: 10 })).rejects.toMatchObject({ message: 'cannot_modify_self' });
    await expect(svc.create((await createUser()).id, { reason: '  ', minutes: 10 })).rejects.toMatchObject({ message: 'reason_required' });
  });

  it('only the issuing admin can redeem, and only once', async () => {
    const s = await setup();
    const other = await createUser('superadmin');
    await expect(support.redeem(other.id, s.token, null)).rejects.toMatchObject({ message: 'support_link_not_yours' });
    await expect(support.redeem(s.admin.id, 'x'.repeat(43), null)).rejects.toMatchObject({ message: 'support_link_invalid' });

    const session = await support.redeem(s.admin.id, s.token, null);
    expect(session).toMatchObject({ userId: s.user.id, adminId: s.admin.id, grantId: s.grant.id });
    await expect(support.redeem(s.admin.id, s.token, null)).rejects.toMatchObject({ status: 410, message: 'support_link_used' });
  });

  it('the guard acts as the user only together with the same admin session', async () => {
    const s = await setup();
    const { token: supportToken } = await support.redeem(s.admin.id, s.token, null);

    const cls = new MockCls();
    const guard = new AuthGuard(jwt, cls as never, new Reflector(), support);
    await expect(guard.canActivate(ctxFor({ [SUPPORT_COOKIE]: supportToken, access_token: accessFor(s.admin.id) }))).resolves.toBe(true);
    expect(cls.get('userId')).toBe(s.user.id);
    expect(cls.get<{ adminId: string }>('support')?.adminId).toBe(s.admin.id);

    // بدون نشست ادمین ← ۴۰۱ ساده (وب refresh می‌کند)؛ با نشست کس دیگر ← پایان.
    await expect(guard.canActivate(ctxFor({ [SUPPORT_COOKIE]: supportToken }))).rejects.toMatchObject({ status: 401 });
    await expect(
      guard.canActivate(ctxFor({ [SUPPORT_COOKIE]: supportToken, access_token: accessFor(s.user.id) })),
    ).rejects.toMatchObject({ message: 'support_session_ended' });
    // توکن پشتیبانی جای access token پذیرفته نمی‌شود.
    await expect(guard.canActivate(ctxFor({ access_token: supportToken }))).rejects.toMatchObject({ status: 401 });
  });

  it('account security and platform routes are forbidden inside a support session', async () => {
    const s = await setup();
    const { token: supportToken } = await support.redeem(s.admin.id, s.token, null);
    const cookies = { [SUPPORT_COOKIE]: supportToken, access_token: accessFor(s.admin.id) };
    for (const reflector of [reflectorWith(SUPPORT_FORBIDDEN_KEY, true), reflectorWith(PLATFORM_ROLES_KEY, ['superadmin'])]) {
      await expect(new AuthGuard(jwt, new MockCls() as never, reflector, support).canActivate(ctxFor(cookies))).rejects.toMatchObject({
        status: 403,
        message: 'impersonation_forbidden',
      });
    }
  });

  it('the user can revoke it, which ends the session immediately', async () => {
    const s = await setup();
    const { token: supportToken } = await support.redeem(s.admin.id, s.token, null);
    await withUser(s.user.id, (tx) =>
      tx.update(supportAccessGrants).set({ revokedAt: new Date(), revokedBy: 'user' }).where(eq(supportAccessGrants.id, s.grant.id)),
    );
    await expect(support.resolve(supportToken, accessFor(s.admin.id))).rejects.toMatchObject({ message: 'support_session_ended' });
  });

  it('a revoked superadmin loses the session', async () => {
    const s = await setup();
    const { token: supportToken } = await support.redeem(s.admin.id, s.token, null);
    await db.update(platformUsers).set({ platformRole: 'user' }).where(eq(platformUsers.id, s.admin.id));
    await expect(support.resolve(supportToken, accessFor(s.admin.id))).rejects.toMatchObject({ message: 'support_session_ended' });
  });

  it('ending, admin revoke and every mutating request are audited', async () => {
    const s = await setup();
    const session = await support.redeem(s.admin.id, s.token, null);
    await support.auditRequest(session, { method: 'PATCH', route: '/me', tenantId: null }, '10.0.0.1');
    expect(await support.end(session.token, null)).toEqual({ userId: s.user.id });
    await expect(support.resolve(session.token, accessFor(s.admin.id))).rejects.toMatchObject({ message: 'support_session_ended' });
    expect(await support.end('garbage', null)).toBeNull();

    const second = await s.admins.create(s.user.id, { reason: 'دوباره', minutes: 5 });
    expect((await s.admins.revoke(second.grant.id)).status).toBe('revoked');
    await expect(s.admins.revoke(second.grant.id)).rejects.toMatchObject({ message: 'support_grant_closed' });

    expect(await actions(s.admin.id, s.user.id)).toEqual(
      expect.arrayContaining(['support.grant', 'support.redeem', 'support.request', 'support.end', 'support.revoke']),
    );
    expect((await s.admins.listForUser(s.user.id)).map((g) => g.status).sort()).toEqual(['ended', 'revoked']);
  });
});
