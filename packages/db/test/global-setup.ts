import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolve } from 'node:path';
import { loadEnv } from './env';

export default async function globalSetup(): Promise<void> {
  loadEnv();
  const migrationsFolder = resolve(process.cwd(), 'migrations');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_MIGRATOR });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
    // پاک‌سازی دادهٔ تست (reserved_slugs حفظ می‌شود).
    await pool.query('TRUNCATE tenant_memberships, tenants, platform_users CASCADE');
  } finally {
    await pool.end();
  }
}
