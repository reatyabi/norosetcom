import '@/components/blog-prose.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { BLOG_AUTHOR, faqItems, tableOfContents, type PublicPostResponse, type TocItem } from '@noroset/blog/shared';
import { BlogContent } from '@noroset/blog/ui';
import { routes } from '@/lib/routes';
import { Breadcrumbs, JsonLd, PostCard } from '../_components/blog-ui';
import { Comments } from '../_components/comments';
import { ReadingProgress, ShareButtons } from '../_components/share';
import { BLOG_TITLE, fa, faDate, getPost, SITE_ORIGIN } from '../_lib/blog-api';

// صفحه‌ی مقاله (docs/architecture.md §9.12): رندر سرور، فهرست مطالب، مطالب مرتبط، نظرها و JSON-LD
// (BlogPosting، BreadcrumbList، FAQPage). نشانی قبلی ← ریدایرکت دائمی ۳۰۸.

type Props = { params: Promise<{ slug: string }> };

function decode(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** metadata و صفحه یک درخواست می‌زنند. */
const load = cache(async (rawSlug: string): Promise<PublicPostResponse> => {
  const r = await getPost(decode(rawSlug));
  if (!r) notFound();
  if ('redirect' in r) permanentRedirect(routes.blog.post(r.redirect));
  return r;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { post } = await load((await params).slug);
  const url = routes.blog.post(post.slug);
  const image = post.seo.ogImage ? [{ url: post.seo.ogImage.url, width: post.seo.ogImage.width ?? undefined, height: post.seo.ogImage.height ?? undefined, alt: post.seo.ogImage.alt }] : undefined;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { absolute: post.seo.title },
    description: post.seo.description,
    alternates: { canonical: post.seo.canonical ?? url },
    robots: post.seo.noindex ? { index: false, follow: true } : undefined,
    authors: [{ name: BLOG_AUTHOR }],
    keywords: post.tags.map((t) => t.name),
    openGraph: {
      type: 'article',
      url,
      title: post.seo.ogTitle,
      description: post.seo.ogDescription,
      siteName: 'نوروست',
      locale: 'fa_IR',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
      images: image,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: post.seo.ogTitle, description: post.seo.ogDescription, images: image?.map((i) => i.url) },
  };
}

function Toc({ items }: { items: TocItem[] }) {
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {items.map((t) => (
        <li key={t.id} className={t.level === 3 ? 'ps-3' : t.level === 4 ? 'ps-6' : undefined}>
          <a href={`#${t.id}`} className="line-clamp-2 text-muted-foreground transition-colors hover:text-primary">
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { post, related, comments } = await load((await params).slug);
  const url = `${SITE_ORIGIN}${routes.blog.post(post.slug)}`;
  const toc = tableOfContents(post.content).filter((t) => t.text);
  const faq = faqItems(post.content);
  const crumbs = [
    { name: 'خانه', href: routes.home },
    { name: 'بلاگ', href: routes.blog.home },
    ...(post.category ? [{ name: post.category.name, href: routes.blog.category(post.category.slug) }] : []),
    { name: post.title },
  ];
  const organization = { '@type': 'Organization', name: 'نوروست', url: SITE_ORIGIN };

  return (
    <>
      <ReadingProgress />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title.slice(0, 110),
            description: post.seo.description,
            image: post.seo.ogImage ? [post.seo.ogImage.url] : undefined,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: { ...organization, name: BLOG_AUTHOR },
            publisher: organization,
            mainEntityOfPage: { '@type': 'WebPage', '@id': url },
            articleSection: post.category?.name,
            keywords: post.tags.map((t) => t.name).join('، ') || undefined,
            wordCount: post.wordCount,
            commentCount: comments.length,
            inLanguage: 'fa-IR',
            isPartOf: { '@type': 'Blog', name: BLOG_TITLE, url: `${SITE_ORIGIN}${routes.blog.home}` },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.href ? `${SITE_ORIGIN}${c.href}` : url })),
          },
          ...(faq.length
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
                },
              ]
            : []),
        ]}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Breadcrumbs items={crumbs} />
          <header className="flex flex-col gap-4">
            {post.category ? (
              <Link href={routes.blog.category(post.category.slug)} className="w-fit text-sm font-medium text-primary hover:underline">
                {post.category.name}
              </Link>
            ) : null}
            <h1 className="text-3xl leading-[1.45] font-extrabold sm:text-4xl">{post.title}</h1>
            {post.excerpt ? <p className="text-lg leading-8 text-muted-foreground">{post.excerpt}</p> : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{BLOG_AUTHOR}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt}>{faDate(post.publishedAt)}</time>
              {post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10) ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    به‌روزرسانی <time dateTime={post.updatedAt}>{faDate(post.updatedAt)}</time>
                  </span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{fa(post.readingMinutes)} دقیقه مطالعه</span>
            </div>
          </header>
        </div>

        {post.cover ? (
          <figure className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile با کش immutable */}
            <img
              src={post.cover.url}
              alt={post.cover.alt || post.title}
              width={post.cover.width ?? undefined}
              height={post.cover.height ?? undefined}
              fetchPriority="high"
              className="w-full object-cover"
            />
          </figure>
        ) : null}

        <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <article id="article-body" className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-8">
            {toc.length >= 2 ? (
              <details className="rounded-2xl border border-border bg-card p-4 lg:hidden">
                <summary className="cursor-pointer font-semibold">فهرست مطالب</summary>
                <div className="mt-3">
                  <Toc items={toc} />
                </div>
              </details>
            ) : null}
            <BlogContent doc={post.content} assetBaseUrl={post.assetBaseUrl} />
            {post.tags.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="برچسب‌ها">
                {post.tags.map((t) => (
                  <li key={t.slug}>
                    <Link href={routes.blog.tag(t.slug)} className="block rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                      #{t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="border-t border-border pt-6">
              <ShareButtons url={url} title={post.title} />
            </div>
          </article>
          {toc.length >= 2 ? (
            <aside className="hidden lg:block">
              <nav aria-label="فهرست مطالب" className="sticky top-24 flex flex-col gap-3 border-s border-border ps-4">
                <span className="text-sm font-semibold">فهرست مطالب</span>
                <Toc items={toc} />
              </nav>
            </aside>
          ) : null}
        </div>

        {related.length ? (
          <section aria-labelledby="related-title" className="flex flex-col gap-5 border-t border-border pt-10">
            <h2 id="related-title" className="text-xl font-bold">
              مطالب مرتبط
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} headingLevel={3} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mx-auto w-full max-w-3xl border-t border-border pt-10">
          <Comments slug={post.slug} comments={comments} allowComments={post.allowComments} />
        </div>
      </main>
    </>
  );
}
