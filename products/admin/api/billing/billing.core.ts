import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  and,
  asc,
  billingCoupons,
  billingPayments,
  billingPlans,
  billingSettings,
  billingSubscriptions,
  desc,
  count,
  eq,
  isNull,
  mergeEntitlements,
  planCovers,
  planScopesOverlap,
  platformUsers,
  PRODUCT_SCOPES,
  resolveEntitlements,
  sql,
  tenants,
  type Db,
  type Entitlements,
  type PlanStatus,
  type ProductScope,
  type ResolvedPlan,
  type ScopedPlan,
} from '@noroset/core';

// منطق مشترک اشتراک (docs/architecture.md §9.11 «تصمیم‌های ۱۱.۶»)، همه روی tx همان tenant (withTenant یا
// withPlatformAdmin + فیلتر tenant). پنل کاربر، ادمین و بازگشت درگاه همین توابع را صدا می‌زنند.

export const DAY_MS = 24 * 60 * 60 * 1000;
/** هر «ماه» اشتراک ۳۰ روز است (قابل پیش‌بینی؛ مستقل از طول ماه شمسی). */
export const MONTH_MS = 30 * DAY_MS;
export const GRACE_MS = 7 * DAY_MS;
/** طول پیش‌فرض دوره‌ی رایگان (`billing_settings.trial_days`، قابل تغییر از مدیریت پلتفرم). */
export const DEFAULT_TRIAL_DAYS = 14;
export const TRIAL_MS = DEFAULT_TRIAL_DAYS * DAY_MS;
/** پلنی که tenant پس از پایان اشتراک روی آن محدود می‌ماند؛ و پلن دوره‌ی رایگان اگر ادمین پلن دیگری انتخاب نکرده باشد. */
export const BASE_PLAN_CODE = 'basic';
export const DEFAULT_VAT_PERCENT = 10;

export type PlanRow = typeof billingPlans.$inferSelect;
export type SubscriptionRow = typeof billingSubscriptions.$inferSelect;
/** addon: خرید هم‌زمان محصولی که پلن فعال فعلی آن دامنه را پوشش نمی‌دهد (جایگزین/ارتقا نیست). */
export type PaymentKind = 'purchase' | 'upgrade' | 'queued' | 'addon';

export type SubscriptionEntry = { sub: SubscriptionRow; plan: PlanRow };

export interface TenantBillingState {
  /** همه‌ی اشتراک‌های جاری، بهترین اول؛ با مدل محصول‌محور معمولاً یکی به‌ازای هر محصول (§9.11). */
  currents: SubscriptionEntry[];
  /** اشتراک جاری برتر (عنوان/کارت پلن)؛ null ← هیچ اشتراک جاری. */
  current: SubscriptionEntry | null;
  /** خریدهای زمان‌بندی‌شده (شروع بعد از الان). */
  queued: SubscriptionEntry[];
  /** آخرین اشتراک غیرآزمایشی پایان‌یافته‌ی هر محصول (مهلت ۷ روزه‌ی همان دامنه). */
  lastEndedByScope: Partial<Record<ProductScope, SubscriptionEntry>>;
  /** آخرین اشتراک غیرآزمایشی پایان‌یافته (نمایش/سازگاری). */
  lastEnded: SubscriptionEntry | null;
  trialUsed: boolean;
}

export async function loadPlans(tx: Db): Promise<PlanRow[]> {
  return tx.select().from(billingPlans).orderBy(asc(billingPlans.rank));
}

export async function basePlan(tx: Db): Promise<PlanRow> {
  const [plan] = await tx.select().from(billingPlans).where(eq(billingPlans.code, BASE_PLAN_CODE)).limit(1);
  if (!plan) throw new Error('base plan missing (migration 0010)');
  return plan;
}

export interface TrialSettings {
  plan: PlanRow;
  /** ۰ ← دوره‌ی رایگان خاموش است. */
  days: number;
}

