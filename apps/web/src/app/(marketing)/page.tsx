import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { routes } from '@/lib/routes';
import { CustomerLogos } from './_components/customer-logos';
import { LatestPosts } from './_components/latest-posts';
import { LinkShowcase } from './_components/link-showcase';
import { NorolinkFeatures } from './_components/norolink-features';

export const metadata: Metadata = {
  title: 'نورولینک از نوروست — دروازه ارتباطات شما',
  description: 'تمام کانال‌های ارتباطی و شناسه‌های دیجیتال خود را از طریق یک لینک‌پیج مدیریت کنید.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    title: 'نورولینک از نوروست — دروازه ارتباطات شما',
    description: 'تمام کانال‌های ارتباطی و شناسه‌های دیجیتال خود را از طریق یک لینک‌پیج مدیریت کنید.',
    url: '/',
    siteName: 'نوروست',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نورولینک از نوروست — دروازه ارتباطات شما',
    description: 'تمام کانال‌های ارتباطی و شناسه‌های دیجیتال خود را از طریق یک لینک‌پیج مدیریت کنید.',
  },
};

const STEPS = [
  { title: 'قالبت را انتخاب کن', text: 'از میان قالب‌های آماده.' },
  { title: 'لینک‌هایت را بچین', text: 'دکمه، شبکه‌ها، تصویر، ویدیو و نقشه.' },
  { title: 'نشانی‌ات را بفرست', text: 'در بیو، کارت ویزیت یا هر جای دیگر.' },
];

function StartButton() {
  return (
    <Link
      href={routes.link.home}
      className="inline-flex h-13 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      ساخت صفحه‌ی رایگان
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="w-full">
      <LinkShowcase />

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="text-center text-2xl font-black text-foreground sm:text-4xl">سه قدم تا صفحه‌ی خودت</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 md:mt-14">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col items-center text-center">
                <span className="text-4xl font-black text-primary">{(i + 1).toLocaleString('fa-IR')}</span>
                <h3 className="mt-3 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-1 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <NorolinkFeatures />

      <Suspense fallback={null}>
        <CustomerLogos />
      </Suspense>

      <section className="border-t border-border bg-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20">
          <p dir="ltr" className="text-2xl font-bold text-foreground sm:text-4xl">
            yourname<span className="text-primary">.n8l.ir</span>
          </p>
          <p className="mt-3 mb-8 text-lg text-muted-foreground">نشانی خودت را بگیر.</p>
          <StartButton />
        </div>
      </section>

      {/* خواندن API بلاگ رندر بقیه‌ی صفحه را معطل نمی‌کند */}
      <Suspense fallback={null}>
        <LatestPosts />
      </Suspense>
    </main>
  );
}
