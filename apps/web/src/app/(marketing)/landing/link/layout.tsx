import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نورولینک — درگاه هوشمند پیوندها و بیو | نوروست',
  description: 'صفحه بیو اختصاصی با آدرس yourname.n8l.ir؛ ۱۲ قالب شیک، ویجت آپارات و نشان، آمار دقیق بازدید بدون ردیاب. رایگان شروع کنید.',
  alternates: {
    canonical: '/landing/link',
  },
  openGraph: {
    type: 'website',
    title: 'نورولینک — درگاه هوشمند پیوندها و بیو | نوروست',
    description: 'صفحه بیو اختصاصی با آدرس yourname.n8l.ir؛ ۱۲ قالب شیک، ویجت آپارات و نشان، آمار دقیق بازدید بدون ردیاب.',
    url: '/landing/link',
    siteName: 'نوروست',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نورولینک — درگاه هوشمند پیوندها و بیو | نوروست',
    description: 'صفحه بیو اختصاصی با آدرس yourname.n8l.ir؛ ۱۲ قالب شیک، ویجت آپارات و نشان، آمار دقیق بازدید بدون ردیاب.',
  },
};

export default function LandingLinkLayout({ children }: { children: ReactNode }) {
  return children;
}

