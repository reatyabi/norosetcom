'use client';

/**
 * دیالوگ‌های ادیتور فرم:
 * - FormPreview: اجرای واقعی فرم با همه‌ی صفحه‌ها، منطق شرطی و اعتبارسنجی field-engine؛ چیزی ذخیره نمی‌شود.
 * - ElementPreview: پیش از افزودن، کاربرد المان، یک نمونه‌ی قابل‌امتحان و محل تنظیماتش (کارت/پیشرفته).
 */

import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  ImageIcon,
  MonitorIcon,
  PlusIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  StarIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import { formatJalali, parseIsoDate } from '@noroset/field-engine';
import type { FormTheme } from '@noroset/field-engine';
import { Button, cn, Input, NativeSelect, NativeSelectOption, ScrollArea, Segmented, Textarea } from '@noroset/ui';
import { hoverScroll, IconAction, Overlay } from '@/components/editor-ui';
import { ELEMENT_INFO } from './data';
import { RichPreview } from './form-rich-text';
import { answerErrorText, pageErrors, runPreview, type AnswerError, type RawAnswers } from './preview-run';
import { isBasicElementType, specsAt } from './settings-spec';
import { type EditorField, type EditorPage, type ElementDef, fa, makeField, optionsOf } from './types';
import { backgroundCss, fontCss, radiusCss, textScale } from '@noroset/noroform/ui';

function readableInk(color: string): string {
  const channels = color.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [0, 0, 0];
  const luminance = channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  return luminance > 0.179 ? '#111827' : '#ffffff';
}

function previewButtonStyle(
  style: FormTheme['button_style'],
  color: string,
  ink: string,
  radius: string,
): CSSProperties {
  const base: CSSProperties = { borderRadius: radius, border: `1px solid ${color}` };
  if (style === 'outline') return { ...base, color, backgroundColor: 'transparent' };
  if (style === 'soft') return { ...base, color: '#111827', borderColor: `${color}44`, backgroundColor: `${color}1f` };
  if (style === 'tonal') return { ...base, color: ink, borderColor: `${color}33`, backgroundColor: `${color}29` };
  if (style === 'glass') return { ...base, color: '#111827', borderColor: 'rgba(255,255,255,.75)', backgroundColor: 'rgba(255,255,255,.78)' };
  if (style === 'shadow') return { ...base, color: ink, backgroundColor: color, boxShadow: `3px 3px 0 ${ink}` };
  return { ...base, color: ink, backgroundColor: color };
}

/* ─── FormPreview ─── */