/**
 * دوره‌ی رایگان کاربر تازه: پلن و طول آن از `billing_settings` (ادمین انتخاب می‌کند؛ هر پلنی، حتی غیرفعال برای خرید).
 * دوره‌ی رایگان «وضعیت» همان پلن است (اشتراک با `source = 'trial'`، PlanStatus `trial`)، نه پلنی جدا: سقف‌ها همان
 * سقف‌های پلن‌اند و فقط امکاناتی که محصول در وضعیت trial می‌بندد (ایندکس گوگل، norolink `seoAllowed`) بسته است.
 */
export async function trialSettings(tx: Db): Promise<TrialSettings> {
  const [row] = await tx.select({ planId: billingSettings.trialPlanId, days: billingSettings.trialDays }).from(billingSettings).limit(1);
  const [chosen] = row?.planId ? await tx.select().from(billingPlans).where(eq(billingPlans.id, row.planId)).limit(1) : [];
  return { plan: chosen ?? (await basePlan(tx)), days: row?.days ?? DEFAULT_TRIAL_DAYS };
}

/** ترتیب ترجیح اشتراک‌ها: پرداختی/دستی جلوتر از دوره‌ی رایگان، سپس rank بالاتر، سپس پایان دیرتر. */
function byPreference(a: SubscriptionEntry, b: SubscriptionEntry): number {
  const aPaid = a.sub.source === 'trial' ? 0 : 1;
  const bPaid = b.sub.source === 'trial' ? 0 : 1;
  return bPaid - aPaid || b.plan.rank - a.plan.rank || b.sub.endsAt.getTime() - a.sub.endsAt.getTime();
}

export async function vatPercent(tx: Db): Promise<number> {
  const [row] = await tx.select({ vat: billingSettings.vatPercent }).from(billingSettings).limit(1);
  return row?.vat ?? DEFAULT_VAT_PERCENT;
}

export async function tenantState(tx: Db, tenantId: string, now: Date): Promise<TenantBillingState> {
  const rows = await tx
    .select({ sub: billingSubscriptions, plan: billingPlans })
    .from(billingSubscriptions)
    .innerJoin(billingPlans, eq(billingPlans.id, billingSubscriptions.planId))
    .where(and(eq(billingSubscriptions.tenantId, tenantId), isNull(billingSubscriptions.canceledAt)))
    .orderBy(desc(billingSubscriptions.endsAt));
  const currents = rows.filter((r) => r.sub.startsAt <= now && r.sub.endsAt > now).sort(byPreference);
  const queued = rows.filter((r) => r.sub.startsAt > now).sort((a, b) => a.sub.startsAt.getTime() - b.sub.startsAt.getTime());
  // مهلت ۷ روزه دامنه‌محور است: پایان اشتراک نورولینک نباید مهلت نوروفورم را هم قطع کند (و برعکس).
  const lastEndedByScope: Partial<Record<ProductScope, SubscriptionEntry>> = {};
  for (const row of rows) {
    if (row.sub.endsAt > now || row.sub.source === 'trial') continue;
    for (const product of PRODUCT_SCOPES) {
      if (planCovers(row.plan.scope, product) && !lastEndedByScope[product]) lastEndedByScope[product] = row;
    }
  }
  return {
    currents,
    current: currents[0] ?? null,
    queued,
    lastEndedByScope,
    lastEnded: rows.find((r) => r.sub.endsAt <= now && r.sub.source !== 'trial') ?? null,
    trialUsed: rows.some((r) => r.sub.source === 'trial'),
  };
}

/** اجتماع افزایشی سقف‌های چند اشتراک هم‌زمان (max برای عدد، OR برای بولی)؛ شروع از سقف‌های نسخه‌ی آزاد. */
function unionEntitlements(entries: SubscriptionEntry[]): Entitlements {
  return entries.reduce((acc, entry) => mergeEntitlements(acc, resolveEntitlements(entry.plan.entitlements)), resolveEntitlements({}));
}

function planView(scope: ProductScope, plan: PlanRow, status: PlanStatus, endsAt: Date | null, entitlements: Entitlements, expired: boolean): ScopedPlan {
  return { scope, planId: plan.id, code: plan.code, name: plan.name, rank: plan.rank, status, endsAt, entitlements, expired };
}

