'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, buttonVariants, Card, CardContent, CardDescription, CardHeader, CardTitle, MotionArt, Skeleton } from '@noroset/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';

// مصرف لینک ورود پشتیبانی (docs/architecture.md §9.11). توکن در fragment است (به سرور، لاگ یا Referer
// نمی‌رسد) و همان لحظه از آدرس پاک می‌شود. سرور فقط ادمین صادرکننده را با نشست خودش می‌پذیرد.

type State = { kind: 'working' } | { kind: 'error'; message: string; login: boolean };

export default function SupportPage() {
  const [state, setState] = useState<State>({ kind: 'working' });
  const started = useRef(false);

  useEffect(() => {
    // StrictMode effect را دوبار اجرا می‌کند؛ توکن یک‌بارمصرف است.
    if (started.current) return;
    started.current = true;
    const token = decodeURIComponent(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);

    void (async () => {
      if (!token) {
        setState({ kind: 'error', message: 'لینک ورود پشتیبانی کامل نیست.', login: false });
        return;
      }
      try {
        // اگر نشست پشتیبانی دیگری باز است، اول بسته شود.
        await api('/auth/support/end', { method: 'POST' }).catch(() => undefined);
        await api('/auth/support/redeem', { method: 'POST', body: { token } });
        // بارگذاری کامل تا پنل با هویت تازه از صفر بالا بیاید.
        window.location.replace(routes.link.home);
      } catch (err) {
        const login = err instanceof ApiError && err.status === 401;
        setState({
          kind: 'error',
          message: login ? 'برای استفاده از این لینک اول با حساب مدیر پلتفرمی که آن را ساخته وارد شوید، سپس لینک را دوباره باز کنید.' : errorMessage(err),
          login,
        });
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-popover shadow-lg">
        <CardHeader>
          <div className="my-2 flex justify-center">
            <MotionArt name="support" className="size-20" />
          </div>
          <CardTitle className="text-lg">ورود پشتیبانی</CardTitle>
          <CardDescription>ورود مدیر پلتفرم به حساب کاربر برای پشتیبانی</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.kind === 'working' ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Skeleton className="size-4 rounded-full" />
                در حال ورود به حساب کاربر…
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                {state.login ? (
                  <Link href={routes.auth(routes.admin.home)} className={buttonVariants()}>
                    ورود
                  </Link>
                ) : (
                  <Link href={routes.admin.users} className={buttonVariants({ variant: 'outline' })}>
                    بازگشت به مدیریت پلتفرم
                  </Link>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
