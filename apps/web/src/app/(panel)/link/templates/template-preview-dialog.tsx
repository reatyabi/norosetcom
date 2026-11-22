'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorIcon,
  SmartphoneIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import {
  Button,
  cn,
  Dialog,
  DialogPopup,
} from '@noroset/ui';
import {
  LINK_TEMPLATE_CATEGORY_LABELS,
  LinkPage,
  templateElements,
  type LinkTemplate,
} from '@noroset/norolink/ui';
import { useLucideIcon, usesLucide } from '@/lib/lucide-icons';
import { PUBLIC_FILES_BASE, PUBLIC_HOST } from '../links-shared';

export interface TemplatePreviewDialogProps {
  template: LinkTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: LinkTemplate) => void;
}

/**
 * قاب گوشی پیش‌نمایش: صفحه در عرض واقعی موبایل (۳۹۰px) رندر می‌شود و قاب با نسبت ۳۹۰:۸۴۴
 * (نسبت گوشی‌های امروزی) ساخته می‌شود. اندازه‌های سیال صفحه‌ی لینک از عرض قاب حساب می‌شوند،
 * پس اگر صفحه مستقیماً در عرض قاب رندر شود و ارتفاع قاب به‌اندازه‌ی پنجره کشیده/فشرده شود،
 * پیش‌نمایش نسبت موبایل را از دست می‌دهد؛ اینجا کل قاب با zoom در صحنه جا می‌شود تا نسبت حفظ شود.
 */
const PHONE_SCREEN_WIDTH = 390;
const PHONE_SCREEN_HEIGHT = 844;
const PHONE_BEZEL = 8;
const PHONE_FRAME_WIDTH = PHONE_SCREEN_WIDTH + PHONE_BEZEL * 2;
const PHONE_FRAME_HEIGHT = PHONE_SCREEN_HEIGHT + PHONE_BEZEL * 2;

/**
 * قاب مرورگر دسکتاپ پیش‌نمایش: نسبت ۱۶:۱۰ (۱۰۲۴×۶۴۰) با نوار مرورگر در همان ارتفاع؛ مثل قاب گوشی
 * نسبت ثابت دارد و با zoom در صحنه جا می‌شود، پس ارتفاع پنجره شکل قاب را عوض نمی‌کند.
 */
const DESKTOP_FRAME_WIDTH = 1024;
const DESKTOP_FRAME_HEIGHT = 640;

/** بدون نوار اسکرول: صفحه‌های داخل موکاپ با اسکرول‌پذیر می‌مانند ولی نوارشان دیده نمی‌شود. */
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** اندازه‌ی زنده‌ی صحنه‌ی نمایش (ResizeObserver)؛ پیش از اولین اندازه‌گیری null. */
function useStageSize(): [(el: HTMLDivElement | null) => void, { width: number; height: number } | null] {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, size];
}

/**
 * مدال پیش‌نمایش تمام‌عیار قالب با ابعاد مناسب، قاب گوشی موبایل یا نمایشگر دسکتاپ،
 * و دکمه‌ی اقدام برای ساخت صفحه‌ی تازه از قالب انتخاب‌شده.
 */