interface ScopeResolution {
  plan: ScopedPlan;
  /** اشتراک‌هایی که سقف‌های این دامنه را می‌سازند (در مهلت: همان اشتراک پایان‌یافته). */
  contributors: SubscriptionEntry[];
}

/**
 * پلن مؤثر یک محصول: اشتراک جاری پوشش‌دهنده‌ی همان دامنه (همه‌ی اشتراک‌های پوشش‌دهنده با هم، union) ← مهلت ۷ روزه‌ی
 * همان دامنه ← محدود. پلن `bundle` همه‌ی دامنه‌ها را پوشش می‌دهد و اشتراک محصول دیگر روی این دامنه اثری ندارد.
 */
function resolveScope(state: TenantBillingState, product: ProductScope, base: PlanRow, now: Date): ScopeResolution {
  const covering = state.currents.filter((r) => planCovers(r.plan.scope, product));
  if (covering.length) {
    const top = covering[0]!;
    return {
      contributors: covering,
      plan: planView(product, top.plan, top.sub.source === 'trial' ? 'trial' : 'active', top.sub.endsAt, unionEntitlements(covering), false),
    };
  }
  const ended = state.lastEndedByScope[product];
  if (ended && ended.sub.endsAt.getTime() + GRACE_MS > now.getTime()) {
    return {
      contributors: [ended],
      plan: planView(
        product,
        ended.plan,
        'grace',
        new Date(ended.sub.endsAt.getTime() + GRACE_MS),
        resolveEntitlements(ended.plan.entitlements),
        false,
      ),
    };
  }
  // نام پلن پایه می‌ماند ولی سقف‌ها به مقدار پیش‌فرض برمی‌گردند.
  return { contributors: [], plan: planView(product, base, 'limited', null, resolveEntitlements({}), true) };
}

/**
 * پلن مؤثر tenant با مدل محصول‌محور (§9.11): هر محصول پلن خودش را دارد و سقف‌های اشتراک‌های هم‌زمان با هم جمع
 * می‌شوند (هیچ خریدی سقف محصول دیگر را صفر نمی‌کند). فیلدهای سطح بالا «پلن برتر» را برای عنوان/سازگاری می‌دهند و
 * `scopes` + `activePlans` تصویر کامل هر محصول است. `expired` فقط وقتی true است که هیچ دامنه‌ای فعال/مهلت نباشد.
 */
export async function resolvePlan(tx: Db, tenantId: string, now: Date): Promise<ResolvedPlan> {
  const state = await tenantState(tx, tenantId, now);
  const base = await basePlan(tx);
  const resolutions = {} as Record<ProductScope, ScopeResolution>;
  for (const product of PRODUCT_SCOPES) resolutions[product] = resolveScope(state, product, base, now);
  const scopes = {} as Record<ProductScope, ScopedPlan>;
  for (const product of PRODUCT_SCOPES) scopes[product] = resolutions[product].plan;
  const activePlans = PRODUCT_SCOPES.map((p) => scopes[p]).filter((p) => p.status !== 'limited');

  const seen = new Map<string, SubscriptionEntry>();
  for (const product of PRODUCT_SCOPES) for (const entry of resolutions[product].contributors) seen.set(entry.sub.id, entry);
  const entitlements = unionEntitlements([...seen.values()]);

  const primaryProduct = state.currents[0] ? PRODUCT_SCOPES.find((p) => planCovers(state.currents[0]!.plan.scope, p)) : undefined;
  const primary = primaryProduct
    ? scopes[primaryProduct]
    : [...activePlans].sort((a, b) => (b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0))[0];
  if (primary) {
    return {
      planId: primary.planId,
      code: primary.code,
      name: primary.name,
      rank: primary.rank,
      status: primary.status,
      endsAt: primary.endsAt,
      entitlements,
      expired: false,
      scopes,
      activePlans,
    };
  }
  return {
    planId: base.id,
    code: base.code,
    name: base.name,
    rank: base.rank,
    status: 'limited',
    endsAt: null,
    entitlements,
    expired: true,
    scopes,
    activePlans,
  };
}

