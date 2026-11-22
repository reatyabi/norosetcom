// CSRF: درخواست تغییردهنده با کوکی نشست فقط از origin وب پذیرفته می‌شود (docs/tech-debt.md مورد ۳).
// مرورگرها روی POST/PUT/PATCH/DELETE همیشه Origin می‌فرستند؛ کلاینت بدون Origin (curl، سرور به سرور)
// کوکی قربانی را ندارد. فرم و آمار عمومی روی n8l.ir کوکی نشست ندارند و مستثنا می‌مانند.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_COOKIE = /(?:^|;\s*)(?:access_token|refresh_token|support_token)=/;

type Env = Record<string, string | undefined>;

export interface CsrfRequest {
  method: string;
  /** مسیر API بدون پیشوند proxy. */
  path: string;
  origin: string | undefined;
  cookie: string | undefined;
}

export function isCsrfRejected(req: CsrfRequest, env: Env = process.env): boolean {
  if (env.NODE_ENV !== 'production' || SAFE_METHODS.has(req.method) || !req.origin) return false;
  // مسیرهای ورود کوکی نشست می‌سازند، پس کوکی نداشتن آن‌ها را از بررسی معاف نمی‌کند (login CSRF).
  if (!req.path.startsWith('/auth/') && !SESSION_COOKIE.test(req.cookie ?? '')) return false;
  return req.origin !== (env.WEB_ORIGIN ?? '').replace(/\/+$/, '');
}
