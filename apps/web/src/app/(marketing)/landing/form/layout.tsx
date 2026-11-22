import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نوروفرم — فرم‌ساز فارسی هوشمند | نوروست',
  description: 'فرم‌ساز فارسی با منطق شرطی، چندصفحه‌ای، آپلود فایل و خروجی اکسل UTF-8. مناسب نظرسنجی، ثبت‌نام و جمع‌آوری سرنخ فروش.',
  alternates: {
    canonical: '/landing/form',
  },
  openGraph: {
    type: 'website',
    title: 'نوروفرم — فرم‌ساز فارسی هوشمند | نوروست',
    description: 'فرم‌ساز فارسی با منطق شرطی، چندصفحه‌ای، آپلود فایل و خروجی اکسل UTF-8.',
    url: '/landing/form',
    siteName: 'نوروست',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نوروفرم — فرم‌ساز فارسی هوشمند | نوروست',
    description: 'فرم‌ساز فارسی با منطق شرطی، چندصفحه‌ای، آپلود فایل و خروجی اکسل UTF-8.',
  },
};

export default function LandingFormLayout({ children }: { children: ReactNode }) {
  return children;
}

