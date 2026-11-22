import { sql } from 'drizzle-orm';
import {
  boolean,
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

// norolink (docs/architecture.md §9): سه جدول صفحه، المان، آمار صفحه.
// همه tenant-scoped: tenant_id + RLS + FORCE (در migration).
// تصویر آپلودی جدول جدا ندارد: کلید ذخیره‌ساز S3 در settings المان یا draft_content صفحه است.
// پیش‌نویس = draft_content + ردیف‌های norolink_elements؛ «انتشار» کل صفحه را در published_snapshot
// کپی می‌کند و صفحه‌ی عمومی فقط همان snapshot را می‌خواند (پیش‌نویس هرگز).

export const norolinkPageStatus = pgEnum('norolink_page_status', ['draft', 'published']);
export const norolinkElementKind = pgEnum('norolink_element_kind', [
  'link_button',
  'social_icons',
  'rich_text',
  'image',
  'video_embed',
  'map_embed',
]);
export const norolinkEventKind = pgEnum('norolink_event_kind', ['page_view', 'element_click']);
export const norolinkDeviceType = pgEnum('norolink_device_type', ['mobile', 'tablet', 'desktop', 'other']);
/** کنترل صفحه از سوی مدیریت پلتفرم (docs/architecture.md §9.13؛ migration ‏0026). */
export const norolinkModerationStatus = pgEnum('norolink_moderation_status', ['none', 'delisted', 'warning', 'suspended']);
export const norolinkModerationReason = pgEnum('norolink_moderation_reason', [
  'legal_order',
  'phishing',
  'malware',
  'scam',
  'impersonation',
  'intellectual_property',
  'illegal_content',
  'hate_violence',
  'adult',
  'privacy',
  'spam',
  'other',
]);
export const norolinkReportStatus = pgEnum('norolink_report_status', ['open', 'actioned', 'dismissed']);

export const norolinkPages = pgTable(
  'norolink_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** زیردامنه‌ی عمومی `{slug}.n8l.ir`؛ در کل پلتفرم یکتا و غیر رزرو. */
    slug: varchar('slug', { length: 64 }).notNull(),
    /** چند بار نشانی عوض شده (سقف در norolink/shared؛ نشانی هنگام ساخت حساب نمی‌شود). */
    slugChanges: integer('slug_changes').notNull().default(0),
    title: varchar('title', { length: 200 }).notNull(),
    status: norolinkPageStatus('status').notNull().default('draft'),
    /** { profile, theme, seo, layout } پیش‌نویس. */
    draftContent: jsonb('draft_content').notNull(),
    /** { content, elements[] } آخرین انتشار؛ تنها منبع صفحه‌ی عمومی. */
    publishedSnapshot: jsonb('published_snapshot'),
    /** سازنده (فیلتر «مالک» در فهرست)؛ ردیف‌های پیش از migration ‏0012 و کاربر حذف‌شده ← null. */
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * وضعیت مدیریتی (§9.13)، جدا از status مالک؛ فقط superadmin از مسیر `app.page_moderation` عوضش می‌کند (trigger
     * `guard_norolink_page_moderation`). `moderation_until` گذشته ← بدون محدودیت مؤثر.
     */
    moderationStatus: norolinkModerationStatus('moderation_status').notNull().default('none'),
    moderationReason: norolinkModerationReason('moderation_reason'),
    /** پیام بازدیدکننده و مالک (یادداشت داخلی فقط در لاگ ممیزی). */
    moderationNotice: varchar('moderation_notice', { length: 500 }),
    moderationUntil: timestamp('moderation_until', { withTimezone: true }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norolink_pages_slug_uniq').on(t.slug),
    uniqueIndex('norolink_pages_id_tenant_uniq').on(t.id, t.tenantId),
    index('norolink_pages_tenant_created_idx').on(t.tenantId, t.createdAt),
    check('norolink_pages_slug_pattern', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('norolink_pages_slug_length', sql`char_length(${t.slug}) BETWEEN 2 AND 63`),
    check('norolink_pages_draft_is_object', sql`jsonb_typeof(${t.draftContent}) = 'object'`),
    check(
      'norolink_pages_snapshot_is_object',
      sql`${t.publishedSnapshot} IS NULL OR jsonb_typeof(${t.publishedSnapshot}) = 'object'`,
    ),
    check(
      'norolink_pages_published_has_snapshot',
      sql`${t.status} = 'draft' OR ${t.publishedSnapshot} IS NOT NULL`,
    ),
    check('norolink_pages_moderation_reason', sql`(${t.moderationStatus} = 'none') = (${t.moderationReason} IS NULL)`),
    index('norolink_pages_moderation_idx').on(t.moderationStatus).where(sql`${t.moderationStatus} <> 'none'`),
  ],
);

export const norolinkElements = pgTable(
  'norolink_elements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id').notNull(),
    kind: norolinkElementKind('kind').notNull(),
    /** کلید مرتب‌سازی کسری (fractional index)؛ با COLLATE "C" مرتب شود. */
    sortKey: varchar('sort_key', { length: 64 }).notNull(),
    settings: jsonb('settings').notNull(),
    visible: boolean('visible').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norolink_elements_page_sort_uniq').on(t.pageId, t.sortKey),
    uniqueIndex('norolink_elements_id_tenant_uniq').on(t.id, t.tenantId),
    index('norolink_elements_tenant_page_idx').on(t.tenantId, t.pageId),
    check('norolink_elements_sort_key_pattern', sql`${t.sortKey} ~ '^[0-9A-Za-z]+$'`),
    check('norolink_elements_settings_is_object', sql`jsonb_typeof(${t.settings}) = 'object'`),
    foreignKey({
      name: 'norolink_elements_page_fk',
      columns: [t.pageId, t.tenantId],
      foreignColumns: [norolinkPages.id, norolinkPages.tenantId],
    }).onDelete('cascade'),
  ],
);

