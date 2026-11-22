// تنظیمات HTTP وابسته به استقرار (docs/tech-debt.md مورد ۲).

type Env = Record<string, string | undefined>;

/**
 * مقدار trustProxy برای Fastify از TRUST_PROXY:
 * خالی/false ← اعتماد نکن (پیش‌فرض)، true ← همه (فقط پشت proxy مطمئن)، عدد ← تعداد hop،
 * بقیه ← فهرست IP/CIDR یا کلیدواژه‌ها (loopback، linklocal، uniquelocal) جداشده با کاما.
 * بدون این تنظیم، پشت reverse proxy همه‌ی کاربران IP خود proxy را دارند (rate limit مشترک).
 */
export function parseTrustProxy(env: Env = process.env): boolean | number | string[] {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw || raw === 'false') return false;
  if (raw === 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * پیشوند مسیری که مرورگر API را با آن می‌بیند (مثلاً `/api` وقتی وب درخواست‌ها را proxy می‌کند).
 * مسیر cookie رفرش باید با آن بخواند وگرنه مرورگر آن را نمی‌فرستد.
 */
export function getApiBasePath(env: Env = process.env): string {
  const raw = (env.API_BASE_PATH ?? '').trim().replace(/\/+$/, '');
  if (raw === '') return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function refreshCookiePath(env: Env = process.env): string {
  return `${getApiBasePath(env)}/auth`;
}
