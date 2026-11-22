import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { routes } from '@/lib/routes';
import { PostCard } from '../blog/_components/blog-ui';
import { listPosts } from '../blog/_lib/blog-api';

const LATEST_COUNT = 4;

/**
 * چهار مطلب آخر بلاگ در انتهای صفحه‌ی اصلی (Server Component). خطای API بلاگ یا نبودن مطلب
 * صفحه‌ی اصلی را نمی‌شکند؛ فقط این بخش نمایش داده نمی‌شود.
 */
export async function LatestPosts() {
  const posts = await listPosts({ limit: LATEST_COUNT })
    .then((r) => r.items.slice(0, LATEST_COUNT))
    .catch(() => []);
  if (!posts.length) return null;

  return (
    <section aria-labelledby="latest-posts-heading" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20">
        <div className="flex items-center justify-between gap-4">
          <h2 id="latest-posts-heading" className="text-xl font-black text-foreground sm:text-3xl">
            آخرین مطالب بلاگ
          </h2>
          <Link
            href={routes.blog.home}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            مطالب بیشتر
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Link>
        </div>
        {/* موبایل: ردیف افقی با اسکرول؛ از sm به بعد شبکه (lg: یک سطر چهارتایی) */}
        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {posts.map((post) => (
            <div key={post.slug} className="flex w-[78%] shrink-0 snap-start sm:w-auto [&>article]:flex-1">
              <PostCard post={post} headingLevel={3} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
