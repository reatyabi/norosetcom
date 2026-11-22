/**
 * ساخت کاربر تست برای محیط توسعه
 * موبایل: 09120000001  |  رمز: 12345678
 */
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('./node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  // همان قالب packages/core/src/password.ts: scrypt$N$r$p$salt(base64url)$hash(base64url)
  // N=2^14 برای seed (سرور N را از hash می‌خواند و همان را verify می‌کند)
  const N = 2 ** 14, r = 8, p = 1;
  const salt = randomBytes(16);
  // KEY_LEN=32 باید با packages/core/src/password.ts مطابقت داشته باشد
  const hash = await scryptAsync(password.normalize('NFKC'), salt, 32, { N, r, p, maxmem: 256 * N * r });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function getEnv(key, fallback) {
  return process.env[key] ?? fallback;
}

const client = new Client({
  host: getEnv('DB_HOST', 'localhost'),
  port: parseInt(getEnv('DB_PORT', '5433')),
  user: 'noroset_migrator',
  password: getEnv('POSTGRES_MIGRATOR_PASSWORD', 'noroset_migrator_password'),
  database: getEnv('POSTGRES_DB', 'noroset'),
});

await client.connect();

const mobile = '+989120000001';
const displayMobile = '09120000001';
const password = '12345678';
const passwordHash = await hashPassword(password);

// اگر کاربر هست دست نمی‌خورد (نشست‌ها، رمز، عضویت‌ها و داده‌ها می‌مانند)
const res = await client.query(
  `INSERT INTO platform_users (mobile, full_name, password_hash, status)
   VALUES ($1, 'کاربر تست', $2, 'active')
   ON CONFLICT (mobile) DO UPDATE SET mobile = EXCLUDED.mobile
   RETURNING id, mobile, status`,
  [mobile, passwordHash]
);

const user = res.rows[0];
console.log(`کاربر تست ساخته شد:`);
console.log(`  موبایل : ${displayMobile}`);
console.log(`  رمز    : ${password}`);
console.log(`  ID     : ${user.id}`);

await client.end();
