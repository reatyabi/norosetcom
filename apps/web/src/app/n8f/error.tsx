'use client';

import { useEffect } from 'react';

/** خطای اجرای فرم عمومی: پیام کوتاه فارسی + تلاش دوباره (بدون وابستگی به پوسته‌ی پنل). */
export default function PublicFormError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="n8f-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
      <div className="n8f-card" style={{ padding: '2rem', maxWidth: '32rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>فرم بارگذاری نشد</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          اتصال برقرار نشد. یک‌بار دیگر تلاش کنید.
        </p>
        <button type="button" onClick={reset} className="n8f-button">
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
