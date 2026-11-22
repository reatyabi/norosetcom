'use client';

import { Checkbox, cn } from '@noroset/ui';
import { ChevronLeft, LockIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { cellText, summaryOf, type FieldColumn, type SubmissionItem } from './results-model';

/**
 * فهرست پاسخ‌ها در موبایل (به‌جای جدول افقی): هر رکورد یک کارت جداگانه و
 * عنوانِ فیلد سنجاق‌شده، زمان ثبت و خلاصهٔ کوتاهی از سایر ستون‌ها را نشان می‌دهد؛
 * انتخاب کارت همان دراور جزئیات دسکتاپ را باز می‌کند تا رفتار و میانبرهای J/K یکی بماند.
 * چک‌باکس ابتدای کارت همان انتخاب پاسخ مبنای کارت‌های خلاصه در جدول دسکتاپ است؛
 * ناحیه‌ی لمس آن بزرگ‌تر از خود چک‌باکس گرفته شده تا در موبایل راحت زده شود.
 */
export function SubmissionList({
  items,
  columns,
  pinnedFieldId,
  filtered,
  selectedId,
  onToggleSelected,
  onSelect,
}: {
  items: SubmissionItem[];
  columns: FieldColumn[];
  pinnedFieldId: string | null;
  filtered: boolean;
  /** شناسهٔ پاسخ انتخاب‌شده به‌عنوان مبنای کارت‌های خلاصه. */
  selectedId: string | null;
  onToggleSelected: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    // بدون رکورد هم ناحیه‌ی فهرست تا پایین صفحه پر می‌شود و اسکرولی فعال نیست.
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-card px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">
        {filtered
          ? 'پاسخی با این فیلترها پیدا نشد.'
          : 'هنوز پاسخی ثبت نشده؛ وقتی کسی فرم را پر کند، پاسخ‌ها همین‌جا می‌آیند.'}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5" aria-label="فهرست پاسخ‌ها">
      {items.map((item) => {
        const pinnedColumn = columns.find((column) => column.fieldId === pinnedFieldId);
        const pinnedTitle = pinnedColumn ? cellText(item.answers[pinnedColumn.fieldId], pinnedColumn.type) : '';
        const summary = item.locked
          ? 'برای دیدن، پلن را ارتقا دهید'
          : summaryOf(item, columns.filter((column) => column.fieldId !== pinnedFieldId));
        const selected = selectedId === item.id;
        return (
          <li key={item.id}>
            <div
              className={cn(
                'flex min-h-12 w-full items-stretch overflow-hidden rounded-xl bg-card ring-1 ring-border transition-colors duration-150',
                selected && 'bg-muted/40 ring-primary/30',
              )}
            >
              <div
                role="checkbox"
                aria-checked={selected}
                aria-disabled={item.locked || undefined}
                aria-label={`انتخاب پاسخ ${formatDateTime(item.createdAt)} برای کارت‌های خلاصه`}
                title="انتخاب برای کارت‌های خلاصه"
                tabIndex={item.locked ? -1 : 0}
                onClick={() => {
                  if (!item.locked) onToggleSelected(item.id);
                }}
                onKeyDown={(event) => {
                  if (item.locked) return;
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    onToggleSelected(item.id);
                  }
                }}
                className={cn(
                  'flex w-11 shrink-0 cursor-pointer items-center justify-center outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  item.locked && 'pointer-events-none opacity-50',
                )}
              >
                <Checkbox checked={selected} disabled={item.locked} tabIndex={-1} aria-hidden className="pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-2 text-start transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
              >
                {item.locked ? <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.locked ? 'پاسخ قفل‌شده' : pinnedTitle || 'پاسخ ثبت‌شده'}
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-1.5 text-xs text-muted-foreground">
                    {item.locked || summary ? <span className="truncate">{summary}</span> : null}
                    <span className="shrink-0 tabular-nums">{formatDateTime(item.createdAt)}</span>
                  </span>
                </span>
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
