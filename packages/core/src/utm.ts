// first-touch UTM ثبت‌نام (docs/architecture.md §9.11، ۱۱.۷). وب (proxy) پارامترهای utm اولین ورود را در کوکی
// httpOnly سی‌روزه نگه می‌دارد؛ API هنگام ساخت کاربر با OTP آن را روی platform_users.signup_utm می‌نویسد.

export const UTM_COOKIE = 'noroset_utm';
export const UTM_KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const;
export type SignupUtm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const MAX_VALUE = 100;

/** مقدار کوکی (JSON، خام یا URI-encoded) ← utm پاک‌سازی‌شده؛ خالی/نامعتبر ← null. */
export function parseUtmCookie(raw: string | undefined): SignupUtm | null {
  if (!raw || raw.length > 2000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    try {
      value = JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: SignupUtm = {};
  for (const key of UTM_KEYS) {
    const v = (value as Record<string, unknown>)[key];
    // فقط متن چاپی؛ کنترل‌کاراکترها و طول زیاد کنار گذاشته می‌شوند.
    if (typeof v === 'string') {
      const clean = [...v]
        .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
        .join('')
        .trim()
        .slice(0, MAX_VALUE);
      if (clean) out[key] = clean;
    }
  }
  return Object.keys(out).length ? out : null;
}
