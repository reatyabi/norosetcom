import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  adminAuditLog,
  billingPayments,
  billingPlans,
  billingSubscriptions,
  db,
  eq,
  FREE_ENTITLEMENTS,
  platformUsers,
  tenants,
  withPlatformAdmin,
  withTenant,
  type Db,
  type PlanUsageRegistry,
  type PlatformAdminContext,
  type TenantContext,
} from '@noroset/core';
import {
  activatePayment,
  AdminBillingService,
  BillingService,
  cancelQueuedSubscription,
  FakeGateway,
  findPlanPrice,
  gatewayFromEnv,
  GRACE_MS,
  MONTH_MS,
  quote,
  resolvePlan,
  startTrial,
  tenantState,
  TRIAL_MS,
  ZarinpalGateway,
} from '../api/index';

// اشتراک و پلن (docs/architecture.md §9.11 «تصمیم‌های ۱۱.۶»).

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

const usage: PlanUsageRegistry = { register: () => undefined, measure: async () => ({ 'noroform.forms': 2 }) };
const DAY = 24 * 60 * 60 * 1000;

async function setup() {
  const [admin] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole: 'superadmin' }).returning();
  const [tenant] = await db.insert(tenants).values({ name: 'billing', slug: `bill-${randomUUID().slice(0, 8)}` }).returning();
  const billing = new AdminBillingService(new Ctx(admin!.id), usage);
  const plans = Object.fromEntries((await db.select().from(billingPlans)).map((p) => [p.code, p]));
  // قیمت‌گذاری و فعال‌سازی پلن‌های seed (مثل کاری که ادمین از UI می‌کند).
  await billing.updatePlan(plans.basic!.id, { active: true, prices: [{ months: 1, priceRial: 1_000_000 }, { months: 12, priceRial: 10_000_000 }] });
  await billing.updatePlan(plans.pro!.id, { active: true, prices: [{ months: 1, priceRial: 3_000_000 }] });
  return { adminId: admin!.id, tenantId: tenant!.id, billing, basic: plans.basic!, pro: plans.pro! };
}

const inTenant = <T>(tenantId: string, fn: (tx: Db) => Promise<T>) => withTenant(tenantId, fn);

/** پرداخت paid برای همان quote و فعال‌سازی (مثل بازگشت موفق درگاه). */
async function pay(tenantId: string, planId: string, months: number, now: Date) {
  return inTenant(tenantId, async (tx) => {
    const q = await quote(tx, tenantId, planId, months, now);
    const [payment] = await tx
      .insert(billingPayments)
      .values({ tenantId, planId, months, kind: q.kind, subtotalRial: q.subtotalRial, creditRial: q.creditRial, vatPercent: q.vatPercent, vatRial: q.vatRial, totalRial: q.totalRial, status: 'paid', gateway: 'fake', paidAt: now })
      .returning();
    return { q, sub: await activatePayment(tx, payment!, now, null) };
  });
}

describe('plan resolution', () => {
  it('a tenant without a plan is limited: base plan name, default limits, expired', async () => {
    const s = await setup();
    const plan = await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date()));
    expect(plan).toMatchObject({ code: 'basic', status: 'limited', endsAt: null, expired: true });
    expect(plan.entitlements).toEqual(FREE_ENTITLEMENTS);
  });

  it('a paid subscription applies its entitlements, then 7 days of grace, then limited', async () => {
    const s = await setup();
    const start = new Date();
    await pay(s.tenantId, s.basic.id, 1, start);
    const active = await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(start.getTime() + DAY)));
    expect(active).toMatchObject({ code: 'basic', status: 'active' });
    expect(active.entitlements['noroform.forms']).toBe(10);
    expect(active.entitlements['branding.remove']).toBe(true);

    const graceAt = new Date(start.getTime() + MONTH_MS + 3 * DAY);
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, graceAt))).toMatchObject({ code: 'basic', status: 'grace', expired: false });
    const after = new Date(start.getTime() + MONTH_MS + GRACE_MS + DAY);
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, after))).toMatchObject({ code: 'basic', status: 'limited', expired: true });
  });
});

