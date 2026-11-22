import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { routes } from '@/lib/routes';
import { BlogHeader, Breadcrumbs, EmptyPosts, Pagination, PostGrid } from '../../_components/blog-ui';
import { BLOG_TITLE, fa, getTag, listPosts, PAGE_SIZE, pageParam, SITE_ORIGIN } from '../../_lib/blog-api';

// صفحه‌ی برچسب (docs/architecture.md §9.12). برچسب کم‌مقاله محتوای نازک است، پس زیر ۳ مقاله noindex.

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

const findTag = cache(async (raw: string) => {
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // همان مقدار خام
  }
  const tag = await getTag(slug);
  if (!tag) notFound();
  return tag;
});

const href = (slug: string) => (n: number) => (n > 1 ? `${routes.blog.tag(slug)}?page=${n}` : routes.blog.tag(slug));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const tag = await findTag((await params).slug);
  const page = pageParam((await searchParams).page);
  const title = `مقاله‌های ${tag.name} | ${BLOG_TITLE}`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { absolute: page > 1 ? `${title} — صفحه‌ی ${page.toLocaleString('fa-IR')}` : title },
    description: `${fa(tag.postCount)} مقاله با برچسب ${tag.name} در ${BLOG_TITLE}.`,
    alternates: { canonical: href(tag.slug)(page) },
    robots: tag.postCount >= 3 ? undefined : { index: false, follow: true },
  };
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const tag = await findTag((await params).slug);
  const page = pageParam((await searchParams).page);
  const list = await listPosts({ tag: tag.slug, page, limit: PAGE_SIZE });
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <Breadcrumbs items={[{ name: 'بلاگ', href: routes.blog.home }, { name: `#${tag.name}` }]} />
      <BlogHeader title={`#${tag.name}`} description={`${fa(list.total)} مقاله`} />
      {list.items.length ? <PostGrid posts={list.items} /> : <EmptyPosts text="مقاله‌ای با این برچسب منتشر نشده است." />}
      <Pagination page={page} total={list.total} limit={PAGE_SIZE} href={href(tag.slug)} />
    </main>
  );
}
