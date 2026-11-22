// اعطای نقش superadmin از خط فرمان (docs/architecture.md §9.11) — فقط برای اولین ادمین یا بازیابی؛
// بعد از آن نقش‌ها از پنل «مدیریت پلتفرم» داده می‌شوند. با نقش migrator اجرا می‌شود.
//
//   pnpm --filter @noroset/db admin:grant 09120000001
//   pnpm --filter @noroset/db admin:grant 09120000001 --revoke
//
// کاربر ناموجود ساخته می‌شود (بعداً با OTP وارد می‌شود). کار در لاگ ممیزی با action `platform_role.cli` ثبت می‌شود.
/* global process, console */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** همان قاعده‌ی normalizeIranianMobile در @noroset/core (db به core وابسته نیست). */
function normalizeIranianMobile(input) {
  let s = [...input]
    .map((ch) => {
      const p = PERSIAN_DIGITS.indexOf(ch);
      if (p >= 0) return String(p);
      const a = ARABIC_DIGITS.indexOf(ch);
      return a >= 0 ? String(a) : ch;
    })
    .join('')
    .replace(/[\s-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0098')) s = s.slice(4);
  else if (s.startsWith('98')) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  return /^9[0-9]{9}$/.test(s) ? `+98${s}` : null;
}

function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    dir = resolve(dir, '..');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const mobile = normalizeIranianMobile(args.find((a) => !a.startsWith('--')) ?? '');
  if (!mobile) {
    console.error('usage: admin:grant <mobile> [--revoke]');
    process.exit(2);
  }

  loadEnv();
  const url = process.env.DATABASE_URL_MIGRATOR;
  if (!url) {
    console.error('DATABASE_URL_MIGRATOR is not set');
    process.exit(2);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    const role = revoke ? 'user' : 'superadmin';
    const { rows } = await client.query(
      `INSERT INTO platform_users (mobile, platform_role) VALUES ($1, $2)
       ON CONFLICT (mobile) DO UPDATE SET platform_role = EXCLUDED.platform_role, updated_at = now()
       RETURNING id, status`,
      [mobile, role],
    );
    const user = rows[0];
    // policy لاگ فقط ادمین فعال را می‌پذیرد: اعطا با هویت خود همان کاربر ثبت می‌شود؛ سلب (که او را
    // دیگر ادمین نمی‌کند) و کاربر غیرفعال در لاگ نمی‌آیند.
    await client.query("SELECT set_config('app.current_admin', $1, true)", [user.id]);
    const { rows: check } = await client.query('SELECT is_platform_admin() AS ok');
    if (check[0].ok) {
      await client.query(
        `INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, details)
         VALUES ($1, 'platform_role.cli', 'user', $1, $2)`,
        [user.id, JSON.stringify({ platformRole: role })],
      );
    }
    await client.query('COMMIT');
    console.log(`${mobile}: platform_role=${role}${user.status === 'active' ? '' : ` (status=${user.status})`}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

await main();
