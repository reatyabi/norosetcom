import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'disabled', 'blocked']);
/** نقش سطح پلتفرم، مستقل از نقش عضویت tenant (docs/architecture.md §9.11). */
export const platformRole = pgEnum('platform_role', ['user', 'superadmin']);
export const tenantStatus = pgEnum('tenant_status', ['active', 'suspended']);
export const membershipRole = pgEnum('membership_role', ['owner', 'admin', 'member']);
export const membershipStatus = pgEnum('membership_status', ['active', 'invited', 'suspended']);

export const platformUsers = pgTable(
  'platform_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mobile: varchar('mobile', { length: 20 }).unique(),
    email: varchar('email', { length: 320 }).unique(),
    fullName: varchar('full_name', { length: 200 }).notNull().default(''),
    /** هش scrypt (قالب در @noroset/core password.ts)؛ null یعنی فقط ورود با OTP. */
    passwordHash: text('password_hash'),
    /** آواتار در فضای شخصی norofile (uuid ساده بدون FK؛ docs/architecture.md §7، §9.9). */
    avatarFileId: uuid('avatar_file_id'),
    status: userStatus('status').notNull().default('active'),
    /** دلیل مدیر پلتفرم برای disabled/blocked (برای active null). */
    statusReason: varchar('status_reason', { length: 500 }),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    platformRole: platformRole('platform_role').notNull().default('user'),
    /** first-touch UTM هنگام ثبت‌نام (`{source, medium, campaign, content, term}`؛ §9.11). */
    signupUtm: jsonb('signup_utm'),
    /** زمان مصرف ۱۴ روز رایگان پلن پایه؛ برای هر کاربر فقط یک بار (§9.11). */
    trialUsedAt: timestamp('trial_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('platform_users_mobile_or_email', sql`${t.mobile} IS NOT NULL OR ${t.email} IS NOT NULL`),
    index('platform_users_created_at_idx').on(t.createdAt),
  ],
);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    status: tenantStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tenants_slug_pattern', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('tenants_slug_length', sql`char_length(${t.slug}) BETWEEN 2 AND 64`),
  ],
);

export const reservedSlugs = pgTable('reserved_slugs', {
  slug: varchar('slug', { length: 64 }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    role: membershipRole('role').notNull().default('member'),
    status: membershipStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tenant_memberships_tenant_user_uniq').on(t.tenantId, t.userId),
    uniqueIndex('tenant_memberships_id_tenant_uniq').on(t.id, t.tenantId),
    index('tenant_memberships_user_id_idx').on(t.userId),
  ],
);

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mobile: varchar('mobile', { length: 20 }).notNull(),
    codeHash: varchar('code_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('otp_codes_mobile_created_idx').on(t.mobile, t.createdAt)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    rotatedFrom: uuid('rotated_from'),
    userAgent: text('user_agent'),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

/**
 * دسترسی پشتیبانی (ورود ادمین به حساب کاربر؛ docs/architecture.md §9.11). ادمین با دلیل و مدت
 * محدود می‌سازد؛ فقط hash توکن یک‌بارمصرف ذخیره می‌شود. RLS + FORCE (در migration): ادمین، خود
 * کاربر (برای دیدن و ابطال) و مسیر بررسی نشست (`app.support_grant_id`، فقط همان یک ردیف).
 */
export const supportAccessGrants = pgTable(
  'support_access_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => platformUsers.id),
    reason: varchar('reason', { length: 500 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    /** پایان دسترسی: هم مهلت مصرف لینک و هم پایان نشست پشتیبانی. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: varchar('revoked_by', { length: 16 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('support_access_grants_user_idx').on(t.userId, t.createdAt),
    index('support_access_grants_admin_idx').on(t.adminUserId, t.createdAt),
    check('support_access_grants_reason_not_empty', sql`char_length(${t.reason}) > 0`),
    check(
      'support_access_grants_revoked_by',
      sql`(${t.revokedAt} IS NULL AND ${t.revokedBy} IS NULL) OR (${t.revokedAt} IS NOT NULL AND ${t.revokedBy} IN ('admin', 'user'))`,
    ),
  ],
);


// noroform (جدول‌های محصول، با پیشوند noroform_)
export * from './noroform.schema';

// norolink (جدول‌های محصول، با پیشوند norolink_)
export * from './norolink.schema';

// norofile (جدول‌های محصول، با پیشوند norofile_)
export * from './norofile.schema';

// admin (مدیریت پلتفرم، با پیشوند admin_)
export * from './admin.schema';

// billing (پلن، اشتراک، پرداخت؛ مالک: ماژول admin)
export * from './billing.schema';

// کمپین‌ها (کد تخفیف، اعلان پنل؛ مالک: ماژول admin)
export * from './campaigns.schema';

// بلاگ (مقاله، دسته، برچسب، نظر؛ مالک: محصول blog)
export * from './blog.schema';