export function TemplatePreviewDialog({
  template,
  open,
  onClose,
  onUseTemplate,
}: TemplatePreviewDialogProps) {
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile');
  const [stageRef, stageSize] = useStageSize();

  // هر قاب هرگز بزرگ‌تر از اندازه‌ی واقعی نمی‌شود و در صحنه‌ی کوچک‌تر با zoom هم‌نسبت کوچک می‌شود.
  const phoneZoom = stageSize ? Math.min(stageSize.width / PHONE_FRAME_WIDTH, stageSize.height / PHONE_FRAME_HEIGHT, 1) : 0;
  const desktopZoom = stageSize ? Math.min(stageSize.width / DESKTOP_FRAME_WIDTH, stageSize.height / DESKTOP_FRAME_HEIGHT, 1) : 0;

  const preview = useMemo(() => {
    if (!template) return null;
    return {
      content: template.content,
      elements: templateElements(template),
    };
  }, [template]);

  const lucideIcon = useLucideIcon(usesLucide(preview?.elements ?? []));

  if (!template || !preview) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPopup
        dir="rtl"
        showCloseButton={false}
        className="flex h-[92vh] max-h-[880px] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card p-0 shadow-lg"
      >
        {/* سربرگ مدال: عنوان قالب، دسته‌بندی، سوییچر نما و دکمه‌ی استفاده */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 sm:px-6 backdrop-blur-md">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base sm:text-lg font-bold text-foreground">
                {template.title}
              </h2>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {LINK_TEMPLATE_CATEGORY_LABELS[template.category]}
              </span>
            </div>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {template.description}
            </p>
          </div>

          {/* تغییر نمای موبایل / دسکتاپ: ظریف، فول رادیوس و فقط با آیکون */}
          <div
            role="group"
            aria-label="تغییر نمای پیش‌نمایش"
            className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-muted/60 p-0.5 shadow-2xs md:flex select-none"
          >
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              title="پیش‌نمایش موبایل"
              aria-label="پیش‌نمایش موبایل"
              aria-pressed={viewport === 'mobile'}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 ease-fluent',
                viewport === 'mobile'
                  ? 'bg-background text-foreground shadow-xs ring-1 ring-border/50'
                  : 'hover:bg-muted hover:text-foreground',
              )}
            >
              <SmartphoneIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              title="پیش‌نمایش دسکتاپ"
              aria-label="پیش‌نمایش دسکتاپ"
              aria-pressed={viewport === 'desktop'}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 ease-fluent',
                viewport === 'desktop'
                  ? 'bg-background text-foreground shadow-xs ring-1 ring-border/50'
                  : 'hover:bg-muted hover:text-foreground',
              )}
            >
              <MonitorIcon className="size-3.5" />
            </button>
          </div>

          {/* دکمه‌های اقدام: استفاده از قالب و بستن */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="بستن پیش‌نمایش"
              className="size-9 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onClose();
                onUseTemplate(template);
              }}
              className="gap-1.5 h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm"
            >
              <SparklesIcon className="size-3.5 sm:size-4" />
              <span>استفاده از این قالب</span>
            </Button>
          </div>
        </div>

        {/* صحنه‌ی نمایش پیش‌نمایش زنده؛ خودش اسکرول نمی‌شود، فقط قاب‌ها با نسبت ثابت در آن جا می‌شوند */}
        <div
          ref={stageRef}
          className={cn('flex flex-1 min-h-0 items-center justify-center overflow-auto bg-muted/35 p-3 sm:p-6', NO_SCROLLBAR)}
        >
          {viewport === 'mobile' ? (
            // تا اولین اندازه‌گیری صحنه چیزی رندر نمی‌شود تا قاب با اندازه‌ی کامل یک لحظه بیرون نزند.
            stageSize && phoneZoom > 0 ? (
              <div className="relative shrink-0" style={{ zoom: phoneZoom }}>
                {/* قاب گوشی همراه با نسبت واقعی موبایل */}
                <div
                  className="relative flex flex-col overflow-hidden rounded-[46px] border-[8px] border-slate-800 bg-background shadow-2xl ring-1 ring-black/10 dark:border-slate-900"
                  style={{ width: PHONE_FRAME_WIDTH, height: PHONE_FRAME_HEIGHT }}
                >
                  {/* ناچ کپسولی بالای گوشی */}
                  <div className="pointer-events-none absolute top-2.5 left-1/2 z-20 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-800 dark:bg-slate-900" />

                  {/* محتوای رندر زنده صفحه‌ی لینک (بدون حاشیه‌ی اضافه تا صفحه مثل گوشی واقعی تمام صفحه را بپوشاند) */}
                  <div className={cn('h-full overflow-y-auto overscroll-contain', NO_SCROLLBAR)} dir="rtl">
                    <LinkPage
                      content={preview.content}
                      elements={preview.elements}
                      assetBaseUrl={PUBLIC_FILES_BASE}
                      forceLicense={false}
                      lucideIcon={lucideIcon}
                      preview
                    />
                  </div>
                </div>
              </div>
            ) : null
          ) : stageSize && desktopZoom > 0 ? (
            <div className="relative shrink-0" style={{ zoom: desktopZoom }}>
              {/* قاب مرورگر دسکتاپ با نسبت ثابت */}
              <div
                className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ring-1 ring-black/10"
                style={{ width: DESKTOP_FRAME_WIDTH, height: DESKTOP_FRAME_HEIGHT }}
              >
                {/* نوار بالای مرورگر */}
                <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-3.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-500/80" />
                    <span className="size-2.5 rounded-full bg-amber-500/80" />
                    <span className="size-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div
                    dir="ltr"
                    className="mx-auto flex h-6 max-w-sm flex-1 items-center justify-center rounded-md border border-border bg-background px-3 text-[11px] font-mono text-muted-foreground num-en"
                  >
                    your-page.{PUBLIC_HOST}
                  </div>
                </div>

                {/* محتوای رندر زنده دسکتاپ */}
                <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', NO_SCROLLBAR)} dir="rtl">
                  <LinkPage
                    content={preview.content}
                    elements={preview.elements}
                    assetBaseUrl={PUBLIC_FILES_BASE}
                    forceLicense={false}
                    lucideIcon={lucideIcon}
                    preview
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
