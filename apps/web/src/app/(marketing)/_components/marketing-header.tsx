'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { buttonVariants, cn } from '@noroset/ui';
import { BrandLogo } from '@/components/brand';
import { routes } from '@/lib/routes';
import { findSignedInUser, hasSessionHint, useSessionHint } from '@/lib/session-hint';

export function MarketingHeader() {
  const router = useRouter();
  const signedIn = useSessionHint();

  useEffect(() => {
    if (signedIn) {
      void findSignedInUser();
    }
  }, [signedIn]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-xs transition-colors">
      <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center outline-none transition-transform hover:opacity-90 sm:static sm:top-auto sm:translate-x-0 sm:translate-y-0"
          aria-label="نوروست"
        >
          <BrandLogo className="h-[42px] w-[156px]" priority />
          <span className="sr-only">نوروست</span>
        </Link>

        <div className="ms-auto flex items-center gap-1 sm:gap-3">
          <Link
            href={signedIn ? routes.link.home : routes.auth()}
            onClick={(e) => {
              if (hasSessionHint() && !signedIn) {
                e.preventDefault();
                router.push(routes.link.home);
              }
            }}
            aria-label={signedIn ? 'ورود به پنل' : 'ورود / ثبت‌نام'}
            className={cn(buttonVariants({ variant: 'secondary' }), 'min-h-11 min-w-11 px-0 sm:min-w-0 sm:px-4')}
          >
            {signedIn ? (
              <LayoutDashboard aria-hidden="true" className="size-4 sm:hidden" />
            ) : (
              <LogIn aria-hidden="true" className="size-4 sm:hidden" />
            )}
            <span className="sr-only sm:not-sr-only">{signedIn ? 'ورود به پنل' : 'ورود / ثبت‌نام'}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
