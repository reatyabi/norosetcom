import { Skeleton } from '@noroset/ui';

/** اسکلتون گرید کارت‌های صفحات، فرم‌ها یا فایل‌ها */
export function ItemGridSkeleton({
  count = 8,
  thumbAspect = 'aspect-[4/3]',
}: {
  count?: number;
  thumbAspect?: string;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3 sm:gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xs"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className={`w-full rounded-lg ${thumbAspect}`} />
            <div className="flex items-start gap-2 px-1 pt-1">
              <Skeleton className="size-5 shrink-0 rounded-md" />
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/40 px-1 pt-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** اسکلتون جدول سطر‌به‌سطر */
export function ItemTableSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-2.5">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="divide-y divide-border/30">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="size-7 shrink-0 rounded-lg" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <Skeleton className="h-4 w-1/3 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Skeleton className="h-4 w-20 rounded max-sm:hidden" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="size-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** اسکلتون نوار قالب‌های آماده بالای صفحه */
export function StartBandSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 shrink-0 w-36 sm:w-44">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}

/** اسکلتون گرید فایل‌ها */
export function FileGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xs"
        >
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="flex flex-col gap-1 pt-2 px-1">
            <Skeleton className="h-4 w-4/5 rounded" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** اسکلتون آمار و نمودارها */
export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* ردیف شاخص‌های عددی */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* نمودار زمانی */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* جدول کلیک‌ها و ارجاع‌دهنده‌ها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <Skeleton className="h-4 w-28 rounded mb-3" />
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-36 rounded" />
                  <Skeleton className="h-3.5 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** اسکلتون صفحه مدیریت اشتراک و پلن‌ها */
export function BillingSkeleton() {
  return (
    <div className="flex flex-col gap-7">
      {/* کارت پلن جاری */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="mt-6 border-t border-border/50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* کارت‌های پلن‌های اشتراک */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-8 w-36 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-3.5 w-5/6 rounded" />
                ))}
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-full mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** اسکلتون پوسته کلی پنل کاربری Fluent 2 */
export function PanelLayoutSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      {/* نوار ابزار بالا */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <Skeleton className="h-8 w-64 rounded-full max-sm:hidden" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      {/* بدنه و کارت محتوا */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <StartBandSkeleton count={5} />
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
          <ItemGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
