// اجرای migrationها در production با وابستگی‌های runtime (بدون drizzle-kit؛ docs/launch-blueprint.md).
// با نقش migrator و همان جدول ثبت drizzle-kit اجرا می‌شود. env از قبل در محیط است.
//
//   DATABASE_URL_MIGRATOR=... node packages/db/scripts/migrate.mjs
/* global process, console */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL_MIGRATOR;
if (!url) {
  console.error('DATABASE_URL_MIGRATOR is not set');
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: resolve(dirname(fileURLToPath(import.meta.url)), '../migrations') });
  console.log('migrations applied');
} finally {
  await pool.end();
}
