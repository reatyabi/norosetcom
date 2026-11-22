import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  billingPlans,
  db,
  eq,
  platformUsers,
  tenantMemberships,
  tenants,
  withPlatformAdmin,
  withTenant,
  type Db,
  type MembershipRole,
  type PlanUsageRegistry,
  type PlatformAdminContext,
  type TenantContext,
} from '@noroset/core';
import { AdminBillingService, AdminCampaignsService, AnnouncementsService, BillingService, FakeGateway } from '../api/index';

// کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷).

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

const usage: PlanUsageRegistry = { register: () => undefined, measure: async () => ({}) };
const code = () => `C${randomUUID().slice(0, 8).toUpperCase()}`;

async function setup(role: MembershipRole = 'owner') {
  const [admin] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole: 'superadmin' }).returning();
  const [owner] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
  const [tenant] = await db.insert(tenants).values({ name: 'camp', slug: `camp-${randomUUID().slice(0, 8)}` }).returning();
  await withTenant(tenant!.id, (tx) => tx.insert(tenantMemberships).values({ tenantId: tenant!.id, userId: owner!.id, role }));
  const ctx = new Ctx(admin!.id);
  const billingAdmin = new AdminBillingService(ctx, usage);
  const plans = Object.fromEntries((await db.select().from(billingPlans)).map((p) => [p.code, p]));
  await billingAdmin.updatePlan(plans.basic!.id, { active: true, prices: [{ months: 1, priceRial: 1_000_000 }] });
  await billingAdmin.updatePlan(plans.pro!.id, { active: true, prices: [{ months: 1, priceRial: 3_000_000 }] });
  const tctx: TenantContext = { tenantId: () => tenant!.id, userId: () => owner!.id, role: () => role, run: (fn) => withTenant(tenant!.id, fn) };
  return {
    adminId: admin!.id,
    tenantId: tenant!.id,
    ownerId: owner!.id,
    campaigns: new AdminCampaignsService(ctx),
    billing: new BillingService(tctx, new FakeGateway(), usage),
    announcements: new AnnouncementsService(tctx),
    basic: plans.basic!,
    pro: plans.pro!,
  };
}

async function pay(s: Awaited<ReturnType<typeof setup>>, planId: string, couponCode?: string) {
  const { redirectUrl } = await s.billing.checkout({ planId, months: 1, couponCode });
  const authority = new URL(redirectUrl).searchParams.get('Authority');
  if (authority) await s.billing.callback(authority, 'OK');
}

describe('coupons', () => {
  it('discounts after credit and before VAT, and counts only paid uses', async () => {
    const s = await setup();
    const c = await s.campaigns.createCoupon({ code: code().toLowerCase(), kind: 'percent', amount: 20, maxUses: 5 });
    expect(c.code).toMatch(/^C[0-9A-F]{8}$/); // حروف بزرگ

    const q = await s.billing.quote({ planId: s.basic.id, months: 1, couponCode: ` ${c.code.toLowerCase()} ` });
    expect(q).toMatchObject({ subtotalRial: 1_000_000, discountRial: 200_000, vatRial: 80_000, totalRial: 880_000, couponId: c.id });

    // پرداخت ناموفق مصرف نیست
    const failed = await s.billing.checkout({ planId: s.basic.id, months: 1, couponCode: c.code });
    await s.billing.callback(new URL(failed.redirectUrl).searchParams.get('Authority')!, 'NOK');
    expect((await s.campaigns.coupons()).find((x) => x.id === c.id)!.usedCount).toBe(0);

    await pay(s, s.basic.id, c.code);
    expect((await s.campaigns.coupons()).find((x) => x.id === c.id)!.usedCount).toBe(1);
    // سقف هر فضای کاری پیش‌فرض ۱ است
    await expect(s.billing.quote({ planId: s.pro.id, months: 1, couponCode: c.code })).rejects.toMatchObject({ message: 'coupon_used' });
  });

  it('applies to the upgrade amount after credit, and fixed amounts are capped', async () => {
    const s = await setup();
    await pay(s, s.basic.id);
    const c = await s.campaigns.createCoupon({ code: code(), kind: 'fixed', amount: 50_000_000 });
    const q = await s.billing.quote({ planId: s.pro.id, months: 1, couponCode: c.code });
    expect(q.kind).toBe('upgrade');
    expect(q.discountRial).toBe(3_000_000 - q.creditRial);
    expect(q.totalRial).toBe(0);
  });

  it('rejects unknown, inactive, expired, wrong-plan and exhausted codes', async () => {
    const s = await setup();
    await expect(s.billing.quote({ planId: s.basic.id, months: 1, couponCode: 'NOPE-NOPE' })).rejects.toMatchObject({ message: 'coupon_invalid' });
    const inactive = await s.campaigns.createCoupon({ code: code(), kind: 'percent', amount: 10, active: false });
    await expect(s.billing.quote({ planId: s.basic.id, months: 1, couponCode: inactive.code })).rejects.toMatchObject({ message: 'coupon_invalid' });
    const expired = await s.campaigns.createCoupon({ code: code(), kind: 'percent', amount: 10, startsAt: '2020-01-01T00:00:00Z', endsAt: '2020-02-01T00:00:00Z' });
    await expect(s.billing.quote({ planId: s.basic.id, months: 1, couponCode: expired.code })).rejects.toMatchObject({ message: 'coupon_invalid' });
    const proOnly = await s.campaigns.createCoupon({ code: code(), kind: 'percent', amount: 10, planIds: [s.pro.id] });
    await expect(s.billing.quote({ planId: s.basic.id, months: 1, couponCode: proOnly.code })).rejects.toMatchObject({ message: 'coupon_not_for_plan' });

    const once = await s.campaigns.createCoupon({ code: code(), kind: 'percent', amount: 10, maxUses: 1 });
    await pay(s, s.basic.id, once.code);
    const other = await setup();
    await expect(other.billing.quote({ planId: other.basic.id, months: 1, couponCode: once.code })).rejects.toMatchObject({ message: 'coupon_exhausted' });
  });

  it('validates admin input; code and kind are immutable', async () => {
    const s = await setup();
    await expect(s.campaigns.createCoupon({ code: code(), kind: 'percent', amount: 150 })).rejects.toMatchObject({ message: 'invalid_coupon' });
    await expect(s.campaigns.createCoupon({ code: 'a b', kind: 'fixed', amount: 10 })).rejects.toMatchObject({ message: 'invalid_coupon' });
    const c = await s.campaigns.createCoupon({ code: code(), kind: 'fixed', amount: 10_000 });
    await expect(s.campaigns.createCoupon({ code: c.code, kind: 'fixed', amount: 10 })).rejects.toMatchObject({ message: 'coupon_code_taken' });
    await expect(s.campaigns.updateCoupon(c.id, { kind: 'percent' })).rejects.toMatchObject({ message: 'coupon_immutable' });
    expect((await s.campaigns.updateCoupon(c.id, { active: false, maxUses: 3 })).active).toBe(false);
  });
});

