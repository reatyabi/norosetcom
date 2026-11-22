'use client';

import { useEffect } from 'react';
import { Button } from '@noroset/ui';

export default function MarketingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[50svh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">صفحه بارگذاری نشد</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        اتصال یا سرور پاسخ نداد. یک‌بار دیگر تلاش کنید.
      </p>
      <Button type="button" onClick={reset}>
        تلاش دوباره
      </Button>
    </div>
  );
}
