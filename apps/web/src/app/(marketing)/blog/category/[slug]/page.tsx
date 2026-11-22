import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { routes } from '@/lib/routes';
import { BlogHeader, Breadcrumbs, CategoryNav, EmptyPosts, JsonLd, Pagination, PostGrid } from '../../_components/blog-ui';
import { BLOG_TITLE, getCategories, listPosts, PAGE_SIZE, pageParam, SITE_ORIGIN } from '../../_lib/blog-api';

// صفحه‌ی دسته با عنوان و توضیح سئوی خودش (docs/architecture.md §9.12).

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

const findCategory = cache(async (raw: string) => {
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // همان مقدار خام
  }
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return { category, categories };
});

const href = (slug: string) => (n: number) => (n > 1 ? `${routes.blog.category(slug)}?page=${n}` : routes.blog.category(slug));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await findCategory((await params).slug);
  const page = pageParam((await searchParams).page);
  const title = category.seoTitle || `${category.name} | ${BLOG_TITLE}`;
  const description = category.seoDescription || category.description || `مقاله‌های ${category.name} در ${BLOG_TITLE}`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { absolute: page > 1 ? `${title} — صفحه‌ی ${page.toLocaleString('fa-IR')}` : title },
    description,
    alternates: { canonical: href(category.slug)(page) },
    // دسته‌ی بی‌مقاله فهرست نمی‌شود
    robots: category.postCount ? undefined : { index: false, follow: true },
    openGraph: { type: 'website', title, description, url: routes.blog.category(category.slug), locale: 'fa_IR', siteName: 'نوروست' },
  };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { category, categories } = await findCategory((await params).slug);
  const page = pageParam((await searchParams).page);
  const list = await listPosts({ category: category.slug, page, limit: PAGE_SIZE });
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'بلاگ', item: `${SITE_ORIGIN}${routes.blog.home}` },
            { '@type': 'ListItem', position: 2, name: category.name, item: `${SITE_ORIGIN}${routes.blog.category(category.slug)}` },
          ],
        }}
      />
      <Breadcrumbs items={[{ name: 'بلاگ', href: routes.blog.home }, { name: category.name }]} />
      <BlogHeader title={category.name} description={category.description || undefined} />
      <CategoryNav categories={categories} active={category.slug} />
      {list.items.length ? <PostGrid posts={list.items} /> : <EmptyPosts text="هنوز مقاله‌ای در این دسته منتشر نشده است." />}
      <Pagination page={page} total={list.total} limit={PAGE_SIZE} href={href(category.slug)} />
    </main>
  );
}
