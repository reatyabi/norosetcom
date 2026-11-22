import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  type PgTableExtraConfigValue,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { platformUsers, tenants } from './schema';

// norofile (docs/architecture.md §9.9): مدیریت و میزبانی فایل؛ تنها سرویس ذخیره‌ساز S3 پلتفرم.
// همه tenant-scoped: tenant_id + RLS + FORCE (در migration).
// محصولات دیگر فقط شناسه‌ی فایل (uuid بدون FK) نگه می‌دارند و استفاده را از Port FILE_SERVICE ثبت می‌کنند.

export const norofileFileKind = pgEnum('norofile_file_kind', ['image', 'document', 'archive']);
export const norofileVisibility = pgEnum('norofile_visibility', ['private', 'public']);

export const norofileFiles = pgTable(
  'norofile_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** نام نمایشی (نام فایل کاربر، پاک‌سازی‌شده). */
    name: varchar('name', { length: 255 }).notNull(),
    kind: norofileFileKind('kind').notNull(),
    /** نوع واقعی از محتوای فایل (magic bytes)، نه Content-Type کاربر. */
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    extension: varchar('extension', { length: 10 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    /** کلید شیء در bucket خصوصی: `{tenant_id}/{id}`. */
    storageKey: varchar('storage_key', { length: 200 }).notNull(),
    visibility: norofileVisibility('visibility').notNull().default('private'),
    /** محصول بارگذار (norofile، norolink، …). */
    source: varchar('source', { length: 32 }).notNull().default('norofile'),
    uploadedBy: uuid('uploaded_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norofile_files_id_tenant_uniq').on(t.id, t.tenantId),
    uniqueIndex('norofile_files_storage_key_uniq').on(t.storageKey),
    index('norofile_files_tenant_created_idx').on(t.tenantId, t.createdAt),
    check('norofile_files_size_positive', sql`${t.sizeBytes} > 0`),
    check('norofile_files_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('norofile_files_extension_pattern', sql`${t.extension} ~ '^[a-z0-9]{1,10}$'`),
    check('norofile_files_source_pattern', sql`${t.source} ~ '^[a-z][a-z0-9_]*$'`),
    check(
      'norofile_files_dimensions',
      sql`(${t.width} IS NULL AND ${t.height} IS NULL) OR (${t.width} > 0 AND ${t.height} > 0)`,
    ),
  ],
);

/**
 * استفاده‌ی محصولات از فایل (مثلاً تصویر صفحه‌ی نورولینک). فایل در حال استفاده حذف نمی‌شود
 * (FK بدون cascade). owner_type نام منطقی مالک (مثل `norolink_page`) و owner_id شناسه‌ی آن است.
 */
export const norofileFileUsages = pgTable(
  'norofile_file_usages',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id').notNull(),
    ownerType: varchar('owner_type', { length: 64 }).notNull(),
    ownerId: uuid('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    primaryKey({ name: 'norofile_file_usages_pk', columns: [t.fileId, t.ownerType, t.ownerId] }),
    index('norofile_file_usages_tenant_owner_idx').on(t.tenantId, t.ownerType, t.ownerId),
    check('norofile_file_usages_owner_type_pattern', sql`${t.ownerType} ~ '^[a-z][a-z0-9_]*$'`),
    // NO ACTION (نه RESTRICT): حذف tenant هر دو جدول را cascade می‌کند و بررسی در پایان دستور است.
    foreignKey({
      name: 'norofile_file_usages_file_fk',
      columns: [t.fileId, t.tenantId],
      foreignColumns: [norofileFiles.id, norofileFiles.tenantId],
    }),
  ],
);

/**
 * فضای شخصی کاربر (بدون tenant؛ فعلاً فقط آواتار، همیشه public). RLS + FORCE روی
 * `user_id = app.current_user` (withUser)؛ ردیف‌ها immutable (فقط INSERT/DELETE).
 */
export const norofileUserFiles = pgTable(
  'norofile_user_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    kind: norofileFileKind('kind').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    extension: varchar('extension', { length: 10 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    /** کلید شیء: `users/{user_id}/{id}`. */
    storageKey: varchar('storage_key', { length: 200 }).notNull(),
    visibility: norofileVisibility('visibility').notNull().default('public'),
    source: varchar('source', { length: 32 }).notNull().default('account'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norofile_user_files_storage_key_uniq').on(t.storageKey),
    index('norofile_user_files_user_created_idx').on(t.userId, t.createdAt),
    check('norofile_user_files_size_positive', sql`${t.sizeBytes} > 0`),
    check('norofile_user_files_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('norofile_user_files_extension_pattern', sql`${t.extension} ~ '^[a-z0-9]{1,10}$'`),
    check('norofile_user_files_source_pattern', sql`${t.source} ~ '^[a-z][a-z0-9_]*$'`),
    check(
      'norofile_user_files_dimensions',
      sql`(${t.width} IS NULL AND ${t.height} IS NULL) OR (${t.width} > 0 AND ${t.height} > 0)`,
    ),
  ],
);

/**
 * فایل‌های پلتفرم (بدون tenant؛ فعلاً تصویر قالب‌های نورولینک، همیشه public). هر فضای کاری می‌تواند به آن‌ها اشاره کند و از
 * سهمیه‌اش کم نمی‌شود؛ فقط superadmin می‌سازد و immutable‌اند (صفحه‌های ساخته‌شده از قالب حتی پس از حذف قالب به آن‌ها نیاز دارند).
 */
export const norofilePlatformFiles = pgTable(
  'norofile_platform_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    extension: varchar('extension', { length: 10 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** کلید شیء: `platform/{id}`. */
    storageKey: varchar('storage_key', { length: 200 }).notNull(),
    source: varchar('source', { length: 32 }).notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => platformUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex('norofile_platform_files_storage_key_uniq').on(t.storageKey),
    check('norofile_platform_files_size_positive', sql`${t.sizeBytes} > 0`),
    check('norofile_platform_files_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('norofile_platform_files_extension_pattern', sql`${t.extension} ~ '^[a-z0-9]{1,10}$'`),
    check('norofile_platform_files_source_pattern', sql`${t.source} ~ '^[a-z][a-z0-9_]*$'`),
    check('norofile_platform_files_dimensions', sql`${t.width} > 0 AND ${t.height} > 0`),
  ],
);
