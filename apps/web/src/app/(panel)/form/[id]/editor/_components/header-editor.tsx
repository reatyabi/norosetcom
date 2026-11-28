'use client';

/**
 * ناحیه هدر فرم (Form Header Zone):
 * - کانتینر شفاف تمام‌عرض با گردی گوشه rounded-2xl و فواصل استاندار بر مبنای گام ۴px.
 * - پشتیبانی از حالت چسبان (Sticky) با بلور ملایم و بردر نیمه‌شفاف بوم.
 * - بلوک برندینگ (لوگو با باکس ۴۰×۴۰px، دکمه ویرایش شناور، عنوان و زیرعنوان درجا).
 * - نشانگر کپسولی هوشمند در سمت چپ (نمایان در sm+).
 * - میکرو-تولبار شناور ویرایشگر (تنظیم ترازبندی، چسبندگی، و پاک‌سازی) با خطوط راهنمای خط‌چین.
 * - پایبندی ۱۰۰٪ به توکن‌های معنایی موجود و ممنوعیت مطلق رنگ‌های هاردکدشده.
 */

import { useState } from 'react';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ImageIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { Button, cn, Skeleton } from '@noroset/ui';
import type { HeaderDefaults } from '@noroset/field-engine';
import type { HeaderAlign } from './types';

const ALIGN_ITEMS: { value: HeaderAlign; label: string; icon: typeof AlignRightIcon }[] = [
  { value: 'start', label: 'راست‌چین', icon: AlignRightIcon },
  { value: 'center', label: 'وسط‌چین', icon: AlignCenterIcon },
  { value: 'end', label: 'چپ‌چین', icon: AlignLeftIcon },
];

export interface HeaderEditorProps {
  value: HeaderDefaults;
  formTitle?: string;
  sticky: boolean;
  onStickyChange?: (sticky: boolean) => void;
  onChange: (patch: Partial<HeaderDefaults>) => void;
  loading?: boolean;
  className?: string;
}

