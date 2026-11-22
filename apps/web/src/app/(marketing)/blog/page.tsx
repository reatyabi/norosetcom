import type { Metadata } from 'next';
import { routes } from '@/lib/routes';
import { BlogHeader, BlogSearch, CategoryNav, EmptyPosts, FeaturedPost, JsonLd, Pagination, PostGrid } from './_components/blog-ui';
import { BLOG_DESCRIPTION, BLOG_TITLE, getCategories, listPosts, PAGE_SIZE, pageParam, SITE_ORIGIN } from './_lib/blog-api';

// فهرست مقاله‌ها (docs/architecture.md §9.12): مقاله‌ی ویژه، دسته‌ها، جست‌وجو و صفحه‌بندی قابل خزش.

type Props = { searchParams: Promise<{ page?: string; q?: string }> };

const pageHref = (q: string | undefined) => (n: number) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (n > 1) params.set('page', String(n));
  const s = params.toString();
  return s ? `${routes.blog.home}?${s}` : routes.blog.home;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: rawPage, q } = await searchParams;
  const page = pageParam(rawPage);
  const title = page > 1 ? `${BLOG_TITLE} — صفحه‌ی ${page.toLocaleString('fa-IR')}` : BLOG_TITLE;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description: BLOG_DESCRIPTION,
    alternates: { canonical: pageHref(undefined)(page), types: { 'application/rss+xml': routes.blog.feed } },
    // نتیجه‌ی جست‌وجو فهرست نمی‌شود
    robots: q ? { index: false, follow: true } : undefined,
    openGraph: { type: 'website', title, description: BLOG_DESCRIPTION, url: routes.blog.home, locale: 'fa_IR', siteName: 'نوروست' },
  };
}

export default async function BlogHomePage({ searchParams }: Props) {
  const { page: rawPage, q: rawQ } = await searchParams;
  const page = pageParam(rawPage);
  const q = rawQ?.trim().slice(0, 100) || undefined;
  const showFeatured = page === 1 && !q;
  const [list, categories, featured] = await Promise.all([
    listPosts({ page, limit: PAGE_SIZE, q }),
    getCategories(),
    showFeatured ? listPosts({ featured: true, limit: 1 }) : null,
  ]);
  const hero = showFeatured ? (featured?.items[0] ?? list.items[0]) : undefined;
  const rest = hero ? list.items.filter((p) => p.slug !== hero.slug) : list.items;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: BLOG_TITLE,
          description: BLOG_DESCRIPTION,
          url: `${SITE_ORIGIN}${routes.blog.home}`,
          inLanguage: 'fa-IR',
          publisher: { '@type': 'Organization', name: 'نوروست', url: SITE_ORIGIN },
        }}
      />
      <BlogHeader title={q ? `نتیجه‌ی جست‌وجو: «${q}»` : 'بلاگ'} description={q ? undefined : BLOG_DESCRIPTION}>
        <BlogSearch q={q} />
      </BlogHeader>
      <CategoryNav categories={categories} />
      {hero ? <FeaturedPost post={hero} /> : null}
      {rest.length ? <PostGrid posts={rest} /> : hero ? null : <EmptyPosts text={q ? 'مقاله‌ای با این عبارت پیدا نشد.' : 'به‌زودی اولین مقاله‌ها منتشر می‌شوند.'} />}
      <Pagination page={page} total={list.total} limit={PAGE_SIZE} href={pageHref(q)} />
    </main>
  );
}
