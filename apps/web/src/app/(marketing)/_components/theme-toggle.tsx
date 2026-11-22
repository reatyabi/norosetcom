'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="size-9 rounded-full border border-border/50 bg-background/50" aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex size-9 items-center justify-center rounded-full border border-border/50 bg-background/60 text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={isDark ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
      title={isDark ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
    >
      {isDark ? <SunIcon className="size-4 text-tone-amber" /> : <MoonIcon className="size-4 text-slate-700" />}
    </button>
  );
}
