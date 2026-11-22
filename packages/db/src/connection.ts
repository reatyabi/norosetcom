import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * اتصال سطح پلتفرم (جداول بدون RLS مثل platform_users/tenants).
 * به‌عنوان noroset_app (DATABASE_URL) اجرا می‌شود.
 * pool به‌صورت مستقیم export نمی‌شود؛ کد محصول فقط از db و withTenant استفاده کند.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  allowExitOnIdle: true,
});

export const db = drizzle(pool, { schema });

export type Db = NodePgDatabase<typeof schema>;

/**
 * اجرای fn داخل یک تراکنش با tenant ست‌شده (SET LOCAL).
 * برای جداول tenant-scoped باید فقط از این استفاده شود.
 */
export async function withTenant<T>(tenantId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
  return withSetting('app.current_tenant', tenantId, fn);
}

/**
 * اجرای fn داخل یک تراکنش با کاربر ست‌شده (SET LOCAL) — برای خواندن دادهٔ خودِ کاربر
 * (مثلاً فهرست membershipهای کاربر در همهٔ tenantها).
 */
export async function withUser<T>(userId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
  return withSetting('app.current_user', userId, fn);
}

/**
 * اجرای fn داخل یک تراکنش با ادمین پلتفرم ست‌شده (`app.current_admin`؛ docs/architecture.md §9.11).
 * خود DB با `is_platform_admin()` بررسی می‌کند این کاربر superadmin فعال است؛ ست‌کردن شناسه‌ی
 * کاربر عادی هیچ دسترسی‌ای نمی‌دهد. لاگ ممیزی فقط داخل همین تراکنش نوشته می‌شود.
 */
export async function withPlatformAdmin<T>(adminUserId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
  return withSetting('app.current_admin', adminUserId, fn);
}

/** داخلی (از index export نمی‌شود): تراکنش با یک setting محلی. */
export async function withSetting<T>(
  setting: string,
  value: string,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', [setting, value]);
    const tx = drizzle(client, { schema });
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
