'use client';

import { useEffect } from 'react';

/** خطای دایرکتوری: پیام کوتاه فارسی + تلاش دوباره. */
export default function DirectoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">دایرکتوری بارگذاری نشد</h1>
      <p className="max-w-md text-sm text-muted-foreground">اتصال برقرار نشد. یک‌بار دیگر تلاش کنید.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
