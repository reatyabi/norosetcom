import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  type PgTableExtraConfigValue,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { platformUsers, tenants } from './schema';

// noroform (docs/architecture.md §8.1). همه tenant-scoped: tenant_id + RLS + FORCE (در migration)
// و FK مرکب (id, tenant_id) تا ردیف‌ها هرگز به tenant دیگری اشاره نکنند.

export const noroformFormStatus = pgEnum('noroform_form_status', ['draft', 'published', 'closed']);
export const noroformFormChannel = pgEnum('noroform_form_channel', ['internal', 'external']);
export const noroformResponseAccess = pgEnum('noroform_response_access', ['internal', 'external']);
export const noroformResponseAuth = pgEnum('noroform_response_auth', ['link', 'key', 'otp']);

export const noroformForms = pgTable(
  'noroform_forms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    /** slug عمومی؛ در کل پلتفرم یکتا (tenant فرم عمومی از همین پیدا می‌شود) و غیر رزرو. */
    slug: varchar('slug', { length: 64 }).notNull(),
    status: noroformFormStatus('status').notNull().default('draft'),
    /** محل اجرای فرم: داخلی (پنل) یا خارجی (n8f.ir). */
    channel: noroformFormChannel('channel').notNull().default('external'),
    /** دسترسی پیش‌فرض پاسخ‌ها؛ external یعنی لینک مشاهده‌ی پاسخ مجاز است. */
    responseAccess: noroformResponseAccess('response_access').notNull().default('external'),
    /** روش احراز لینک پاسخ؛ تا انتخاب مالک null است و ساخت لینک غیرفعال می‌ماند. */
    responseAuth: noroformResponseAuth('response_auth'),
    /** مدت اعتبار پیش‌فرض لینک پاسخ (روز)؛ هر لینک snapshot خودش را نگه می‌دارد. */
    responseAccessTtlDays: integer('response_access_ttl_days').notNull().default(90),
    draftDefinition: jsonb('draft_definition').notNull(),
    /** سازنده (فیلتر «مالک» در فهرست)؛ ردیف‌های پیش از migration ‏0012 و کاربر حذف‌شده ← null. */
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    /** نسخه‌ی منتشرشده‌ی جاری؛ برای published/closed الزامی. */
    currentVersionId: uuid('current_version_id'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('noroform_forms_slug_uniq').on(t.slug),
    uniqueIndex('noroform_forms_id_tenant_uniq').on(t.id, t.tenantId),
    index('noroform_forms_tenant_created_idx').on(t.tenantId, t.createdAt),
    check('noroform_forms_slug_pattern', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('noroform_forms_slug_length', sql`char_length(${t.slug}) BETWEEN 2 AND 64`),
    check('noroform_forms_draft_is_object', sql`jsonb_typeof(${t.draftDefinition}) = 'object'`),
    check(
      'noroform_forms_published_has_version',
      sql`${t.status} = 'draft' OR ${t.currentVersionId} IS NOT NULL`,
    ),
    foreignKey({
      name: 'noroform_forms_current_version_fk',
      columns: [t.currentVersionId, t.id, t.tenantId],
      foreignColumns: [noroformFormVersions.id, noroformFormVersions.formId, noroformFormVersions.tenantId],
    }),
  ],
);

/** immutable: noroset_app فقط SELECT/INSERT دارد و trigger هر UPDATE را رد می‌کند. */
export const noroformFormVersions = pgTable(
  'noroform_form_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    formId: uuid('form_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    definition: jsonb('definition').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('noroform_form_versions_form_number_uniq').on(t.formId, t.versionNumber),
    uniqueIndex('noroform_form_versions_id_tenant_uniq').on(t.id, t.tenantId),
    uniqueIndex('noroform_form_versions_id_form_tenant_uniq').on(t.id, t.formId, t.tenantId),
    index('noroform_form_versions_tenant_idx').on(t.tenantId),
    check('noroform_form_versions_number_positive', sql`${t.versionNumber} > 0`),
    check('noroform_form_versions_definition_is_object', sql`jsonb_typeof(${t.definition}) = 'object'`),
    foreignKey({
      name: 'noroform_form_versions_form_fk',
      columns: [t.formId, t.tenantId],
      foreignColumns: [noroformForms.id, noroformForms.tenantId],
    }).onDelete('cascade'),
  ],
);

