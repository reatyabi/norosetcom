'use client';

/**
 * Primitives پایه‌ی فیلدها و المان‌های نوروفرم (NoroForm Field Primitives):
 * تک‌منبع استاندارد و توکن‌محور برای چیدمان عمودی ۳بخشی، تراز متن، برچسب،
 * باکس‌های ورودی، گزینه‌ها، امتیاز، رسانه، راهنما و خطا.
 * مشترک بین ادیتور بوم، دیالوگ پیش‌نمایش و رندرر عمومی.
 */

import { type ReactNode } from 'react';
import {
  CalendarIcon,
  CheckIcon,
  ImageIcon,
  MailIcon,
  PhoneIcon,
  HashIcon,
  StarIcon,
  VideoIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { cn } from '@noroset/ui';

/* ─── ۱. کادر اصلی فیلد (NfFieldFrame) ─── */

export interface NfFieldFrameProps {
  textAlign?: 'right' | 'center' | 'left';
  className?: string;
  children: ReactNode;
}

/** چیدمان عمودی ۳بخشی استاندارد با فاصله‌گذاری دقیق و تراز متن */
export function NfFieldFrame({ textAlign = 'right', className, children }: NfFieldFrameProps) {
  const alignClass =
    textAlign === 'center'
      ? 'text-center items-center'
      : textAlign === 'left'
        ? 'text-left items-start'
        : 'text-right items-stretch';

  return (
    <div className={cn('flex w-full flex-col space-y-0', alignClass, className)}>
      {children}
    </div>
  );
}

/* ─── ۲. عنوان و ستاره اجباری (NfFieldLabel) ─── */

export interface NfFieldLabelProps {
  htmlFor?: string;
  label?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}

/** عنوان چندخطی با ستاره اجباری (*) چسبیده به انتهای متن و فاصله‌ی mb-2 */
export function NfFieldLabel({
  htmlFor,
  label,
  required,
  className,
  children,
}: NfFieldLabelProps) {
  return (
    <div
      className={cn(
        'mb-2 flex w-full flex-wrap items-baseline gap-1 text-sm font-medium leading-relaxed text-nf-card-foreground [overflow-wrap:anywhere]',
        className,
      )}
    >
      {children ? (
        children
      ) : (
        <label htmlFor={htmlFor} className="cursor-pointer break-words [overflow-wrap:anywhere]">
          {label?.trim() || 'بدون عنوان'}
        </label>
      )}
      {required && (
        <span
          className="shrink-0 select-none text-sm font-bold leading-none text-nf-destructive"
          aria-label="اجباری"
        >
          *
        </span>
      )}
    </div>
  );
}

/* ─── ۳. باکس استاندارد ورودی (NfControlBox) ─── */

export interface NfControlBoxProps {
  dir?: 'rtl' | 'ltr';
  tabularNums?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  isInvalid?: boolean;
  isMultiline?: boolean;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
  placeholder?: string;
  onClick?: () => void;
}

/** کانتینر استاندارد ورودی (h-10 برای تک‌خطی، min-h-24 برای چندخطی) */
export function NfControlBox({
  dir,
  tabularNums,
  icon,
  iconPosition = 'end',
  isInvalid,
  isMultiline,
  interactive,
  className,
  children,
  placeholder,
  onClick,
}: NfControlBoxProps) {
  return (
    <div
      dir={dir}
      onClick={onClick}
      className={cn(
        'w-full rounded-nf-control border bg-nf-muted/35 text-sm transition-colors',
        isMultiline
          ? 'nf-control-multiline min-h-24 px-3 py-2 flex flex-col justify-start rounded-nf-card'
          : 'h-10 min-h-10 px-3 py-2 flex items-center justify-between gap-2.5',
        isInvalid
          ? 'border-nf-destructive ring-1 ring-nf-destructive/20 text-nf-card-foreground'
          : 'border-nf-border text-nf-card-foreground',
        tabularNums && 'tabular-nums',
        !interactive && 'select-none cursor-default text-nf-muted-foreground',
        interactive && 'focus-within:border-nf-primary focus-within:ring-1 focus-within:ring-nf-primary bg-nf-card',
        className,
      )}
    >
      {icon && iconPosition === 'start' && (
        <span className="shrink-0 text-nf-muted-foreground [&_svg]:size-4">{icon}</span>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {children ? (
          children
        ) : (
          <span className={cn('truncate', !placeholder && 'text-nf-muted-foreground/60')}>
            {placeholder}
          </span>
        )}
      </div>

      {icon && iconPosition === 'end' && (
        <span className="shrink-0 text-nf-muted-foreground [&_svg]:size-4">{icon}</span>
      )}
    </div>
  );
}

/* ─── ۴. ردیف استاندارد گزینه‌ها (NfChoiceOption) ─── */

export interface NfChoiceOptionProps {
  type: 'radio' | 'checkbox';
  checked?: boolean;
  label: ReactNode;
  disabled?: boolean;
  onChange?: () => void;
  className?: string;
  actionSlot?: ReactNode;
}

/** ردیف گزینه رادیویی دایره‌ای یا چک‌باکس مربعی */
export function NfChoiceOption({
  type,
  checked,
  label,
  disabled,
  onChange,
  className,
  actionSlot,
}: NfChoiceOptionProps) {
  const isRadio = type === 'radio';

  return (
    <div
      onClick={!disabled ? onChange : undefined}
      className={cn(
        'group/opt flex min-h-9 items-center gap-2.5 py-1 text-sm select-none transition-colors',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className={cn(
          'size-4 shrink-0 flex items-center justify-center border-2 transition-colors',
          isRadio ? 'rounded-full' : 'rounded-[4px]',
          checked
            ? 'border-nf-primary bg-nf-primary text-nf-primary-fg'
            : 'border-nf-muted-foreground/45 bg-transparent group-hover/opt:border-nf-primary/60',
        )}
      >
        {checked && (
          isRadio ? (
            <span className="size-1.5 rounded-full bg-nf-primary-fg" />
          ) : (
            <CheckIcon className="size-3 stroke-[3]" />
          )
        )}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2 text-nf-card-foreground">
        {typeof label === 'string' ? <span className="break-words">{label}</span> : label}
      </div>

      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </div>
  );
}

/* ─── ۵. ردیف ستاره‌های امتیاز (NfRatingStars) ─── */

export interface NfRatingStarsProps {
  max?: number;
  value?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  color?: string;
  className?: string;
}

/** ردیف ستاره‌های امتیازدهی (Star Icon size-6 gap-2) */
export function NfRatingStars({
  max = 5,
  value = 0,
  interactive,
  onChange,
  color,
  className,
}: NfRatingStarsProps) {
  const starCount = Math.min(Math.max(max, 3), 10);

  return (
    <div
      role="radiogroup"
      tabIndex={interactive ? -1 : undefined}
      aria-label={`امتیاز از ${starCount}`}
      className={cn('flex flex-wrap items-center gap-2 outline-none', className)}
    >
      {Array.from({ length: starCount }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= value;

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isFilled}
              aria-label={`${starIndex} از ${starCount}`}
              onClick={() => onChange?.(starIndex)}
              className="rounded-nf-control p-1 text-nf-muted-foreground/40 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-nf-ring cursor-pointer"
            >
              <StarIcon
                className="size-6 transition-colors"
                style={
                  isFilled
                    ? { color: color || 'var(--nf-primary)', fill: color || 'var(--nf-primary)' }
                    : undefined
                }
              />
            </button>
          );
        }

        return (
          <div key={i} className="flex flex-col items-center gap-1 text-[11px] text-nf-muted-foreground">
            <StarIcon
              className={cn(
                'size-6 transition-colors',
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-nf-muted-foreground/35',
              )}
              style={
                color && isFilled
                  ? { color, fill: color }
                  : undefined
              }
            />
            <span className="select-none text-[10px]">{starIndex}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── ۶. قاب خط‌چین رسانه‌ی خالی (NfMediaPlaceholder) ─── */

export interface NfMediaPlaceholderProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  className?: string;
}

/** کادر خط‌چین خالی برای عکس و ویدیو با حداقل ارتفاع ۳۲ (min-h-32) */
export function NfMediaPlaceholder({
  icon,
  label,
  hint,
  onClick,
  className,
}: NfMediaPlaceholderProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-nf-card border border-dashed border-nf-border bg-nf-muted/25 p-4 text-center text-xs text-nf-muted-foreground transition-colors select-none',
        onClick && 'cursor-pointer hover:border-nf-primary/60 hover:bg-nf-muted/40 hover:text-nf-card-foreground',
        className,
      )}
    >
      <span className="shrink-0 text-nf-muted-foreground [&_svg]:size-7 [&_svg]:opacity-70">
        {icon}
      </span>
      <span className="font-medium text-nf-card-foreground">{label}</span>
      {hint && <span className="text-[11px] text-nf-muted-foreground opacity-80">{hint}</span>}
    </div>
  );
}

/* ─── ۷. متن راهنما و خطای اعتبارسنجی (NfFieldHelper & NfFieldError) ─── */

/** متن راهنما با فاصله‌ی استاندارد mt-2 زیر کانتینر کنترل */
export function NfFieldHelper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div className={cn('mt-2 text-xs leading-normal text-nf-muted-foreground', className)}>
      {children}
    </div>
  );
}

/** پیام خطای اعتبارسنجی با فاصله‌ی mt-1 و رنگ منفی دیزاین‌سیستم */
export function NfFieldError({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn('mt-1 text-xs font-medium leading-normal text-nf-destructive', className)}
    >
      {children}
    </p>
  );
}

/* ─── آیکون‌های کمکی ورودی‌ها ─── */
export {
  CalendarIcon as NfCalendarIcon,
  MailIcon as NfMailIcon,
  PhoneIcon as NfPhoneIcon,
  HashIcon as NfHashIcon,
  ImageIcon as NfImageIcon,
  VideoIcon as NfVideoIcon,
  ChevronDownIcon as NfChevronDownIcon,
};