/**
 * آمار صفحه: هر بازدید/کلیک یک ردیف خام؛ بدون IP. element_id بدون FK چون snapshot زنده ممکن است
 * المانی را داشته باشد که از پیش‌نویس حذف شده.
 */
export const norolinkPageStats = pgTable(
  'norolink_page_stats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id').notNull(),
    elementId: uuid('element_id'),
    kind: norolinkEventKind('kind').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    /** هش بازدیدکننده با salt روزانه‌ی چرخشی. */
    visitorHash: varchar('visitor_hash', { length: 64 }),
    deviceType: norolinkDeviceType('device_type'),
    os: varchar('os', { length: 32 }),
    browser: varchar('browser', { length: 32 }),
    referrerDomain: varchar('referrer_domain', { length: 253 }),
  },
  (t): PgTableExtraConfigValue[] => [
    index('norolink_page_stats_tenant_page_occurred_idx').on(t.tenantId, t.pageId, t.occurredAt),
    check(
      'norolink_page_stats_element_matches_kind',
      sql`(${t.kind} = 'page_view' AND ${t.elementId} IS NULL) OR (${t.kind} = 'element_click' AND ${t.elementId} IS NOT NULL)`,
    ),
    foreignKey({
      name: 'norolink_page_stats_page_fk',
      columns: [t.pageId, t.tenantId],
      foreignColumns: [norolinkPages.id, norolinkPages.tenantId],
    }).onDelete('cascade'),
  ],
);

export const norolinkTemplateCategory = pgEnum('norolink_template_category', ['personal', 'business', 'creator']);

/**
 * قالب‌های آماده‌ی ساخته‌شده با ادیتور در مدیریت پلتفرم (سطح پلتفرم، بدون tenant). مثل صفحه پیش‌نویس و انتشار دارد و
 * گالری فقط published_snapshot را می‌خواند. RLS: خواندن قالب منتشرشده برای همه، بقیه فقط superadmin (در migration).
 */
export const norolinkTemplates = pgTable(
  'norolink_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 300 }).notNull().default(''),
    category: norolinkTemplateCategory('category').notNull().default('personal'),
    status: norolinkPageStatus('status').notNull().default('draft'),
    /** { profile, theme, seo, layout } پیش‌نویس. */
    draftContent: jsonb('draft_content').notNull(),
    /** المان‌های پیش‌نویس [{ id, kind, settings, visible, sortKey }]. */
    draftElements: jsonb('draft_elements').notNull().default([]),
    /** { content, elements[] } آخرین انتشار؛ تنها منبع گالری. */
    publishedSnapshot: jsonb('published_snapshot'),
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** منسوخ (migration `0023`): لینک‌ها در `norolink_claim_links` هستند؛ برای امکان برگشت به ریلیز قبلی مانده‌اند. */
    claimToken: varchar('claim_token', { length: 64 }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norolink_templates_claim_token_uniq').on(t.claimToken),
    index('norolink_templates_status_created_idx').on(t.status, t.createdAt),
    check('norolink_templates_draft_is_object', sql`jsonb_typeof(${t.draftContent}) = 'object'`),
    check('norolink_templates_elements_is_array', sql`jsonb_typeof(${t.draftElements}) = 'array'`),
    check('norolink_templates_published_has_snapshot', sql`${t.status} = 'draft' OR ${t.publishedSnapshot} IS NOT NULL`),
  ],
);