describe('quotes and plan changes', () => {
  it('prices a purchase with VAT, refuses inactive plans and unknown periods', async () => {
    const s = await setup();
    const now = new Date();
    const q = await inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, s.basic.id, 12, now));
    expect(q).toMatchObject({ kind: 'purchase', subtotalRial: 10_000_000, creditRial: 0, vatPercent: 10, vatRial: 1_000_000, totalRial: 11_000_000 });
    expect(q.endsAt.getTime() - q.startsAt.getTime()).toBe(12 * MONTH_MS);
    await expect(inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, s.basic.id, 3, now))).rejects.toMatchObject({ message: 'period_not_available' });
    await expect(inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, randomUUID(), 1, now))).rejects.toMatchObject({ message: 'plan_not_found' });
  });

  it('an upgrade starts now with the remaining value as credit and ends the old period', async () => {
    const s = await setup();
    const start = new Date();
    const { sub: basicSub } = await pay(s.tenantId, s.basic.id, 1, start);
    const half = new Date(start.getTime() + MONTH_MS / 2);
    const { q, sub } = await pay(s.tenantId, s.pro.id, 1, half);
    expect(q.kind).toBe('upgrade');
    expect(q.creditRial).toBe(500_000);
    expect(q.totalRial).toBe(Math.round((3_000_000 - 500_000) * 1.1));
    expect(sub.startsAt.getTime()).toBe(half.getTime());
    const [old] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, basicSub.id)));
    expect(old!.endsAt.getTime()).toBe(half.getTime());
    expect((await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(half.getTime() + DAY)))).code).toBe('pro');
  });

  it('allows chaining multiple queued renewals after existing reservations and deleting/canceling reservations', async () => {
    const s = await setup();
    const start = new Date();
    const { sub: basicSub } = await pay(s.tenantId, s.basic.id, 1, start);
    // رزرو اول
    const { sub: q1Sub, q: q1 } = await pay(s.tenantId, s.basic.id, 1, new Date(start.getTime() + DAY));
    expect(q1.kind).toBe('queued');
    expect(q1.startsAt.getTime()).toBe(basicSub.endsAt.getTime());
    // رزرو دوم (زنجیره‌ای بعد از رزرو اول)
    const { sub: q2Sub, q: q2 } = await pay(s.tenantId, s.basic.id, 1, new Date(start.getTime() + 2 * DAY));
    expect(q2.kind).toBe('queued');
    expect(q2.startsAt.getTime()).toBe(q1Sub.endsAt.getTime());

    // رزرو پرداخت‌شده را کاربر لغو نمی‌کند (بازپرداخت نداریم) و هر دو می‌مانند
    await expect(
      inTenant(s.tenantId, (tx) => cancelQueuedSubscription(tx, s.tenantId, q1Sub.id, new Date(start.getTime() + 3 * DAY))),
    ).rejects.toMatchObject({ message: 'paid_reservation' });
    const [kept] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, q1Sub.id)));
    expect(kept!.canceledAt).toBeNull();
    const state = await inTenant(s.tenantId, (tx) => tenantState(tx, s.tenantId, new Date(start.getTime() + 3 * DAY)));
    expect(state.queued.map((q) => q.sub.id)).toEqual([q1Sub.id, q2Sub.id]);
  });

  it('reports a paid reservation as paid and lists only active plans with prices publicly', async () => {
    const s = await setup();
    const start = new Date();
    await pay(s.tenantId, s.basic.id, 1, start);
    await pay(s.tenantId, s.basic.id, 1, new Date(start.getTime() + DAY));
    const ctx: TenantContext = { tenantId: () => s.tenantId, userId: () => s.adminId, role: () => 'owner', run: (fn) => withTenant(s.tenantId, fn) };
    const user = new BillingService(ctx, new FakeGateway(), usage);
    const overview = await user.overview();
    expect(overview.queued).toHaveLength(1);
    expect(overview.queued[0]).toMatchObject({ paid: true });

    const plans = await user.publicPlans();
    expect(plans.vatPercent).toBeGreaterThanOrEqual(0);
    for (const p of plans.plans) expect(Object.keys(p).sort()).toEqual(['code', 'name', 'prices', 'rank', 'scope']);
  });

  it('calculates price multipliers for annual plans up to 5 years', () => {
    const prices = [
      { months: 6, priceRial: 5_000_000 },
      { months: 12, priceRial: 9_000_000, discountPercent: 10 },
    ];
    expect(findPlanPrice(prices, 6)).toEqual({ months: 6, priceRial: 5_000_000 });
    expect(findPlanPrice(prices, 12)).toEqual({ months: 12, priceRial: 9_000_000, discountPercent: 10 });
    // 2 years (24 months)
    expect(findPlanPrice(prices, 24)).toEqual({ months: 24, priceRial: 18_000_000, discountPercent: 10 });
    // 3 years (36 months)
    expect(findPlanPrice(prices, 36)).toEqual({ months: 36, priceRial: 27_000_000, discountPercent: 10 });
    // 5 years (60 months)
    expect(findPlanPrice(prices, 60)).toEqual({ months: 60, priceRial: 45_000_000, discountPercent: 10 });
    // > 5 years (e.g. 72 months) not available
    expect(findPlanPrice(prices, 72)).toBeUndefined();
  });

  it('applies direct plan discount to quote and calculates taxable amount correctly', async () => {
    const s = await setup();
    await s.billing.updatePlan(s.pro.id, {
      active: true,
      prices: [{ months: 12, priceRial: 10_000_000, discountPercent: 20 }],
    });
    const now = new Date();
    const q = await inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, s.pro.id, 12, now));
    expect(q.subtotalRial).toBe(10_000_000);
    expect(q.discountRial).toBe(2_000_000); // 20% direct discount
    expect(q.vatRial).toBe(800_000); // 10% VAT on 8,000,000
    expect(q.totalRial).toBe(8_800_000);
  });

  it('allows upgrading from active basic plan to pro and deducts remaining credit', async () => {
    const s = await setup();
    const now = new Date();
    // Buy 1 month basic plan
    await pay(s.tenantId, s.basic.id, 1, now);

    // After 10 days, upgrade to Pro
    const upgradeTime = new Date(now.getTime() + 10 * DAY);
    const q = await inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, s.pro.id, 1, upgradeTime));
    expect(q.kind).toBe('upgrade');
    expect(q.creditRial).toBeGreaterThan(0);
    expect(q.startsAt.getTime()).toBe(upgradeTime.getTime());
  });

  it('allows renewing active basic plan as queued subscription starting at endsAt', async () => {
    const s = await setup();
    const now = new Date();
    const { sub: basicSub } = await pay(s.tenantId, s.basic.id, 1, now);

    // Renew basic plan
    const renewTime = new Date(now.getTime() + 5 * DAY);
    const q = await inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, s.basic.id, 1, renewTime));
    expect(q.kind).toBe('queued');
    expect(q.creditRial).toBe(0);
    expect(q.startsAt.getTime()).toBe(basicSub.endsAt.getTime());
  });
});

