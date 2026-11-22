'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  Share2Icon,
  XIcon,
} from 'lucide-react';
import { buttonVariants, cn } from '@noroset/ui';

export interface PublishNotice {
  kind: 'published' | 'unpublished';
  url: string;
  title: string;
}

/**
 * مدال اعلان نتیجه‌ی انتشار در مرکز صفحه:
 * ابعاد بزرگ و چشم‌گیر برای جلب تمرکز کاربر پس از انتشار، با لینک مستقیم،
 * ارقام کاملاً انگلیسی در نشانی، دکمه‌های اشتراک‌گذاری و مشاهده‌ی صفحه.
 */
export function PublishToast({
  notice,
  onClose,
}: {
  notice: PublishNotice | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // تمرکز روی خود دیالوگ است، نه یک دکمه‌ی خاص که روی موبایل برجسته شود یا صفحه‌کلید را باز کند.
  useEffect(() => {
    if (notice) panelRef.current?.focus();
  }, [notice]);

  useEffect(() => {
    if (!notice) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [notice, onClose]);

  if (!notice) return null;
  const published = notice.kind === 'published';
  const displayUrl = notice.url.replace(/^https?:\/\//, '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(notice.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // کلیپ‌بورد در دسترس نیست؛ نشانی در کادر قابل انتخاب است
    }
  };

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: notice.title, url: notice.url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  if (!published) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-notice-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div ref={panelRef} tabIndex={-1} className="relative w-full max-w-md rounded-2xl bg-card border outline-none border-border p-6 shadow-lg text-card-foreground animate-in zoom-in-95 fade-in-0 duration-200">
          <button
            type="button"
            aria-label="بستن"
            title="بستن"
            className={buttonVariants({
              variant: 'ghost',
              size: 'icon',
              className: 'absolute top-4 left-4 size-8 text-muted-foreground hover:text-foreground',
            })}
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border shadow-sm">
              <CircleSlashIcon className="size-7" />
            </div>
            <h2 id="publish-notice-title" className="text-xl font-bold text-foreground">
              صفحه از دسترس عمومی خارج شد
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
              این صفحه اکنون فقط برای شما در پنل ویرایشگر قابل مشاهده است و دیگر برای کاربران عمومی در دسترس نیست.
            </p>
            <button
              type="button"
              className={cn(buttonVariants({ size: 'default' }), 'mt-6 w-full font-semibold')}
              onClick={onClose}
            >
              متوجه شدم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-notice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-card border outline-none border-border p-6 sm:p-8 shadow-lg text-card-foreground animate-in zoom-in-95 fade-in-0 duration-200">
        <button
          type="button"
          aria-label="بستن اعلان"
          title="بستن"
          className={buttonVariants({
            variant: 'ghost',
            size: 'icon',
            className: 'absolute top-4 left-4 sm:top-5 sm:left-5 size-8 text-muted-foreground hover:text-foreground',
          })}
          onClick={onClose}
        >
          <XIcon className="size-4" />
        </button>

        {/* سربرگ موفقیت انتشار */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success border border-success/20 ring-4 ring-success/5 shadow-sm">
            <CircleCheckIcon className="size-9 stroke-[2.2]" />
          </div>
          <h2 id="publish-notice-title" className="text-xl sm:text-2xl font-bold text-foreground">
            صفحه با موفقیت منتشر شد!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
            لینک اختصاصی صفحه شما فعال و در دسترس عموم قرار گرفت. هم‌اکنون می‌توانید آن را به اشتراک بگذارید یا مشاهده کنید.
          </p>
        </div>

        {/* کادر نشانی اختصاصی با ارقام انگلیسی */}
        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <GlobeIcon className="size-3.5" />
              <span>نشانی اختصاصی صفحه</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success border border-success/20">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              فعال و آنلاین
            </span>
          </div>

          <div
            dir="ltr"
            className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-background p-2 ps-3.5 shadow-xs transition-colors hover:border-primary/40"
          >
            <span className="flex-1 truncate text-left font-mono text-sm sm:text-base font-semibold text-foreground select-all num-en tracking-tight">
              {displayUrl}
            </span>
            <button
              type="button"
              onClick={() => void copyLink()}
              className={buttonVariants({
                variant: copied ? 'default' : 'secondary',
                size: 'sm',
                className: 'h-9 shrink-0 gap-1.5 px-3.5 text-xs font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform]',
              })}
            >
              {copied ? <CheckIcon className="size-4 text-primary-foreground" /> : <CopyIcon className="size-4" />}
              <span>{copied ? 'کپی شد!' : 'کپی لینک'}</span>
            </button>
          </div>
        </div>

        {/* دکمه‌های اقدام اصلی */}
        <div className="mt-6 flex flex-row gap-3">
          <a
            href={notice.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده‌ی صفحه در زبانه‌ی جدید"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 min-w-0 flex-1 gap-2 text-sm font-semibold')}
          >
            <ExternalLinkIcon className="size-4" />
            <span className="truncate">مشاهده</span>
          </a>
          <button
            type="button"
            onClick={() => void share()}
            className={cn(buttonVariants({ size: 'lg' }), 'h-11 min-w-0 flex-1 gap-2 text-sm font-semibold shadow-sm')}
          >
            <Share2Icon className="size-4" />
            <span className="truncate">{copied ? 'کپی شد' : 'اشتراک‌گذاری'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
