// نگاشت دامنه به مسیر داخلی Next (docs/routes.md). منطق خالص تا proxy نازک و قابل تست بماند.

/** مسیر داخلی صفحه‌های دامنه‌ی کوتاه؛ از دامنه‌ی اصلی مستقیم در دسترس نیست. */
export const PUBLIC_SITE_PREFIX = '/n8l';

/** مسیر داخلی خروجی عمومی نوروفرم (n8f.ir)؛ از دامنه‌ی اصلی مستقیم در دسترس نیست. */
export const NOROFORM_SITE_PREFIX = '/n8f';

/** پیشوند لینک مشاهده‌ی بیرونی پاسخ در دامنه‌ی نوروفرم. */
export const RESPONSE_SITE_PREFIX = '/r';

/** مسیر داخلی صفحه‌ی لینک زیردامنه (`{slug}.n8l.ir`)؛ از هیچ دامنه‌ای مستقیم در دسترس نیست. */
export const LINK_SITE_PREFIX = '/nls';

/** پیش‌فرض development؛ مرورگرها `*.localhost` را به loopback می‌برند. */
export const DEFAULT_PUBLIC_HOST = 'n8l.localhost';

/** میزبان خروجی عمومی نوروفرم در development؛ production: n8f.ir. */
export const DEFAULT_NOROFORM_HOST = 'n8f.localhost';

/** صفحه‌ی «به‌زودی» که تا لانچ نوروفرم پشت `/form` نشان داده می‌شود (docs/architecture.md §۲). */
export const NOROFORM_SOON_PATH = '/landing/form/soon';

export type HostRoute =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string; linkPage?: boolean; mainHost?: boolean }
  | { kind: 'not-found' };

/** نوروفرم در لانچ نیست: production خاموش مگر با NOROFORM_ENABLED=true؛ development روشن مگر با false. */
export function noroformEnabled(flag: string | undefined, nodeEnv: string | undefined): boolean {
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return nodeEnv !== 'production';
}

const SUBDOMAIN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** نام host بدون پورت و با حروف کوچک. */
export function hostName(hostHeader: string | null): string {
  return (hostHeader ?? '').split(':')[0]!.trim().toLowerCase();
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * دامنه‌ی کوتاه (مثلاً n8l.ir) فقط صفحه‌های عمومی را دارد: هر مسیر به `/n8l{path}` بازنویسی می‌شود
 * (مسیر بی‌صفحه همان ۴۰۴ Next است). زیردامنه‌ی آن (`{slug}.n8l.ir`) فقط صفحه‌ی لینک همان slug را در
 * ریشه دارد. روی دامنه‌ی اصلی، مسیرهای داخلی `/n8l` و `/nls` ۴۰۴ هستند.
 * با نوروفرم خاموش، فرم اجرا نمی‌شود (`/f` ۴۰۴) و پنل آن جای خود را به صفحه‌ی «به‌زودی» می‌دهد.
 */
export function resolveHostRoute(
  host: string,
  pathname: string,
  publicHost: string,
  noroform = true,
  noroformHost = DEFAULT_NOROFORM_HOST,
): HostRoute {
  const base = publicHost.toLowerCase();
  const formBase = noroformHost.toLowerCase();
  if (
    under(pathname, PUBLIC_SITE_PREFIX) ||
    under(pathname, LINK_SITE_PREFIX) ||
    under(pathname, NOROFORM_SITE_PREFIX)
  ) {
    return { kind: 'not-found' };
  }
  // مشاهده‌ی بیرونی پاسخ فقط روی دامنه‌ی نوروفرم و با توکن ۳۲ بایتی.
  if (under(pathname, RESPONSE_SITE_PREFIX)) {
    if (!noroform || host !== formBase) return { kind: 'not-found' };
    const match = /^\/r\/([A-Za-z0-9_-]{43})\/?$/.exec(pathname);
    return match ? { kind: 'rewrite', pathname: `${NOROFORM_SITE_PREFIX}/r/${match[1]}` } : { kind: 'not-found' };
  }
  if (host === formBase) {
    if (pathname === '/') return { kind: 'rewrite', pathname: NOROFORM_SITE_PREFIX };
    const slug = /^\/([a-z0-9][a-z0-9-]{1,63})\/?$/.exec(pathname);
    return slug ? { kind: 'rewrite', pathname: `${NOROFORM_SITE_PREFIX}/f/${slug[1]}` } : { kind: 'not-found' };
  }
  if (!noroform && under(pathname, '/f')) return { kind: 'not-found' };
  if (host === base) {
    if (under(pathname, '/f')) return { kind: 'not-found' };
    return { kind: 'rewrite', pathname: pathname === '/' ? PUBLIC_SITE_PREFIX : `${PUBLIC_SITE_PREFIX}${pathname}` };
  }
  if (host.endsWith(`.${base}`)) {
    const slug = host.slice(0, -(base.length + 1));
    if (!SUBDOMAIN.test(slug) || slug.length > 63 || pathname !== '/') return { kind: 'not-found' };
    return { kind: 'rewrite', pathname: `${LINK_SITE_PREFIX}/${slug}`, linkPage: true };
  }
  if (!noroform && under(pathname, '/form')) return { kind: 'rewrite', pathname: NOROFORM_SOON_PATH, mainHost: true };
  return { kind: 'next' };
}

/**
 * CSP صفحه‌ی لینک: فقط ارائه‌دهندگان فهرست سفید برای iframe؛ صفحه در frame سایت دیگر باز نمی‌شود.
 * اسکریپت‌ها محدود نمی‌شوند چون Next اسکریپت درون‌خطی دارد (محتوای کاربر هرگز HTML نیست).
 */
export function linkPageCsp(frameSources: readonly string[]): string {
  return [`frame-src ${frameSources.join(' ')}`, "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"].join('; ');
}

/** دامنه‌ی کوتاه یا زیردامنه‌اش (مثلاً برای ۴۰۴ کردن sitemap.xml و robots.txt دامنه‌ی اصلی روی آن). */
export function isPublicHost(host: string, publicHost: string): boolean {
  const base = publicHost.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}

/** میزبان خروجی عمومی نوروفرم (n8f.ir / n8f.localhost). */
export function isNoroformHost(host: string, noroformHost: string): boolean {
  return host === noroformHost.toLowerCase();
}