describe('product-scoped subscriptions', () => {
  const scopedCode = (scope: string) => `${scope}_${randomUUID().slice(0, 6)}`;

  /** پلن محصول‌محور با قیمت یک‌ماهه؛ rank بالاتر = ارتقا داخل همان دامنه. */
  async function scopedPlan(
    s: Awaited<ReturnType<typeof setup>>,
    scope: 'norolink' | 'noroform' | 'norofile' | 'bundle',
    entitlements: Record<string, number | boolean>,
    rank = 100,
  ) {
    return s.billing.createPlan({
      code: scopedCode(scope),
      name: `پلن ${scope}`,
      description: '',
      scope,
      rank,
      active: true,
      entitlements,
      prices: [
        { months: 1, priceRial: 500_000 },
        { months: 3, priceRial: 1_500_000 },
      ],
    });
  }

  const scopedAt = (tenantId: string, at: Date) => inTenant(tenantId, (tx) => resolvePlan(tx, tenantId, at));

  it('keeps plans of different products side by side and unions their entitlements', async () => {
    const s = await setup();
    const link = await scopedPlan(s, 'norolink', { 'norolink.pages': 5 });
    const form = await scopedPlan(s, 'noroform', { 'noroform.forms': 9, 'branding.remove': true });
    const start = new Date();
    const { sub: linkSub } = await pay(s.tenantId, link.id, 1, start);
    const at = new Date(start.getTime() + DAY);
    const { q, sub: formSub } = await pay(s.tenantId, form.id, 1, at);

    // محصول دیگر افزودنی است: نه ارتقا، نه صف، و اشتراک اول کوتاه نمی‌شود.
    expect(q.kind).toBe('addon');
    expect(q.creditRial).toBe(0);
    expect(formSub.startsAt.getTime()).toBe(at.getTime());
    const [linkAfter] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, linkSub.id)));
    expect(linkAfter!.endsAt.getTime()).toBe(linkSub.endsAt.getTime());

    const plan = await scopedAt(s.tenantId, new Date(at.getTime() + DAY));
    expect(plan.expired).toBe(false);
    expect(plan.scopes?.norolink).toMatchObject({ scope: 'norolink', status: 'active' });
    expect(plan.scopes?.norolink?.entitlements['norolink.pages']).toBe(5);
    // پلن نورولینک سقف نوروفرم را بالا نمی‌برد؛ فقط پیش‌فرض نسخه‌ی آزاد.
    expect(plan.scopes?.norolink?.entitlements['noroform.forms']).toBe(FREE_ENTITLEMENTS['noroform.forms']);
    expect(plan.scopes?.noroform?.entitlements['noroform.forms']).toBe(9);
    // اجتماع سطح بالا برای نمایش/سازگاری: بیشترین هر کلید از همه‌ی محصولات.
    expect(plan.entitlements['norolink.pages']).toBe(5);
    expect(plan.entitlements['noroform.forms']).toBe(9);
    expect(plan.entitlements['branding.remove']).toBe(true);
    expect(plan.activePlans?.map((p) => p.code).sort()).toEqual([link.code, form.code].sort());
    // دامنه‌ی سوم همچنان محدود است؛ داشتن پلن دو محصول آن را فعال نمی‌کند.
    expect(plan.scopes?.norofile).toMatchObject({ status: 'limited', expired: true });
  });

  it('an upgrade inside one domain credits only that domain and leaves the other subscription alone', async () => {
    const s = await setup();
    const link = await scopedPlan(s, 'norolink', { 'norolink.pages': 3 }, 110);
    const linkPro = await scopedPlan(s, 'norolink', { 'norolink.pages': 20 }, 120);
    const form = await scopedPlan(s, 'noroform', { 'noroform.forms': 9 }, 110);
    const start = new Date();
    const { sub: linkSub } = await pay(s.tenantId, link.id, 1, start);
    const { sub: formSub } = await pay(s.tenantId, form.id, 1, new Date(start.getTime() + DAY));

    const half = new Date(start.getTime() + MONTH_MS / 2);
    const { q, sub: upgraded } = await pay(s.tenantId, linkPro.id, 1, half);
    expect(q.kind).toBe('upgrade');
    expect(q.creditRial).toBe(250_000); // نیمه‌ی باقی‌مانده‌ی همان ۵۰۰٬۰۰۰ ریال
    expect(upgraded.startsAt.getTime()).toBe(half.getTime());
    const [old] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, linkSub.id)));
    expect(old!.endsAt.getTime()).toBe(half.getTime());
    // اشتراک نوروفرم دست نمی‌خورد (نه کوتاه، نه لغو).
    const [formAfter] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, formSub.id)));
    expect(formAfter!.endsAt.getTime()).toBe(formSub.endsAt.getTime());
    expect(formAfter!.canceledAt).toBeNull();

    const plan = await scopedAt(s.tenantId, new Date(half.getTime() + DAY));
    expect(plan.scopes?.norolink?.entitlements['norolink.pages']).toBe(20);
    expect(plan.scopes?.noroform?.entitlements['noroform.forms']).toBe(9);
  });

  it('queues only inside the same domain and expires each product with its own grace', async () => {
    const s = await setup();
    const link = await scopedPlan(s, 'norolink', { 'norolink.pages': 5 }, 110);
    const form = await scopedPlan(s, 'noroform', { 'noroform.forms': 9 }, 110);
    const start = new Date();
    const { sub: linkSub } = await pay(s.tenantId, link.id, 1, start);
    const { sub: formSub } = await pay(s.tenantId, form.id, 3, start);

    // تمدید نورولینک از پایان دوره‌ی همان دامنه شروع می‌شود.
    const { q: renewal, sub: renewalSub } = await pay(s.tenantId, link.id, 1, new Date(start.getTime() + DAY));
    expect(renewal.kind).toBe('queued');
    expect(renewal.startsAt.getTime()).toBe(linkSub.endsAt.getTime());
    expect((await inTenant(s.tenantId, (tx) => tenantState(tx, s.tenantId, new Date(start.getTime() + 2 * DAY)))).queued.map((e) => e.sub.id)).toEqual([
      renewalSub.id,
    ]);

    // رزرو نورولینک، خرید نوروفایل (دامنه‌ی سوم) را به صف نمی‌برد: هم‌زمان از الان.
    const file = await scopedPlan(s, 'norofile', { 'norofile.storage_mb': 2048 }, 110);
    const at = new Date(start.getTime() + 2 * DAY);
    const q = await inTenant(s.tenantId, (tx) => quote(tx, s.tenantId, file.id, 1, at));
    expect(q.kind).toBe('addon');
    expect(q.startsAt.getTime()).toBe(at.getTime());
    expect(q.creditRial).toBe(0);
    const { sub: fileSub } = await pay(s.tenantId, file.id, 1, at);

    // پایان نوروفایل ← مهلت همان دامنه؛ نورولینک (تمدید) و نوروفورم هنوز فعال‌اند.
    const fileGrace = await scopedAt(s.tenantId, new Date(fileSub.endsAt.getTime() + DAY));
    expect(fileGrace.expired).toBe(false);
    expect(fileGrace.scopes?.norofile).toMatchObject({ status: 'grace', expired: false });
    expect(fileGrace.scopes?.norofile?.endsAt?.getTime()).toBe(fileSub.endsAt.getTime() + GRACE_MS);
    expect(fileGrace.scopes?.norolink).toMatchObject({ status: 'active', expired: false });
    expect(fileGrace.scopes?.noroform).toMatchObject({ status: 'active', expired: false });
    expect(fileGrace.scopes?.noroform?.endsAt?.getTime()).toBe(formSub.endsAt.getTime());

    // پایان تمدید نورولینک ← مهلت نورولینک، نوروفایل محدود، نوروفورم هنوز فعال.
    const linkGrace = await scopedAt(s.tenantId, new Date(renewalSub.endsAt.getTime() + DAY));
    expect(linkGrace.scopes?.norolink).toMatchObject({ status: 'grace', expired: false });
    expect(linkGrace.scopes?.norolink?.endsAt?.getTime()).toBe(renewalSub.endsAt.getTime() + GRACE_MS);
    expect(linkGrace.scopes?.norofile).toMatchObject({ status: 'limited', expired: true });
    expect(linkGrace.scopes?.noroform).toMatchObject({ status: 'active' });
    expect(linkGrace.expired).toBe(false);

    // پایان همه: فقط نوروفورم در مهلت است، بعد از آن هیچ محصولی فعال نیست.
    const gracePlan = await scopedAt(s.tenantId, new Date(formSub.endsAt.getTime() + DAY));
    expect(gracePlan.scopes?.norolink).toMatchObject({ status: 'limited', expired: true });
    expect(gracePlan.scopes?.noroform).toMatchObject({ status: 'grace', expired: false });
    expect(gracePlan.expired).toBe(false);
    expect((await scopedAt(s.tenantId, new Date(formSub.endsAt.getTime() + GRACE_MS + DAY))).expired).toBe(true);
  });

  it('scopes the free trial to its own product so another product can still be bought', async () => {
    const s = await setup();
    const link = await scopedPlan(s, 'norolink', { 'norolink.pages': 5 }, 110);
    const form = await scopedPlan(s, 'noroform', { 'noroform.forms': 9 }, 110);
    await s.billing.updateSettings({ trialPlanId: link.id, trialDays: 14 });
    try {
      const now = new Date();
      const [u1] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
      await pay(s.tenantId, link.id, 1, now);
      // اشتراک همان دامنه مانع دوره‌ی رایگان است.
      await expect(inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, u1!.id, now))).rejects.toMatchObject({ message: 'subscription_exists' });

      // فضای کاری تازه: دوره‌ی رایگان نورولینک، نوروفورم را محدود می‌گذارد و خریدش هم‌زمان است.
      const [tenant2] = await db.insert(tenants).values({ name: 'scoped-trial', slug: `bill-${randomUUID().slice(0, 8)}` }).returning();
      const [u2] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
      await inTenant(tenant2!.id, (tx) => startTrial(tx, tenant2!.id, u2!.id, now));
      const trialPlan = await scopedAt(tenant2!.id, new Date(now.getTime() + DAY));
      expect(trialPlan.scopes?.norolink).toMatchObject({ status: 'trial', expired: false });
      expect(trialPlan.scopes?.noroform).toMatchObject({ status: 'limited', expired: true });

      const { q } = await pay(tenant2!.id, form.id, 1, new Date(now.getTime() + 2 * DAY));
      expect(q.kind).toBe('addon');
      const both = await scopedAt(tenant2!.id, new Date(now.getTime() + 3 * DAY));
      expect(both.scopes?.norolink).toMatchObject({ status: 'trial' });
      expect(both.scopes?.noroform).toMatchObject({ status: 'active' });
      expect(both.activePlans).toHaveLength(2);
    } finally {
      await s.billing.updateSettings({ trialPlanId: null, trialDays: 14 });
    }
  });
});