export interface Quote {
  planId: string;
  months: number;
  kind: PaymentKind;
  startsAt: Date;
  endsAt: Date;
  /** روزهای باقی‌مانده‌ی دوره‌ی رایگان که به انتهای این اشتراک اضافه می‌شود (۰ ← خارج از دوره‌ی رایگان). */
  trialCarryDays: number;
  subtotalRial: number;
  creditRial: number;
  discountRial: number;
  vatPercent: number;
  vatRial: number;
  totalRial: number;
  /** کد تخفیف اعمال‌شده (`couponCode` همان‌طور که در DB است). */
  couponId: string | null;
  couponCode: string | null;
}

export type CouponRow = typeof billingCoupons.$inferSelect;

/** کد ورودی کاربر ← قالب ذخیره‌شده (حروف بزرگ، بدون فاصله). */
export const normalizeCouponCode = (raw: string) => raw.trim().toUpperCase();

/**
 * کد تخفیف همان کدی که کاربر وارد کرده؛ policy «billing_coupons_lookup_select» فقط همین ردیف را نشان می‌دهد
 * (فهرست‌گیری کدها ممکن نیست).
 */
export async function findCoupon(tx: Db, raw: string): Promise<CouponRow | null> {
  const code = normalizeCouponCode(raw);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return null;
  await tx.execute(sql`SELECT set_config('app.coupon_code', ${code}, true)`);
  const [row] = await tx.select().from(billingCoupons).where(eq(billingCoupons.code, code)).limit(1);
  return row ?? null;
}

/**
 * اعتبار کد برای این خرید و مبلغ تخفیف روی `base` (= مبلغ پلن − اعتبار ارتقا؛ مالیات بعد از تخفیف). سقف‌ها فقط
 * پرداخت‌های paid را می‌شمارند (docs/architecture.md §9.11، ۱۱.۷).
 */
export async function couponDiscount(tx: Db, coupon: CouponRow | null, tenantId: string, planId: string, base: number, now: Date): Promise<number> {
  if (!coupon || !coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt <= now)) {
    throw new UnprocessableEntityException('coupon_invalid');
  }
  if (coupon.planIds.length && !coupon.planIds.includes(planId)) throw new UnprocessableEntityException('coupon_not_for_plan');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new ConflictException('coupon_exhausted');
  if (coupon.maxUsesPerTenant !== null) {
    const [used] = await tx
      .select({ n: count() })
      .from(billingPayments)
      .where(and(eq(billingPayments.tenantId, tenantId), eq(billingPayments.couponId, coupon.id), eq(billingPayments.status, 'paid')));
    if (Number(used?.n ?? 0) >= coupon.maxUsesPerTenant) throw new ConflictException('coupon_used');
  }
  const discount = coupon.kind === 'percent' ? Math.floor((base * coupon.amount) / 100) : coupon.amount;
  return Math.min(base, discount);
}

/** ارزش باقی‌مانده‌ی اشتراک جاری (فقط پرداختی؛ دستی و آزمایشی اعتبار ندارند). */
async function remainingCredit(tx: Db, sub: SubscriptionRow, now: Date): Promise<number> {
  if (sub.source !== 'payment' || !sub.paymentId) return 0;
  const [payment] = await tx.select().from(billingPayments).where(eq(billingPayments.id, sub.paymentId)).limit(1);
  if (!payment) return 0;
  const value = payment.subtotalRial - payment.discountRial;
  const total = sub.endsAt.getTime() - sub.startsAt.getTime();
  const left = Math.max(0, sub.endsAt.getTime() - Math.max(now.getTime(), sub.startsAt.getTime()));
  return Math.floor((value * left) / total);
}

export interface PlanPriceItem {
  months: number;
  priceRial: number;
  discountPercent?: number;
}

