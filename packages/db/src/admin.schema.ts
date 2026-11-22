import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { platformUsers } from './schema';

// admin — مدیریت پلتفرم (docs/architecture.md §9.11). جدول‌ها سطح پلتفرم‌اند (بدون tenant) و
// RLS + FORCE روی is_platform_admin() دارند (در migration): فقط وقتی app.current_admin کاربری
// است که در DB واقعاً superadmin فعال است.

/** لاگ ممیزی کارهای تغییردهنده‌ی ادمین؛ append-only (بدون UPDATE/DELETE). */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => platformUsers.id),
    /** کد ماشینی کار، مثل `user.status` (`[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*`). */
    action: varchar('action', { length: 64 }).notNull(),
    /** نوع هدف، مثل `user` یا `tenant`. */
    targetType: varchar('target_type', { length: 32 }).notNull(),
    targetId: uuid('target_id'),
    reason: varchar('reason', { length: 500 }),
    details: jsonb('details').notNull().default({}),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_audit_log_created_idx').on(t.createdAt),
    index('admin_audit_log_target_idx').on(t.targetType, t.targetId, t.createdAt),
    index('admin_audit_log_actor_idx').on(t.actorUserId, t.createdAt),
    check('admin_audit_log_action_pattern', sql`${t.action} ~ '^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$'`),
    check('admin_audit_log_target_type_pattern', sql`${t.targetType} ~ '^[a-z][a-z0-9_]*$'`),
    check('admin_audit_log_details_object', sql`jsonb_typeof(${t.details}) = 'object'`),
  ],
);

/** وضعیت سراسری یک ماژول (محصول)؛ ردیف ناموجود = active (docs/architecture.md §9.11). */
export const moduleStatus = pgEnum('module_status', ['active', 'maintenance', 'off']);

/**
 * وضعیت ماژول‌های پلتفرم. رجیستری کلیدها در کد است (`PLATFORM_MODULE_KEYS` در core)؛ این جدول فقط
 * انحراف از پیش‌فرض را نگه می‌دارد. خواندن برای همه (گارد هر درخواست، حتی ناشناس)، نوشتن فقط ادمین.
 */
export const platformModules = pgTable(
  'platform_modules',
  {
    key: varchar('key', { length: 32 }).primaryKey(),
    status: moduleStatus('status').notNull().default('active'),
    /** پیام فارسی به کاربران در حالت maintenance/off (اختیاری). */
    message: varchar('message', { length: 500 }),
    updatedBy: uuid('updated_by').references(() => platformUsers.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('platform_modules_key_pattern', sql`${t.key} ~ '^[a-z][a-z0-9_]*$'`)],
);
