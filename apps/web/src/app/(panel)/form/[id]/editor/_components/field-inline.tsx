'use client';

/**
 * بدنه‌ی کارت درون‌خطی هر المان: فقط تنظیمات گروه «عمومی» و «ظاهر» (settings-spec.ts).
 * حالت‌ها به سبک گوگل فرم (docs/architecture.md §8.8):
 * - جمع‌شده: عنوان و راهنما به‌صورت متن، و پیش‌نمای پاسخ با خط نقطه‌چین (آنچه پاسخ‌دهنده می‌بیند).
 * - باز: هر بخش نوشتاری بدون زمینه با خط زیرین کم‌رنگ؛ با فوکوس خط زیرین دوبرابر و به رنگ اصلی،
 *   و برای متن غنی نوار قالب‌بندی زیر آن.
 * کلید «اجباری» در فوتر کارت (canvas.tsx) است؛ اعتبارسنجی و منطق شرطی در دیالوگ پیشرفته.
 */

import { useState, type ReactNode } from 'react';
import { CalendarIcon, ChevronDownIcon, ImageIcon, PlusIcon, StarIcon, VideoIcon, XIcon } from 'lucide-react';
import { parseVideoUrl } from '@noroset/field-engine';
import { cn, NativeSelect, NativeSelectOption, Segmented } from '@noroset/ui';
import { IconAction } from '@/components/editor-ui';
import { FormRichText, RichPreview } from './form-rich-text';
import { specsAt, type SettingSpec } from './settings-spec';
import { type EditorField, DEFAULT_LABEL, fa, nextOptionValue, optionsOf } from './types';

type Patch = (patch: Partial<EditorField>) => void;

/**
 * بخش نوشتاری باز: بدون زمینه، خط زیرین ۱px؛ با فوکوس ۲px به رنگ اصلی. padding پایین هنگام فوکوس
 * یک پیکسل کم می‌شود تا ارتفاع نپرد.
 */
const underline =
  'w-full min-w-0 rounded-none border-0 border-b bg-transparent px-0 pt-1 pb-1.5 outline-none transition-colors duration-150 ease-fluent placeholder:text-muted-foreground/70 focus:border-b-2 focus:border-b-primary focus:pb-[5px] aria-invalid:border-b-destructive';

/** همیشه دیده می‌شود (عنوان، راهنما، نشانی‌ها). */
const underlineShown = cn(underline, 'border-b-foreground/20 hover:border-b-foreground/40');

/** فقط با اشاره/فوکوس (گزینه‌ها، مثل گوگل فرم). */
const underlineQuiet = cn(underline, 'border-b-transparent hover:border-b-foreground/25');

/** پیش‌نمای پاسخ: متن کم‌رنگ روی خط نقطه‌چین. */
const answerLine = 'flex items-center border-b border-dotted border-foreground/35 pb-1.5 text-sm text-muted-foreground';

/** متن پیش‌نمای پاسخ وقتی جای‌نگهدار خالی است تا نوع فیلد از روی کارت خوانا باشد. */
const ANSWER_HINT: Partial<Record<EditorField['type'], string>> = {
  short_text: 'پاسخ کوتاه',
  long_text: 'پاسخ بلند',
  number: 'عدد',
  email: 'name@example.com',
  phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
};

const LTR_ANSWER = new Set<EditorField['type']>(['email', 'phone', 'number']);

export function FieldInline({ field, active, onChange }: { field: EditorField; active: boolean; onChange: Patch }) {
  const specs = specsAt(field.type, 'inline');
  const setSettings = (patch: Record<string, unknown>) => onChange({ settings: { ...field.settings, ...patch } });
  const head = specs.filter((s) => s.control === 'label' || s.control === 'description');
  const body = specs.filter((s) => s.control !== 'label' && s.control !== 'description');

  return (
    <div className="flex flex-col gap-4">
      {head.length > 0 && (
        <div className={cn('flex flex-col', active ? 'gap-2' : 'gap-1')}>
          {head.map((spec) => (
            <InlineControl key={spec.keys.join('+')} spec={spec} field={field} active={active} onChange={onChange} setSettings={setSettings} />
          ))}
        </div>
      )}
      {body.map((spec) => (
        <InlineControl key={spec.keys.join('+')} spec={spec} field={field} active={active} onChange={onChange} setSettings={setSettings} />
      ))}
      {/* تاریخ تنظیم درون‌خطی ندارد (بازه‌ی تاریخ اعتبارسنجی است)؛ فقط شکل پاسخ نشان داده می‌شود. */}
      {field.type === 'date' && (
        <div className={cn(answerLine, 'w-56 justify-between')}>
          روز / ماه / سال
          <CalendarIcon className="size-4" />
        </div>
      )}
    </div>
  );
}