/** یافتن قیمت دوره: اگر مساوی باشد برمی‌گرداند؛ برای دوره‌های سالانه مضرب ۱۲ (تا ۶۰ ماه / ۵ سال) بر اساس قیمت ۱۲ ماهه محاسبه می‌شود. */
export function findPlanPrice(prices: PlanPriceItem[], months: number): PlanPriceItem | undefined {
  const direct = prices.find((p) => p.months === months);
  if (direct) return direct;
  if (months > 12 && months % 12 === 0 && months <= 60) {
    const yearly = prices.find((p) => p.months === 12);
    if (yearly) {
      const years = months / 12;
      return {
        months,
        priceRial: yearly.priceRial * years,
        ...(yearly.discountPercent ? { discountPercent: yearly.discountPercent } : {}),
      };
    }
  }
  return undefined;
}

interface ChangeContext {
  /** دوره‌ی رایگان هم‌پوشان با پلن هدف (اگر رزروی پشتش نباشد) که با این خرید تمام می‌شود. */
  trial: SubscriptionRow | null;
  /** اشتراک‌های جاری هم‌پوشان با پلن هدف (bundle با همه هم‌پوشان است). */
  overlapping: SubscriptionEntry[];
  /** از میان هم‌پوشان‌ها، آن‌هایی که این خرید واقعاً جایگزینشان می‌شود (هم‌دامنه؛ پلن bundle همه را). */
  releasable: SubscriptionEntry[];
  overlappingQueued: SubscriptionEntry[];
  releasableQueued: SubscriptionEntry[];
  upgrade: boolean;
  /** پایان زنجیره‌ی رزروهای هم‌پوشان (یا پایان اشتراک جاری، یا الان). */
  chainEnd: Date;
}

/**
 * تصمیم خرید بر مبنای دامنه (§9.11): ارتقا/تمدید/رزرو فقط بین پلن‌هایی که روی هم می‌افتند معنا دارد. خرید محصول
 * دیگر جایگزین نمی‌شود، پس اگر پلن فعال فعلی آن دامنه را پوشش ندهد `addon` (هم‌زمان) است، نه ارتقا و نه صف.
 */
function changeContext(state: TenantBillingState, plan: PlanRow, now: Date): ChangeContext {
  const overlaps = (entry: SubscriptionEntry) => planScopesOverlap(entry.plan.scope, plan.scope);
  const replaces = (entry: SubscriptionEntry) => plan.scope === 'bundle' || entry.plan.scope === plan.scope;
  const overlapping = state.currents.filter(overlaps);
  const overlappingQueued = state.queued.filter(overlaps);
  const maxRank = overlapping.reduce((max, entry) => Math.max(max, entry.plan.rank), Number.NEGATIVE_INFINITY);
  const chainEnd = overlappingQueued.length
    ? overlappingQueued[overlappingQueued.length - 1]!.sub.endsAt
    : overlapping.length
      ? new Date(Math.max(...overlapping.map((entry) => entry.sub.endsAt.getTime())))
      : now;
  const trialEntry = overlapping.find((entry) => entry.sub.source === 'trial');
  return {
    trial: trialEntry && overlappingQueued.length === 0 ? trialEntry.sub : null,
    overlapping,
    releasable: overlapping.filter(replaces),
    overlappingQueued,
    releasableQueued: overlappingQueued.filter(replaces),
    upgrade: overlapping.length > 0 && plan.rank > maxRank,
    chainEnd,
  };
}

/**
 * قیمت خرید پلن `planId` برای `months` ماه در لحظه‌ی `now`: ارتقا (rank بالاتر) در همان دامنه از الان با اعتبار
 * روزهای باقی‌مانده؛ همان دامنه از پایان دوره‌ی جاری (queued)؛ افزودنی برای دامنه‌ی تازه (addon)؛ بدون اشتراک
 * جاری از الان. `priceOverride` فقط برای ثبت پرداخت آفلاین ادمین.
 */