describe('announcements', () => {
  it('targets by plan, tenant and audience; dismissals are per user; targets never leak', async () => {
    const s = await setup('member');
    const managers = await s.campaigns.createAnnouncement({ title: 'مدیران', audience: 'managers' });
    const freePlan = await s.campaigns.createAnnouncement({ title: 'رایگان‌ها', targetType: 'plans', targetIds: ['basic'], linkUrl: '/billing', linkLabel: 'ارتقا' });
    const proPlan = await s.campaigns.createAnnouncement({ title: 'حرفه‌ای‌ها', targetType: 'plans', targetIds: ['pro'] });
    const mine = await s.campaigns.createAnnouncement({ title: 'فقط شما', targetType: 'tenants', targetIds: [s.tenantId] });
    const later = await s.campaigns.createAnnouncement({ title: 'بعداً', startsAt: new Date(Date.now() + 86_400_000).toISOString() });

    const list = await s.announcements.list();
    const seen = list.map((a) => a.id);
    expect(seen).toEqual(expect.arrayContaining([freePlan.id, mine.id]));
    expect(seen).not.toContain(managers.id);
    expect(seen).not.toContain(proPlan.id);
    expect(seen).not.toContain(later.id);
    expect(Object.keys(list[0]!).sort()).toEqual(['body', 'id', 'linkLabel', 'linkUrl', 'title', 'tone']);

    await s.announcements.dismiss(mine.id);
    expect((await s.announcements.list()).map((a) => a.id)).not.toContain(mine.id);
    await s.announcements.dismiss(randomUUID()); // ناموجود: بی‌اثر
    for (const a of [managers, freePlan, proPlan, later]) await s.campaigns.updateAnnouncement(a.id, { active: false });
  });

  it('rejects unsafe links', async () => {
    const s = await setup();
    await expect(s.campaigns.createAnnouncement({ title: 'x', linkUrl: 'javascript:alert(1)' })).rejects.toMatchObject({ message: 'invalid_link' });
    await expect(s.campaigns.createAnnouncement({ title: 'x', linkUrl: '//evil.example' })).rejects.toMatchObject({ message: 'invalid_link' });
    await expect(s.campaigns.createAnnouncement({ title: 'x', linkUrl: 'http://plain.example' })).rejects.toMatchObject({ message: 'invalid_link' });
  });
});

describe('UTM report', () => {
  it('groups signups by first-touch UTM with paying users and revenue', async () => {
    const s = await setup();
    const campaign = `camp-${randomUUID().slice(0, 6)}`;
    await db.update(platformUsers).set({ signupUtm: { source: 'instagram', medium: 'social', campaign } }).where(eq(platformUsers.id, s.ownerId));
    await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, signupUtm: { source: 'instagram', medium: 'social', campaign } });
    await pay(s, s.basic.id);

    const row = (await s.campaigns.utmReport({ days: 30 })).find((r) => r.campaign === campaign);
    expect(row).toEqual({ source: 'instagram', medium: 'social', campaign, signups: 2, paying: 1, revenueRial: 1_100_000 });
  });
});
