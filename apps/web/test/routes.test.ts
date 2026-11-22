import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { hostName, isPublicHost, noroformEnabled, resolveHostRoute } from '../src/lib/host-routing';
import { gateHtml, linkGate, MODULE_OFF_RETRY_AFTER, RATE_LIMIT_RETRY_AFTER } from '../src/lib/link-gate';
import { blogApiPath, blogGate, blogTarget, NOT_FOUND_REWRITE } from '../src/lib/blog-gate';
import { GET as sitemapGet } from '../src/app/sitemap.xml/route';
import { publicFormUrl, publicLinkUrl, publicReportUrl, publicResponseUrl, routes, safeNext } from '../src/lib/routes';
import { GET as robotsGet } from '../src/app/robots.txt/route';

const APP_DIR = join(__dirname, '..', 'src', 'app');

/** نقشه‌ی مصوب docs/routes.md: مسیر داخلی Next هر page.tsx (route groupها حذف). */
const ROUTE_MAP = [
  '/',
  '/landing/form',
  '/landing/form/soon',
  '/landing/link',
  '/landing/file',
  '/privacy',
  '/contact',
  '/terms',
  '/claim',
  '/blog',
  '/blog/[slug]',
  '/blog/category/[slug]',
  '/blog/tag/[slug]',
  '/auth',
  '/support',
  '/ws',
  '/account',
  '/billing',
  '/billing/result',
  '/billing/receipts/[id]',
  '/form',
  '/form/templates',
  '/form/[id]',
  '/form/[id]/editor',
  '/form/[id]/results',
  '/f/[id]',
  '/n8l',
  '/n8l/report/[slug]',
  '/n8f',
  '/n8f/f/[slug]',
  '/n8f/r/[token]',
  '/link',
  '/link/templates',
  '/link/[slug]/editor',
  '/link/[slug]/analytics',
  '/nls/[slug]',
  '/shots',
  '/file',
  '/admin',
  '/admin/users',
  '/admin/users/[id]',
  '/admin/tenants',
  '/admin/tenants/[id]',
  '/admin/audit',
  '/admin/modules',
  '/admin/billing',
  '/admin/campaigns',
  '/admin/templates',
  '/admin/templates/[id]/editor',
  '/admin/link-pages',
  '/admin/link-pages/[id]',
  '/admin/blog',
  '/admin/blog/[id]',
  '/admin/blog/categories',
  '/admin/blog/comments',
];

function pageRoutes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageRoutes(path);
    if (entry.name !== 'page.tsx') return [];
    const segments = relative(APP_DIR, dir)
      .split(sep)
      .filter((s) => s && !/^\(.+\)$/.test(s));
    return [`/${segments.join('/')}`];
  });
}

describe('page tree', () => {
  it('matches the documented route map exactly (no parallel or leftover pages)', () => {
    expect(pageRoutes(APP_DIR).sort()).toEqual([...ROUTE_MAP].sort());
  });
});

describe('routes', () => {
  it('builds product paths', () => {
    expect(routes.form.editor('a1')).toBe('/form/a1/editor');
    expect(routes.form.results('a1')).toBe('/form/a1/results');
    expect(routes.form.internal('a1')).toBe('/f/a1');
    expect(routes.link.editor('shop')).toBe('/link/shop/editor');
    expect(routes.link.analytics('shop')).toBe('/link/shop/analytics');
    expect(publicFormUrl('n8f.ir', 'k7m3qx9')).toBe('https://n8f.ir/k7m3qx9');
    expect(publicFormUrl('n8f.localhost', 'k7m3qx9', '3000')).toBe('http://n8f.localhost:3000/k7m3qx9');
    expect(publicResponseUrl('n8f.ir', 't'.repeat(43))).toBe(`https://n8f.ir/r/${'t'.repeat(43)}`);
    expect(publicResponseUrl('n8f.localhost', 't'.repeat(43), '3000')).toBe(`http://n8f.localhost:3000/r/${'t'.repeat(43)}`);
    expect(routes.admin.user('u 1')).toBe('/admin/users/u%201');
    expect(routes.admin.tenant('t1')).toBe('/admin/tenants/t1');
    expect(routes.supportLink('a-b_c')).toBe('/support#a-b_c');
  });

  it('encodes dynamic segments', () => {
    expect(routes.form.editor('a/b')).toBe('/form/a%2Fb/editor');
  });

  it('adds next to the auth path', () => {
    expect(routes.auth()).toBe('/auth');
    expect(routes.auth('/form/a1/editor')).toBe('/auth?next=%2Fform%2Fa1%2Feditor');
  });

  it('accepts only same-origin next paths', () => {
    expect(safeNext('/form')).toBe('/form');
    expect(safeNext(null)).toBe('/link');
    expect(safeNext('https://evil.example')).toBe('/link');
    expect(safeNext('//evil.example')).toBe('/link');
    expect(safeNext('/\\evil.example')).toBe('/link');
  });
});

