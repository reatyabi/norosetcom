import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, RssIcon, SearchIcon } from 'lucide-react';
import { cn } from '@noroset/ui';
import type { PostSummary, PublicCategory } from '@noroset/blog/shared';
import { routes } from '@/lib/routes';
import { fa, faDate } from '../_lib/blog-api';

// اجزای سرور صفحه‌های عمومی بلاگ (بدون JS در مرورگر).

export function PostMeta({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground', className)}>
      <time dateTime={post.publishedAt}>{faDate(post.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span className="flex items-center gap-1">
        <ClockIcon className="size-3" aria-hidden />
        {fa(post.readingMinutes)} دقیقه مطالعه
      </span>
    </div>
  );
}

function Cover({ post, className, eager }: { post: PostSummary; className?: string; eager?: boolean }) {
  return post.cover ? (
    // eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile با کش immutable
    <img
      src={post.cover.url}
      alt={post.cover.alt || post.title}
      width={post.cover.width ?? undefined}
      height={post.cover.height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]', className)}
    />
  ) : (
    <div className={cn('flex size-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-background', className)}>
      <span className="px-6 text-center text-lg font-bold text-foreground/70">{post.title}</span>
    </div>
  );
}

export function PostCard({ post, headingLevel = 2 }: { post: PostSummary; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-xs">
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        <Cover post={post} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {post.category ? (
          <Link href={routes.blog.category(post.category.slug)} className="relative z-10 w-fit text-xs font-medium text-primary hover:underline">
            {post.category.name}
          </Link>
        ) : null}
        <H className="text-base leading-7 font-bold">
          <Link href={routes.blog.post(post.slug)} className="after:absolute after:inset-0 hover:text-primary">
            {post.title}
          </Link>
        </H>
        {post.excerpt ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p> : null}
        <PostMeta post={post} className="mt-auto pt-2" />
      </div>
    </article>
  );
}

export function FeaturedPost({ post }: { post: PostSummary }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2">
      <div className="aspect-[16/9] overflow-hidden bg-muted md:aspect-auto md:min-h-80">
        <Cover post={post} eager />
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
        <span className="text-xs font-medium text-primary">{post.category?.name ?? 'مقاله‌ی ویژه'}</span>
        <h2 className="text-2xl leading-snug font-extrabold md:text-3xl">
          <Link href={routes.blog.post(post.slug)} className="after:absolute after:inset-0 hover:text-primary">
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? <p className="line-clamp-3 leading-7 text-muted-foreground">{post.excerpt}</p> : null}
        <PostMeta post={post} />
      </div>
    </article>
  );
}

export function PostGrid({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.slug} post={p} />
      ))}
    </div>
  );
}

export function CategoryNav({ categories, active }: { categories: PublicCategory[]; active?: string }) {
  const visible = categories.filter((c) => c.postCount > 0 || c.slug === active);
  if (!visible.length) return null;
  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={on ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="دسته‌های بلاگ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chip(routes.blog.home, 'همه', !active)}
      {visible.map((c) => chip(routes.blog.category(c.slug), c.name, c.slug === active))}
    </nav>
  );
}

export function BlogSearch({ q }: { q?: string }) {
  return (
    <form action={routes.blog.home} method="get" role="search" className="relative w-full sm:w-80">
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={q}
        maxLength={100}
        placeholder="جست‌وجو در مقاله‌ها"
        aria-label="جست‌وجو در مقاله‌ها"
        className="h-10 w-full rounded-full border border-border bg-card ps-9 pe-4 text-sm outline-none focus:border-primary"
      />
    </form>
  );
}

export function BlogHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {description ? <p className="max-w-2xl leading-7 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <a href={routes.blog.feed} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="خوراک RSS">
          <RssIcon className="size-4" />
        </a>
      </div>
    </header>
  );
}

/** صفحه‌بندی با پیوند (قابل خزش)؛ صفحه‌ی ۱ بدون `?page`. */
export function Pagination({ page, total, limit, href }: { page: number; total: number; limit: number; href: (page: number) => string }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const item = 'flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm';
  return (
    <nav aria-label="صفحه‌ها" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(item, 'border-border bg-card')} aria-label="صفحه‌ی قبل">
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1]! > 1 ? <span className="text-muted-foreground">…</span> : null}
          <Link
            href={href(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(item, n === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:text-primary')}
          >
            {fa(n)}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cn(item, 'border-border bg-card')} aria-label="صفحه‌ی بعد">
          <ChevronLeftIcon className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}

export function EmptyPosts({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{text}</p>;
}

/** JSON-LD امن: `<` درون رشته‌ها escape می‌شود تا `</script>` در محتوا اسکریپت را نبندد. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="مسیر" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronLeftIcon className="size-3" aria-hidden /> : null}
            {it.href ? (
              <Link href={it.href} className="hover:text-foreground">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page" className="line-clamp-1 text-foreground">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
