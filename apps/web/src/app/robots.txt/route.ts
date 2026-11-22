import { DEFAULT_NOROFORM_HOST, DEFAULT_PUBLIC_HOST, hostName, isNoroformHost, isPublicHost } from '../../lib/host-routing';
import { publicDirectoryUrl } from '../../lib/routes';
import { SITE_ORIGIN } from '../(marketing)/blog/_lib/blog-api';

// robots.txt دامنه‌ی اصلی: پنل و API خزیده نمی‌شوند؛ نقشه‌ی سایت معرفی می‌شود.
// دامنه‌ی کوتاه (n8l.ir) و هر زیردامنه‌ی آن ({slug}.n8l.ir): همه آزاد جز API، و sitemap صفحه‌های لینک روی n8l.ir.
// ارجاع از robots.txt هر زیردامنه همان چیزی است که sitemaps.org برای sitemap بین‌میزبانی لازم دارد؛ ایندکس شدن هر
// صفحه همچنان با meta robots خود آن است (docs/architecture.md §9.1).

const PUBLIC_HOST = process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST;
const NOROFORM_HOST = process.env.NOROFORM_PUBLIC_HOST ?? DEFAULT_NOROFORM_HOST;
const PRIVATE = ['/api/', '/admin', '/account', '/billing', '/link', '/form', '/file', '/ws', '/auth', '/support', '/claim', '/c/', '/f/', '/shots'];
const HEADERS = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' };

export function GET(request: Request): Response {
  const hostHeader = request.headers.get('host');
  // خروجی عمومی نوروفرم ایندکس نمی‌شود؛ پاسخ‌ها هم لینک اختصاصی دارند.
  if (isNoroformHost(hostName(hostHeader), NOROFORM_HOST)) {
    return new Response(['User-agent: *', 'Disallow: /', ''].join('\n'), { headers: HEADERS });
  }
  if (isPublicHost(hostName(hostHeader), PUBLIC_HOST)) {
    const sitemap = `${publicDirectoryUrl(PUBLIC_HOST, hostHeader?.split(':')[1])}/sitemap.xml`;
    return new Response(['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${sitemap}`, ''].join('\n'), { headers: HEADERS });
  }
  const body = ['User-agent: *', 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`), '', `Sitemap: ${SITE_ORIGIN}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: HEADERS });
}
