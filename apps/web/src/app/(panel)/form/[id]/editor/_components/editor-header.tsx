'use client';

/**
 * هدر ادیتور: نوار محصول، عنوان قابل‌ویرایش فرم (Enter ذخیره، Esc بازگشت) و وضعیت ذخیره‌ی
 * خودکار. اقدام‌های سمت چپ (قالب، پیش‌نمایش، انتشار) از صفحه به‌صورت `actions` می‌آیند.
 */

import type { ReactNode } from 'react';
import { Badge, Skeleton } from '@noroset/ui';
import { ProductBar } from '../../../../product-bar';
import { STATUS, type FormSummary } from '../../../forms-shared';

export type TitleState = 'idle' | 'saving' | 'error';

export function EditorHeader({
  form,
  draft,
  loading,
  titleState,
  saveState,
  saveLabel,
  saveError,
  actions,
  onDraftChange,
  onSave,
  onRevert,
  onRetry,
}: {
  /** تا پیش از بارگذاری، فرم null است و فقط اسکلت عنوان دیده می‌شود. */
  form: FormSummary | null;
  draft: string;
  loading: boolean;
  titleState: TitleState;
  saveState: 'saved' | 'dirty' | 'saving' | 'error';
  saveLabel: string;
  saveError: string | null;
  actions: ReactNode;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onRetry: () => void;
}) {
  return (
    <ProductBar product="noroform" workspace={true} className="max-md:px-2" actions={actions}>
      <div className="flex min-w-0 flex-1 flex-col">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
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
              className="field-sizing-content max-w-full min-w-12 truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xl font-bold outline-none transition-colors duration-150 ease-fluent hover:border-input focus:border-input focus:bg-card md:max-w-72"
            />
            {form && (
              <>
                <Badge variant={STATUS[form.status].variant} className="max-md:hidden">
                  {STATUS[form.status].label}
                </Badge>
                <Badge variant="outline" className="max-md:hidden">
                  {form.channel === 'internal' ? 'داخلی' : 'خارجی'}
                </Badge>
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 px-1.5 text-xs text-muted-foreground" aria-live="polite">
          <span>{titleState === 'saving' ? 'در حال ذخیره‌ی عنوان…' : titleState === 'error' ? 'عنوان ذخیره نشد' : saveLabel}</span>
          {saveState === 'error' && (
            <>
              {saveError && <span className="max-md:hidden text-destructive">{saveError}</span>}
              <button type="button" className="text-primary hover:underline" onClick={onRetry}>
                تلاش دوباره
              </button>
            </>
          )}
        </div>
      </div>
    </ProductBar>
  );
}