describe('trial, manual grants and offline payments', () => {
  it('14 free days on the base plan once per user, without grace, then limited', async () => {
    const s = await setup();
    const [user] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
    const now = new Date();
    await inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, now));
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(now.getTime() + DAY)))).toMatchObject({ code: 'basic', status: 'trial', expired: false });
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(now.getTime() + TRIAL_MS + DAY)))).toMatchObject({ code: 'basic', status: 'limited', expired: true });
    await expect(inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, new Date(now.getTime() + TRIAL_MS + DAY)))).rejects.toMatchObject({
      message: 'trial_used',
    });

    // فضای کاری تازه‌ی همان کاربر دوباره رایگان نمی‌گیرد؛ کاربر دیگر می‌گیرد.
    const [second] = await db.insert(tenants).values({ name: 'second', slug: `bill-${randomUUID().slice(0, 8)}` }).returning();
    await expect(inTenant(second!.id, (tx) => startTrial(tx, second!.id, user!.id, now))).rejects.toMatchObject({ message: 'trial_used' });
    expect(await inTenant(second!.id, (tx) => resolvePlan(tx, second!.id, now))).toMatchObject({ status: 'limited', expired: true });
    const [other] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
    await inTenant(second!.id, (tx) => startTrial(tx, second!.id, other!.id, now));
    expect(await inTenant(second!.id, (tx) => resolvePlan(tx, second!.id, now))).toMatchObject({ status: 'trial' });
  });

  it('a refused trial does not use up the free days of the user', async () => {
    const s = await setup();
    const [user] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
    const now = new Date();
    await pay(s.tenantId, s.basic.id, 1, now);
    await expect(inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, now))).rejects.toMatchObject({ message: 'subscription_exists' });
    const [row] = await db.select().from(platformUsers).where(eq(platformUsers.id, user!.id));
    expect(row!.trialUsedAt).toBeNull();
  });

  it('admins grant, cancel and record offline payments, all audited', async () => {
    const s = await setup();
    const sub = await s.billing.grant(s.tenantId, { planId: s.pro.id, days: 30, note: 'هدیه‌ی قرارداد' });
    let view = await s.billing.tenantBilling(s.tenantId);
    expect(view.plan).toMatchObject({ code: 'pro', status: 'active' });
    expect(view.usage).toEqual({ 'noroform.forms': 2 });

    await s.billing.cancelSubscription(sub.id, 'اشتباه');
    expect((await s.billing.tenantBilling(s.tenantId)).plan.status).toBe('limited');

    const { payment } = await s.billing.recordOfflinePayment(s.tenantId, { planId: s.basic.id, months: 12, totalRial: 9_000_000, note: 'کارت‌به‌کارت' });
    expect(payment).toMatchObject({ status: 'paid', gateway: 'manual', totalRial: 9_000_000, vatRial: 0 });
    view = await s.billing.tenantBilling(s.tenantId);
    expect(view.plan.code).toBe('basic');
    expect(view.payments.map((p) => p.id)).toContain(payment.id);

    const actions = (await withPlatformAdmin(s.adminId, (tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, s.tenantId)))).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['billing.grant', 'billing.cancel', 'billing.offline_payment']));
  });

  it('validates plan edits and the VAT setting', async () => {
    const s = await setup();
    await expect(s.billing.updatePlan(s.basic.id, { entitlements: { 'noroform.forms': -1 } })).rejects.toMatchObject({ message: 'invalid_entitlements' });
    await expect(s.billing.updatePlan(s.basic.id, { entitlements: { 'nope.key': 1 } })).rejects.toMatchObject({ message: 'invalid_entitlements' });
    await expect(s.billing.updatePlan(s.basic.id, { prices: [{ months: 1, priceRial: 1 }, { months: 1, priceRial: 2 }] })).rejects.toMatchObject({
      message: 'invalid_prices',
    });

    expect(await s.billing.updateSettings({ vatPercent: 9 })).toMatchObject({ vatPercent: 9, trialDays: 14 });
    expect((await s.billing.overview()).vatPercent).toBe(9);
    await s.billing.updateSettings({ vatPercent: 10 });
  });
});