export async function quote(
  tx: Db,
  tenantId: string,
  planId: string,
  months: number,
  now: Date,
  opts: { priceOverride?: number; allowInactive?: boolean; couponCode?: string } = {},
): Promise<Quote> {
  const [plan] = await tx.select().from(billingPlans).where(eq(billingPlans.id, planId)).limit(1);
  if (!plan) throw new NotFoundException('plan_not_found');
  if (!plan.active && !opts.allowInactive) throw new ConflictException('plan_inactive');
  const priceItem =
    opts.priceOverride !== undefined ? { months, priceRial: opts.priceOverride } : findPlanPrice(plan.prices, months);
  if (priceItem === undefined) throw new UnprocessableEntityException('period_not_available');

  const rawPrice = priceItem.priceRial;
  const planDiscountRial =
    priceItem.discountPercent && priceItem.discountPercent > 0
      ? Math.round((rawPrice * priceItem.discountPercent) / 100)
      : 0;
  const baseAfterPlanDiscount = rawPrice - planDiscountRial;

  const state = await tenantState(tx, tenantId, now);
  const ctx = changeContext(state, plan, now);

  let kind: PaymentKind = 'purchase';
  let startsAt = now;
  let creditRial = 0;
  // روزهای باقی‌مانده‌ی دوره‌ی رایگان به انتهای اشتراک خریده‌شده اضافه می‌شود تا خرید زودهنگام چیزی از کاربر نگیرد.
  let trialCarryMs = 0;

  if (ctx.trial) {
    // خرید در دوره‌ی رایگان همان لحظه فعال می‌شود (نه رزرو بعد از آن)، تا امکانات پولی مثل ایندکس گوگل فوراً باز شود.
    kind = ctx.upgrade ? 'upgrade' : 'purchase';
    startsAt = now;
    trialCarryMs = Math.max(0, ctx.trial.endsAt.getTime() - now.getTime());
  } else if (ctx.upgrade && ctx.releasable.length) {
    kind = 'upgrade';
    startsAt = now;
    let totalCredit = 0;
    for (const entry of [...ctx.releasable, ...ctx.releasableQueued]) {
      totalCredit += await remainingCredit(tx, entry.sub, now);
    }
    creditRial = Math.min(baseAfterPlanDiscount, totalCredit);
  } else if (ctx.overlappingQueued.length) {
    kind = 'queued';
    startsAt = ctx.chainEnd;
  } else if (ctx.releasable.length) {
    kind = 'queued';
    // رزرو بعدی از انتهای آخرین رزرو موجود (یا پایان دوره اشتراک جاری) آغاز می‌شود
    startsAt = ctx.chainEnd;
  } else if (state.currents.length) {
    // محصول دیگری فعال است و این پلن دامنه‌ی تازه‌ای می‌آورد: هم‌زمان افزوده می‌شود، هیچ‌چیز کوتاه/جایگزین نمی‌شود.
    kind = 'addon';
    startsAt = now;
  }
  const vat = opts.priceOverride !== undefined ? 0 : await vatPercent(tx);
  const coupon = opts.couponCode?.trim() ? await findCoupon(tx, opts.couponCode) : null;
  const couponDiscountRial = opts.couponCode?.trim()
    ? await couponDiscount(tx, coupon, tenantId, planId, baseAfterPlanDiscount - creditRial, now)
    : 0;
  const totalDiscountRial = planDiscountRial + couponDiscountRial;
  const taxable = rawPrice - creditRial - totalDiscountRial;
  const vatRial = Math.round((taxable * vat) / 100);
  return {
    planId,
    months,
    kind,
    startsAt,
    endsAt: new Date(startsAt.getTime() + months * MONTH_MS + trialCarryMs),
    trialCarryDays: Math.ceil(trialCarryMs / DAY_MS),
    subtotalRial: rawPrice,
    creditRial,
    discountRial: totalDiscountRial,
    vatPercent: vat,
    vatRial,
    totalRial: taxable + vatRial,
    couponId: coupon?.id ?? null,
    couponCode: coupon?.code ?? null,
  };
}

/**
 * فعال‌سازی پرداخت تأییدشده (پرداخت باید همین الان در tx به `paid` رفته باشد): بازه دوباره با `now`
 * محاسبه می‌شود (ممکن است دقایقی از quote گذشته باشد)؛ ارتقا فقط اشتراک‌های هم‌دامنه را در `now` کوتاه می‌کند و
 * خرید محصول دیگر (`addon`) هیچ اشتراکی را دست نمی‌زند (§9.11).
 */
