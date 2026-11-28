'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PinIcon, PinOffIcon } from 'lucide-react';
import { cn } from '@noroset/ui';
import { type EditorPage } from './types';

export interface BottomBarEditorProps {
  pages?: EditorPage[];
  activePageIndex?: number;
  fixed?: boolean;
  onFixedChange?: (fixed: boolean) => void;
  prevLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  onPrevLabelChange?: (label: string) => void;
  onNextLabelChange?: (label: string) => void;
  onSubmitLabelChange?: (label: string) => void;
  className?: string;
}

export function BottomBarEditor({
  pages,
  activePageIndex = 0,
  fixed,
  onFixedChange,
  prevLabel: controlledPrevLabel,
  nextLabel: controlledNextLabel,
  submitLabel: controlledSubmitLabel,
  onPrevLabelChange,
  onNextLabelChange,
  onSubmitLabelChange,
  className,
}: BottomBarEditorProps) {
  // وضعیت ثابت/چسبان بودن نوار پایین در انتهای فرم
  const [localFixed, setLocalFixed] = useState(fixed ?? false);
  const isFixed = fixed !== undefined ? fixed : localFixed;

  const toggleFixed = () => {
    const next = !isFixed;
    setLocalFixed(next);
    onFixedChange?.(next);
  };

  const totalPages = Math.max(1, pages?.length ?? 1);
  const isFirstPage = activePageIndex === 0;
  const isLastPage = activePageIndex >= totalPages - 1;
  const isMultiPage = totalPages > 1;

  // متن‌های دکمه‌ها
  const [localPrevLabel, setLocalPrevLabel] = useState('مرحله قبلی');
  const prevLabel = controlledPrevLabel ?? localPrevLabel;

  const [localNextLabel, setLocalNextLabel] = useState('مرحله بعدی');
  const nextLabel = controlledNextLabel ?? localNextLabel;

  const [localSubmitLabel, setLocalSubmitLabel] = useState('ثبت و ارسال');
  const submitLabel = controlledSubmitLabel ?? localSubmitLabel;

  const primaryLabel = isLastPage ? submitLabel : nextLabel;

  const handlePrevChange = (val: string) => {
    setLocalPrevLabel(val);
    onPrevLabelChange?.(val);
  };

  const handlePrimaryChange = (val: string) => {
    if (isLastPage) {
      setLocalSubmitLabel(val);
      onSubmitLabelChange?.(val);
    } else {
      setLocalNextLabel(val);
      onNextLabelChange?.(val);
    }
  };

  return (
    <div
      className={cn(
        'group/bottombar relative flex flex-col gap-3 rounded-nf-card border border-nf-border p-3 md:p-4 transition-all duration-200 ease-fluent min-w-0 overflow-visible',
        isFixed
          ? 'sticky bottom-3 z-20 shadow-md backdrop-blur-sm bg-nf-card/95 border-nf-border'
          : 'shadow-sm bg-nf-card text-nf-card-foreground',
        className,
      )}
    >
      {/* میکرو-تولبار شناور کنترل حالت سنجاق/ثابت روی لبه بالای کارت */}
      <div className="absolute -top-3.5 end-4 z-10 flex items-center gap-1 opacity-90 transition-opacity md:opacity-0 group-hover/bottombar:opacity-100 focus-within:opacity-100">
        <div className="flex items-center rounded-lg border border-nf-border bg-nf-card p-0.5 text-xs shadow-xs">
          <button
            type="button"
            onClick={toggleFixed}
            aria-label={isFixed ? 'تغییر به حالت عادی' : 'ثابت کردن در پایین بوم'}
            title={isFixed ? 'تغییر به حالت عادی' : 'ثابت در پایین بوم'}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ease-fluent outline-none cursor-pointer',
              isFixed
                ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                : 'text-nf-muted-foreground hover:text-nf-card-foreground hover:bg-nf-muted',
            )}
          >
            {isFixed ? <PinIcon className="size-3" /> : <PinOffIcon className="size-3" />}
            <span>{isFixed ? 'ثابت در پایین' : 'عادی'}</span>
          </button>
        </div>
      </div>

      {/* دکمه‌های ناوبری فرم (مرحله بعدی/قبلی) با امکان ویرایش درجا و ریسپانسیو کامل */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
        {/* دکمه مرحله قبلی (در صورت چندصفحه‌ای بودن نمایش داده می‌شود؛ در صفحه اول غیرفعال) */}
        {isMultiPage ? (
          <div
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-nf-control border border-nf-border bg-nf-muted/50 text-nf-card-foreground font-medium px-3.5 py-2 text-sm transition-colors w-full sm:w-auto min-w-28',
              isFirstPage && 'opacity-50 pointer-events-none',
            )}
          >
            <ChevronRightIcon className="size-4 shrink-0 opacity-80" />
            <input
              value={prevLabel}
              disabled={isFirstPage}
              aria-label="متن دکمه مرحله قبلی"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handlePrevChange(e.target.value)}
              className="nf-inline-edit text-center bg-transparent text-nf-card-foreground font-medium outline-none border-b border-transparent hover:border-nf-border focus:border-nf-primary focus:bg-nf-card px-1 py-0.5 rounded-sm min-w-16 w-auto max-w-full truncate"
            />
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        {/* دکمه اصلی (مرحله بعدی یا ثبت و ارسال) با استایل دکمه تم */}
        <div className="nf-btn-primary flex items-center justify-center gap-1.5 rounded-nf-control font-medium px-4 py-2 text-sm transition-colors w-full sm:w-auto min-w-32 cursor-pointer shadow-xs">
          <input
            value={primaryLabel}
            aria-label="متن دکمه اصلی فرم"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            className="nf-inline-edit text-center bg-transparent text-inherit font-medium outline-none border-b border-transparent hover:border-current/30 focus:border-current/80 px-1 py-0.5 rounded-sm min-w-20 w-auto max-w-full truncate"
          />
          <ChevronLeftIcon className="size-4 shrink-0 opacity-80" />
        </div>
      </div>
    </div>
  );
}