describe('trial as a state of a configurable plan', () => {
  it('a purchase during the trial starts now, ends the trial and keeps its remaining days', async () => {
    const s = await setup();
    const [user] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
    const start = new Date();
    const trial = await inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, start));
    const at = new Date(start.getTime() + 4 * DAY);
    const left = trial.endsAt.getTime() - at.getTime();

    // همان پلن: خرید (نه رزرو بعد از دوره‌ی رایگان) و همان لحظه فعال
    const { q, sub } = await pay(s.tenantId, s.basic.id, 1, at);
    expect(q).toMatchObject({ kind: 'purchase', creditRial: 0, trialCarryDays: 10 });
    expect(q.startsAt.getTime()).toBe(at.getTime());
    expect(sub.startsAt.getTime()).toBe(at.getTime());
    expect(sub.endsAt.getTime()).toBe(at.getTime() + MONTH_MS + left);
    const [ended] = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.id, trial.id)));
    expect(ended!.endsAt.getTime()).toBe(at.getTime());
    // وضعیت همان لحظه active است (پس ایندکس گوگل باز می‌شود)، نه trial
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(at.getTime() + 1000)))).toMatchObject({ code: 'basic', status: 'active' });
    // پایان دوره‌ی رایگان مهلت ۷ روزه نمی‌سازد و اشتراک تا پایان ماه + روزهای رایگان می‌ماند
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(at.getTime() + MONTH_MS + left - DAY)))).toMatchObject({ status: 'active' });
  });

  it('an upgrade during the trial also starts now and keeps the remaining trial days', async () => {
    const s = await setup();
    const [user] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
    const start = new Date();
    const trial = await inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, start));
    const at = new Date(start.getTime() + 2 * DAY);
    const { q, sub } = await pay(s.tenantId, s.pro.id, 1, at);
    expect(q).toMatchObject({ kind: 'upgrade', creditRial: 0, trialCarryDays: 12 });
    expect(sub.endsAt.getTime()).toBe(at.getTime() + MONTH_MS + (trial.endsAt.getTime() - at.getTime()));
    expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, new Date(at.getTime() + 1000)))).toMatchObject({ code: 'pro', status: 'active' });
  });

  it('admins choose the trial plan and length; 0 days turns the trial off without using it up', async () => {
    const s = await setup();
    try {
      expect(await s.billing.updateSettings({ trialPlanId: s.pro.id, trialDays: 7 })).toMatchObject({ trialPlanId: s.pro.id, trialDays: 7 });
      expect((await s.billing.overview()).trial).toEqual({ planId: s.pro.id, days: 7 });
      const [user] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
      const now = new Date();
      const sub = await inTenant(s.tenantId, (tx) => startTrial(tx, s.tenantId, user!.id, now));
      expect(sub.planId).toBe(s.pro.id);
      expect(sub.endsAt.getTime() - sub.startsAt.getTime()).toBe(7 * DAY);
      expect(await inTenant(s.tenantId, (tx) => resolvePlan(tx, s.tenantId, now))).toMatchObject({ code: 'pro', status: 'trial' });

      await s.billing.updateSettings({ trialDays: 0 });
      const [other] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
      const [tenant2] = await db.insert(tenants).values({ name: 'no-trial', slug: `bill-${randomUUID().slice(0, 8)}` }).returning();
      await expect(inTenant(tenant2!.id, (tx) => startTrial(tx, tenant2!.id, other!.id, now))).rejects.toMatchObject({ message: 'trial_disabled' });
      const [row] = await db.select().from(platformUsers).where(eq(platformUsers.id, other!.id));
      expect(row!.trialUsedAt).toBeNull();

      await expect(s.billing.updateSettings({ trialPlanId: randomUUID() })).rejects.toMatchObject({ message: 'plan_not_found' });
      const actions = (await withPlatformAdmin(s.adminId, (tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.actorUserId, s.adminId)))).map((a) => a.action);
      expect(actions).toContain('billing.settings');
    } finally {
      // تنظیم سراسری است؛ برای تست‌های دیگر به پیش‌فرض برمی‌گردد (null ← پلن پایه).
      await s.billing.updateSettings({ trialPlanId: null, trialDays: 14 });
    }
  });
});

