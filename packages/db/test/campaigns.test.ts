import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  billingCoupons,
  db,
  eq,
  panelAnnouncementDismissals,
  panelAnnouncements,
  platformUsers,
  sql,
  withPlatformAdmin,
  withUser,
} from '../src/index';

// RLS کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷).

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

const createUser = (platformRole: 'user' | 'superadmin' = 'user') =>
  one(db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole }).returning());

const code = () => `T${randomUUID().slice(0, 8).toUpperCase()}`;

describe('coupons RLS', () => {
  it('users cannot list coupons, only look one up by its exact code or bump its usage by id', async () => {
    const admin = await createUser('superadmin');
    const c = code();
    const coupon = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(billingCoupons).values({ code: c, kind: 'percent', amount: 20, createdBy: admin.id }).returning()),
    );

    expect(await db.select().from(billingCoupons)).toHaveLength(0);
    const found = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.coupon_code', ${c}, true)`);
      return tx.select().from(billingCoupons);
    });
    expect(found.map((r) => r.id)).toEqual([coupon.id]);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.coupon_id', ${coupon.id}, true)`);
      await tx.update(billingCoupons).set({ usedCount: sql`${billingCoupons.usedCount} + 1` }).where(eq(billingCoupons.id, coupon.id));
    });
    const [after] = await withPlatformAdmin(admin.id, (tx) => tx.select().from(billingCoupons).where(eq(billingCoupons.id, coupon.id)));
    expect(after!.usedCount).toBe(1);

    // کاربر عادی نمی‌سازد
    const user = await createUser();
    await expect(withPlatformAdmin(user.id, (tx) => tx.insert(billingCoupons).values({ code: code(), kind: 'fixed', amount: 1000 }))).rejects.toThrow();
  });
});

describe('announcements RLS', () => {
  it('only live announcements are readable without admin; dismissals are per user', async () => {
    const admin = await createUser('superadmin');
    const live = await withPlatformAdmin(admin.id, (tx) => one(tx.insert(panelAnnouncements).values({ title: 'زنده', createdBy: admin.id }).returning()));
    const off = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(panelAnnouncements).values({ title: 'خاموش', active: false, createdBy: admin.id }).returning()),
    );
    const future = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(panelAnnouncements).values({ title: 'آینده', startsAt: new Date(Date.now() + 86_400_000), createdBy: admin.id }).returning()),
    );
    const ids = (await db.select({ id: panelAnnouncements.id }).from(panelAnnouncements)).map((r) => r.id);
    expect(ids).toContain(live.id);
    expect(ids).not.toContain(off.id);
    expect(ids).not.toContain(future.id);

    const a = await createUser();
    const b = await createUser();
    await withUser(a.id, (tx) => tx.insert(panelAnnouncementDismissals).values({ userId: a.id, announcementId: live.id }));
    await expect(withUser(a.id, (tx) => tx.insert(panelAnnouncementDismissals).values({ userId: b.id, announcementId: live.id }))).rejects.toThrow();
    expect(await withUser(b.id, (tx) => tx.select().from(panelAnnouncementDismissals))).toHaveLength(0);
    expect(await withUser(a.id, (tx) => tx.select().from(panelAnnouncementDismissals))).toHaveLength(1);
  });
});
