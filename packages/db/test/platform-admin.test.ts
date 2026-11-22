import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  adminAuditLog,
  db,
  eq,
  platformModules,
  platformUsers,
  readModuleStates,
  tenantMemberships,
  tenants,
  withPlatformAdmin,
  withTenant,
} from '../src/index';

// RLS مدیریت پلتفرم (docs/architecture.md §9.11): فقط superadmin فعالی که در DB ثبت است دسترسی دارد.

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

const createUser = (platformRole: 'user' | 'superadmin' = 'user') =>
  one(db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole }).returning());

let app: Client;

beforeAll(async () => {
  app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();
});

afterAll(async () => {
  await app.end();
});

describe('platform admin RLS', () => {
  it('only an active superadmin can write and read the audit log', async () => {
    const admin = await createUser('superadmin');
    const user = await createUser();

    const entry = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(adminAuditLog).values({ actorUserId: admin.id, action: 'user.status', targetType: 'user', targetId: user.id }).returning()),
    );
    const seen = await withPlatformAdmin(admin.id, (tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.id, entry.id)));
    expect(seen).toHaveLength(1);

    // کاربر عادی با همان setting هیچ دسترسی‌ای ندارد.
    expect(await withPlatformAdmin(user.id, (tx) => tx.select().from(adminAuditLog))).toHaveLength(0);
    await expect(
      withPlatformAdmin(user.id, (tx) => tx.insert(adminAuditLog).values({ actorUserId: user.id, action: 'x', targetType: 'user' })),
    ).rejects.toThrow();

    // بدون setting
    expect((await app.query('SELECT * FROM admin_audit_log')).rows).toHaveLength(0);
  });

  it('the actor of an audit entry must be the current admin', async () => {
    const admin = await createUser('superadmin');
    const other = await createUser('superadmin');
    await expect(
      withPlatformAdmin(admin.id, (tx) => tx.insert(adminAuditLog).values({ actorUserId: other.id, action: 'x', targetType: 'user' })),
    ).rejects.toThrow();
  });

  it('a disabled superadmin is not an admin', async () => {
    const admin = await createUser('superadmin');
    await db.update(platformUsers).set({ status: 'disabled' }).where(eq(platformUsers.id, admin.id));
    await expect(
      withPlatformAdmin(admin.id, (tx) => tx.insert(adminAuditLog).values({ actorUserId: admin.id, action: 'x', targetType: 'user' })),
    ).rejects.toThrow();
  });

  it('the audit log is append-only', async () => {
    const admin = await createUser('superadmin');
    const entry = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(adminAuditLog).values({ actorUserId: admin.id, action: 'x', targetType: 'user' }).returning()),
    );
    await expect(
      withPlatformAdmin(admin.id, (tx) => tx.update(adminAuditLog).set({ reason: 'edited' }).where(eq(adminAuditLog.id, entry.id))),
    ).rejects.toThrow();
    await expect(withPlatformAdmin(admin.id, (tx) => tx.delete(adminAuditLog).where(eq(adminAuditLog.id, entry.id)))).rejects.toThrow();
  });

  it('a superadmin reads memberships of every tenant, a normal user does not', async () => {
    const admin = await createUser('superadmin');
    const member = await createUser();
    const tenant = await one(db.insert(tenants).values({ name: 'ADM', slug: `adm-${Date.now().toString(36)}` }).returning());
    await withTenant(tenant.id, (tx) => tx.insert(tenantMemberships).values({ tenantId: tenant.id, userId: member.id, role: 'owner' }));

    const asAdmin = await withPlatformAdmin(admin.id, (tx) =>
      tx.select().from(tenantMemberships).where(eq(tenantMemberships.tenantId, tenant.id)),
    );
    expect(asAdmin).toHaveLength(1);

    const asUser = await withPlatformAdmin(member.id, (tx) =>
      tx.select().from(tenantMemberships).where(eq(tenantMemberships.tenantId, tenant.id)),
    );
    expect(asUser).toHaveLength(0);

    // فقط خواندن: ادمین بدون tenant نمی‌تواند عضویت بنویسد.
    await expect(
      withPlatformAdmin(admin.id, (tx) => tx.insert(tenantMemberships).values({ tenantId: tenant.id, userId: admin.id })),
    ).rejects.toThrow();
  });
});

describe('platform modules RLS', () => {
  it('everyone reads module states; only a superadmin writes, as themselves; no deletes', async () => {
    const admin = await createUser('superadmin');
    const user = await createUser();
    const key = `mod_${Date.now().toString(36)}`;

    await expect(withPlatformAdmin(user.id, (tx) => tx.insert(platformModules).values({ key, status: 'off', updatedBy: user.id }))).rejects.toThrow();
    await expect(withPlatformAdmin(admin.id, (tx) => tx.insert(platformModules).values({ key, status: 'off', updatedBy: user.id }))).rejects.toThrow();
    await withPlatformAdmin(admin.id, (tx) => tx.insert(platformModules).values({ key, status: 'maintenance', message: 'به‌روزرسانی', updatedBy: admin.id }));

    expect((await readModuleStates()).find((m) => m.key === key)).toMatchObject({ status: 'maintenance', message: 'به‌روزرسانی' });
    expect((await app.query('SELECT status FROM platform_modules WHERE key = $1', [key])).rows).toEqual([{ status: 'maintenance' }]);

    // کاربر عادی بی‌اثر می‌ماند (UPDATE روی ردیف‌های قابل‌دید policy ندارد)
    await withPlatformAdmin(user.id, (tx) => tx.update(platformModules).set({ status: 'active', updatedBy: user.id }).where(eq(platformModules.key, key)));
    expect((await readModuleStates()).find((m) => m.key === key)?.status).toBe('maintenance');
    await expect(withPlatformAdmin(admin.id, (tx) => tx.delete(platformModules).where(eq(platformModules.key, key)))).rejects.toThrow();
  });
});