describe('online checkout and gateway callback', () => {
  class BrokenGateway extends FakeGateway {
    override async request(): Promise<never> {
      throw new Error('down');
    }
  }
  const ctxFor = (tenantId: string, userId: string): TenantContext => ({
    tenantId: () => tenantId,
    userId: () => userId,
    role: () => 'owner',
    run: (fn) => withTenant(tenantId, fn),
  });

  it('pays through the gateway, verifies on return, activates once', async () => {
    const s = await setup();
    const svc = new BillingService(ctxFor(s.tenantId, s.adminId), new FakeGateway(), usage);
    const { paymentId, redirectUrl } = await svc.checkout({ planId: s.basic.id, months: 1 });
    const url = new URL(redirectUrl);
    expect(url.pathname).toBe('/api/billing/callback');
    const authority = url.searchParams.get('Authority')!;

    expect(await svc.callback(authority, 'OK')).toContain(`status=ok&payment=${paymentId}`);
    expect(await svc.callback(authority, 'OK')).toContain('status=ok'); // تکرار بی‌اثر
    const receipt = await svc.receipt(paymentId);
    expect(receipt).toMatchObject({ status: 'paid', totalRial: 1_100_000, vatRial: 100_000, planName: 'پایه نورولینک' });
    expect(receipt.refId).toMatch(/^FAKE-/);
    const subs = await inTenant(s.tenantId, (tx) => tx.select().from(billingSubscriptions).where(eq(billingSubscriptions.paymentId, paymentId)));
    expect(subs).toHaveLength(1);
    expect((await svc.status()).code).toBe('basic');
  });

  it('a cancelled or unverifiable return fails the payment; unknown authorities are ignored', async () => {
    const s = await setup();
    const svc = new BillingService(ctxFor(s.tenantId, s.adminId), new FakeGateway(), usage);
    const first = await svc.checkout({ planId: s.basic.id, months: 1 });
    const a1 = new URL(first.redirectUrl).searchParams.get('Authority')!;
    expect(await svc.callback(a1, 'NOK')).toContain('status=failed');
    expect((await svc.receipt(first.paymentId)).status).toBe('failed');

    expect(await svc.callback('NOPE', 'OK')).toContain('status=failed');
    expect(await svc.callback(undefined, undefined)).toContain('status=failed');
    expect((await svc.status()).status).toBe('limited');
  });

  it('a gateway outage fails the payment with 502', async () => {
    const s = await setup();
    const svc = new BillingService(ctxFor(s.tenantId, s.adminId), new BrokenGateway(), usage);
    await expect(svc.checkout({ planId: s.basic.id, months: 1 })).rejects.toMatchObject({ status: 502, message: 'gateway_unavailable' });
    expect((await svc.payments())[0]).toMatchObject({ status: 'failed' });
  });

  it('lists the buyable plans without a free plan', async () => {
    const s = await setup();
    const svc = new BillingService(ctxFor(s.tenantId, s.adminId), new FakeGateway(), usage);
    const overview = await svc.overview();
    expect(overview.canManage).toBe(true);
    expect(overview.plans.map((p) => p.code)).toEqual(expect.arrayContaining(['basic', 'pro']));
    expect(overview.plans.map((p) => p.code)).not.toContain('free');
  });
});

