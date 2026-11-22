'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@noroset/ui/lib/utils';

export interface ErrorSummaryItem {
  /** شناسهٔ عنصر فیلد مقصد (بدون #) */
  id: string;
  label: string;
  message?: string;
}

/**
 * خلاصهٔ خطاهای فرم (قاعدهٔ error-summary / focus-management):
 * - بعد از ارسال ناموفق، خودش فوکوس می‌گیرد (`tabIndex=-1` + نقش alert)
 * - هر مورد به فیلد مربوط لینک است و خطاهای درون‌خطی حذف نمی‌شوند
 * - `focusKey` با هر ارسال تازه عوض می‌شود تا حتی با خطاهای یکسان دوباره فوکوس بگیرد
 */
export function ErrorSummary({
  items,
  focusKey,
  title = 'برای ادامه، خطاهای زیر را برطرف کنید',
  id = 'form-error-summary',
  className,
}: {
  items: ErrorSummaryItem[];
  focusKey?: number | string;
  title?: string;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length > 0) ref.current?.focus();
    // فقط با تغییر کلید فوکوس یا تعداد خطاها دوباره فوکوس می‌گیرد، نه با هر رندر.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  if (items.length === 0) return null;

  return (
    <div
      id={id}
      ref={ref}
      role="alert"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className={cn(
        'rounded-lg border border-destructive/30 bg-destructive-surface px-4 py-3 text-sm text-destructive-ink outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <h2 id={`${id}-title`} className="mb-1 font-semibold">
        {title}
      </h2>
      <ul className="list-inside list-disc space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="underline underline-offset-4 hover:no-underline">
              {item.label}
              {item.message ? ` — ${item.message}` : ''}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