describe('host routing', () => {
  const PUBLIC = 'n8l.ir';

  it('strips port and lowercases the host', () => {
    expect(hostName('N8L.localhost:3000')).toBe('n8l.localhost');
    expect(hostName(null)).toBe('');
  });

  it('rewrites the short domain into /n8l', () => {
    expect(resolveHostRoute('n8l.ir', '/f/k7m3qx9', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('n8l.ir', '/report/shop', PUBLIC)).toEqual({ kind: 'rewrite', pathname: '/n8l/report/shop' });
    expect(resolveHostRoute('n8l.ir', '/', PUBLIC)).toEqual({ kind: 'rewrite', pathname: '/n8l' });
  });

  it('keeps panel and marketing pages off the short domain', () => {
    // /form روی n8l.ir به /n8l/form می‌رود که صفحه ندارد (۴۰۴)
    expect(resolveHostRoute('n8l.ir', '/form', PUBLIC)).toEqual({ kind: 'rewrite', pathname: '/n8l/form' });
    expect(resolveHostRoute('n8l.ir', '/n8l/f/x', PUBLIC)).toEqual({ kind: 'not-found' });
  });

  it('keeps noroform off until launch, in production by default', () => {
    expect(noroformEnabled(undefined, 'production')).toBe(false);
    expect(noroformEnabled('true', 'production')).toBe(true);
    expect(noroformEnabled(undefined, 'development')).toBe(true);
    expect(noroformEnabled('false', 'development')).toBe(false);
  });

  it('shows the coming-soon page for the noroform panel when it is off', () => {
    const soon = { kind: 'rewrite', pathname: '/landing/form/soon', mainHost: true };
    expect(resolveHostRoute('noroset.com', '/form', PUBLIC, false)).toEqual(soon);
    expect(resolveHostRoute('noroset.com', '/form/a1/editor', PUBLIC, false)).toEqual(soon);
    expect(resolveHostRoute('noroset.com', '/f/a1', PUBLIC, false)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('n8l.ir', '/f/a1', PUBLIC, false)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('noroset.com', '/formx', PUBLIC, false)).toEqual({ kind: 'next' });
    expect(resolveHostRoute('noroset.com', '/link', PUBLIC, false)).toEqual({ kind: 'next' });
    expect(resolveHostRoute('shop.n8l.ir', '/', PUBLIC, false)).toEqual({ kind: 'rewrite', pathname: '/nls/shop', linkPage: true });
  });

  it('hides the internal prefix on the main domain', () => {
    expect(resolveHostRoute('noroset.com', '/n8l/f/x', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('noroset.com', '/n8l', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('noroset.com', '/n8lx', PUBLIC)).toEqual({ kind: 'next' });
    expect(resolveHostRoute('noroset.com', '/f/a1', PUBLIC)).toEqual({ kind: 'next' });
  });

  it('serves the link page of a subdomain only at its root', () => {
    expect(resolveHostRoute('shop.n8l.ir', '/', PUBLIC)).toEqual({ kind: 'rewrite', pathname: '/nls/shop', linkPage: true });
    expect(resolveHostRoute('my-shop.n8l.ir', '/', PUBLIC)).toEqual({ kind: 'rewrite', pathname: '/nls/my-shop', linkPage: true });
    expect(resolveHostRoute('shop.n8l.ir', '/f/x', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('a.b.n8l.ir', '/', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('-x.n8l.ir', '/', PUBLIC)).toEqual({ kind: 'not-found' });
    // مسیر داخلی صفحه‌ی لینک از هیچ دامنه‌ای مستقیم باز نمی‌شود.
    expect(resolveHostRoute('noroset.com', '/nls/shop', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('n8l.ir', '/nls/shop', PUBLIC)).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('evil-n8l.ir', '/', PUBLIC)).toEqual({ kind: 'next' });
  });

  it('builds public link urls', () => {
    expect(publicLinkUrl('n8l.ir', 'shop')).toBe('https://shop.n8l.ir');
    expect(publicLinkUrl('n8l.localhost', 'shop', '3000')).toBe('http://shop.n8l.localhost:3000');
    expect(publicReportUrl('n8l.ir', 'shop')).toBe('https://n8l.ir/report/shop');
  });

  it('serves forms and the response viewer only on the noroform host', () => {
    const token = 't'.repeat(43);
    expect(resolveHostRoute('n8f.ir', '/', PUBLIC, true, 'n8f.ir')).toEqual({ kind: 'rewrite', pathname: '/n8f' });
    expect(resolveHostRoute('n8f.ir', '/k7m3qx9', PUBLIC, true, 'n8f.ir')).toEqual({
      kind: 'rewrite',
      pathname: '/n8f/f/k7m3qx9',
    });
    expect(resolveHostRoute('n8f.ir', `/r/${token}`, PUBLIC, true, 'n8f.ir')).toEqual({
      kind: 'rewrite',
      pathname: `/n8f/r/${token}`,
    });
    expect(resolveHostRoute('n8f.ir', '/r/short', PUBLIC, true, 'n8f.ir')).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('n8l.ir', `/r/${token}`, PUBLIC, true, 'n8f.ir')).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('noroset.com', `/r/${token}`, PUBLIC, true, 'n8f.ir')).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('noroset.com', '/n8f/r/x', PUBLIC, true, 'n8f.ir')).toEqual({ kind: 'not-found' });
    expect(resolveHostRoute('n8f.ir', `/r/${token}`, PUBLIC, false, 'n8f.ir')).toEqual({ kind: 'not-found' });
  });
});

describe('blog routes', () => {
  it('encodes Persian slugs and keeps sitemap/robots off the short domain', () => {
    expect(routes.blog.post('ساخت-صفحه')).toBe(`/blog/${encodeURIComponent('ساخت-صفحه')}`);
    expect(routes.blog.category('guide')).toBe('/blog/category/guide');
    expect(routes.admin.blogPost('p1')).toBe('/admin/blog/p1');
    expect(isPublicHost('n8l.ir', 'n8l.ir')).toBe(true);
    expect(isPublicHost('shop.n8l.ir', 'n8l.ir')).toBe(true);
    expect(isPublicHost('noroset.com', 'n8l.ir')).toBe(false);
  });

  it('serves robots.txt disallowing private directories on the main domain', async () => {
    const resNoroset = robotsGet(new Request('https://noroset.com/robots.txt', { headers: { host: 'noroset.com' } }));
    expect(resNoroset.status).toBe(200);
    const body = await resNoroset.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /link');
    expect(body).toContain('Disallow: /file');
    expect(body).toContain('Disallow: /form');
    expect(body).toContain('Disallow: /account');
    expect(body).toContain('Disallow: /billing');
    expect(body).toContain('Disallow: /auth');
    expect(body).toContain('Disallow: /shots');

    expect(body).not.toContain('n8l');
  });
});

describe('search engines on the short domain', () => {
  it('robots.txt of n8l and every link subdomain points at the n8l sitemap', async () => {
    for (const host of ['n8l.localhost:3000', 'shop.n8l.localhost:3000']) {
      const res = robotsGet(new Request(`http://${host}/robots.txt`, { headers: { host } }));
      expect(res.status, host).toBe(200);
      const body = await res.text();
      expect(body).toContain('Allow: /');
      expect(body).toContain('Disallow: /api/');
      expect(body).toContain('Sitemap: http://n8l.localhost:3000/sitemap.xml');
      expect(body).not.toContain('Disallow: /link');
    }
  });

  it('sitemap.xml of n8l lists only what the API allows, and 404s on subdomains', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({ pages: [{ slug: 'shop', lastmod: '2026-11-10T08:00:00.000Z' }, { slug: 'a-b', lastmod: null }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const res = await sitemapGet(new Request('http://n8l.localhost:3000/sitemap.xml', { headers: { host: 'n8l.localhost:3000' } }));
      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(fetchMock.mock.calls[0]![0]).toMatch(/\/norolink\/public\/sitemap$/);
      expect(xml).toContain('<url><loc>http://n8l.localhost:3000</loc></url>');
      expect(xml).toContain('<url><loc>http://shop.n8l.localhost:3000</loc><lastmod>2026-11-10T08:00:00.000Z</lastmod></url>');
      expect(xml).toContain('<url><loc>http://a-b.n8l.localhost:3000</loc></url>');

      const sub = await sitemapGet(new Request('http://shop.n8l.localhost:3000/sitemap.xml', { headers: { host: 'shop.n8l.localhost:3000' } }));
      expect(sub.status).toBe(404);

      // خطای API: ۵۰۳ (نه sitemap خالی که نشانی‌ها را از موتور جستجو پاک کند)
      fetchMock.mockImplementationOnce(async (_url: string) => new Response(null, { status: 500 }));
      const down = await sitemapGet(new Request('http://n8l.localhost:3000/sitemap.xml', { headers: { host: 'n8l.localhost:3000' } }));
      expect(down.status).toBe(503);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('decides the link page status before streaming', () => {
    expect(linkGate(404, { message: 'Not Found' })).toEqual({ kind: 'not-found' });
    expect(linkGate(200, { redirectTo: 'new-shop' })).toEqual({ kind: 'redirect', slug: 'new-shop' });
    // نشانی ریدایرکت فقط slug معتبر؛ هرگز host یا مسیر دلخواه
    expect(linkGate(200, { redirectTo: 'evil.com/x' })).toEqual({ kind: 'render' });
    expect(linkGate(503, { message: 'module_off', notice: 'به‌زودی برمی‌گردیم' })).toEqual({
      kind: 'unavailable',
      retryAfter: MODULE_OFF_RETRY_AFTER,
      notice: 'به‌زودی برمی‌گردیم',
    });
    expect(linkGate(429, null)).toEqual({ kind: 'unavailable', retryAfter: RATE_LIMIT_RETRY_AFTER, notice: null });
    // تعلیق مدیریت پلتفرم (§9.13): ۴۵۱/۴۰۳ بدون رندر؛ ۴۰۳ دیگر (مثلاً CSRF) به صفحه سپرده می‌شود.
    expect(linkGate(451, { message: 'page_suspended', notice: 'به دستور مرجع قضایی' })).toEqual({ kind: 'blocked', status: 451, notice: 'به دستور مرجع قضایی' });
    expect(linkGate(403, { message: 'page_suspended', notice: null })).toEqual({ kind: 'blocked', status: 403, notice: null });
    expect(linkGate(403, { message: 'Forbidden' })).toEqual({ kind: 'render' });
    // پلن تمام‌شده و صفحه‌ی عادی رندر می‌شوند؛ خطای دیگر هم به صفحه سپرده می‌شود
    expect(linkGate(200, { unavailable: true, notice: null })).toEqual({ kind: 'render' });
    expect(linkGate(200, { slug: 'shop', content: {} })).toEqual({ kind: 'render' });
    expect(linkGate(500, null)).toEqual({ kind: 'render' });
    expect(gateHtml('<b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('blog status before streaming', () => {
  const fa = 'ساخت-صفحه';

  it('recognises post, category and tag paths only', () => {
    expect(blogTarget(routes.blog.post(fa))).toEqual({ kind: 'post', slug: fa });
    expect(blogTarget(routes.blog.category('guide'))).toEqual({ kind: 'category', slug: 'guide' });
    expect(blogTarget(routes.blog.tag('seo'))).toEqual({ kind: 'tag', slug: 'seo' });
    for (const p of ['/blog', '/blog/', '/blog/feed', '/blog/category', '/blog/tag', '/blog/a/b', '/blogx/a', '/link/a', '/blog/%E0%A4%A']) {
      expect(blogTarget(p), p).toBeNull();
    }
    expect(blogApiPath({ kind: 'post', slug: fa })).toBe(`/blog/public/posts/${encodeURIComponent(fa)}`);
    expect(blogApiPath({ kind: 'tag', slug: 'seo' })).toBe('/blog/public/tags/seo');
    expect(blogApiPath({ kind: 'category', slug: 'guide' })).toBe('/blog/public/categories');
  });

  it('answers 404 and 308 from the API response, and leaves the rest to the page', () => {
    const post = { kind: 'post', slug: 'old' } as const;
    expect(blogGate(post, 404, null)).toEqual({ kind: 'not-found' });
    expect(blogGate(post, 200, { redirect: fa })).toEqual({ kind: 'redirect', slug: fa });
    expect(blogGate(post, 200, { redirect: 'old' })).toEqual({ kind: 'render' });
    expect(blogGate(post, 200, { post: {} })).toEqual({ kind: 'render' });
    expect(blogGate(post, 500, null)).toEqual({ kind: 'render' });
    expect(blogGate({ kind: 'tag', slug: 'x' }, 404, null)).toEqual({ kind: 'not-found' });
    const cat = { kind: 'category', slug: 'guide' } as const;
    expect(blogGate(cat, 200, [{ slug: 'guide' }])).toEqual({ kind: 'render' });
    expect(blogGate(cat, 200, [{ slug: 'news' }])).toEqual({ kind: 'not-found' });
    expect(blogGate(cat, 200, null)).toEqual({ kind: 'render' });
  });

  it('rewrites missing pages to a path that can never be a route', () => {
    // پوشه‌ی `_` در App Router route نیست؛ پس Next صفحه‌ی not-found را با ۴۰۴ واقعی رندر می‌کند.
    expect(NOT_FOUND_REWRITE.startsWith('/_')).toBe(true);
    expect(pageRoutes(APP_DIR).some((r) => r.startsWith(NOT_FOUND_REWRITE.split('/').slice(0, 2).join('/')))).toBe(false);
  });
});
