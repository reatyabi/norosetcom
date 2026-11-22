import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon, FileSpreadsheetIcon, FileTextIcon, GitBranchIcon, LayersIcon } from 'lucide-react';
import { routes } from '@/lib/routes';

// تا لانچ نوروفرم، proxy مسیر /form را به این صفحه می‌آورد (docs/architecture.md §۲).

export const metadata: Metadata = {
  title: 'نوروفرم به‌زودی | نوروست',
  description: 'فرم‌ساز فارسی نوروست به‌زودی در دسترس قرار می‌گیرد: فرم چندصفحه‌ای، منطق شرطی و خروجی سازگار با اکسل.',
  robots: { index: false, follow: true },
};

const FEATURES = [
  { icon: LayersIcon, title: 'فرم چندصفحه‌ای', desc: 'صفحه‌های خوش‌آمد، سؤال‌ها و پایان با نوار پیشرفت برای پاسخ‌دهنده.' },
  { icon: GitBranchIcon, title: 'منطق شرطی', desc: 'هر پاسخ‌دهنده فقط سؤال‌هایی را می‌بیند که به پاسخ‌های قبلی او مربوط است.' },
  { icon: FileSpreadsheetIcon, title: 'خروجی اکسل فارسی', desc: 'پاسخ‌ها با فیلتر تاریخ شمسی و خروجی CSV سازگار با اکسل در دسترس‌اند.' },
];

export default function NoroformSoonPage() {
  return (
    <main className="w-full">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
          <FileTextIcon className="size-4" />
          <span>به‌زودی</span>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          <span className="text-purple-600 dark:text-purple-400">نوروفرم</span> در راه است
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          فرم‌ساز فارسی نوروست را برای عرضه آماده می‌کنیم. تا آن زمان می‌توانید با نورولینک صفحه‌ی لینک خود را بسازید.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={routes.link.home}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <span>ساخت صفحه با نورولینک</span>
            <ArrowLeftIcon className="size-4" />
          </Link>
          <Link
            href={routes.landing.form}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            معرفی نوروفرم
          </Link>
        </div>
        <ul className="mt-14 grid w-full gap-4 text-start sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="size-5 text-purple-600 dark:text-purple-400" />
              <h2 className="mt-3 text-sm font-bold text-foreground">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
