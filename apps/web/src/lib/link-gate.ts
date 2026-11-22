// تصمیم وضعیت HTTP صفحه‌ی لینک عمومی پیش از رندر (docs/architecture.md §9.1). صفحه‌ها پشت loading.tsx ریشه
// stream می‌شوند و پس از شروع stream دیگر وضعیت عوض نمی‌شود: notFound() و permanentRedirect() داخل صفحه
// ۲۰۰ با noindex یا ریدایرکت سمت کلاینت می‌دهند. پس proxy همین‌جا ۴۰۴، ۳۰۸ و ۵۰۳ را برمی‌گرداند.
// منطق خالص تا proxy نازک و قابل تست بماند.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type LinkGate =
  | { kind: 'render' }
  | { kind: 'not-found' }
  | { kind: 'redirect'; slug: string }
  | { kind: 'unavailable'; retryAfter: number; notice: string | null }
  /** تعلیق مدیریت پلتفرم (§9.13): ۴۵۱ برای دستور مرجع قانونی، ۴۰۳ برای بقیه؛ بدون محتوا. */
  | { kind: 'blocked'; status: 451 | 403; notice: string | null };

/** ماژول نورولینک خاموش است (۵۰۳ API)؛ موتور جستجو بعداً دوباره سر می‌زند و صفحه را از ایندکس بیرون نمی‌کند. */
export const MODULE_OFF_RETRY_AFTER = 1800;
/** سقف درخواست API (۴۲۹)؛ وضعیت موقت، نه noindex. */
export const RATE_LIMIT_RETRY_AFTER = 120;

/**
 * پاسخ `GET /norolink/public/pages/:slug` ← کار proxy. پلن تمام‌شده (`{unavailable: true}` با ۲۰۰) رندر می‌شود:
 * صفحه پیام «در دسترس نیست» را با noindex نشان می‌دهد چون تا خرید پلن برنمی‌گردد. خطای دیگر هم به صفحه سپرده می‌شود.
 */
export function linkGate(status: number, body: unknown): LinkGate {
  if (status === 404) return { kind: 'not-found' };
  if (status === 451 || status === 403) {
    const b = body as { message?: unknown; notice?: unknown } | null;
    if (b?.message === 'page_suspended') return { kind: 'blocked', status, notice: typeof b.notice === 'string' ? b.notice : null };
  }
  if (status === 503) {
    const notice = (body as { notice?: unknown } | null)?.notice;
    return { kind: 'unavailable', retryAfter: MODULE_OFF_RETRY_AFTER, notice: typeof notice === 'string' ? notice : null };
  }
  if (status === 429) return { kind: 'unavailable', retryAfter: RATE_LIMIT_RETRY_AFTER, notice: null };
  if (status >= 200 && status < 300) {
    const redirectTo = (body as { redirectTo?: unknown } | null)?.redirectTo;
    if (typeof redirectTo === 'string' && SLUG.test(redirectTo) && redirectTo.length <= 63) return { kind: 'redirect', slug: redirectTo };
  }
  return { kind: 'render' };
}

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[c]!);

/** صفحه‌ی ساده‌ی پاسخ‌های بدون رندر Next (۴۰۴ و ۵۰۳)؛ متن ادمین escape می‌شود. */
export function gateHtml(message: string): string {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(message)}</title><style>body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Tahoma,'Segoe UI',sans-serif;color:#555;text-align:center}</style></head><body><p>${esc(message)}</p></body></html>`;
}

export const NOT_FOUND_MESSAGE = 'این صفحه پیدا نشد.';
export const UNAVAILABLE_MESSAGE = 'این صفحه در حال حاضر در دسترس نیست.';
export const SUSPENDED_MESSAGE = 'این صفحه به دلیل نقض قوانین استفاده از نورولینک در دسترس نیست.';
