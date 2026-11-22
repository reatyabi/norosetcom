import Link from 'next/link';
import { Skeleton } from '@noroset/ui';
import { BrandLogo } from '@/components/brand';
import { routes } from '@/lib/routes';

export function AuthCardSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center" dir="rtl">
      {/* برند و لوگو خارج از پنل در بالا وسط */}
      <Link
        href={routes.home}
        className="mb-6 inline-flex items-center justify-center transition-transform hover:scale-105"
        aria-label="نوروست"
      >
        <BrandLogo className="h-8 w-auto" priority />
      </Link>

      <div className="w-full rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl flex flex-col items-center gap-6">
        {/* عنوان جایگزین لوگو و تصویر */}
        <div className="flex flex-col items-center gap-2 w-full text-center">
          <Skeleton className="h-7 w-40 rounded-lg mx-auto" />
          <Skeleton className="size-16 rounded-xl my-1 mx-auto" />
          <Skeleton className="h-4 w-48 rounded mx-auto" />
        </div>

        {/* فیلد ورودی و دکمه */}
        <div className="w-full space-y-4 pt-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
        </div>

        {/* لینک‌های کمکی */}
        <div className="flex justify-between w-full pt-4 border-t border-border/40">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function AuthLoading() {
  return <AuthCardSkeleton />;
}