export async function activatePayment(
  tx: Db,
  payment: typeof billingPayments.$inferSelect,
  now: Date,
  createdBy: string | null,
): Promise<SubscriptionRow> {
  const [plan] = await tx.select().from(billingPlans).where(eq(billingPlans.id, payment.planId)).limit(1);
  if (!plan) throw new NotFoundException('plan_not_found');
  const state = await tenantState(tx, payment.tenantId, now);
  const ctx = changeContext(state, plan, now);
  let startsAt = now;
  // خرید در دوره‌ی رایگان (quote: purchase یا upgrade از الان): دوره‌ی رایگان همین لحظه تمام و باقی‌مانده‌اش به
  // انتهای اشتراک اضافه می‌شود. رزرو (queued) قدیمی از پیش از این قاعده همان رفتار قبلی را دارد.
  const trial = payment.kind === 'queued' ? null : ctx.trial;
  const trialCarryMs = trial ? Math.max(0, trial.endsAt.getTime() - now.getTime()) : 0;
  if (trial) {
    await tx.update(billingSubscriptions).set({ endsAt: now }).where(eq(billingSubscriptions.id, trial.id));
  }
  if (payment.kind === 'queued') startsAt = ctx.chainEnd;
  if (payment.kind === 'upgrade') {
    for (const entry of ctx.releasable) {
      if (entry.sub.id === trial?.id) continue;
      await tx.update(billingSubscriptions).set({ endsAt: now }).where(eq(billingSubscriptions.id, entry.sub.id));
    }
    // رزروهای هم‌دامنه‌ی قبلی لغو می‌شوند تا رتبه پایین‌تر/بعدی جای ارتقا را نگیرد (رزرو محصول دیگر دست‌نخورده می‌ماند).
    for (const entry of ctx.releasableQueued) {
      await tx.update(billingSubscriptions).set({ canceledAt: now }).where(eq(billingSubscriptions.id, entry.sub.id));
    }
  }
  const [sub] = await tx
    .insert(billingSubscriptions)
    .values({
      tenantId: payment.tenantId,
      planId: payment.planId,
      source: 'payment',
      paymentId: payment.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + payment.months * MONTH_MS + trialCarryMs),
      createdBy,
    })
    .returning();
  if (payment.couponId) {
    // فقط پرداخت موفق مصرف کد است؛ policy «billing_coupons_usage_*» فقط همین ردیف را باز می‌کند.
    await tx.execute(sql`SELECT set_config('app.coupon_id', ${payment.couponId}, true)`);
    await tx.update(billingCoupons).set({ usedCount: sql`${billingCoupons.usedCount} + 1` }).where(eq(billingCoupons.id, payment.couponId));
  }
  return sub!;
}

/**
 * دوره‌ی رایگان در اولین ورود، روی پلن و به طولی که ادمین تنظیم کرده (`trialSettings`؛ پیش‌فرض پلن پایه، ۱۴ روز):
 * یک بار برای هر کاربر (نه هر tenant، تا با فضای تازه تکرار نشود) و فقط برای دامنه‌ای که هنوز اشتراک/رزرو ندارد —
 * داشتن پلن یک محصول دیگر مانع دوره‌ی رایگان محصول تازه نیست. ثبت مصرف در همان تراکنش است، پس شکست اشتراک آن را
 * مصرف نمی‌کند. طول ۰ ← `trial_disabled` و مصرف نمی‌شود.
 */