function InlineControl({
  spec,
  field,
  active,
  onChange,
  setSettings,
}: {
  spec: SettingSpec;
  field: EditorField;
  active: boolean;
  onChange: Patch;
  setSettings: (patch: Record<string, unknown>) => void;
}) {
  const s = field.settings;
  const key = spec.keys[0]!;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  switch (spec.control) {
    case 'label':
      return active ? (
        <div className="flex items-end gap-1">
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            // عنوان پیش‌فرض با اولین فوکوس انتخاب می‌شود تا با تایپ جایگزین شود.
            onFocus={(e) => field.label === DEFAULT_LABEL && e.currentTarget.select()}
            aria-label={spec.label}
            aria-invalid={field.label.trim() === '' || undefined}
            placeholder={spec.label}
            maxLength={500}
            className={cn(underlineShown, 'text-base font-medium')}
          />
          {field.required && (
            <span className="pb-1.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-1 text-base font-medium">
          <span className={cn('min-w-0 break-words', !field.label.trim() && 'text-muted-foreground')}>
            {field.label.trim() || 'بدون عنوان'}
          </span>
          {field.required && (
            <span className="text-destructive" aria-label="اجباری">
              *
            </span>
          )}
        </div>
      );

    case 'description':
      // متن غنی محدود (پررنگ، کج، لینک، فهرست) با همان نوار قالب‌بندی المان «متن»، بدون تیتر.
      if (!active) return <RichPreview doc={field.description} empty="" className="text-muted-foreground" />;
      return (
        <FormRichText
          value={field.description}
          onChange={(doc) => onChange({ description: doc.blocks.length ? doc : '' })}
          label={spec.label}
          placeholder={`${spec.label} (اختیاری)`}
          headings={false}
          className="text-muted-foreground"
        />
      );

    // در فوتر کارت رندر می‌شود.
    case 'switch':
      return null;

    case 'placeholder': {
      const value = str(s[key]);
      const hint = ANSWER_HINT[field.type] ?? '';
      const ltr = LTR_ANSWER.has(field.type);
      const width = field.type === 'long_text' ? 'w-full' : 'w-full sm:w-1/2';
      if (!active) {
        return (
          <div dir={ltr ? 'ltr' : undefined} className={cn(answerLine, width, ltr && 'justify-end')}>
            {value || hint}
          </div>
        );
      }
      // پاسخ‌دهنده جای‌نگهدار را داخل ورودی می‌بیند؛ این‌جا خود همان متن ویرایش می‌شود.
      return (
        <label className={cn('flex flex-col gap-0.5', width)}>
          <input
            value={value}
            onChange={(e) => setSettings({ [key]: e.target.value })}
            aria-label={spec.label}
            placeholder={hint}
            maxLength={200}
            className={cn(underline, 'border-dotted border-b-foreground/35 text-base focus:border-solid md:text-sm')}
          />
          <span className="text-[11px] text-muted-foreground">{spec.label} (اختیاری)</span>
        </label>
      );
    }

    case 'options':
      return <OptionsEditor field={field} active={active} onChange={(options) => setSettings({ options })} />;

    case 'select':
      // شکل نمایش فقط هنگام ویرایش؛ نمای جمع‌شده خودش شکل انتخاب‌شده را نشان می‌دهد.
      if (!active || !spec.choices) return null;
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {spec.label}
          <Segmented
            className="w-full max-w-72"
            value={str(s[key])}
            onChange={(v) => setSettings({ [key]: v })}
            items={spec.choices.map((c) => ({ value: c.value, label: c.label }))}
          />
        </div>
      );

    case 'scale': {
      const max = typeof s[key] === 'number' ? (s[key] as number) : 5;
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3 text-muted-foreground" aria-label={`امتیاز از ${fa(max)}`}>
            {Array.from({ length: max }, (_, i) => (
              <span key={i} className="flex flex-col items-center gap-1 text-[11px]">
                {fa(i + 1)}
                <StarIcon className="size-6 opacity-70" />
              </span>
            ))}
          </div>
          {active && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              {spec.label}
              <NativeSelect size="sm" value={String(max)} onChange={(e) => setSettings({ [key]: Number(e.target.value) })}>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <NativeSelectOption key={n} value={n}>
                    {fa(n)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          )}
        </div>
      );
    }

    case 'rich_text':
      return active ? (
        <FormRichText
          value={s[key]}
          onChange={(doc) => setSettings({ [key]: doc })}
          label={spec.label}
          placeholder="متن را بنویسید"
        />
      ) : (
        <RichPreview doc={s[key]} empty="متن خالی" />
      );

    case 'url': {
      const url = str(s[key]);
      const valid = url.startsWith('https://');
      return (
        <div className="flex flex-col gap-3">
          <ImagePreview key={url} url={valid ? url : ''} alt={str(s.alt)} />
          {active && (
            <UnderlineInput
              label={spec.label}
              hint={spec.hint}
              value={url}
              ltr
              placeholder="https://example.com/photo.jpg"
              error={url !== '' && !valid ? 'نشانی باید با https شروع شود.' : undefined}
              onChange={(v) => setSettings({ [key]: v.trim() })}
            />
          )}
        </div>
      );
    }

    case 'image_alt':
      return active ? (
        <UnderlineInput label={spec.label} hint={spec.hint} value={str(s[key])} maxLength={300} onChange={(v) => setSettings({ [key]: v })} />
      ) : null;

    case 'video_url':
      return <VideoInline field={field} active={active} spec={spec} setSettings={setSettings} />;

    case 'int':
    case 'number':
    case 'date':
    case 'condition':
      // گروه اعتبارسنجی/منطق؛ هرگز در کارت درون‌خطی نیست (تست form-editor-settings).
      return null;
  }
}

