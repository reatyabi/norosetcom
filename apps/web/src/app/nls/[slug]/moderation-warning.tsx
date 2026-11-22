import { TriangleAlertIcon } from 'lucide-react';

// هشدار مدیریت پلتفرم پیش از صفحه‌ی لینک (docs/architecture.md §9.13)؛ الگوی صفحه‌ی هشدار فیشینگ مرورگرها:
// اقدام امن (بستن/بازگشت) برجسته و «ادامه» کم‌رنگ. بدون JS؛ «ادامه» همان نشانی با ?continue=1 است.

export function ModerationWarning({ notice, name, homeHref }: { notice: string; name: string; homeHref: string }) {
  return (
    <main lang="fa" dir="rtl" className="flex min-h-svh items-center justify-center bg-[#b3261e] p-6 text-white">
      <div className="flex w-full max-w-md flex-col gap-5">
        <TriangleAlertIcon aria-hidden className="size-12" />
        <h1 className="text-2xl font-bold leading-snug">هشدار: پیش از ادامه دقت کنید</h1>
        <p className="leading-relaxed">{notice}</p>
        {name ? <p className="text-sm text-white/80">صفحه: {name}</p> : null}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a href={homeHref} className="inline-flex h-11 items-center rounded-lg bg-white px-5 font-semibold text-[#b3261e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            بازگشت به جای امن
          </a>
          <a href="?continue=1" rel="nofollow" className="inline-flex h-11 items-center px-2 text-sm text-white/85 underline underline-offset-4 hover:text-white">
            خطر را می‌پذیرم، ادامه می‌دهم
          </a>
        </div>
      </div>
    </main>
  );
}

/** نوار ثابت بالای صفحه پس از «ادامه». */
export function WarningBar({ notice }: { notice: string }) {
  return (
    <div role="alert" lang="fa" dir="rtl" className="sticky top-0 z-50 flex items-start gap-2 bg-[#b3261e] px-4 py-2.5 text-sm leading-relaxed text-white">
      <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{notice}</span>
    </div>
  );
}