export async function startTrial(tx: Db, tenantId: string, userId: string, now: Date): Promise<SubscriptionRow> {
  const { plan, days } = await trialSettings(tx);
  if (days <= 0) throw new ConflictException('trial_disabled');
  const state = await tenantState(tx, tenantId, now);
  if (state.trialUsed) throw new ConflictException('trial_used');
  const scopeTaken = [...state.currents, ...state.queued].some((entry) => planScopesOverlap(entry.plan.scope, plan.scope));
  if (scopeTaken) throw new ConflictException('subscription_exists');
  const [claimed] = await tx
    .update(platformUsers)
    .set({ trialUsedAt: now })
    .where(and(eq(platformUsers.id, userId), isNull(platformUsers.trialUsedAt)))
    .returning({ id: platformUsers.id });
  if (!claimed) throw new ConflictException('trial_used');
  const [sub] = await tx
    .insert(billingSubscriptions)
    .values({ tenantId, planId: plan.id, source: 'trial', startsAt: now, endsAt: new Date(now.getTime() + days * DAY_MS), createdBy: userId })
    .returning();
  return sub!;
}

/** اشتراک‌ها و پرداخت‌های یک tenant برای نمایش (جدیدترین اول). */
export async function tenantHistory(tx: Db, tenantId: string) {
  const subscriptions = await tx
    .select({
      id: billingSubscriptions.id,
      planId: billingSubscriptions.planId,
      planName: billingPlans.name,
      planScope: billingPlans.scope,
      source: billingSubscriptions.source,
      startsAt: billingSubscriptions.startsAt,
      endsAt: billingSubscriptions.endsAt,
      paymentId: billingSubscriptions.paymentId,
      note: billingSubscriptions.note,
      canceledAt: billingSubscriptions.canceledAt,
      createdAt: billingSubscriptions.createdAt,
    })
    .from(billingSubscriptions)
    .innerJoin(billingPlans, eq(billingPlans.id, billingSubscriptions.planId))
    .where(eq(billingSubscriptions.tenantId, tenantId))
    .orderBy(desc(billingSubscriptions.startsAt))
    .limit(100);
  const payments = await paymentsQuery(tx).where(eq(billingPayments.tenantId, tenantId)).orderBy(desc(billingPayments.createdAt)).limit(100);
  return { subscriptions, payments };
}

export function paymentsQuery(tx: Db) {
  return tx
    .select({
      id: billingPayments.id,
      tenantId: billingPayments.tenantId,
      tenantName: tenants.name,
      number: billingPayments.number,
      planId: billingPayments.planId,
      planName: billingPlans.name,
      planScope: billingPlans.scope,
      months: billingPayments.months,
      kind: billingPayments.kind,
      subtotalRial: billingPayments.subtotalRial,
      creditRial: billingPayments.creditRial,
      discountRial: billingPayments.discountRial,
      vatPercent: billingPayments.vatPercent,
      vatRial: billingPayments.vatRial,
      totalRial: billingPayments.totalRial,
      status: billingPayments.status,
      gateway: billingPayments.gateway,
      refId: billingPayments.refId,
      cardPan: billingPayments.cardPan,
      note: billingPayments.note,
      createdAt: billingPayments.createdAt,
      paidAt: billingPayments.paidAt,
    })
    .from(billingPayments)
    .innerJoin(billingPlans, eq(billingPlans.id, billingPayments.planId))
    .innerJoin(tenants, eq(tenants.id, billingPayments.tenantId))
    .$dynamic();
}

/** لغو رزرو اشتراک زمان‌بندی‌شده (آتی). */
export async function cancelQueuedSubscription(
  tx: Db,
  tenantId: string,
  subId: string,
  now: Date,
): Promise<void> {
  const [sub] = await tx
    .select()
    .from(billingSubscriptions)
    .where(
      and(
        eq(billingSubscriptions.id, subId),
        eq(billingSubscriptions.tenantId, tenantId),
        isNull(billingSubscriptions.canceledAt),
      ),
    )
    .limit(1);
  if (!sub) throw new NotFoundException('subscription_not_found');
  // بازپرداخت نداریم (§9.11)، پس دوره‌ی پرداخت‌شده با لغو فقط از دست می‌رود؛ لغو آن فقط از مدیریت پلتفرم است.
  if (sub.source === 'payment') throw new ConflictException('paid_reservation');
  if (sub.startsAt <= now) {
    throw new BadRequestException('cannot_cancel_active_subscription');
  }
  await tx
    .update(billingSubscriptions)
    .set({ canceledAt: now })
    .where(eq(billingSubscriptions.id, sub.id));
}

