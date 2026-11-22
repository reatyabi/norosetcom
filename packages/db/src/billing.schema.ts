import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { billingCoupons } from './campaigns.schema';
import { platformUsers, tenants } from './schema';

// billing (docs/architecture.md §9.11، مرحله‌ی ۱۱.۶) — مالک: ماژول admin. پلن‌ها و تنظیمات سطح پلتفرم‌اند
// (خواندن برای همه، نوشتن فقط ادمین)؛ اشتراک‌ها و پرداخت‌ها tenant-scoped با RLS + FORCE (در migration).
// مبلغ‌ها ریال (bigint؛ نمایش تومان).

export const billingSubscriptionSource = pgEnum('billing_subscription_source', ['payment', 'manual', 'trial']);
/** دامنه‌ی محصولی پلن (docs/architecture.md §9.11): خرید هر محصول مستقل و افزایشی است؛ bundle همه را می‌پوشاند. */
export const billingPlanScope = pgEnum('billing_plan_scope', ['norolink', 'noroform', 'norofile', 'bundle']);
/**
 * purchase: شروع از الان (اولین اشتراک همان دامنه یا دوره‌ی رایگان)؛ upgrade: پلن بالاتر در همان دامنه با اعتبار؛
 * queued: از پایان دوره‌ی جاری همان دامنه؛ addon: افزودنیِ هم‌زمان برای محصولی که پلن فعالش دامنه را پوشش نمی‌دهد.
 */
export const billingPaymentKind = pgEnum('billing_payment_kind', ['purchase', 'upgrade', 'queued', 'addon']);
export const billingPaymentStatus = pgEnum('billing_payment_status', ['pending', 'paid', 'failed', 'canceled']);

export interface PlanPrice {
  months: number;
  priceRial: number;
  discountPercent?: number;
}

export const billingPlans = pgTable(
  'billing_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** شناسه‌ی پایدار (`basic`، `pro`). */
    code: varchar('code', { length: 32 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }).notNull().default(''),
    /** ترتیب پلن‌ها؛ rank بالاتر = ارتقا. */
    rank: integer('rank').notNull(),
    /** محصول پلن (`norolink` | `noroform` | `norofile` | `bundle`)؛ migration `0027`. */
    scope: billingPlanScope('scope').notNull().default('bundle'),
    /** فقط پلن فعال قابل خرید است. */
    active: boolean('active').notNull().default(false),
    /** مقدار کلیدهای ENTITLEMENTS (core)؛ کلید بی‌مقدار ← مقدار پیش‌فرض همان کلید. */
    entitlements: jsonb('entitlements').notNull().default({}),
    /** دوره‌های آزاد: `[{months, priceRial}]`. */
    prices: jsonb('prices').$type<PlanPrice[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('billing_plans_code_pattern', sql`${t.code} ~ '^[a-z][a-z0-9_]*$'`),
    check('billing_plans_entitlements_object', sql`jsonb_typeof(${t.entitlements}) = 'object'`),
    check('billing_plans_prices_array', sql`jsonb_typeof(${t.prices}) = 'array'`),
  ],
);

export const billingSettings = pgTable(
  'billing_settings',
  {
    id: smallint('id').primaryKey().default(1),
    vatPercent: integer('vat_percent').notNull().default(10),
    /** پلن دوره‌ی رایگان کاربر تازه (migration `0025`)؛ null ← پلن پایه (`basic`). */
    trialPlanId: uuid('trial_plan_id').references(() => billingPlans.id, { onDelete: 'set null' }),
    /** طول دوره‌ی رایگان به روز؛ ۰ ← بدون دوره‌ی رایگان. */
    trialDays: integer('trial_days').notNull().default(14),
    updatedBy: uuid('updated_by').references(() => platformUsers.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('billing_settings_singleton', sql`${t.id} = 1`),
    check('billing_settings_vat_range', sql`${t.vatPercent} BETWEEN 0 AND 100`),
    check('billing_settings_trial_days_range', sql`${t.trialDays} BETWEEN 0 AND 90`),
  ],
);

export const billingPayments = pgTable(
  'billing_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** شماره‌ی رسید (ترتیبی در کل پلتفرم). */
    number: bigserial('number', { mode: 'number' }).notNull().unique(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => billingPlans.id),
    months: integer('months').notNull(),
    kind: billingPaymentKind('kind').notNull(),
    subtotalRial: bigint('subtotal_rial', { mode: 'number' }).notNull(),
    creditRial: bigint('credit_rial', { mode: 'number' }).notNull().default(0),
    discountRial: bigint('discount_rial', { mode: 'number' }).notNull().default(0),
    /** کد تخفیف استفاده‌شده (فقط پرداخت paid در سقف‌ها شمرده می‌شود). */
    couponId: uuid('coupon_id').references(() => billingCoupons.id),
    vatPercent: integer('vat_percent').notNull(),
    vatRial: bigint('vat_rial', { mode: 'number' }).notNull(),
    totalRial: bigint('total_rial', { mode: 'number' }).notNull(),
    status: billingPaymentStatus('status').notNull().default('pending'),
    /** `zarinpal` | `fake` | `manual` (ثبت آفلاین ادمین). */
    gateway: varchar('gateway', { length: 16 }).notNull(),
    authority: varchar('authority', { length: 64 }).unique(),
    refId: varchar('ref_id', { length: 64 }),
    cardPan: varchar('card_pan', { length: 32 }),
    note: varchar('note', { length: 500 }),
    createdBy: uuid('created_by').references(() => platformUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [
    index('billing_payments_tenant_created_idx').on(t.tenantId, t.createdAt),
    uniqueIndex('billing_payments_id_tenant_uniq').on(t.id, t.tenantId),
    check('billing_payments_months_positive', sql`${t.months} > 0`),
    check('billing_payments_amounts', sql`${t.subtotalRial} >= 0 AND ${t.creditRial} >= 0 AND ${t.discountRial} >= 0 AND ${t.vatRial} >= 0 AND ${t.totalRial} >= 0`),
    check('billing_payments_total', sql`${t.totalRial} = ${t.subtotalRial} - ${t.creditRial} - ${t.discountRial} + ${t.vatRial}`),
    check('billing_payments_gateway', sql`${t.gateway} IN ('zarinpal', 'fake', 'manual')`),
  ],
);

export const billingSubscriptions = pgTable(
  'billing_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => billingPlans.id),
    source: billingSubscriptionSource('source').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    /** با ارتقا به «الان» کوتاه می‌شود (ارزش باقی‌مانده اعتبار خرید جدید است). */
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    paymentId: uuid('payment_id'),
    note: varchar('note', { length: 500 }),
    createdBy: uuid('created_by').references(() => platformUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
  },
  (t) => [
    index('billing_subscriptions_tenant_period_idx').on(t.tenantId, t.startsAt, t.endsAt),
    uniqueIndex('billing_subscriptions_id_tenant_uniq').on(t.id, t.tenantId),
    uniqueIndex('billing_subscriptions_payment_uniq').on(t.paymentId),
    foreignKey({ columns: [t.paymentId, t.tenantId], foreignColumns: [billingPayments.id, billingPayments.tenantId] }),
    check('billing_subscriptions_period', sql`${t.endsAt} > ${t.startsAt}`),
    check('billing_subscriptions_payment_source', sql`(${t.source} = 'payment') = (${t.paymentId} IS NOT NULL)`),
  ],
);
