import { routes } from '@/lib/routes';
import { BLOG_DESCRIPTION, BLOG_TITLE, listPosts, SITE_ORIGIN } from '../_lib/blog-api';

// خوراک RSS ۲.۰ بیست مقاله‌ی آخر (docs/architecture.md §9.12).

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export async function GET(): Promise<Response> {
  const { items } = await listPosts({ limit: 20 });
  const blogUrl = `${SITE_ORIGIN}${routes.blog.home}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(BLOG_TITLE)}</title>
<link>${esc(blogUrl)}</link>
<description>${esc(BLOG_DESCRIPTION)}</description>
<language>fa-IR</language>
<atom:link href="${esc(`${SITE_ORIGIN}${routes.blog.feed}`)}" rel="self" type="application/rss+xml"/>
${items[0] ? `<lastBuildDate>${new Date(items[0].updatedAt).toUTCString()}</lastBuildDate>` : ''}
${items
  .map((p) => {
    const url = `${SITE_ORIGIN}${routes.blog.post(p.slug)}`;
    return `<item>
<title>${esc(p.title)}</title>
<link>${esc(url)}</link>
<guid isPermaLink="true">${esc(url)}</guid>
<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
<description>${esc(p.excerpt)}</description>
${p.category ? `<category>${esc(p.category.name)}</category>` : ''}
</item>`;
  })
  .join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
