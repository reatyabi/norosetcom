import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نوروفایل — میزبان امن ابری فایل‌های سازمان | نوروست',
  description: 'فضای ابری S3 اختصاصی با بهینه‌سازی خودکار WebP، کراپ هوشمند غیرمخرب و ایزولاسیون کامل PostgreSQL RLS. ۱۰۰ مگابایت رایگان.',
  alternates: {
    canonical: '/landing/file',
  },
  openGraph: {
    type: 'website',
    title: 'نوروفایل — میزبان امن ابری فایل‌های سازمان | نوروست',
    description: 'فضای ابری S3 اختصاصی با بهینه‌سازی خودکار WebP، کراپ هوشمند غیرمخرب و ایزولاسیون کامل PostgreSQL RLS. ۱۰۰ مگابایت رایگان.',
    url: '/landing/file',
    siteName: 'نوروست',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نوروفایل — میزبان امن ابری فایل‌های سازمان | نوروست',
    description: 'فضای ابری S3 اختصاصی با بهینه‌سازی خودکار WebP، کراپ هوشمند غیرمخرب و ایزولاسیون کامل PostgreSQL RLS. ۱۰۰ مگابایت رایگان.',
  },
};

export default function LandingFileLayout({ children }: { children: ReactNode }) {
  return children;
}

