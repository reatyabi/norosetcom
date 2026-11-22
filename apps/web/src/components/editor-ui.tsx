'use client';

/**
 * کامپوننت‌های utility مشترک ادیتورهای نوروفرم و نورولینک:
 * - IconAction: دکمه‌ی آیکون با Tooltip
 * - UnderlineTabs: تب‌های با خط زیر (TODO: به @noroset/ui منتقل شود)
 * - Editable: متن inline قابل‌ویرایش
 * - Overlay: پس‌زمینه + dialog موضعی
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@noroset/ui';

/** اسکرول سمت راست، فقط با هاور نمایان (RTL-aware) */
export const hoverScroll =
  '[&_[data-slot=scroll-area-scrollbar]]:!right-0 [&_[data-slot=scroll-area-scrollbar]]:!left-auto [&_[data-slot=scroll-area-scrollbar]]:opacity-0 [&_[data-slot=scroll-area-scrollbar]]:transition-opacity hover:[&_[data-slot=scroll-area-scrollbar]]:opacity-100 [&_[data-slot=scroll-area-thumb]]:bg-foreground/20';

/** اسکرول بومی (overflow-auto) در فضای طراحی: باریک، خنثی و فقط هنگام اشاره دیده می‌شود. */
export const hoverNativeScroll =
  '[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:color-mix(in_srgb,currentColor_22%,transparent)_transparent] focus-within:[scrollbar-color:color-mix(in_srgb,currentColor_22%,transparent)_transparent]';

/* ─── IconAction ─── */

export function IconAction({
  label,
  onClick,
  children,
  className,
  size = 'icon-sm',
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  size?: 'icon-xs' | 'icon-sm' | 'icon';
  /** دکمه‌ی بی‌اثر در جایگاه فعلی (مثلاً انتقال اولین المان به بالا). */
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size={size}
            aria-label={label}
            disabled={disabled}
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ─── UnderlineTabs ─── */

export function UnderlineTabs<T extends string = string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex gap-5 border-b', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            '-mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2 text-sm transition-colors duration-150 ease-fluent',
            value === it.value
              ? 'border-foreground font-semibold text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Editable ─── */

/** متن inline قابل‌ویرایش با خط‌چین زیر در حالت فعال */
export function Editable({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      contentEditable={active}
      suppressContentEditableWarning
      className={cn(
        'border-b border-dashed outline-none',
        active ? 'border-primary/60' : 'border-transparent',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ─── Overlay ─── */

export function Overlay({
  onClose,
  children,
  className,
  labelledBy,
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** id عنوان دیالوگ برای صفحه‌خوان. */
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // فوکوس به دیالوگ می‌رود و پس از بستن به همان دکمه‌ای که آن را باز کرد برمی‌گردد.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 animate-in fade-in-0" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'outline-none',
          'absolute flex flex-col rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-border',
          'animate-in fade-in-0 zoom-in-95',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