function UnderlineInput({
  label,
  value,
  onChange,
  hint,
  error,
  ltr,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  ltr?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <input
        value={value}
        dir={ltr ? 'ltr' : undefined}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(underlineShown, 'text-base md:text-sm', ltr && 'text-left')}
      />
      <span className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>
        {error ?? (
          <>
            {label}
            {hint && <span className="opacity-70"> · {hint}</span>}
          </>
        )}
      </span>
    </label>
  );
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    // تصویر بیرونی کاربر؛ next/image برای دامنه‌ی ناشناس استفاده نمی‌شود.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} onError={() => setFailed(true)} className="max-h-60 w-full rounded-lg bg-muted object-contain" />;
  }
  return (
    <EmptyMedia icon={<ImageIcon />}>{failed ? 'تصویر از این نشانی بارگذاری نشد' : 'هنوز تصویری انتخاب نشده'}</EmptyMedia>
  );
}

function EmptyMedia({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-foreground/15 bg-muted/50 text-xs text-muted-foreground [&_svg]:size-6">
      {icon}
      {children}
    </div>
  );
}

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
  const dropdown = field.type === 'single_choice' && field.settings.display === 'dropdown';
  // گزینه‌ی تازه‌ای که باید فوکوس بگیرد (پس از «افزودن گزینه» یا Enter).
  const [focusValue, setFocusValue] = useState<string | null>(null);

  const add = (after = options.length - 1) => {
    const value = nextOptionValue(options);
    const next = [...options];
    next.splice(after + 1, 0, { value, label: `گزینه ${fa(options.length + 1)}` });
    onChange(next);
    setFocusValue(value);
  };

  if (!active && dropdown) {
    return (
      <div className={cn(answerLine, 'w-full justify-between sm:w-1/2')}>
        انتخاب کنید
        <ChevronDownIcon className="size-4" />
      </div>
    );
  }

  // مثل گوگل فرم: رادیو/چک‌باکس، و در کشویی شماره‌ی گزینه.
  const marker = (i: number) =>
    dropdown ? (
      <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">{fa(i + 1)}.</span>
    ) : (
      <span className={cn('size-[18px] shrink-0 border-2 border-foreground/35', multi ? 'rounded-[3px]' : 'rounded-full')} />
    );

  return (
    <div className="flex flex-col gap-1">
      {options.map((o, i) => (
        <div key={o.value} className="group/opt flex min-h-9 items-center gap-3 text-sm">
          {marker(i)}
          {active ? (
            <>
              <input
                value={o.label}
                aria-label={`گزینه‌ی ${fa(i + 1)}`}
                aria-invalid={o.label.trim() === '' || undefined}
                maxLength={500}
                autoFocus={o.value === focusValue}
                onFocus={(e) => o.value === focusValue && e.currentTarget.select()}
                onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && options.length < 100) {
                    e.preventDefault();
                    add(i);
                  }
                }}
                className={cn(underlineQuiet, 'text-base md:text-sm')}
              />
              <IconAction
                label={`حذف گزینه‌ی ${fa(i + 1)}`}
                size="icon-sm"
                className={cn('text-muted-foreground', options.length < 2 && 'invisible')}
                onClick={() => onChange(options.filter((_, j) => j !== i))}
              >
                <XIcon />
              </IconAction>
            </>
          ) : (
            <span>{o.label}</span>
          )}
        </div>
      ))}
      {active && options.length < 100 && (
        <div className="flex min-h-9 items-center gap-3 text-sm">
          {marker(options.length)}
          <button
            type="button"
            onClick={() => add()}
            className="flex items-center gap-1.5 border-b border-dotted border-transparent pb-0.5 text-muted-foreground outline-none hover:border-foreground/35 hover:text-foreground focus-visible:border-primary focus-visible:text-foreground"
          >
            <PlusIcon className="size-4" />
            افزودن گزینه
          </button>
        </div>
      )}
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = { aparat: 'آپارات', youtube: 'یوتیوب', vimeo: 'ویمیو' };

