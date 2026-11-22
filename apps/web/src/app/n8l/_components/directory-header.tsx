'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { SystemIcon } from '@noroset/ui';

export function DirectoryHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-[color,background-color,border-color,box-shadow,opacity,transform]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 outline-none">
            <SystemIcon name="norolink" className="size-9 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight sm:text-lg">نورولینک</span>
                <span className="rounded-md bg-tone-rose/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-tone-rose dark:text-tone-rose">
                  n8l.ir
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">دایرکتوری صفحات منتخب</span>
            </div>
          </Link>
        </div>

        {/* Nav + CTA */}
        <nav className="flex items-center gap-3" aria-label="ناوبری اصلی دایرکتوری">
          <a
            href="https://noroset.com/landing/link"
            className="hidden sm:inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            امکانات نورولینک
          </a>
          <a
            href="https://noroset.com/link"
            className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 hover:bg-pink-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform]"
          >
            <span>ساخت صفحه رایگان</span>
            <ArrowLeftIcon className="size-3.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
