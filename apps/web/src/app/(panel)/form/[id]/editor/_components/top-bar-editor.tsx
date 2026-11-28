'use client';

import { useEffect, useState } from 'react';
import { InfoIcon, SlidersHorizontalIcon } from 'lucide-react';
import { cn } from '@noroset/ui';
import { type EditorPage, fa } from './types';

export type TopBarDisplayMode = 'progress' | 'notice' | 'none';

export interface TopBarEditorProps {
  formTitle: string;
  formDescription?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onTitleBlur?: () => void;
  onDescriptionBlur?: () => void;
  pages?: EditorPage[];
  activePageIndex?: number;
  mode?: TopBarDisplayMode;
  onModeChange?: (mode: TopBarDisplayMode) => void;
  noticeText?: string;
  onNoticeTextChange?: (noticeText: string) => void;
  className?: string;
}

export function TopBarEditor({
  formTitle,
  formDescription,
  onTitleChange,
  onDescriptionChange,
  onTitleBlur,
  onDescriptionBlur,
  pages,
  activePageIndex = 0,
  mode: controlledMode,
  onModeChange,
  noticeText: controlledNoticeText,
  onNoticeTextChange,
  className,
}: TopBarEditorProps) {
  // حالت نمایش نوار پایین کارت: پیشرفت (پیش‌فرض)، اطلاعیه، یا فقط عنوان
  const [localMode, setLocalMode] = useState<TopBarDisplayMode>('progress');
  const mode = controlledMode ?? localMode;

  const [localTitle, setLocalTitle] = useState(formTitle || '');
  const [localDesc, setLocalDesc] = useState(formDescription ?? '');
  const [localNoticeText, setLocalNoticeText] = useState('لطفاً تمامی موارد را با دقت مطالعه و تکمیل فرمایید.');
  const noticeText = controlledNoticeText ?? localNoticeText;

  const setMode = (nextMode: TopBarDisplayMode) => {
    setLocalMode(nextMode);
    onModeChange?.(nextMode);
  };

  const handleNoticeTextChange = (val: string) => {
    setLocalNoticeText(val);
    onNoticeTextChange?.(val);
  };

  useEffect(() => {
    setLocalTitle(formTitle || '');
  }, [formTitle]);

  useEffect(() => {
    if (formDescription !== undefined) {
      setLocalDesc(formDescription);
    }
  }, [formDescription]);

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    onTitleChange?.(val);
  };

  const handleDescChange = (val: string) => {
    setLocalDesc(val);
    onDescriptionChange?.(val);
  };

  // محاسبه گام و پیشرفت بر اساس صفحات
  const total = Math.max(1, pages?.length ?? 1);
  const current = Math.min(total, Math.max(1, (activePageIndex ?? 0) + 1));
  const percent = Math.round((current / total) * 100);

  return (
    <div
      className={cn(
        'group/topbar relative flex flex-col gap-4 rounded-nf-card border border-nf-border bg-nf-card p-4 md:p-6 text-nf-card-foreground shadow-sm transition-colors duration-150 ease-fluent min-w-0 overflow-visible',
        className,
      )}
    >
      {/* میکرو-تولبار شناور تغییر حالت روی لبه بالای کارت (هنگام هاور یا فوکوس) */}
      <div className="absolute -top-3.5 end-4 z-20 flex items-center gap-1 opacity-90 transition-opacity md:opacity-0 group-hover/topbar:opacity-100 focus-within:opacity-100">
        <div className="flex items-center rounded-lg border border-nf-border bg-nf-card p-0.5 text-xs shadow-xs">
          <button
            type="button"
            aria-label="حالت نوار پیشرفت"
            onClick={() => setMode('progress')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ease-fluent outline-none',
              mode === 'progress'
                ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                : 'text-nf-muted-foreground hover:text-nf-card-foreground',
            )}
          >
            <SlidersHorizontalIcon className="size-3" />
            <span>پیشرفت</span>
          </button>
          <button
            type="button"
            aria-label="حالت پیام اطلاع‌رسانی"
            onClick={() => setMode('notice')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ease-fluent outline-none',
              mode === 'notice'
                ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                : 'text-nf-muted-foreground hover:text-nf-card-foreground',
            )}
          >
            <InfoIcon className="size-3" />
            <span>اطلاعیه</span>
          </button>
          <button
            type="button"
            aria-label="فقط عنوان"
            onClick={() => setMode('none')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ease-fluent outline-none',
              mode === 'none'
                ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                : 'text-nf-muted-foreground hover:text-nf-card-foreground',
            )}
          >
            <span>فقط عنوان</span>
          </button>
        </div>
      </div>

      {/* بخش عنوان و توضیحات فرم (ویرایش درجا و مستقیم در بالای کارت) */}
      <div className="flex flex-col gap-1 min-w-0">
        <textarea
          rows={1}
          value={localTitle}
          placeholder="عنوان فرم…"
          aria-label="عنوان فرم"
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="nf-inline-edit field-sizing-content block w-full min-w-0 resize-none break-words [overflow-wrap:anywhere] px-2 py-1 text-2xl md:text-3xl font-bold text-nf-card-foreground outline-none transition-colors"
        />

        <textarea
          rows={1}
          value={localDesc}
          placeholder="توضیحات فرم (اختیاری)…"
          aria-label="توضیحات فرم"
          onChange={(e) => handleDescChange(e.target.value)}
          onBlur={onDescriptionBlur}
          className="nf-inline-edit field-sizing-content block w-full min-w-0 resize-none break-words [overflow-wrap:anywhere] px-2 py-1 text-sm text-nf-muted-foreground outline-none transition-colors"
        />
      </div>

      {/* بخش پایین کارت: بر اساس حالت فعال (پیشرفت / اطلاع‌رسانی / هیچ) */}
      {mode === 'progress' && (
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs text-nf-muted-foreground font-medium">
            <span>
              مرحله {fa(current)} از {fa(total)}
            </span>
            <span dir="ltr">{fa(percent)}٪</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-nf-muted">
            <div
              className="h-full bg-nf-primary transition-all duration-300 ease-fluent rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {mode === 'notice' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-nf-border bg-nf-muted/50 p-3 text-xs leading-5 text-nf-card-foreground min-w-0">
          <InfoIcon className="size-4 shrink-0 mt-0.5 text-nf-primary" />
          <textarea
            rows={1}
            value={noticeText}
            aria-label="متن اطلاع‌رسانی"
            placeholder="پیام اطلاع‌رسانی فرم…"
            onChange={(e) => handleNoticeTextChange(e.target.value)}
            className="nf-inline-edit field-sizing-content block w-full min-w-0 resize-none break-words [overflow-wrap:anywhere] bg-transparent p-1 text-xs text-nf-card-foreground outline-none"
          />
        </div>
      )}
    </div>
  );
}
