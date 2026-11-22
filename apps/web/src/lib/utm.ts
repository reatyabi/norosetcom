// first-touch UTM (docs/architecture.md §9.11، ۱۱.۷): proxy پارامترهای utm اولین ورود به دامنه‌ی اصلی را در
// کوکی httpOnly سی‌روزه نگه می‌دارد؛ API هنگام ثبت‌نام با OTP آن را روی کاربر می‌نویسد (همان قالب
// parseUtmCookie در @noroset/core). وب به core وابسته نیست، پس نام و کلیدها اینجا تکرار شده‌اند.

export const UTM_COOKIE = 'noroset_utm';
export const UTM_MAX_AGE = 30 * 24 * 60 * 60;
const KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const;

/** مقدار کوکی (JSON؛ Next خودش encode می‌کند) از query، فقط اگر دست‌کم یک `utm_*` باشد. */
export function utmCookieValue(params: URLSearchParams): string | null {
  const utm: Record<string, string> = {};
  for (const key of KEYS) {
    const v = params.get(`utm_${key}`)?.trim().slice(0, 100);
    if (v) utm[key] = v;
  }
  return Object.keys(utm).length ? JSON.stringify(utm) : null;
}