export const noroformSubmissions = pgTable(
  'noroform_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    formId: uuid('form_id').notNull(),
    versionId: uuid('version_id').notNull(),
    /** تخت با کلید field_id؛ مقدارها serializeشده با field-engine. */
    answers: jsonb('answers').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull(),
    /** هش IP (خود IP ذخیره نمی‌شود). */
    ipHash: varchar('ip_hash', { length: 64 }),
    /** پاسخ‌دهنده‌ی داخلی؛ برای پاسخ عمومی null است. */
    submittedBy: uuid('submitted_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('noroform_submissions_form_idempotency_uniq').on(t.formId, t.idempotencyKey),
    uniqueIndex('noroform_submissions_id_tenant_uniq').on(t.id, t.tenantId),
    index('noroform_submissions_tenant_form_created_idx').on(t.tenantId, t.formId, t.createdAt),
    check('noroform_submissions_answers_is_object', sql`jsonb_typeof(${t.answers}) = 'object'`),
    check('noroform_submissions_idempotency_length', sql`char_length(${t.idempotencyKey}) BETWEEN 8 AND 64`),
    foreignKey({
      name: 'noroform_submissions_form_fk',
      columns: [t.formId, t.tenantId],
      foreignColumns: [noroformForms.id, noroformForms.tenantId],
    }).onDelete('cascade'),
    // نسخه باید متعلق به همان فرم و همان tenant باشد.
    foreignKey({
      name: 'noroform_submissions_version_fk',
      columns: [t.versionId, t.formId, t.tenantId],
      foreignColumns: [noroformFormVersions.id, noroformFormVersions.formId, noroformFormVersions.tenantId],
    }).onDelete('cascade'),
  ],
);

/**
 * لینک مشاهده‌ی بیرونی یک پاسخ (docs/routes.md): فقط hash توکن ذخیره می‌شود؛
 * توکن خام یک‌بار در پاسخ API برمی‌گردد. لینک با ابطال/انقضا از دسترسی خارج می‌شود
 * ولی پاسخ همچنان در پنل برای همه‌ی اعضای فضای کاری دیده می‌شود.
 */
export const noroformResponseLinks = pgTable(
  'noroform_response_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    submissionId: uuid('submission_id').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** روش احراز snapshot این لینک؛ تغییر تنظیم فرم روی لینک موجود اثر ندارد. */
    authMode: noroformResponseAuth('auth_mode').notNull().default('link'),
    /** hash کلید دسترسی برای authMode='key' (scrypt؛ هرگز خام ذخیره نمی‌شود). */
    keyHash: varchar('key_hash', { length: 255 }),
    accessCount: integer('access_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('noroform_response_links_token_uniq').on(t.tokenHash),
    index('noroform_response_links_tenant_submission_idx').on(t.tenantId, t.submissionId),
    check('noroform_response_links_token_length', sql`char_length(${t.tokenHash}) = 64`),
    check('noroform_response_links_access_count', sql`${t.accessCount} >= 0`),
    check('noroform_response_links_key_mode', sql`${t.authMode} <> 'key' OR ${t.keyHash} IS NOT NULL`),
    foreignKey({
      name: 'noroform_response_links_submission_fk',
      columns: [t.submissionId, t.tenantId],
      foreignColumns: [noroformSubmissions.id, noroformSubmissions.tenantId],
    }).onDelete('cascade'),
  ],
);

/**
 * کدهای OTP مشاهده‌ی بیرونی پاسخ (جدا از otp_codes ورود). فقط hash کد ذخیره می‌شود؛
 * موبایل برای ممیزی نگه داشته می‌شود. دسترسی فقط از مسیر tenant همان لینک است.
 */
export const noroformResponseOtpCodes = pgTable(
  'noroform_response_otp_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id')
      .notNull()
      .references(() => noroformResponseLinks.id, { onDelete: 'cascade' }),
    mobile: varchar('mobile', { length: 20 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('noroform_response_otp_link_mobile_idx').on(t.linkId, t.mobile, t.createdAt),
    check('noroform_response_otp_code_length', sql`char_length(${t.codeHash}) = 64`),
    check('noroform_response_otp_attempts', sql`${t.attempts} >= 0`),
  ],
);