export function HeaderEditor({
  value,
  formTitle: _formTitle,
  sticky,
  onStickyChange,
  onChange,
  loading = false,
  className,
}: HeaderEditorProps) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [logoDraft, setLogoDraft] = useState(value.logo_url);

  const align = value.align ?? 'start';
  const isCenter = align === 'center';
  const isEnd = align === 'end';

  return (
    <header
      className={cn(
        'group/header relative w-full flex items-center justify-between gap-3 rounded-2xl border border-transparent transition-all pt-4 pb-3 px-4 sm:px-5',
        'outline-dashed outline-[1.5px] outline-offset-2 outline-transparent hover:outline-nf-primary/60 focus-within:outline-nf-primary/60 transition-[outline-color]',
        sticky
          ? 'sticky top-0 z-30 backdrop-blur-sm bg-nf-on-canvas-surface/80 border-nf-on-canvas-border shadow-xs'
          : 'bg-transparent',
        className,
      )}
    >
      {/* ─── میکرو-تولبار شناور (حالت ادیتور) ─── */}
      <div className="absolute -top-3.5 left-3 z-30 flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-card-foreground shadow-md opacity-0 transition-opacity duration-150 ease-fluent group-hover/header:opacity-100 focus-within:opacity-100">
        <div className="flex items-center gap-0.5">
          {ALIGN_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = align === item.value;
            return (
              <Button
                key={item.value}
                type="button"
                size="icon-xs"
                variant={active ? 'secondary' : 'ghost'}
                aria-label={item.label}
                title={item.label}
                onClick={() => onChange({ align: item.value })}
                className={cn(
                  'size-6 rounded-md transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-3" />
              </Button>
            );
          })}
        </div>

        {onStickyChange && (
          <>
            <div className="w-px h-3.5 bg-border shrink-0" aria-hidden="true" />
            <Button
              type="button"
              size="icon-xs"
              variant={sticky ? 'secondary' : 'ghost'}
              aria-label={sticky ? 'هدر چسبان فعال' : 'هدر عادی'}
              title={sticky ? 'هدر چسبان فعال' : 'هدر عادی'}
              onClick={() => onStickyChange(!sticky)}
              className={cn(
                'size-6 rounded-md transition-colors',
                sticky
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {sticky ? <PinIcon className="size-3" /> : <PinOffIcon className="size-3" />}
            </Button>
          </>
        )}

        <div className="w-px h-3.5 bg-border shrink-0" aria-hidden="true" />
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="پاک کردن محتوای هدر"
          title="پاک کردن محتوای هدر"
          onClick={() => onChange({ logo_url: '', brand_title: '', brand_subtitle: '' })}
          className="size-6 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2Icon className="size-3" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : (
        <>
          {/* ─── بلوک برندینگ (لوگو، عنوان و زیرعنوان) ─── */}
          <div
            className={cn(
              'flex min-w-0 flex-1 gap-3',
              isCenter ? 'flex-col items-center justify-center text-center' : 'items-center',
              isEnd ? 'flex-row-reverse text-end justify-start' : 'flex-row text-start justify-start',
            )}
          >
            {/* ۱. باکس لوگو و دکمه شناور تغییر آیکون */}
            {value.show_logo !== false && (
              <div className="relative shrink-0">
                <div className="relative flex size-10 items-center justify-center rounded-xl border border-nf-on-canvas-border bg-nf-on-canvas-surface/60 backdrop-blur-sm overflow-hidden">
                  {value.logo_url ? (
                    <img
                      src={value.logo_url}
                      alt={value.brand_title || 'لوگو'}
                      className="size-full rounded-xl object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5 text-nf-on-canvas-muted" />
                  )}
                </div>

                {/* دکمه شناور تغییر آیکون (فقط در حالت ویرایش) */}
                <button
                  type="button"
                  aria-label={value.logo_url ? 'تغییر تصویر لوگو' : 'افزودن لوگو'}
                  title={value.logo_url ? 'تغییر تصویر لوگو' : 'افزودن لوگو'}
                  onClick={() => {
                    setLogoDraft(value.logo_url || '');
                    setEditingUrl((v) => !v);
                  }}
                  className="absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  <PencilIcon className="size-2.5" />
                </button>

                {/* پاپ‌اور درون‌خطی تغییر نشانی لوگو */}
                {editingUrl && (
                  <div className="absolute top-full start-0 z-40 mt-1.5 flex w-64 items-center gap-1.5 rounded-lg border border-border bg-popover p-1.5 shadow-md">
                    <input
                      autoFocus
                      type="url"
                      value={logoDraft}
                      placeholder="https://... نشانی تصویر"
                      onChange={(e) => setLogoDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onChange({ logo_url: logoDraft.trim() });
                          setEditingUrl(false);
                        }
                        if (e.key === 'Escape') setEditingUrl(false);
                      }}
                      className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                    <Button
                      size="icon-xs"
                      onClick={() => {
                        onChange({ logo_url: logoDraft.trim() });
                        setEditingUrl(false);
                      }}
                    >
                      ✓
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditingUrl(false)}>
                      <XIcon />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ۲. عنوان و زیرعنوان برند (ویرایش درجا با کلاس nf-inline-edit) */}
            <div className={cn('flex min-w-0 flex-col', isCenter ? 'items-center max-w-xs' : 'flex-1 max-w-md')}>
              {value.show_title !== false && (
                <input
                  value={value.brand_title}
                  placeholder="عنوان برند"
                  aria-label="عنوان برند"
                  maxLength={150}
                  onChange={(e) => onChange({ brand_title: e.target.value })}
                  className="nf-inline-edit w-full truncate py-0.5 px-1 text-sm sm:text-base font-extrabold leading-tight text-nf-on-canvas outline-none placeholder:text-nf-on-canvas-muted/60"
                />
              )}
              {value.show_subtitle !== false && (
                <input
                  value={value.brand_subtitle}
                  placeholder="زیرعنوان برند (اختیاری)"
                  aria-label="زیرعنوان برند"
                  maxLength={200}
                  onChange={(e) => onChange({ brand_subtitle: e.target.value })}
                  className="nf-inline-edit w-full truncate py-0.5 px-1 mt-0.5 text-xs leading-tight text-nf-on-canvas-muted outline-none placeholder:text-nf-on-canvas-muted/50"
                />
              )}
            </div>
          </div>

          {/* ─── نشانگر / بج سمت چپ (نمایان در sm+؛ در زمان هاور/ویرایش جهت جلوگیری از تداخل محو می‌شود) ─── */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-nf-on-canvas-border bg-nf-on-canvas-surface/60 px-2.5 py-1 text-xs font-medium text-nf-on-canvas-muted backdrop-blur-sm select-none shrink-0 transition-opacity duration-150 group-hover/header:opacity-0 group-hover/header:pointer-events-none focus-within:opacity-0 focus-within:pointer-events-none">
            <span className="size-1.5 rounded-full bg-nf-primary" aria-hidden="true" />
            <span>{sticky ? 'هدر چسبان' : 'فرم رسمی'}</span>
          </div>
        </>
      )}
    </header>
  );
}
