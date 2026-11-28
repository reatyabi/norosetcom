'use client';

/**
 * بدنه‌ی کارت درون‌خطی هر یک از ۱۲ المان فرم:
 * استفاده از Primitives مشترک @noroset/noroform/ui با رعایت دقیق فاصله‌گذاری ۴ پیکسلی
 * و توکن‌های --nf-* بدون کنترل تنظیماتی روی بوم (تنظیمات در SettingsDrawer).
 */

import { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import {
  NfFieldFrame,
  NfFieldLabel,
  NfControlBox,
  NfChoiceOption,
  NfRatingStars,
  NfMediaPlaceholder,
  NfFieldHelper,
  NfMailIcon,
  NfPhoneIcon,
  NfHashIcon,
  NfCalendarIcon,
  NfImageIcon,
  NfVideoIcon,
  NfChevronDownIcon,
} from '@noroset/noroform/ui';
import { cn } from '@noroset/ui';
import { IconAction } from '@/components/editor-ui';
import { FormRichText, RichPreview } from './form-rich-text';
import { type EditorField, DEFAULT_LABEL, fa, nextOptionValue, optionsOf } from './types';

type Patch = (patch: Partial<EditorField>) => void;

const PROVIDER_LABEL: Record<string, string> = {
  aparat: 'آپارات',
  youtube: 'یوتیوب',
  vimeo: 'ویمیو',
};

export function FieldInline({
  field,
  active,
  onChange,
  onOpenSettings,
}: {
  field: EditorField;
  active: boolean;
  onChange: Patch;
  onOpenSettings?: () => void;
}) {
  const s = field.settings;
  const setSettings = (patch: Record<string, unknown>) =>
    onChange({ settings: { ...field.settings, ...patch } });
  const textAlign = (s.text_align as 'right' | 'center' | 'left') || 'right';
  const placeholder = typeof s.placeholder === 'string' ? s.placeholder : '';

  // ۱. المان متن (Typography خالص بدون برچسب و بدون باکس)
  if (field.type === 'text') {
    return (
      <NfFieldFrame textAlign={textAlign}>
        {active ? (
          <FormRichText
            value={s.doc}
            onChange={(doc) => setSettings({ doc })}
            label="متن"
            placeholder="متن را بنویسید…"
          />
        ) : (
          <RichPreview doc={s.doc} empty="متن خالی" />
        )}
      </NfFieldFrame>
    );
  }

  // ۲. المان تصویر (در حالت خالی Placeholder و در حالت پر قاب شکیل)
  if (field.type === 'image') {
    const url = typeof s.url === 'string' && s.url.startsWith('https://') ? s.url : '';
    const alt = typeof s.alt === 'string' ? s.alt : '';
    return (
      <NfFieldFrame textAlign={textAlign}>
        {url ? (
          <div className="overflow-hidden rounded-nf-card border border-nf-border bg-nf-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="max-h-60 w-full object-contain" />
            {alt && <div className="p-2 text-center text-xs text-nf-muted-foreground">{alt}</div>}
          </div>
        ) : (
          <NfMediaPlaceholder
            icon={<NfImageIcon />}
            label="افزودن تصویر"
            hint="برای درج نشانی تصویر، تنظیمات را باز کنید"
            onClick={onOpenSettings}
          />
        )}
      </NfFieldFrame>
    );
  }

  // ۳. المان ویدیو (در حالت خالی Placeholder و در حالت پر مشخصات ویدیو)
  if (field.type === 'video') {
    const provider = typeof s.provider === 'string' ? s.provider : '';
    const videoId = typeof s.video_id === 'string' ? s.video_id : '';
    return (
      <NfFieldFrame textAlign={textAlign}>
        {provider && videoId ? (
          <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-nf-card border border-nf-border bg-nf-card p-4 text-center text-xs text-nf-card-foreground shadow-xs">
            <NfVideoIcon className="size-6 text-nf-primary" />
            <span className="font-medium">ویدیوی {PROVIDER_LABEL[provider] || provider}</span>
          </div>
        ) : (
          <NfMediaPlaceholder
            icon={<NfVideoIcon />}
            label="افزودن ویدیو"
            hint="برای ثبت لینک آپارات، یوتیوب یا ویمیو کلیک کنید"
            onClick={onOpenSettings}
          />
        )}
      </NfFieldFrame>
    );
  }

  // ۴. سایر ۹ فیلد ورودی استاندارد
  return (
    <NfFieldFrame textAlign={textAlign}>
      {/* عنوان فیلد با ستاره اجباری متصل */}
      <NfFieldLabel label={field.label} required={field.required}>
        {active ? (
          <textarea
            rows={1}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            onFocus={(e) => field.label === DEFAULT_LABEL && e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            aria-label="عنوان پرسش"
            aria-invalid={field.label.trim() === '' || undefined}
            placeholder="عنوان پرسش"
            maxLength={500}
            className="nf-inline-edit inline-block w-auto min-w-16 max-w-full break-words [overflow-wrap:anywhere] field-sizing-content resize-none text-sm font-medium text-nf-card-foreground bg-transparent border-b border-b-transparent hover:border-b-nf-border focus:border-b-2 focus:border-b-nf-primary focus:outline-none transition-colors"
          />
        ) : (
          <span className={cn('break-words [overflow-wrap:anywhere]', !field.label.trim() && 'text-nf-muted-foreground')}>
            {field.label.trim() || 'بدون عنوان'}
          </span>
        )}
      </NfFieldLabel>

      {/* باکس یا کنترل پاسخ بر اساس نوع فیلد */}
      {field.type === 'short_text' && (
        <NfControlBox placeholder={placeholder || 'پاسخ کوتاه'} />
      )}

      {field.type === 'long_text' && (
        <NfControlBox isMultiline placeholder={placeholder || 'متن پاسخ چندخطی…'} />
      )}

      {field.type === 'email' && (
        <NfControlBox dir="ltr" icon={<NfMailIcon />} placeholder={placeholder || 'name@example.com'} />
      )}

      {field.type === 'phone' && (
        <NfControlBox dir="ltr" tabularNums icon={<NfPhoneIcon />} placeholder={placeholder || '0912 345 6789'} />
      )}

      {field.type === 'number' && (
        <NfControlBox dir="ltr" tabularNums icon={<NfHashIcon />} placeholder={placeholder || '۰'} />
      )}

      {field.type === 'date' && (
        <NfControlBox tabularNums icon={<NfCalendarIcon />} placeholder="۱۴۰۵/۰۱/۰۱" />
      )}

      {field.type === 'single_choice' && (
        s.display === 'dropdown' ? (
          <div className="flex flex-col gap-2">
            <NfControlBox icon={<NfChevronDownIcon />} placeholder={placeholder || 'انتخاب کنید'} />
            {active && (
              <div className="mt-1 rounded-nf-control border border-nf-border bg-nf-muted/15 p-2.5">
                <span className="mb-2 block text-xs font-medium text-nf-muted-foreground">گزینه‌های منوی کشویی:</span>
                <OptionsEditor field={field} active={active} onChange={(options) => setSettings({ options })} />
              </div>
            )}
          </div>
        ) : (
          <OptionsEditor field={field} active={active} onChange={(options) => setSettings({ options })} />
        )
      )}

      {field.type === 'multi_choice' && (
        <OptionsEditor field={field} active={active} onChange={(options) => setSettings({ options })} />
      )}

      {field.type === 'rating' && (
        <div className="py-1">
          <NfRatingStars max={typeof s.max === 'number' ? s.max : 5} value={0} />
        </div>
      )}

      {/* متن راهنما زیر کانتینر ورودی */}
      {active ? (
        <NfFieldHelper>
          <FormRichText
            value={field.description}
            onChange={(doc) => onChange({ description: doc.blocks.length ? doc : '' })}
            label="متن راهنما"
            placeholder="افزودن متن راهنما…"
            headings={false}
            subtle
            className="text-xs text-nf-muted-foreground"
          />
        </NfFieldHelper>
      ) : field.description ? (
        <NfFieldHelper>
          <RichPreview doc={field.description} empty="" className="text-xs text-nf-muted-foreground" />
        </NfFieldHelper>
      ) : null}
    </NfFieldFrame>
  );
}

/* ─── ویرایشگر گزینه‌های انتخابی درجا ─── */

function OptionsEditor({
  field,
  active,
  onChange,
}: {
  field: EditorField;
  active: boolean;
  onChange: (options: { value: string; label: string }[]) => void;
}) {
  const options = optionsOf(field);
  const multi = field.type === 'multi_choice';
  const [focusValue, setFocusValue] = useState<string | null>(null);

  const add = (after = options.length - 1) => {
    const value = nextOptionValue(options);
    const next = [...options];
    next.splice(after + 1, 0, { value, label: `گزینه ${fa(options.length + 1)}` });
    onChange(next);
    setFocusValue(value);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o, i) => (
        <NfChoiceOption
          key={o.value}
          type={multi ? 'checkbox' : 'radio'}
          checked={false}
          label={
            active ? (
              <input
                value={o.label}
                aria-label={`گزینه‌ی ${fa(i + 1)}`}
                aria-invalid={o.label.trim() === '' || undefined}
                maxLength={500}
                autoFocus={o.value === focusValue}
                onFocus={(e) => o.value === focusValue && e.currentTarget.select()}
                onChange={(e) =>
                  onChange(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && options.length < 100) {
                    e.preventDefault();
                    add(i);
                  }
                }}
                className="nf-inline-edit w-full min-w-0 bg-transparent px-1.5 py-0.5 text-sm text-nf-card-foreground border-b border-transparent hover:border-nf-border focus:border-nf-primary focus:outline-none transition-colors"
              />
            ) : (
              <span className="text-sm text-nf-card-foreground">{o.label}</span>
            )
          }
          actionSlot={
            active && options.length > 1 ? (
              <IconAction
                label={`حذف گزینه‌ی ${fa(i + 1)}`}
                size="icon-xs"
                className="text-nf-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onChange(options.filter((_, j) => j !== i))}
              >
                <XIcon className="size-3.5" />
              </IconAction>
            ) : undefined
          }
        />
      ))}

      {active && options.length < 100 && (
        <div className="flex min-h-8 items-center gap-2.5 pt-1">
          <span
            className={cn(
              'size-4 shrink-0 border-2 border-dashed border-nf-muted-foreground/40',
              multi ? 'rounded-[4px]' : 'rounded-full',
            )}
          />
          <button
            type="button"
            onClick={() => add()}
            className="flex items-center gap-1 text-xs font-medium text-nf-primary hover:underline outline-none cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            <span>افزودن گزینه</span>
          </button>
        </div>
      )}
    </div>
  );
}
