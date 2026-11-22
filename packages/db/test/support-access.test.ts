import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  db,
  eq,
  findSupportGrant,
  isSupportGrantLive,
  platformUsers,
  supportAccessGrants,
  withPlatformAdmin,
  withUser,
} from '../src/index';

// RLS دسترسی پشتیبانی (docs/architecture.md §9.11).

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

const createUser = (platformRole: 'user' | 'superadmin' = 'user') =>
  one(db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole }).returning());

const grantValues = (userId: string, adminUserId: string) => ({
  userId,
  adminUserId,
  reason: 'تیکت ۱۲۳',
  tokenHash: randomBytes(32).toString('hex'),
  expiresAt: new Date(Date.now() + 30 * 60_000),
});

let app: Client;

beforeAll(async () => {
  app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();
});

afterAll(async () => {
  await app.end();
});

describe('support access grants RLS', () => {
  it('only a superadmin creates grants, and only as themselves', async () => {
    const admin = await createUser('superadmin');
    const other = await createUser('superadmin');
    const user = await createUser();

    const grant = await withPlatformAdmin(admin.id, (tx) => one(tx.insert(supportAccessGrants).values(grantValues(user.id, admin.id)).returning()));
    expect(grant.adminUserId).toBe(admin.id);

    await expect(withPlatformAdmin(admin.id, (tx) => tx.insert(supportAccessGrants).values(grantValues(user.id, other.id)))).rejects.toThrow();
    await expect(withPlatformAdmin(user.id, (tx) => tx.insert(supportAccessGrants).values(grantValues(user.id, user.id)))).rejects.toThrow();
    expect((await app.query('SELECT * FROM support_access_grants')).rows).toHaveLength(0);
  });

  it('the user sees and revokes only their own grants; immutable columns stay immutable', async () => {
    const admin = await createUser('superadmin');
    const user = await createUser();
    const stranger = await createUser();
    const grant = await withPlatformAdmin(admin.id, (tx) => one(tx.insert(supportAccessGrants).values(grantValues(user.id, admin.id)).returning()));

    expect(await withUser(user.id, (tx) => tx.select().from(supportAccessGrants))).toHaveLength(1);
    expect(await withUser(stranger.id, (tx) => tx.select().from(supportAccessGrants))).toHaveLength(0);

    await withUser(user.id, (tx) =>
      tx.update(supportAccessGrants).set({ revokedAt: new Date(), revokedBy: 'user' }).where(eq(supportAccessGrants.id, grant.id)),
    );
    // تمدید مهلت یا تغییر کاربر حتی برای ادمین مجاز نیست (GRANT ستونی).
    await expect(
      withPlatformAdmin(admin.id, (tx) =>
        tx.update(supportAccessGrants).set({ expiresAt: new Date(Date.now() + 86_400_000) }).where(eq(supportAccessGrants.id, grant.id)),
      ),
    ).rejects.toThrow();
    await expect(withPlatformAdmin(admin.id, (tx) => tx.delete(supportAccessGrants).where(eq(supportAccessGrants.id, grant.id)))).rejects.toThrow();
  });

  it('the session check reads exactly one grant and reports whether it is live', async () => {
    const admin = await createUser('superadmin');
    const user = await createUser();
    const grant = await withPlatformAdmin(admin.id, (tx) => one(tx.insert(supportAccessGrants).values(grantValues(user.id, admin.id)).returning()));

    const fresh = await findSupportGrant(grant.id);
    expect(fresh).toMatchObject({ id: grant.id, userId: user.id, adminUserId: admin.id });
    expect(isSupportGrantLive(fresh!, new Date())).toBe(false); // هنوز مصرف نشده

    await withPlatformAdmin(admin.id, (tx) => tx.update(supportAccessGrants).set({ redeemedAt: new Date() }).where(eq(supportAccessGrants.id, grant.id)));
    const redeemed = await findSupportGrant(grant.id);
    expect(isSupportGrantLive(redeemed!, new Date())).toBe(true);
    expect(isSupportGrantLive(redeemed!, new Date(Date.now() + 31 * 60_000))).toBe(false);

    expect(await findSupportGrant(randomUUID())).toBeNull();
    expect(await findSupportGrant('not-a-uuid')).toBeNull();
  });
});
