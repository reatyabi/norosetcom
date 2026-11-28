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
import type { FormDefaults, FormLayout, FormTheme } from '@noroset/field-engine';
import { resolveFormThemeTokens } from '@noroset/field-engine';
import { Button, cn, Input, NativeSelect, NativeSelectOption, ScrollArea, Segmented, Textarea } from '@noroset/ui';
import { hoverScroll, IconAction, Overlay } from '@/components/editor-ui';
import {
  NfFieldFrame,
  NfFieldLabel,
  NfControlBox,
  NfChoiceOption,
  NfRatingStars,
  NfMediaPlaceholder,
  NfFieldHelper,
  NfFieldError,
  NfMailIcon,
  NfPhoneIcon,
  NfHashIcon,
  NfCalendarIcon,
  NfImageIcon,
  NfVideoIcon,
  NfChevronDownIcon,
} from '@noroset/noroform/ui';
import { ELEMENT_INFO } from './data';
import { EditorBackground } from './editor-background';
import { RichPreview } from './form-rich-text';
import { answerErrorText, pageErrors, runPreview, type AnswerError, type RawAnswers } from './preview-run';
import { isBasicElementType, specsAt } from './settings-spec';
import { type EditorField, type EditorPage, type ElementDef, fa, makeField, optionsOf } from './types';

/* ─── FormPreview ─── */

