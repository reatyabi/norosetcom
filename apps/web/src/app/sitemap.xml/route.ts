import { DEFAULT_NOROFORM_HOST, DEFAULT_PUBLIC_HOST, hostName, isNoroformHost, isPublicHost } from '../../lib/host-routing';
import { publicDirectoryUrl, publicLinkUrl, routes } from '../../lib/routes';
import { getSitemap, SITE_ORIGIN } from '../(marketing)/blog/_lib/blog-api';

// نقشه‌ی سایت (فایل‌های پسوند‌دار از proxy رد نمی‌شوند، پس میزبان همین‌جا تشخیص داده می‌شود):
// - noroset.com: صفحه‌های مارکتینگ + بلاگ (docs/architecture.md §9.12).
// - n8l.ir: دایرکتوری و صفحه‌های لینکی که ایندکس می‌شوند (منتشرشده، seo.indexable روشن، پلن دارای سئو؛ §9.1).
//   نشانی زیردامنه‌ها با ارجاع robots.txt هر زیردامنه (و Domain property در Search Console) پذیرفته می‌شود.
// - زیردامنه‌ها ({slug}.n8l.ir): ۴۰۴.

const PUBLIC_HOST = process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST;
const NOROFORM_HOST = process.env.NOROFORM_PUBLIC_HOST ?? DEFAULT_NOROFORM_HOST;
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
const STATIC = [routes.home, routes.landing.link, routes.landing.file, routes.blog.home, routes.landing.privacy, routes.landing.terms];
const HEADERS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' };

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

type Url = { loc: string; lastmod?: string | null };

function sitemapXml(urls: Url[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
}

async function linkPages(): Promise<{ slug: string; lastmod: string | null }[]> {
  const res = await fetch(`${API_ORIGIN}/norolink/public/sitemap`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`norolink sitemap: ${res.status}`);
  return ((await res.json()) as { pages: { slug: string; lastmod: string | null }[] }).pages;
}

export async function GET(request: Request): Promise<Response> {
  const hostHeader = request.headers.get('host');
  const host = hostName(hostHeader);
  if (isNoroformHost(host, NOROFORM_HOST)) return new Response(null, { status: 404 });
  if (host === PUBLIC_HOST.toLowerCase()) {
    const port = hostHeader?.split(':')[1];
    // خطای API ← ۵۰۳ تا موتور جستجو نسخه‌ی قبلی را نگه دارد و sitemap خالی جای آن ننشیند.
    const pages = await linkPages().catch(() => null);
    if (!pages) return new Response(null, { status: 503, headers: { 'Retry-After': '600' } });
    const urls: Url[] = [{ loc: publicDirectoryUrl(PUBLIC_HOST, port) }, ...pages.map((p) => ({ loc: publicLinkUrl(PUBLIC_HOST, p.slug, port), lastmod: p.lastmod }))];
    return new Response(sitemapXml(urls), { headers: HEADERS });
  }
  if (isPublicHost(host, PUBLIC_HOST)) return new Response(null, { status: 404 });
  const blog = await getSitemap().catch(() => null);
  const urls: Url[] = [
    ...STATIC.map((path) => ({ loc: path })),
    ...(blog?.posts.map((p) => ({ loc: routes.blog.post(p.slug), lastmod: p.updatedAt })) ?? []),
    ...(blog?.categories.map((c) => ({ loc: routes.blog.category(c.slug), lastmod: c.updatedAt })) ?? []),
    ...(blog?.tags.map((t) => ({ loc: routes.blog.tag(t.slug), lastmod: t.updatedAt })) ?? []),
  ].map((u) => ({ ...u, loc: `${SITE_ORIGIN}${u.loc}` }));
  return new Response(sitemapXml(urls), { headers: HEADERS });
}
