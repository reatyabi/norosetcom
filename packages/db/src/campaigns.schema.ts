import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { platformUsers } from './schema';

// کمپین‌ها (docs/architecture.md §9.11، مرحله‌ی ۱۱.۷) — مالک: ماژول admin. سطح پلتفرم با RLS + FORCE (در migration):
// کد تخفیف فقط با همان کد (یا شناسه) دیده می‌شود؛ اعلان فعال برای همه خواندنی؛ بستن اعلان به‌ازای کاربر.

export const couponKind = pgEnum('coupon_kind', ['percent', 'fixed']);
export const announcementTone = pgEnum('announcement_tone', ['info', 'warning', 'success']);
export const announcementAudience = pgEnum('announcement_audience', ['all_members', 'managers']);
export const announcementTarget = pgEnum('announcement_target', ['all', 'plans', 'tenants']);

export const billingCoupons = pgTable(
  'billing_coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** حروف بزرگ انگلیسی، عدد، `-` و `_`. */
    code: varchar('code', { length: 32 }).notNull().unique(),
    description: varchar('description', { length: 300 }).notNull().default(''),
    kind: couponKind('kind').notNull(),
    /** percent: ۱ تا ۱۰۰؛ fixed: ریال. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    /** سقف کل پرداخت‌های موفق (null = نامحدود). */
    maxUses: integer('max_uses'),
    /** سقف هر فضای کاری (null = نامحدود). */
    maxUsesPerTenant: integer('max_uses_per_tenant').default(1),
    /** پلن‌های مجاز (آرایه‌ی uuid؛ خالی = همه). */
    planIds: jsonb('plan_ids').$type<string[]>().notNull().default([]),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    /** شمار پرداخت‌های موفق (هنگام فعال‌سازی پرداخت افزایش می‌یابد). */
    usedCount: integer('used_count').notNull().default(0),
    createdBy: uuid('created_by').references(() => platformUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('billing_coupons_code_pattern', sql`${t.code} ~ '^[A-Z0-9_-]{3,32}$'`),
    check('billing_coupons_amount', sql`${t.amount} > 0 AND (${t.kind} = 'fixed' OR ${t.amount} <= 100)`),
    check('billing_coupons_caps', sql`(${t.maxUses} IS NULL OR ${t.maxUses} > 0) AND (${t.maxUsesPerTenant} IS NULL OR ${t.maxUsesPerTenant} > 0)`),
    check('billing_coupons_window', sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
    check('billing_coupons_plan_ids_array', sql`jsonb_typeof(${t.planIds}) = 'array'`),
    check('billing_coupons_used_count', sql`${t.usedCount} >= 0`),
  ],
);

export const panelAnnouncements = pgTable(
  'panel_announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 120 }).notNull(),
    body: varchar('body', { length: 1000 }).notNull().default(''),
    /** https یا مسیر داخلی پنل (`/billing`). */
    linkUrl: varchar('link_url', { length: 500 }),
    linkLabel: varchar('link_label', { length: 40 }),
    tone: announcementTone('tone').notNull().default('info'),
    audience: announcementAudience('audience').notNull().default('all_members'),
    targetType: announcementTarget('target_type').notNull().default('all'),
    /** plans: کد پلن‌ها (`basic`)؛ tenants: شناسه‌ی فضاهای کاری. */
    targetIds: jsonb('target_ids').$type<string[]>().notNull().default([]),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    createdBy: uuid('created_by').references(() => platformUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('panel_announcements_window_idx').on(t.active, t.startsAt),
    check('panel_announcements_title_not_empty', sql`char_length(${t.title}) > 0`),
    check('panel_announcements_window', sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
    check('panel_announcements_target_ids_array', sql`jsonb_typeof(${t.targetIds}) = 'array'`),
    check('panel_announcements_link', sql`${t.linkUrl} IS NULL OR ${t.linkUrl} ~ '^(https://|/[^/])'`),
  ],
);

export const panelAnnouncementDismissals = pgTable(
  'panel_announcement_dismissals',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => panelAnnouncements.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.announcementId] })],
);
