import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads the monorepo-root .env by searching upward from cwd.
 * (import.meta.url is unreliable under vitest worker transforms, so we search the tree.)
 */
export function loadEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      config({ path: candidate });
      break;
    }
    dir = resolve(dir, '..');
  }

  // تست‌ها روی دیتابیس جدای {نام}_test اجرا می‌شوند تا داده‌ی محیط توسعه پاک نشود (dev.ps1 آن را می‌سازد).
  for (const key of ['DATABASE_URL', 'DATABASE_URL_MIGRATOR']) {
    const value = process.env[key];
    if (!value) continue;
    const url = new URL(value);
    if (!url.pathname.endsWith('_test')) url.pathname += '_test';
    process.env[key] = url.toString();
  }
}
