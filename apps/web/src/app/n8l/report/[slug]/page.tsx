import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEFAULT_PUBLIC_HOST } from '@/lib/host-routing';
import { ReportForm } from './report-form';

// گزارش تخلف یک صفحه‌ی لینک روی دامنه‌ی کوتاه (n8l.ir/report/{slug}؛ docs/architecture.md §9.13). لینکش در پانویس
// هر صفحه‌ی عمومی است. صفحه ایندکس نمی‌شود؛ گزارش فقط برای صفحه‌ی منتشرشده ثبت می‌شود (API ۴۰۴ می‌دهد).

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const metadata: Metadata = {
  title: 'گزارش تخلف | نورولینک',
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.toLowerCase();
  if (!SLUG.test(slug) || slug.length > 63) notFound();
  return (
    <main lang="fa" dir="rtl" className="flex min-h-svh justify-center bg-background px-4 py-10 text-foreground">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">گزارش تخلف</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            اگر صفحه‌ی{' '}
            <span dir="ltr" className="font-medium text-foreground">
              {slug}.{process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST}
            </span>{' '}
            برای فریب، کلاهبرداری، جعل هویت یا انتشار محتوای غیرقانونی ساخته شده، به ما خبر دهید. گزارش‌ها را تیم نوروست
            بررسی می‌کند و نام شما به صاحب صفحه گفته نمی‌شود.
          </p>
        </header>
        <ReportForm slug={slug} />
      </div>
    </main>
  );
}
