'use client';

/**
 * هدر بالای ویرایشگر فرم (تگ <header> اول صفحه):
 * - ارتفاع ۵۶px (h-14) با فونت سیستم وزیرمتن/اینتر به ارث رسیده از body.
 * - بخش راست (منو، برند نوروفرم، عنوان قابل‌ویرایش، بج‌های وضعیت، وضعیت ذخیره خودکار #autosave-status).
 * - بخش میانی (کانتینر دکمه‌های کنترل نمایش نواحی: هاور / همیشگی در lg+ و دکمه آیکونی در زیر lg).
 * - بخش چپ (دکمه‌های اقدام: المان‌ها در زیر md، قالب، پیش‌نمایش، انتشار).
 */

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LayersIcon, LayoutGridIcon } from 'lucide-react';
import { Badge, Button, cn, Skeleton, SystemIcon } from '@noroset/ui';
import { routes } from '@/lib/routes';
import { ProductNavMenu } from '../../../../shell-menus';
import { STATUS, type FormSummary } from '../../../forms-shared';

export type TitleState = 'idle' | 'saving' | 'error';
export type ZoneDisplayMode = 'hover' | 'always';

export function EditorHeader({
  form,
  draft,
  loading,
  titleState,
  saveState,
  saveLabel,
  saveError,
  actions,
  zoneDisplayMode,
  onZoneDisplayModeChange,
  className,
  onDraftChange,
  onSave,
  onRevert,
  onRetry,
  onOpenElements,
}: {
  /** تا پیش از بارگذاری، فرم null است و اسکلت عنوان دیده می‌شود. */
  form: FormSummary | null;
  draft: string;
  loading: boolean;
  titleState: TitleState;
  saveState: 'saved' | 'dirty' | 'saving' | 'error';
  saveLabel: string;
  saveError: string | null;
  actions: ReactNode;
  zoneDisplayMode?: ZoneDisplayMode;
  onZoneDisplayModeChange?: (mode: ZoneDisplayMode) => void;
  className?: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onRetry: () => void;
  onOpenElements?: () => void;
}) {
  const [internalZoneMode, setInternalZoneMode] = useState<ZoneDisplayMode>('hover');
  const activeZoneMode = zoneDisplayMode ?? internalZoneMode;

  const handleZoneMode = (mode: ZoneDisplayMode) => {
    setInternalZoneMode(mode);
    onZoneDisplayModeChange?.(mode);
  };

  return (
    <header
      className={cn(
        'relative flex h-14 shrink-0 items-center justify-between px-2.5 sm:px-4 gap-2 sm:gap-3 border-b border-border bg-card text-foreground',
        className,
      )}
    >
      {/* ─── بخش راست (منو، برند، عنوان) ─── */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* دکمه منو (sm+) */}
        <ProductNavMenu
          currentProduct="noroform"
          workspace={true}
          triggerClassName="size-8 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4"
          iconClassName="size-4"
        />

        {/* بلوک برند (آیکون + «نوروفرم») */}
        <Link
          href={routes.form.home}
          className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg transition-colors hover:opacity-85"
          aria-label="نوروفرم"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <SystemIcon name="noroform" className="size-4" />
          </div>
          <span className="text-xs sm:text-base font-extrabold tracking-tight text-foreground select-none">
            نوروفرم
          </span>
        </Link>

        {/* خط جداکننده عمودی (sm+) */}
        <div className="hidden sm:block w-px h-5 bg-border shrink-0" aria-hidden="true" />

        {/* ردیف عنوان فرم و بج‌ها */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {loading ? (
            <Skeleton className="h-4 w-24 sm:w-32" />
          ) : (
            <input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={onSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
                if (e.key === 'Escape') {
                  const el = e.currentTarget;
                  onRevert();
                  requestAnimationFrame(() => el.blur());
                }
              }}
              aria-label="عنوان فرم"
              maxLength={200}
              placeholder="عنوان فرم"
              className="min-w-0 max-w-[110px] sm:max-w-[220px] truncate px-1 text-xs sm:text-sm font-bold text-foreground rounded border border-transparent bg-transparent outline-none transition-colors duration-150 ease-fluent hover:border-input focus:border-input focus:bg-background"
            />
          )}

          {form && (
            <>
              <Badge
                variant={STATUS[form.status].variant}
                className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-medium leading-none"
              >
                {STATUS[form.status].label}
              </Badge>
              <Badge
                variant="outline"
                className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-medium leading-none"
              >
                {form.channel === 'internal' ? 'داخلی' : 'خارجی'}
              </Badge>
            </>
          )}

          {/* وضعیت ذخیره (#autosave-status) */}
          <div
            id="autosave-status"
            className="flex items-center gap-1.5 px-1 text-[10px] font-normal text-muted-foreground truncate"
            aria-live="polite"
          >
            <span className="truncate">
              {titleState === 'saving'
                ? 'در حال ذخیره‌ی عنوان…'
                : titleState === 'error'
                  ? 'عنوان ذخیره نشد'
                  : saveLabel}
            </span>
            {saveState === 'error' && (
              <>
                {saveError && (
                  <span className="hidden md:inline text-destructive truncate">
                    {saveError}
                  </span>
                )}
                <button
                  type="button"
                  className="shrink-0 text-primary hover:underline font-medium cursor-pointer"
                  onClick={onRetry}
                >
                  تلاش دوباره
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── بخش میانی (کانتینر نواحی - lg+) ─── */}
      <div className="hidden lg:flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
        <button
          type="button"
          onClick={() => handleZoneMode('hover')}
          aria-pressed={activeZoneMode === 'hover'}
          className={cn(
            'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            activeZoneMode === 'hover'
              ? 'bg-card text-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          هاور
        </button>
        <button
          type="button"
          onClick={() => handleZoneMode('always')}
          aria-pressed={activeZoneMode === 'always'}
          className={cn(
            'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            activeZoneMode === 'always'
              ? 'bg-card text-foreground shadow-2xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          همیشگی
        </button>
      </div>

      {/* دکمه آیکونی نواحی (زیر lg) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="نواحی فرم"
        className="lg:hidden p-1.5 size-7 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
        onClick={() => handleZoneMode(activeZoneMode === 'hover' ? 'always' : 'hover')}
      >
        <LayersIcon />
      </Button>

      {/* ─── بخش چپ (دکمه‌های اکشن) ─── */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {onOpenElements && (
          <Button
            variant="secondary"
            aria-label="المان‌ها"
            className="md:hidden px-2.5 py-1.5 gap-1 text-xs font-semibold [&_svg]:size-3.5"
            onClick={onOpenElements}
          >
            <LayoutGridIcon />
            <span>المان‌ها</span>
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
}