export function FormPreview({
  title,
  pages,
  startPage,
  theme,
  onClose,
}: {
  title: string;
  pages: EditorPage[];
  /** صفحه‌ای که پیش‌نمایش از آن شروع می‌شود (صفحه‌ی باز در ادیتور). */
  startPage: number;
  theme: FormTheme;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [index, setIndex] = useState(startPage);
  const [raw, setRaw] = useState<RawAnswers>({});
  const [errors, setErrors] = useState<Record<string, AnswerError>>({});
  const [done, setDone] = useState(false);

  const { visible } = useMemo(() => runPreview(pages, raw), [pages, raw]);
  const page = pages[index] ?? pages[0]!;
  const items = page.fields.filter((f) => visible.has(f.id));
  const isLast = index === pages.length - 1;
  const accentInk = readableInk(theme.primary_color);
  const cardRadius = radiusCss(theme.radius);

  const restart = () => {
    setRaw({});
    setErrors({});
    setDone(false);
    setIndex(0);
  };

  const setAnswer = (fieldId: string, value: unknown) => {
    setRaw((r) => ({ ...r, [fieldId]: value }));
    setErrors((e) => {
      if (!e[fieldId]) return e;
      const rest = { ...e };
      delete rest[fieldId];
      return rest;
    });
  };

  const next = () => {
    const errs = pageErrors(items, raw);
    setErrors(errs);
    const first = items.find((f) => errs[f.fieldId]);
    if (first) {
      document.getElementById(`pv-${first.fieldId}`)?.focus();
      return;
    }
    if (isLast) setDone(true);
    else setIndex((i) => i + 1);
  };

  return (
    <Overlay
      onClose={onClose}
      labelledBy={titleId}
      className="inset-0 overflow-hidden max-md:rounded-none max-md:ring-0 md:inset-[6%]"
    >
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <div className="flex min-w-0 flex-col">
          <span id={titleId} className="font-semibold">
            پیش‌نمایش
          </span>
          <span className="text-xs text-muted-foreground">پاسخ‌ها ذخیره نمی‌شوند.</span>
        </div>
        <div className="flex flex-1 justify-center">
          <div className="w-56 max-md:hidden">
            <Segmented
              value={mode}
              onChange={setMode}
              items={[
                { value: 'desktop', label: <><MonitorIcon />دسکتاپ</> },
                { value: 'mobile', label: <><SmartphoneIcon />موبایل</> },
              ]}
            />
          </div>
        </div>
        <IconAction label="شروع دوباره" onClick={restart}>
          <RotateCcwIcon />
        </IconAction>
        <IconAction label="بستن (Esc)" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      <ScrollArea className={cn('min-h-0 flex-1', hoverScroll)}>
        <div className="flex justify-center p-3 md:p-6">
          <div
            className={cn(
              'flex w-full flex-col gap-3',
              mode === 'desktop' ? 'max-w-160' : 'max-w-94 rounded-[28px] p-2 ring-1 ring-border',
            )}
            style={{
              background: backgroundCss(theme),
              fontFamily: fontCss(theme.font),
              fontSize: `${textScale(theme.text_size)}em`,
              ['--pv-accent' as string]: theme.primary_color,
            }}
          >
            {/* سربرگ فرم با نوار رنگ اصلی (مثل گوگل فرم) */}
            <div className="overflow-hidden bg-white text-neutral-900 shadow-xs ring-1 ring-black/10" style={{ borderRadius: cardRadius }}>
              <div className="h-2" style={{ backgroundColor: theme.primary_color }} />
              <div className="flex flex-col gap-1 px-5 py-4">
                <h2 className="text-xl font-bold">{title || 'فرم بدون عنوان'}</h2>
                {pages.length > 1 && !done && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full transition-[width] duration-300 ease-fluent"
                        style={{ width: `${((index + 1) / pages.length) * 100}%`, backgroundColor: theme.primary_color }}
                      />
                    </div>
                    صفحه‌ی {fa(index + 1)} از {fa(pages.length)}
                  </div>
                )}
              </div>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-2 bg-white px-5 py-10 text-center text-neutral-900 shadow-xs ring-1 ring-black/10" style={{ borderRadius: cardRadius }}>
                <CircleCheckIcon className="size-10" style={{ color: theme.primary_color }} />
                <span className="font-semibold">پاسخ شما ثبت شد.</span>
                <span className="text-sm text-muted-foreground">این پیش‌نمایش است و پاسخی ذخیره نشد.</span>
                <Button variant="secondary" className="mt-3" onClick={restart}>
                  <RotateCcwIcon />
                  شروع دوباره
                </Button>
              </div>
            ) : (
              <>
                {items.length === 0 && (
                  <p className="bg-white px-5 py-6 text-center text-sm text-neutral-600 ring-1 ring-black/10" style={{ borderRadius: cardRadius }}>
                    در این صفحه با پاسخ‌های فعلی چیزی نمایش داده نمی‌شود.
                  </p>
                )}
                {items.map((f) => (
                  <div key={f.id} className="px-5 py-4 text-neutral-900 shadow-xs ring-1 ring-black/10" style={{ background: theme.button_style === 'glass' ? 'rgba(255,255,255,.82)' : '#fff', borderRadius: cardRadius }}>
                    <AnswerItem
                      field={f}
                      value={raw[f.fieldId]}
                      error={errors[f.fieldId]}
                      color={theme.primary_color}
                      onChange={(v) => setAnswer(f.fieldId, v)}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 py-1">
                  <Button
                    className="hover:opacity-90"
                    style={previewButtonStyle(theme.button_style, theme.primary_color, accentInk, cardRadius)}
                    onClick={next}
                  >
                    {isLast ? 'ارسال' : 'بعدی'}
                    {!isLast && <ArrowLeftIcon />}
                  </Button>
                  {index > 0 && (
                    <Button variant="secondary" onClick={() => setIndex((i) => i - 1)}>
                      <ArrowRightIcon />
                      قبلی
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </Overlay>
  );
}

/* ─── پاسخ یک آیتم (پیش‌نمایش فرم و نمونه‌ی المان) ─── */

function AnswerItem({
  field,
  value,
  error,
  color,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  error?: AnswerError;
  color: string;
  onChange: (value: unknown) => void;
}) {
  const s = field.settings;
  const id = `pv-${field.fieldId}`;
  const errorId = `${id}-error`;

  if (field.family === 'content') {
    if (field.type === 'text') return <RichPreview doc={s.doc} empty="" />;
    if (field.type === 'image') {
      const url = typeof s.url === 'string' && s.url.startsWith('https://') ? s.url : '';
      // تصویر بیرونی کاربر؛ next/image برای دامنه‌ی ناشناس استفاده نمی‌شود.
      // eslint-disable-next-line @next/next/no-img-element
      return url ? <img src={url} alt={String(s.alt ?? '')} className="w-full rounded-lg" /> : <MediaPlaceholder icon={<ImageIcon />} />;
    }
    // iframe ویدیو فقط در صفحه‌ی عمومی با CSP مخصوص ساخته می‌شود.
    return <MediaPlaceholder icon={<VideoIcon />} dark={typeof s.provider === 'string'} />;
  }

  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  } as const;
  const str = typeof value === 'string' ? value : '';
  const placeholder = typeof s.placeholder === 'string' ? s.placeholder : '';
  const options = optionsOf(field);
  const accent = { accentColor: color };

  let control: ReactNode;
  switch (field.type) {
    case 'long_text':
      control = <Textarea {...common} rows={3} value={str} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'date':
      control = (
        <div className="flex flex-col gap-1">
          <Input {...common} type="date" dir="ltr" className="w-56 text-right" value={str} onChange={(e) => onChange(e.target.value)} />
          {str && parseIsoDate(str) && <span className="text-xs text-muted-foreground">{formatJalali(str)}</span>}
        </div>
      );
      break;
    case 'single_choice':
      control =
        s.display === 'dropdown' ? (
          <NativeSelect {...common} value={str} onChange={(e) => onChange(e.target.value)}>
            <NativeSelectOption value="">انتخاب کنید</NativeSelectOption>
            {options.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <div role="radiogroup" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
            {options.map((o) => (
              <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
                <input type="radio" name={id} className="size-[18px]" style={accent} checked={str === o.value} onChange={() => onChange(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        );
      break;
    case 'multi_choice': {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <div role="group" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
          {options.map((o) => (
            <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-[18px]"
                style={accent}
                checked={picked.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...picked, o.value] : picked.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'rating': {
      const max = typeof s.max === 'number' ? s.max : 5;
      const current = typeof value === 'number' ? value : 0;
      control = (
        <div role="radiogroup" {...common} tabIndex={-1} className="flex flex-wrap gap-1 outline-none">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={current === i + 1}
              aria-label={`${fa(i + 1)} از ${fa(max)}`}
              onClick={() => onChange(i + 1)}
              className="rounded-md p-1 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <StarIcon className="size-7" style={i < current ? { color, fill: color } : undefined} />
            </button>
          ))}
        </div>
      );
      break;
    }
    default: {
      const ltr = field.type === 'email' || field.type === 'phone' || field.type === 'number';
      control = (
        <Input
          {...common}
          dir={ltr ? 'ltr' : undefined}
          className={cn(ltr && 'text-right')}
          inputMode={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'decimal' : undefined}
          value={str}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-[15px] font-medium">
          {field.label.trim() || 'بدون عنوان'}
          {field.required && (
            <span className="text-destructive" aria-label="اجباری">
              {' '}
              *
            </span>
          )}
        </label>
        <RichPreview doc={field.description} empty="" className="text-muted-foreground" />
      </div>
      {control}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {answerErrorText(error)}
        </p>
      )}
    </div>
  );
}

function MediaPlaceholder({ icon, dark }: { icon: ReactNode; dark?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-32 items-center justify-center rounded-lg [&_svg]:size-6',
        dark ? 'bg-foreground/85 text-background' : 'bg-muted text-muted-foreground',
      )}
    >
      {icon}
    </div>
  );
}

/* ─── ElementPreview ─── */

export function ElementPreview({
  def,
  color,
  onClose,
  onAdd,
}: {
  def: ElementDef;
  color: string;
  onClose: () => void;
  onAdd: () => void;
}) {
  const titleId = useId();
  const basic = isBasicElementType(def.key) ? def.key : null;
  const info = basic ? ELEMENT_INFO[basic] : null;
  const sample = useMemo(() => {
    const f = makeField(def);
    return {
      ...f,
      label: info?.sample.label ?? f.label,
      settings: { ...f.settings, ...info?.sample.settings },
    };
  }, [def, info]);
  const [value, setValue] = useState<unknown>(undefined);
  const inline = basic ? specsAt(basic, 'inline').map((s) => s.label) : [];
  const advanced = basic ? specsAt(basic, 'advanced').map((s) => s.label) : [];

  return (
    <Overlay
      onClose={onClose}
      labelledBy={titleId}
      className="inset-x-0 top-1/2 mx-auto max-h-[calc(100svh-2rem)] w-110 max-w-[calc(100%-2rem)] -translate-y-1/2 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
          {def.icon}
        </span>
        <span id={titleId} className="text-[15px] font-semibold">
          {def.label}
        </span>
        <div className="flex-1" />
        <IconAction label="بستن (Esc)" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      <ScrollArea className={cn('min-h-0 flex-1', hoverScroll)}>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {info?.description ?? 'این المان توضیح کوتاهی ندارد.'}
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">نمونه (قابل امتحان)</span>
            <div className="rounded-xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-border">
              <AnswerItem field={sample} value={value} color={color} onChange={setValue} />
            </div>
          </div>

          {basic && (
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <SettingList title="روی کارت" items={inline} />
              <SettingList title="تنظیمات پیشرفته" items={advanced} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 border-t px-5 py-3">
        <Button variant="secondary" onClick={onClose}>
          بستن
        </Button>
        <Button onClick={onAdd}>
          <PlusIcon />
          افزودن به فرم
        </Button>
      </div>
    </Overlay>
  );
}

function SettingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
      <span className="font-medium">{title}</span>
      <ul className="flex flex-wrap gap-1">
        {items.map((label) => (
          <li key={label} className="rounded-full bg-background px-2 py-0.5 text-muted-foreground ring-1 ring-border">
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