describe('ZarinPal adapter', () => {
  it('maps request and verify to the v4 API', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fakeFetch = (async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      calls.push({ url, body });
      const data = url.endsWith('request.json') ? { code: 100, authority: 'A000000000000000000000000000000123' } : { code: 101, ref_id: 98765, card_pan: '6037**1234' };
      return { json: async () => ({ data, errors: [] }) };
    }) as unknown as typeof fetch;
    const zp = new ZarinpalGateway('merchant-1', true, fakeFetch);
    const started = await zp.request({ amountRial: 1_100_000, description: 'x', callbackUrl: 'https://noroset.com/api/billing/callback', mobile: '+989121234567' });
    expect(started.redirectUrl).toBe('https://sandbox.zarinpal.com/pg/StartPay/A000000000000000000000000000000123');
    expect(calls[0]).toMatchObject({
      url: 'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
      body: { merchant_id: 'merchant-1', amount: 1_100_000, currency: 'IRR', metadata: { mobile: '09121234567' } },
    });
    expect(await zp.verify({ authority: started.authority, amountRial: 1_100_000 })).toEqual({ ok: true, refId: '98765', cardPan: '6037**1234' });
  });

  it('refuses unsafe gateway configuration', () => {
    expect(() => gatewayFromEnv({ NODE_ENV: 'production', PAYMENT_GATEWAY: 'fake' })).toThrow();
    expect(() => gatewayFromEnv({ NODE_ENV: 'production' })).toThrow(/ZARINPAL_MERCHANT_ID/);
    expect(() => gatewayFromEnv({ NODE_ENV: 'production', ZARINPAL_MERCHANT_ID: 'm', ZARINPAL_SANDBOX: 'true' })).toThrow(/SANDBOX/);
    expect(gatewayFromEnv({ NODE_ENV: 'production', ZARINPAL_MERCHANT_ID: 'm' }).name).toBe('zarinpal');
    expect(gatewayFromEnv({}).name).toBe('fake');
  });
});
