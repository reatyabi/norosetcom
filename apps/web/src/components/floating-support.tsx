'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  HeadphonesIcon,
  PhoneCallIcon,
  XIcon,
} from 'lucide-react';
import {
  SUPPORT_CHANNELS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_FORMATTED,
} from './support-channels';

/**
 * دکمه و بازشوی شناور پشتیبانی نوروست:
 * - قرارگیری ثابت در سمت راست پایین صفحه (Desktop/Tablet)
 * - مخفی در موبایل
 * - باز شدن منوی دسترسی مستقیم به بله، واتس‌اپ و تلگرام با شماره 09396655322
 * - امکان تماس تلفنی مستقیم و کپی شماره پشتیبانی
 * فقط در layout سایت (مارکتینگ) و ورود رندر می‌شود؛ در پنل پشتیبانی از منوی همبرگری است. در layout ریشه نیست:
 * روی n8l.ir مسیر مرورگر با rewrite فرق دارد و بررسی مسیر در کلاینت صفحه‌های عمومی را تشخیص نمی‌دهد.
 */
export function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // بستن منو با کلیک در خارج از کامپوننت
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // بازنشانی وضعیت کپی
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SUPPORT_PHONE);
      setCopied(true);
    } catch {
      // fallback
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col items-end"
      dir="rtl"
    >
      {/* پاپ‌اور بازشو پشتیبانی */}
      {open && (
        <div
          role="dialog"
          aria-label="پشتیبانی نوروست"
          className="absolute bottom-16 right-0 mb-3 w-88 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        >
          {/* هدر پاپ‌اور بدون زیرعنوان */}
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-success shadow-[0_0_9px_2px_rgba(16,185,129,0.7)]" title="آنلاین" />
              <span className="font-extrabold text-base text-foreground">پشتیبانی نوروست</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="بستن پنجره پشتیبانی"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* فهرست پیام‌رسان‌ها با فونت و آیکون بزرگتر و بدون زیرعنوان و باجت */}
          <div className="flex flex-col gap-0.5 py-2">
            {SUPPORT_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.id}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-xl px-2 py-1 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:bg-muted/80 hover:shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105"
                      style={{ backgroundColor: `${channel.themeColor}18`, color: channel.themeColor }}
                    >
                      <Icon className="size-6" />
                    </span>
                    <span className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
                      {channel.title}
                    </span>
                  </div>
                  <ArrowLeftIcon className="size-5 text-muted-foreground/60 transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-foreground" />
                </a>
              );
            })}
          </div>

          {/* بخش تماس تلفنی با جهت نمایش اصلاح‌شده (LTR) و بدون به هم ریختگی */}
          <div className="mt-1 border-t border-border/50 pt-2">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-2">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-2xs">
                  <PhoneCallIcon className="size-4.5" />
                </span>
                <span
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                  className="font-mono text-sm font-bold tracking-wider text-foreground select-all"
                >
                  0939 665 5322
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title="کپی شماره"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3.5 text-success dark:text-success" />
                      <span className="text-success dark:text-success">کپی شد</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5" />
                      <span>کپی</span>
                    </>
                  )}
                </button>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="flex h-8 items-center gap-1 rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  <span>تماس</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* دکمه شناور اصلی دارای لیبل عنوان "پشتیبانی" */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'بستن پشتیبانی' : 'پشتیبانی'}
        className="group relative flex h-12 items-center gap-2.5 rounded-full bg-primary px-4.5 text-primary-foreground shadow-xl shadow-primary/30 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:scale-105 hover:bg-primary/95 hover:shadow-2xl hover:shadow-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95"
      >
        {/* پالس نورانی وضعیت آنلاین */}
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/80 opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.95)]" />
          <span className="relative inline-flex size-3 rounded-full border-2 border-background bg-success shadow-[0_0_9px_2px_rgba(16,185,129,0.75)]" />
        </span>

        {/* آیکون هدست / بستن */}
        <span
          className={`flex items-center justify-center transition-transform duration-200 ${
            open ? 'rotate-90' : 'rotate-0'
          }`}
        >
          {open ? <XIcon className="size-5" /> : <HeadphonesIcon className="size-5" />}
        </span>

        {/* لیبل عنوان روی آیکون */}
        <span className="text-sm font-extrabold tracking-tight">
          {open ? 'بستن' : 'پشتیبانی'}
        </span>
      </button>
    </div>
  );
}
