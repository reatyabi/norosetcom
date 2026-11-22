'use client';

import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Check, ChevronDownIcon, GripVerticalIcon, XIcon } from 'lucide-react';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@noroset/ui';
import { cardGripClass, cardToolBase, cardToolHidden, type SubmissionDetail } from './results-model';

export function SummaryFieldCard({
  field,
  value,
  index,
  draggable = false,
  dragging = false,
  dropTarget = false,
  active = false,
  onRemove,
  onActivate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  field: Pick<SubmissionDetail['fields'][number], 'fieldId' | 'label'>;
  value: string;
  index: number;
  /** کارت با کشیدنِ دستهٔ گوشه جابه‌جا می‌شود. */
  draggable?: boolean;
  dragging?: boolean;
  /** این کارت مقصد رهاکردن درگ فعلی است. */
  dropTarget?: boolean;
  /** کارت انتخاب شده (لمس) و ابزارهایش ثابت دیده می‌شوند. */
  active?: boolean;
  /** حذف کارت از بخش خلاصه (فیلد در بدنه می‌ماند). */
  onRemove?: () => void;
  onActivate?: () => void;
  onDragStart?: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const palettes = [
    'border-tone-sky/30 from-tone-sky/10 via-tone-sky/10 to-background before:bg-tone-sky/40 text-tone-sky dark:border-tone-sky/50 dark:from-tone-sky/25 dark:via-tone-sky/20 dark:to-card dark:before:bg-tone-sky/20 dark:text-tone-sky',
    'border-tone-violet/30 from-tone-violet/10 via-tone-violet/10 to-background before:bg-tone-violet/40 text-tone-violet dark:border-tone-violet/50 dark:from-tone-violet/25 dark:via-tone-violet/20 dark:to-card dark:before:bg-tone-violet/20 dark:text-tone-violet',
    'border-tone-emerald/30 from-tone-emerald/10 via-tone-teal/10 to-background before:bg-tone-emerald/40 text-tone-emerald dark:border-tone-emerald/50 dark:from-tone-emerald/25 dark:via-tone-emerald/20 dark:to-card dark:before:bg-success/20 dark:text-tone-emerald',
    'border-tone-amber/30 from-tone-amber/10 via-tone-amber/10 to-background before:bg-tone-amber/40 text-tone-amber dark:border-tone-amber/50 dark:from-tone-amber/25 dark:via-tone-amber/20 dark:to-card dark:before:bg-warning/20 dark:text-tone-amber',
    'border-tone-rose/30 from-tone-rose/10 via-tone-rose/10 to-background before:bg-tone-rose/40 text-tone-rose dark:border-tone-rose/50 dark:from-tone-rose/25 dark:via-tone-rose/20 dark:to-card dark:before:bg-tone-rose/20 dark:text-tone-rose',
  ] as const;
  const palette = palettes[index % palettes.length] ?? palettes[0];

  return (
    <div
      className="group relative flex min-w-0"
      onPointerDown={(event) => {
        // لمس/کلیک روی ابزارها نباید حالت انتخاب کارت را تغییر دهد.
        if ((event.target as HTMLElement).closest('[data-card-tools]')) return;
        onActivate?.();
      }}
    >
      <article
        data-detail-card="summary"
        data-field-id={field.fieldId}
        className={cn(
          'relative isolate flex w-full min-w-0 flex-col justify-between gap-1.5 overflow-hidden rounded-xl border bg-gradient-to-br p-2.5 shadow-sm transition-[border-color,box-shadow,opacity] before:pointer-events-none before:absolute before:-end-5 before:-top-6 before:size-20 before:rounded-full before:opacity-70 before:blur-2xl',
          palette,
          dragging && 'opacity-40',
          dropTarget && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background',
        )}
        title={`${field.label}: ${value}`}
      >
        <div className="relative z-10 min-w-0">
          <p className="truncate text-[11px] text-current/65">{field.label}</p>
          <p className="mt-1 truncate text-sm font-medium text-current" dir="auto">
            {value}
          </p>
        </div>
      </article>
      {/* گوشهٔ کارت بیرون از بدنهٔ clip‌شده می‌نشیند تا کامل دیده شود. */}
      {draggable ? (
        <span
          aria-hidden
          data-card-tools
          className={cn(
            'absolute -start-1.5 -top-1.5 rounded-full',
            cardToolBase,
            cardGripClass,
            active ? 'opacity-100' : cardToolHidden,
          )}
          data-print-hide
          title="برای جابه‌جایی بکشید"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <GripVerticalIcon className="size-3" />
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`حذف ${field.label} از خلاصه`}
          title="حذف از خلاصه"
          data-card-tools
          className={cn(
            'absolute -end-1.5 -top-1.5 rounded-full hover:border-destructive/40 hover:text-destructive',
            cardToolBase,
            active ? 'opacity-100' : cardToolHidden,
          )}
          data-print-hide
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export interface MenuSelectOption {
  value: string;
  label: string;
}

export function CompactMenuSelect({
  ariaLabel,
  icon,
  value,
  options,
  active = false,
  disabled = false,
  compactOnly = false,
  onChange,
}: {
  ariaLabel: string;
  icon: ReactNode;
  value: string;
  options: MenuSelectOption[];
  active?: boolean;
  disabled?: boolean;
  compactOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? ariaLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="relative md:w-auto md:gap-1.5 md:px-2 md:text-xs"
            aria-label={`${ariaLabel}: ${selectedLabel}`}
            title={`${ariaLabel}: ${selectedLabel}`}
            disabled={disabled}
          />
        }
      >
        <span className="flex items-center [&_svg]:size-3.5">{icon}</span>
        {!compactOnly ? <span className="hidden md:inline">{selectedLabel}</span> : null}
        {!compactOnly ? <ChevronDownIcon className="hidden size-3 md:block" /> : null}
        {active ? <span className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-primary ring-2 ring-background" aria-hidden /> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-64 min-w-40 overflow-y-auto p-1 text-xs [&_[data-slot=dropdown-menu-item]]:min-h-7 [&_[data-slot=dropdown-menu-item]]:py-1 [&_[data-slot=dropdown-menu-item]]:text-xs"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value || 'all'}
            className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
            onClick={() => onChange(option.value)}
          >
            <Check className={cn('size-3.5', value === option.value ? 'opacity-100' : 'opacity-0')} aria-hidden />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