/**
 * لینک‌های واگذاری صفحه به مشتری (docs/architecture.md §9.8)، هر لینک یک ردیف و سابقه‌اش می‌ماند. سطح پلتفرم (بدون tenant):
 * RLS ادمین، و دارنده‌ی توکن فقط همان لینک فعال را می‌بیند. `slug` نشانی رزروشده برای مشتری است (trigger صفحه‌ها جلوی
 * گرفتنش را می‌گیرد)؛ null فقط برای لینک‌های منتقل‌شده از قبل ← نشانی تصادفی.
 */
export const norolinkClaimLinks = pgTable(
  'norolink_claim_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id').references(() => norolinkTemplates.id, { onDelete: 'set null' }),
    token: varchar('token', { length: 64 }).notNull(),
    slug: varchar('slug', { length: 63 }),
    businessName: varchar('business_name', { length: 200 }).notNull(),
    note: varchar('note', { length: 500 }).notNull().default(''),
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    openCount: integer('open_count').notNull().default(0),
    firstOpenedAt: timestamp('first_opened_at', { withTimezone: true }),
    lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    claimedBy: uuid('claimed_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    claimedTenantId: uuid('claimed_tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    /** صفحه‌ی ساخته‌شده؛ uuid ساده چون صفحه tenant-scoped است. */
    claimedPageId: uuid('claimed_page_id'),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norolink_claim_links_token_uniq').on(t.token),
    uniqueIndex('norolink_claim_links_active_slug_uniq')
      .on(t.slug)
      .where(sql`${t.claimedAt} IS NULL AND ${t.revokedAt} IS NULL`),
    index('norolink_claim_links_template_idx').on(t.templateId, t.createdAt),
    index('norolink_claim_links_created_idx').on(t.createdAt),
  ],
);

/** قالب‌های کدی (`LINK_TEMPLATES`) که superadmin از گالری برداشته است؛ داده‌ی قالب در کد می‌ماند و قابل بازگردانی است. */
export const norolinkRemovedTemplates = pgTable('norolink_removed_templates', {
  templateKey: varchar('template_key', { length: 64 }).primaryKey(),
  removedBy: uuid('removed_by')
    .notNull()
    .references(() => platformUsers.id),
  removedAt: timestamp('removed_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * نشانی‌های قبلی هر صفحه: به نشانی فعلی ریدایرکت دائمی می‌شوند و برای همان صفحه رزرو می‌مانند تا صفحه‌ی دیگری لینک‌های
 * قدیمی را نگیرد. یکتا در کل پلتفرم؛ با حذف صفحه آزاد می‌شوند. رزرو در DB اعمال می‌شود (trigger روی norolink_pages).
 */
export const norolinkSlugRedirects = pgTable(
  'norolink_slug_redirects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id').notNull(),
    oldSlug: varchar('old_slug', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norolink_slug_redirects_old_slug_uniq').on(t.oldSlug),
    uniqueIndex('norolink_slug_redirects_id_tenant_uniq').on(t.id, t.tenantId),
    index('norolink_slug_redirects_tenant_page_idx').on(t.tenantId, t.pageId),
    foreignKey({
      name: 'norolink_slug_redirects_page_fk',
      columns: [t.pageId, t.tenantId],
      foreignColumns: [norolinkPages.id, norolinkPages.tenantId],
    }).onDelete('cascade'),
  ],
);

/**
 * گزارش تخلف بازدیدکننده‌ها (§9.13): سطح پلتفرم با tenant_id برای پیگیری؛ page_id بدون FK تا با حذف صفحه سابقه بماند.
 * ثبت فقط برای صفحه‌ی منتشرشده‌ی همان نشانی، خواندن و رسیدگی فقط superadmin (migration ‏0026).
 */
export const norolinkPageReports = pgTable(
  'norolink_page_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id').notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    reason: norolinkModerationReason('reason').notNull(),
    details: varchar('details', { length: 2000 }).notNull().default(''),
    /** راه تماس اختیاری گزارش‌دهنده (فقط برای ادمین). */
    contact: varchar('contact', { length: 200 }),
    ipHash: varchar('ip_hash', { length: 64 }),
    status: norolinkReportStatus('status').notNull().default('open'),
    resolvedBy: uuid('resolved_by').references(() => platformUsers.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNote: varchar('resolution_note', { length: 1000 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('norolink_page_reports_status_created_idx').on(t.status, t.createdAt),
    index('norolink_page_reports_tenant_page_idx').on(t.tenantId, t.pageId),
    check('norolink_page_reports_resolved', sql`(${t.status} = 'open') = (${t.resolvedAt} IS NULL)`),
    check('norolink_page_reports_not_legal', sql`${t.reason} <> 'legal_order'`),
  ],
);