export function FormPreview({
  title,
  pages,
  startPage,
  theme,
  layout,
  defaults,
  onClose,
}: {
  title: string;
  pages: EditorPage[];
  /** صفحه‌ای که پیش‌نمایش از آن شروع می‌شود (صفحه‌ی باز در ادیتور). */
  startPage: number;
  theme: FormTheme;
  layout?: FormLayout;
  defaults?: FormDefaults;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [index, setIndex] = useState(startPage);
  const [raw, setRaw] = useState<RawAnswers>({});
  const [errors, setErrors] = useState<Record<string, AnswerError>>({});
  const [done, setDone] = useState(false);

  const zones = layout?.zones ?? {
    header: true,
    top_bar: true,
    sidebar: true,
    bottom_bar: true,
    footer: true,
  };
  const hasSidebar = Boolean(zones.sidebar && pages.length > 1);

  const { visible } = useMemo(() => runPreview(pages, raw), [pages, raw]);
  const page = pages[index] ?? pages[0]!;
  const items = page.fields.filter((f) => visible.has(f.id));
  const isLast = index === pages.length - 1;
  const resolved = resolveFormThemeTokens(theme);

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

      <div
        data-nf-canvas=""
        data-canvas-contrast={resolved.contrast}
        data-button-style={theme.button_style || 'filled'}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden text-nf-on-canvas"
        style={resolved.cssVars as CSSProperties}
      >
        <EditorBackground theme={theme} />
        <ScrollArea className={cn('relative z-10 min-h-0 flex-1', hoverScroll)}>
          <div className="flex justify-center p-3 md:p-6">
            <div
              className={cn(
                'flex w-full flex-col gap-4 transition-colors',
                mode === 'desktop'
                  ? 'max-w-3xl'
                  : 'max-w-96 rounded-[28px] border border-border bg-nf-canvas/80 p-3 shadow-xl backdrop-blur-xs',
              )}
            >
              {/* ۱. هدر فرم (در صورت فعال بودن zones.header) */}
              {zones.header && (defaults?.header?.logo_url || defaults?.header?.brand_title) && (
                <header
                  className={cn(
                    'flex items-center gap-3 py-1 px-1 text-sm text-nf-on-canvas',
                    defaults?.header?.align === 'center'
                      ? 'justify-center text-center'
                      : defaults?.header?.align === 'end'
                        ? 'justify-end text-end'
                        : 'justify-start text-start',
                  )}
                >
                  {defaults?.header?.show_logo !== false && defaults?.header?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={defaults.header.logo_url}
                      alt={defaults.header.brand_title || 'لوگو'}
                      className="size-8 rounded-lg object-cover ring-1 ring-nf-on-canvas-border"
                    />
                  )}
                  <div className="flex flex-col">
                    {defaults?.header?.show_title !== false && defaults?.header?.brand_title && (
                      <span className="font-bold text-nf-on-canvas">{defaults.header.brand_title}</span>
                    )}
                    {defaults?.header?.show_subtitle !== false && defaults?.header?.brand_subtitle && (
                      <span className="text-xs text-nf-on-canvas-muted">{defaults.header.brand_subtitle}</span>
                    )}
                  </div>
                </header>
              )}

              {/* نوار مراحل افقی برای حالت موبایل */}
              {hasSidebar && (
                <div className={cn('flex items-center gap-1.5 overflow-x-auto pb-1 text-xs', mode === 'desktop' ? 'md:hidden' : '')}>
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        i === index
                          ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                          : 'bg-nf-card border border-nf-border text-nf-card-foreground hover:bg-nf-muted',
                      )}
                    >
                      <span className="flex size-4 items-center justify-center rounded-full bg-black/10 text-[10px]">{fa(i + 1)}</span>
                      <span>{p.title.trim() || `صفحه ${fa(i + 1)}`}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ساختار شبکه‌ای دسکتاپ: سایدبار در کنار ستون اصلی با مقیاس محتوا */}
              <div
                data-nf-content-area=""
                className={cn(
                  'grid items-start gap-4',
                  hasSidebar && mode === 'desktop' ? 'grid-cols-1 md:grid-cols-[180px_1fr]' : 'grid-cols-1',
                )}
              >
                {/* ۲. سایدبار مراحل در حالت دسکتاپ */}
                {hasSidebar && mode === 'desktop' && (
                  <aside className="hidden md:flex flex-col gap-1 rounded-nf-card border border-nf-border bg-nf-card p-3 text-nf-card-foreground shadow-sm">
                    {defaults?.sidebar?.title && (
                      <span className="px-2 py-1 text-xs font-bold text-nf-muted-foreground">
                        {defaults.sidebar.title}
                      </span>
                    )}
                    <nav className="flex flex-col gap-1">
                      {pages.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-right transition-colors cursor-pointer',
                            i === index
                              ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                              : 'text-nf-card-foreground hover:bg-nf-muted',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                              i === index ? 'bg-black/15 text-inherit' : 'bg-nf-muted text-nf-muted-foreground',
                            )}
                          >
                            {fa(i + 1)}
                          </span>
                          <span className="truncate">{p.title.trim() || `صفحه ${fa(i + 1)}`}</span>
                        </button>
                      ))}
                    </nav>
                  </aside>
                )}

                {/* ستون کارت‌های میانی */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  {/* ۳. کارت نوار بالای فرم (TopBar) */}
                  {zones.top_bar && (
                    <div className="overflow-hidden rounded-nf-card border border-nf-border bg-nf-card text-nf-card-foreground shadow-xs">
                      <div className="h-2 bg-nf-primary" />
                      <div className="flex flex-col gap-1 px-5 py-4">
                        <h2 className="text-xl font-bold">{title || 'فرم بدون عنوان'}</h2>
                        {defaults?.top_bar?.description && (
                          <p className="text-xs text-nf-muted-foreground">{defaults.top_bar.description}</p>
                        )}
                        {defaults?.top_bar?.mode === 'notice' && defaults.top_bar.notice_text && (
                          <div className="mt-2 rounded-lg bg-nf-muted p-2.5 text-xs text-nf-card-foreground">
                            {defaults.top_bar.notice_text}
                          </div>
                        )}
                        {defaults?.top_bar?.mode !== 'notice' && defaults?.top_bar?.mode !== 'none' && pages.length > 1 && !done && (
                          <div className="mt-2 flex items-center gap-3 text-xs text-nf-muted-foreground">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-nf-muted" aria-hidden>
                              <div
                                className="h-full rounded-full bg-nf-primary transition-[width] duration-300 ease-fluent"
                                style={{ width: `${((index + 1) / pages.length) * 100}%` }}
                              />
                            </div>
                            صفحه‌ی {fa(index + 1)} از {fa(pages.length)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {done ? (
                    <div className="flex flex-col items-center gap-2 rounded-nf-card border border-nf-border bg-nf-card px-5 py-10 text-center text-nf-card-foreground shadow-xs">
                      <CircleCheckIcon className="size-10 text-nf-primary" />
                      <span className="font-semibold">پاسخ شما ثبت شد.</span>
                      <span className="text-sm text-muted-foreground">این پیش‌نمایش است و پاسخی ذخیره نشد.</span>
                      <Button variant="secondary" className="mt-3" onClick={restart}>
                        <RotateCcwIcon />
                        شروع دوباره
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* ۴. کارت واحد بدنه اصلی */}
                      <div
                        id="pv-zone-main"
                        className="flex flex-col gap-4 rounded-nf-card border border-nf-border bg-nf-card p-4 md:p-6 text-nf-card-foreground shadow-sm"
                      >
                        {items.length === 0 ? (
                          <p className="py-6 text-center text-sm text-nf-muted-foreground">
                            در این صفحه با پاسخ‌های فعلی چیزی نمایش داده نمی‌شود.
                          </p>
                        ) : (
                          <div
                            className={cn(
                              'grid gap-x-5 gap-y-5',
                              (layout?.main_columns ?? 1) === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
                            )}
                          >
                            {items.map((f) => {
                              const isColSpan2 = Number(f.settings?.col_span) === 2;
                              return (
                                <div
                                  key={f.id}
                                  className={cn(
                                    'flex flex-col',
                                    isColSpan2 && 'md:col-span-2',
                                  )}
                                >
                                  <AnswerItem
                                    field={f}
                                    value={raw[f.fieldId]}
                                    error={errors[f.fieldId]}
                                    color={theme.primary_color}
                                    onChange={(v) => setAnswer(f.fieldId, v)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ۵. نوار دکمه‌های پایین فرم */}
                      {zones.bottom_bar && (
                        <div
                          className={cn(
                            'flex items-center justify-between gap-2 transition-all',
                            layout?.bottom_bar_fixed
                              ? 'sticky bottom-3 z-20 backdrop-blur-sm bg-nf-card/95 border border-nf-border shadow-md rounded-nf-card p-3'
                              : 'rounded-nf-card border border-nf-border bg-nf-card px-4 py-3 shadow-xs',
                          )}
                        >
                          <button
                            type="button"
                            className="nf-btn-primary rounded-nf-control font-medium px-4 py-2 text-sm transition-colors cursor-pointer min-w-24 flex items-center justify-center gap-1.5 shadow-xs"
                            onClick={next}
                          >
                            <span>
                              {isLast
                                ? defaults?.bottom_bar?.submit_label || 'ارسال'
                                : defaults?.bottom_bar?.next_label || 'بعدی'}
                            </span>
                            {!isLast && <ArrowLeftIcon className="size-4" />}
                          </button>
                          {index > 0 && (
                            <Button variant="secondary" onClick={() => setIndex((i) => i - 1)}>
                              <ArrowRightIcon />
                              {defaults?.bottom_bar?.prev_label || 'قبلی'}
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ۶. فوتر فرم */}
              {zones.footer && (
                <footer className="w-full shrink-0 py-2 text-center text-xs text-nf-on-canvas-muted opacity-80">
                  {defaults?.footer?.text || 'این فرم با نوروست طراحی شده است.'}
                </footer>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
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
      if (url) {
        return (
          <div className="overflow-hidden rounded-nf-card border border-nf-border bg-nf-muted/20">
            <img src={url} alt={String(s.alt ?? '')} className="max-h-80 w-full object-contain" />
            {Boolean(s.alt) && <div className="p-2 text-center text-xs text-nf-muted-foreground">{String(s.alt)}</div>}
          </div>
        );
      }
      return <NfMediaPlaceholder icon={<NfImageIcon />} label="تصویری انتخاب نشده است" />;
    }
    // video
    if ((s.provider === 'aparat' || s.provider === 'youtube' || s.provider === 'vimeo') && typeof s.video_id === 'string') {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-nf-card border border-nf-border bg-nf-muted/25 p-6 text-center text-xs text-nf-muted-foreground">
          <NfVideoIcon className="size-8 text-nf-primary" />
          <span className="font-medium text-nf-card-foreground">ویدیوی فرم ({String(s.provider)})</span>
          <span className="text-[11px] opacity-75">پخش زنده ویدیو در صفحه‌ی عمومی فرم فعال است.</span>
        </div>
      );
    }
    return <NfMediaPlaceholder icon={<NfVideoIcon />} label="ویدیویی انتخاب نشده است" />;
  }

  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  } as const;
  const str = typeof value === 'string' ? value : '';
  const placeholder = typeof s.placeholder === 'string' ? s.placeholder : '';
  const options = optionsOf(field);

  let control: ReactNode;
  switch (field.type) {
    case 'long_text':
      control = (
        <NfControlBox isMultiline isInvalid={Boolean(error)} interactive>
          <textarea
            {...common}
            rows={4}
            value={str}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-20 bg-transparent text-sm text-nf-card-foreground outline-none resize-none placeholder:text-nf-muted-foreground/60"
          />
        </NfControlBox>
      );
      break;
    case 'date':
      control = (
        <div className="flex flex-col gap-1 w-full max-w-xs">
          <NfControlBox tabularNums icon={<NfCalendarIcon />} isInvalid={Boolean(error)} interactive>
            <input
              {...common}
              type="date"
              dir="ltr"
              value={str}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-transparent text-sm text-nf-card-foreground outline-none text-right placeholder:text-nf-muted-foreground/60"
            />
          </NfControlBox>
          {str && parseIsoDate(str) && (
            <span className="text-xs text-nf-muted-foreground">{formatJalali(str)}</span>
          )}
        </div>
      );
      break;
    case 'single_choice':
      control =
        s.display === 'dropdown' ? (
          <NfControlBox icon={<NfChevronDownIcon />} isInvalid={Boolean(error)} interactive>
            <select
              {...common}
              value={str}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-transparent text-sm text-nf-card-foreground outline-none cursor-pointer"
            >
              <option value="" className="bg-nf-card text-nf-card-foreground">انتخاب کنید</option>
              {options.map((o) => (
                <option key={o.value} value={o.value} className="bg-nf-card text-nf-card-foreground">
                  {o.label}
                </option>
              ))}
            </select>
          </NfControlBox>
        ) : (
          <div role="radiogroup" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
            {options.map((o) => (
              <NfChoiceOption
                key={o.value}
                type="radio"
                checked={str === o.value}
                onChange={() => onChange(o.value)}
                label={o.label}
              />
            ))}
          </div>
        );
      break;
    case 'multi_choice': {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <div role="group" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
          {options.map((o) => (
            <NfChoiceOption
              key={o.value}
              type="checkbox"
              checked={picked.includes(o.value)}
              onChange={() =>
                onChange(
                  picked.includes(o.value)
                    ? picked.filter((v) => v !== o.value)
                    : [...picked, o.value],
                )
              }
              label={o.label}
            />
          ))}
        </div>
      );
      break;
    }
    case 'rating': {
      const max = typeof s.max === 'number' ? s.max : 5;
      const current = typeof value === 'number' ? value : 0;
      control = (
        <NfRatingStars
          interactive
          max={max}
          value={current}
          onChange={(rating) => onChange(rating)}
          color={color}
        />
      );
      break;
    }
    default: {
      const ltr = field.type === 'email' || field.type === 'phone' || field.type === 'number';
      const icon =
        field.type === 'email' ? (
          <NfMailIcon />
        ) : field.type === 'phone' ? (
          <NfPhoneIcon />
        ) : field.type === 'number' ? (
          <NfHashIcon />
        ) : undefined;

      control = (
        <NfControlBox
          dir={ltr ? 'ltr' : undefined}
          tabularNums={field.type === 'phone' || field.type === 'number'}
          icon={icon}
          isInvalid={Boolean(error)}
          interactive
        >
          <input
            {...common}
            dir={ltr ? 'ltr' : undefined}
            type={field.type === 'email' ? 'email' : 'text'}
            inputMode={
              field.type === 'email'
                ? 'email'
                : field.type === 'phone'
                  ? 'tel'
                  : field.type === 'number'
                    ? 'decimal'
                    : undefined
            }
            value={str}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full bg-transparent text-sm text-nf-card-foreground outline-none placeholder:text-nf-muted-foreground/60',
              ltr && 'text-left',
            )}
          />
        </NfControlBox>
      );
    }
  }

  return (
    <NfFieldFrame textAlign={s.text_align as 'right' | 'center' | 'left'}>
      <NfFieldLabel htmlFor={id} label={field.label} required={field.required} />
      {control}
      {field.description && (
        <NfFieldHelper>
          <RichPreview doc={field.description} empty="" />
        </NfFieldHelper>
      )}
      {error && (
        <NfFieldError id={errorId}>
          {answerErrorText(error)}
        </NfFieldError>
      )}
    </NfFieldFrame>
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