function canonicalVideoUrl(provider: string, id: string): string {
  if (provider === 'youtube') return `https://youtu.be/${id}`;
  if (provider === 'vimeo') return `https://vimeo.com/${id}`;
  return `https://www.aparat.com/v/${id}`;
}

function VideoInline({
  field,
  active,
  spec,
  setSettings,
}: {
  field: EditorField;
  active: boolean;
  spec: SettingSpec;
  setSettings: (patch: Record<string, unknown>) => void;
}) {
  const provider = typeof field.settings.provider === 'string' ? field.settings.provider : undefined;
  const videoId = typeof field.settings.video_id === 'string' ? field.settings.video_id : undefined;
  // لینک خام ذخیره نمی‌شود (§8.3: فقط {provider, video_id})؛ ورودی در state محلی می‌ماند و از داده‌ی ذخیره‌شده بازسازی می‌شود.
  const [draft, setDraft] = useState(() => (provider && videoId ? canonicalVideoUrl(provider, videoId) : ''));
  const parsed = draft ? parseVideoUrl(draft) : null;

  return (
    <div className="flex flex-col gap-3">
      {provider ? (
        <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-lg bg-foreground/85 text-xs text-background">
          <VideoIcon className="size-6" />
          ویدیوی {PROVIDER_LABEL[provider]}
        </div>
      ) : (
        <EmptyMedia icon={<VideoIcon />}>هنوز ویدیویی انتخاب نشده</EmptyMedia>
      )}
      {active && (
        <UnderlineInput
          label={spec.label}
          hint={spec.hint}
          value={draft}
          ltr
          placeholder="https://www.aparat.com/v/…"
          error={draft !== '' && !parsed ? 'لینک ویدیو از آپارات، یوتیوب یا ویمیو نیست.' : undefined}
          onChange={(v) => {
            setDraft(v);
            const p = parseVideoUrl(v);
            setSettings({ provider: p?.provider, video_id: p?.video_id });
          }}
        />
      )}
    </div>
  );
}
