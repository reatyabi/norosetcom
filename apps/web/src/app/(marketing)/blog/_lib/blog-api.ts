import type { PostListResponse, PublicCategory, PublicPostResponse, PublicTag, SitemapResponse } from '@noroset/blog/shared';

// خواندن API عمومی بلاگ در رندر سرور (بدون کش Next؛ docs/architecture.md §9.12).

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';

/** نشانی مطلق سایت برای canonical، OG، RSS و نقشه‌ی سایت. */
export const SITE_ORIGIN = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');

export const BLOG_TITLE = 'بلاگ نوروست';
export const BLOG_DESCRIPTION = 'آموزش‌ها، راهنماها و تازه‌های نوروست: ساخت صفحه‌ی لینک، معرفی کسب‌وکار در شبکه‌های اجتماعی و بازاریابی آنلاین.';
export const PAGE_SIZE = 12;

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_ORIGIN}${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`blog api ${res.status} ${path}`);
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const listPosts = (params: { page?: number; limit?: number; category?: string; tag?: string; q?: string; featured?: boolean }) =>
  get<PostListResponse>(`/blog/public/posts${qs({ ...params, featured: params.featured ? '1' : undefined })}`).then(
    (r) => r ?? { items: [], total: 0, page: 1, limit: PAGE_SIZE },
  );

export const getPost = (slug: string) => get<PublicPostResponse | { redirect: string }>(`/blog/public/posts/${encodeURIComponent(slug)}`);
export const getCategories = () => get<PublicCategory[]>('/blog/public/categories').then((r) => r ?? []);
export const getTag = (slug: string) => get<PublicTag>(`/blog/public/tags/${encodeURIComponent(slug)}`);
export const getSitemap = () => get<SitemapResponse>('/blog/public/sitemap');

/** شماره‌ی صفحه از query (`?page=`). */
export function pageParam(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 1 && n <= 1000 ? n : 1;
}

const longDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
export const faDate = (iso: string) => longDate.format(new Date(iso));
export const fa = (n: number) => n.toLocaleString('fa-IR');
