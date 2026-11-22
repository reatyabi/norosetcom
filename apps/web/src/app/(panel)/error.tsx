'use client';

import { useEffect } from 'react';
import { Button } from '@noroset/ui';

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[60svh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">مشکلی پیش آمد</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        این بخش بارگذاری نشد. یک‌بار دیگر تلاش کنید؛ اگر تکرار شد صفحه را دوباره باز کنید.
      </p>
      <Button type="button" onClick={reset}>
        تلاش دوباره
      </Button>
    </div>
  );
}
