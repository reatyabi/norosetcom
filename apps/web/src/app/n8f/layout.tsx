import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './n8f.css';

/** خروجی عمومی نوروفرم: مستقل از پوسته و توکن‌های دیزاین‌سیستم پلتفرم. */
export const metadata: Metadata = {
  title: 'مشاهده‌ی پاسخ | نوروفرم',
  robots: { index: false, follow: false },
};

export default function NoroformPublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground" dir="rtl">
      {children}
    </div>
  );
}
