import { Skeleton } from '@noroset/ui';

export default function MarketingLoading() {
  return (
    <div className="w-full" dir="rtl">
      {/* هیرو اسکلتون */}
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col items-start gap-6 lg:col-span-6">
            <Skeleton className="h-7 w-48 rounded-full" />
            <div className="flex flex-col gap-3 w-full">
              <Skeleton className="h-12 w-4/5 rounded-2xl" />
              <Skeleton className="h-12 w-3/5 rounded-2xl" />
            </div>
            <div className="space-y-2 w-full max-w-lg">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-12 w-36 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 lg:col-span-6">
            <Skeleton className="h-5 w-44 rounded-full" />
            <Skeleton className="h-[460px] w-full max-w-[340px] rounded-[36px]" />
          </div>
        </div>
      </section>

      {/* کارت‌های سه‌گانه محصولات */}
      <section className="border-t border-border/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12 flex flex-col items-center gap-3">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-9 w-72 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col justify-between rounded-3xl border border-border p-8 shadow-xs">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="size-12 rounded-2xl" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-36 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-4 w-4/5 rounded" />
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-border/40 mt-6 flex items-center justify-between">
                  <Skeleton className="h-6 w-20 rounded" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
