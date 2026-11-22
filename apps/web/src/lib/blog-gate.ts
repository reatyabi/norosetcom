// وضعیت HTTP صفحه‌های بلاگ پیش از رندر (docs/architecture.md §9.12)؛ همان مشکل صفحه‌ی لینک (src/lib/link-gate.ts):
// صفحه‌ها پشت loading.tsx ریشه stream می‌شوند و notFound()/permanentRedirect() داخل صفحه ۲۰۰ می‌دهند. proxy با همین
// منطق خالص پیش از stream ۴۰۴ و ۳۰۸ را برمی‌گرداند؛ خود صفحه‌ها همچنان پشتیبان‌اند.

export type BlogTarget = { kind: 'post' | 'category' | 'tag'; slug: string };

export type BlogGate = { kind: 'render' } | { kind: 'not-found' } | { kind: 'redirect'; slug: string };

/** زیرمسیرهای `/blog/` که مقاله نیستند. */
const NOT_POSTS = new Set(['category', 'tag', 'feed']);

/** نشانی مقاله/دسته/برچسب از مسیر (با ارقام و حروف فارسی percent-encoded)؛ هر مسیر دیگر ← null. */
export function blogTarget(pathname: string): BlogTarget | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'blog') return null;
  let slug: string;
  try {
    slug = decodeURIComponent(parts[parts.length - 1] ?? '');
  } catch {
    return null;
  }
  if (!slug) return null;
  if (parts.length === 2 && !NOT_POSTS.has(parts[1]!)) return { kind: 'post', slug };
  if (parts.length === 3 && (parts[1] === 'category' || parts[1] === 'tag')) return { kind: parts[1], slug };
  return null;
}

/** مسیر API عمومی بلاگ برای بررسی وجود (`/blog/public/...`). */
export function blogApiPath(target: BlogTarget): string {
  const slug = encodeURIComponent(target.slug);
  if (target.kind === 'post') return `/blog/public/posts/${slug}`;
  if (target.kind === 'tag') return `/blog/public/tags/${slug}`;
  return '/blog/public/categories';
}

/** پاسخ API ← کار proxy. خطای دیگر (۵xx، بدنه‌ی نامعتبر) به صفحه سپرده می‌شود. */
export function blogGate(target: BlogTarget, status: number, body: unknown): BlogGate {
  if (status === 404) return { kind: 'not-found' };
  if (status < 200 || status >= 300) return { kind: 'render' };
  if (target.kind === 'post') {
    const redirect = (body as { redirect?: unknown } | null)?.redirect;
    if (typeof redirect === 'string' && redirect && redirect !== target.slug) return { kind: 'redirect', slug: redirect };
  }
  if (target.kind === 'category' && Array.isArray(body)) {
    return body.some((c) => (c as { slug?: unknown } | null)?.slug === target.slug) ? { kind: 'render' } : { kind: 'not-found' };
  }
  return { kind: 'render' };
}

/**
 * مقصد بازنویسی پاسخ ۴۰۴: پوشه‌ی `_` در App Router هرگز route نیست، پس Next همان صفحه‌ی not-found خودش را با
 * وضعیت ۴۰۴ واقعی رندر می‌کند.
 */
export const NOT_FOUND_REWRITE = '/_gate/not-found';
