'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, type ReactNode } from 'react';
import { applyStoredTheme } from '@noroset/ui';

/** تم روشن/تیره از تنظیم سیستم (کلاس `.dark` روی html) + بازگرداندن برند/رنگ پایه‌ی ذخیره‌شده. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
