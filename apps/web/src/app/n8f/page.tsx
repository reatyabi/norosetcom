import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'نوروفرم | فرم‌های عمومی',
  description: 'فرم‌های عمومی ساخته‌شده با نوروفرم.',
  robots: { index: false, follow: false },
};

/** ریشه‌ی دامنه‌ی خروجی عمومی؛ فعلاً صفحه‌ی برند کوتاه. */
export default function NoroformPublicHome() {
  return (
    <main className="n8f-shell">
      <article className="n8f-card">
        <header className="n8f-head">
          <p className="n8f-eyebrow">نوروفرم</p>
          <h1 className="n8f-title">فرم‌های عمومی</h1>
          <p className="n8f-meta">این دامنه مخصوص فرم‌های عمومی و مشاهده‌ی پاسخ‌های اشتراکی نوروفرم است.</p>
        </header>
        <footer className="n8f-foot">برای ساخت فرم، از پنل نوروفرم در noroset.com استفاده کنید.</footer>
      </article>
    </main>
  );
}
