'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  InfoIcon,
  StarIcon,
} from 'lucide-react';
import {
  buildEmbedUrl,
  buildRuntimeState,
  computeVisiblePages,
  evaluateConditions,
  fieldTypes,
  formatJalali,
  isEmptyValue,
  isShown,
  LICENSE_BADGE,
  richTextSchema,
  resolveZones,
  type Answers,
  type FormDefinition,
  type FormPage,
  type FormTheme,
  type NavButton,
  type RichText as RichTextValue,
  type SubmissionError,
} from '@noroset/field-engine';
import { Button, ErrorSummary, Input, NativeSelect, NativeSelectOption, Textarea, cn } from '@noroset/ui';
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
} from './field-primitives';
import { LogoTitle, type LogoTitleValue } from './logo-title';
import { FormBackground, backgroundFromTheme } from './background';
import { answerErrorText, type AnswerError } from './answer-error';
import { fontCss, radiusCss, textScale } from './theme';
import { PublicMessage, buttonStyle } from './public-form-parts';

export type PublicFormView =
  | {
      status: 'published';
      slug: string;
      title: string;
      versionId: string;
      definition: FormDefinition;
      branding: { forceLicense: boolean };
    }
  | { status: 'closed'; slug: string; title: string; closedMessage: string };

const fa = (value: number) => value.toLocaleString('fa-IR');
type NavAction = 'start' | 'prev' | 'next' | 'submit';

function isNavAction(value: unknown): value is NavAction {
  return value === 'start' || value === 'prev' || value === 'next' || value === 'submit';
}

function serializedAnswers(definition: FormDefinition, raw: Record<string, unknown>): Answers {
  const answers: Answers = {};
  for (const page of definition.pages) {
    for (const item of page.body.items) {
      if (item.kind !== 'field' || isEmptyValue(raw[item.field_id])) continue;
      const type = fieldTypes.get(item.type);
      if (!type) continue;
      const result = type.validate(raw[item.field_id], item.settings);
      if (result.ok) answers[item.field_id] = type.serialize(result.value);
    }
  }
  return answers;
}

function validatePage(page: FormPage, raw: Record<string, unknown>, visible: Set<string>) {
  const errors: Record<string, AnswerError> = {};
  for (const item of page.body.items) {
    if (item.kind !== 'field' || !visible.has(item.item_id)) continue;
    const value = raw[item.field_id];
    if (isEmptyValue(value)) {
      if (item.required) errors[item.field_id] = { code: 'required' };
      continue;
    }
    const type = fieldTypes.get(item.type);
    const result = type?.validate(value, item.settings);
    if (result && !result.ok) errors[item.field_id] = { code: result.code, params: result.params };
  }
  return errors;
}

type RichInline = Extract<RichTextValue['blocks'][number], { type: 'paragraph' }>['children'][number];

function RichText({ value }: { value: string | RichTextValue | undefined }) {
  if (typeof value === 'string') return <p className="whitespace-pre-wrap">{value}</p>;
  if (!value) return null;
  const inline = (runs: RichInline[]): ReactNode =>
    runs.map((run, index) => {
      if (run.type === 'link') {
        return <a key={index} href={run.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline">{inline(run.children)}</a>;
      }
      let text: ReactNode = run.text;
      if (run.italic) text = <em>{text}</em>;
      if (run.bold) text = <strong>{text}</strong>;
      return <span key={index}>{text}</span>;
    });

  return (
    <div className="flex flex-col gap-3">
      {value.blocks.map((block, index) => {
        if (!block || typeof block !== 'object' || !('type' in block)) return null;
        if (block.type === 'list' && 'items' in block && Array.isArray(block.items)) {
          const ordered = block.ordered;
          const List = ordered ? 'ol' : 'ul';
          return <List key={index} className={cn('ps-6', ordered ? 'list-decimal' : 'list-disc')}>{block.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</List>;
        }
        if (!('children' in block)) return null;
        if (block.type === 'heading') {
          const children = inline(block.children);
          if ('level' in block && block.level === 1) return <h2 key={index} className="text-2xl font-bold">{children}</h2>;
          if ('level' in block && block.level === 2) return <h3 key={index} className="text-xl font-bold">{children}</h3>;
          return <h4 key={index} className="text-lg font-bold">{children}</h4>;
        }
        return <p key={index}>{inline(block.children)}</p>;
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  color,
  error,
  onChange,
}: {
  field: Extract<FormDefinition['pages'][number]['body']['items'][number], { kind: 'field' }>;
  value: unknown;
  color: string;
  error?: AnswerError;
  onChange: (value: unknown) => void;
}) {
  const id = `answer-${field.field_id}`;
  const errorId = `${id}-error`;
  const common = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined };
  const text = typeof value === 'string' ? value : '';
  const settings = field.settings;
  const placeholder = typeof settings.placeholder === 'string' ? settings.placeholder : '';
  const options = Array.isArray(settings.options)
    ? settings.options.filter((option): option is { value: string; label: string } =>
        Boolean(option && typeof option === 'object' && 'value' in option && 'label' in option &&
          typeof option.value === 'string' && typeof option.label === 'string'))
    : [];

  let input: ReactNode;

  switch (field.type) {
    case 'long_text':
      input = (
        <NfControlBox isMultiline isInvalid={Boolean(error)} interactive>
          <textarea
            {...common}
            rows={4}
            value={text}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="w-full min-h-20 bg-transparent text-sm text-nf-card-foreground outline-none resize-none placeholder:text-nf-muted-foreground/60"
          />
        </NfControlBox>
      );
      break;
    case 'date':
      input = (
        <div className="flex flex-col gap-1 w-full max-w-xs">
          <NfControlBox tabularNums icon={<NfCalendarIcon />} isInvalid={Boolean(error)} interactive>
            <input
              {...common}
              type="date"
              dir="ltr"
              value={text}
              onChange={(event) => onChange(event.target.value)}
              className="w-full bg-transparent text-sm text-nf-card-foreground outline-none text-right placeholder:text-nf-muted-foreground/60"
            />
          </NfControlBox>
          {text && <span className="text-xs text-nf-muted-foreground">{formatJalali(text)}</span>}
        </div>
      );
      break;
    case 'single_choice':
      input = settings.display === 'dropdown' ? (
        <NfControlBox icon={<NfChevronDownIcon />} isInvalid={Boolean(error)} interactive>
          <select
            {...common}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className="w-full bg-transparent text-sm text-nf-card-foreground outline-none cursor-pointer"
          >
            <option value="" className="bg-nf-card text-nf-card-foreground">انتخاب کنید</option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-nf-card text-nf-card-foreground">
                {option.label}
              </option>
            ))}
          </select>
        </NfControlBox>
      ) : (
        <div role="radiogroup" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
          {options.map((option) => (
            <NfChoiceOption
              key={option.value}
              type="radio"
              checked={text === option.value}
              onChange={() => onChange(option.value)}
              label={option.label}
            />
          ))}
        </div>
      );
      break;
    case 'multi_choice': {
      const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
      input = (
        <div role="group" {...common} tabIndex={-1} className="flex flex-col gap-1 outline-none">
          {options.map((option) => (
            <NfChoiceOption
              key={option.value}
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() =>
                onChange(
                  selected.includes(option.value)
                    ? selected.filter((item) => item !== option.value)
                    : [...selected, option.value],
                )
              }
              label={option.label}
            />
          ))}
        </div>
      );
      break;
    }
    case 'rating': {
      const max = typeof settings.max === 'number' ? settings.max : 5;
      const current = typeof value === 'number' ? value : 0;
      input = (
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

      input = (
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
            inputMode={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'decimal' : undefined}
            value={text}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
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
    <NfFieldFrame textAlign={settings.text_align as 'right' | 'center' | 'left'}>
      <NfFieldLabel htmlFor={id} label={field.label} required={field.required} />
      {input}
      {field.description && (
        <NfFieldHelper>
          <RichText value={field.description} />
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

function ContentItem({ item }: { item: Extract<FormDefinition['pages'][number]['body']['items'][number], { kind: 'content' }> }) {
  const settings = item.settings;
  if (item.type === 'text') {
    const doc = richTextSchema.safeParse(settings.doc);
    return doc.success ? <RichText value={doc.data} /> : null;
  }
  if (item.type === 'image') {
    if (typeof settings.url === 'string' && settings.url.startsWith('https://')) {
      const alt = typeof settings.alt === 'string' ? settings.alt : '';
      return (
        <div className="overflow-hidden rounded-nf-card border border-nf-border bg-nf-muted/20">
          <img src={settings.url} alt={alt} className="max-h-80 w-full object-contain" />
          {alt && <div className="p-2 text-center text-xs text-nf-muted-foreground">{alt}</div>}
        </div>
      );
    }
    return <NfMediaPlaceholder icon={<NfImageIcon />} label="تصویری انتخاب نشده است" />;
  }
  if (item.type === 'video') {
    if ((settings.provider === 'aparat' || settings.provider === 'youtube' || settings.provider === 'vimeo') && typeof settings.video_id === 'string') {
      return (
        <div className="overflow-hidden rounded-nf-card border border-nf-border bg-black/5">
          <iframe
            className="aspect-video w-full"
            src={buildEmbedUrl(settings.provider, settings.video_id)}
            title="ویدیوی فرم"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }
    return <NfMediaPlaceholder icon={<NfVideoIcon />} label="ویدیویی انتخاب نشده است" />;
  }
  return null;
}

function BottomNav({
  buttons,
  theme,
  busy,
  onAction,
}: {
  buttons: NavButton[];
  theme: FormTheme;
  busy: boolean;
  onAction: (action: NavAction) => void;
}) {
  if (!buttons.length) return null;
  return (
    <nav
      aria-label="پیمایش فرم"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:static md:mx-auto md:mt-2 md:w-full md:max-w-160 md:rounded-2xl md:border md:border-border md:px-4 md:py-3 md:shadow-sm"
    >
      <div className="mx-auto flex w-full max-w-160 items-center gap-2">
        {buttons.map((button) => {
          const primary = button.action !== 'prev';
          return (
            <Button
              key={button.action}
              type="button"
              variant={primary ? 'default' : 'secondary'}
              onClick={() => onAction(button.action)}
              loading={busy && button.action === 'submit'}
              disabled={busy}
              style={primary ? buttonStyle(theme) : undefined}
              className={cn('h-11 text-sm md:h-10 md:flex-none', primary ? 'flex-1 md:min-w-36' : 'px-4')}
            >
              {button.action === 'prev' ? <ArrowRightIcon /> : null}
              {busy && button.action === 'submit' ? 'در حال ثبت…' : button.label}
              {button.action !== 'prev' ? <ArrowLeftIcon /> : null}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

export type PublicFormSubmission = {
  versionId: string;
  answers: Answers;
  idempotencyKey: string;
  website: string;
};

export type PublicFormSubmissionResult =
  | { ok: true }
  | { ok: false; code?: string; errors?: SubmissionError[]; message?: string };

export function PublicFormClient({
  form,
  onSubmit,
}: {
  form: PublicFormView;
  onSubmit: (submission: PublicFormSubmission) => Promise<PublicFormSubmissionResult>;
}) {
  const definition = form.status === 'published' ? form.definition : null;
  const [answersRaw, setAnswersRaw] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, AnswerError>>({});
  /** با هر ارسال ناموفق چندخطایی عوض می‌شود تا خلاصه‌ی خطا دوباره فوکوس بگیرد. */
  const [errorFocusKey, setErrorFocusKey] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pageId, setPageId] = useState(form.status === 'published' ? form.definition.pages[0]!.page_id : '');
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID());

  const result = useMemo(() => {
    if (!definition) return null;
    const rawAnswers = serializedAnswers(definition, answersRaw);
    const evaluated = evaluateConditions(definition, rawAnswers);
    const visibleItems = new Set<string>();
    for (const page of definition.pages) {
      if (page.kind === 'main' && !computeVisiblePages(definition, rawAnswers).some((item) => item.page_id === page.page_id)) continue;
      for (const item of page.body.items) {
        if (isShown(item.condition, evaluated.answers)) visibleItems.add(item.item_id);
      }
    }
    return { rawAnswers, evaluated, visibleItems, visiblePages: computeVisiblePages(definition, rawAnswers) };
  }, [answersRaw, definition]);

  useEffect(() => {
    if (form.status !== 'published' || submitted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [form.status, submitted]);

  useEffect(() => {
    if (!submitted || !definition?.ending.redirect) return;
    const timer = window.setTimeout(
      () => window.location.assign(definition.ending.redirect!.url),
      definition.ending.redirect.delay_seconds * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [definition, submitted]);

  if (form.status === 'closed') {
    return <PublicMessage title={form.title} message={form.closedMessage || 'این فرم فعلاً پاسخ نمی‌پذیرد.'} />;
  }

  const visiblePages = result!.visiblePages;
  if (visiblePages.length === 0) return <PublicMessage title={form.title} message="این فرم در حال حاضر صفحه‌ی قابل نمایشی ندارد." />;
  const page = visiblePages.find((item) => item.page_id === pageId) ?? visiblePages[0]!;
  const pageIndex = visiblePages.findIndex((item) => item.page_id === page.page_id);
  const visibleMainPages = visiblePages.filter((item) => item.kind === 'main');
  const mainPageIndex = visibleMainPages.findIndex((item) => item.page_id === page.page_id);
  const currentItems = page.body.items.filter((item) => result!.visibleItems.has(item.item_id));
  const zones = resolveZones(definition!);

  const buttons: NavButton[] = [];
  if (page.kind === 'welcome') {
    buttons.push({ action: 'start', label: 'شروع' });
  } else if (page.kind === 'main') {
    if (pageIndex > 0) {
      buttons.push({ action: 'prev', label: zones.bottom_bar?.prev_label || 'قبلی' });
    }
    const isLastMain = visiblePages.slice(pageIndex + 1).every((p) => p.kind === 'ending');
    if (isLastMain) {
      buttons.push({ action: 'submit', label: zones.bottom_bar?.submit_label || 'ارسال' });
    } else {
      buttons.push({ action: 'next', label: zones.bottom_bar?.next_label || 'بعدی' });
    }
  }

  const showWatermark = Boolean(form.branding.forceLicense);
  const bottomNavVisible = !submitted && buttons.length > 0;
  const bottomBarVisible = !submitted && (Boolean(zones.bottom_bar) || bottomNavVisible);
  const previous = () => {
    if (busy || submitted) return;
    const target = visiblePages[pageIndex - 1];
    if (target) setPageId(target.page_id);
  };
  const validateCurrent = () => {
    const errors = validatePage(page, answersRaw, result!.visibleItems);
    setFieldErrors(errors);
    // چند خطا: خلاصه‌ی فوکوس‌پذیر بالای صفحه راهنمای کاربر می‌شود (error-summary)؛
    // تک‌خطا: همان فیلد فوکوس می‌گیرد تا مسیر کوتاه‌تر باشد.
    if (Object.keys(errors).length > 1) {
      setErrorFocusKey((key) => key + 1);
      return false;
    }
    const first = page.body.items.find((item) => item.kind === 'field' && errors[item.field_id]);
    if (first?.kind === 'field') document.getElementById(`answer-${first.field_id}`)?.focus();
    return Object.keys(errors).length === 0;
  };
  const submit = async () => {
    if (busy || submitted) return;
    if (!validateCurrent()) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const response = await onSubmit({
        versionId: form.versionId,
        answers: result!.evaluated.answers,
        idempotencyKey,
        website,
      });
      if (!response.ok) {
        if (response.code === 'invalid_answers') {
          const mapped: Record<string, AnswerError> = {};
          for (const issue of response.errors ?? []) {
            if (issue.field_id) mapped[issue.field_id] = { code: issue.code, params: issue.params };
          }
          setFieldErrors(mapped);
          if (Object.keys(mapped).length > 1) setErrorFocusKey((key) => key + 1);
          setSubmitError(Object.keys(mapped).length ? null : 'بررسی پاسخ‌ها ناموفق بود. لطفاً پاسخ‌ها را دوباره بررسی کنید.');
          return;
        }
        if (response.code === 'form_closed') {
          setSubmitError('این فرم در همین فاصله بسته شده است و پاسخ شما ثبت نشد.');
          return;
        }
        if (response.code === 'version_not_found') {
          setSubmitError('نسخه‌ی فرم تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره پاسخ دهید.');
          return;
        }
        setSubmitError(response.message ?? 'ثبت پاسخ ناموفق بود. کمی بعد دوباره تلاش کنید.');
        return;
      }
      setSubmitted(true);
      const ending = definition!.pages.find((item) => item.kind === 'ending' && visiblePages.some((visible) => visible.page_id === item.page_id));
      if (ending) setPageId(ending.page_id);
    } catch {
      setSubmitError('ارتباط با سرویس فرم برقرار نشد. کمی بعد دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    if (busy || submitted) return;
    if (!validateCurrent()) return;
    if (page.kind === 'welcome') {
      const target = visiblePages.slice(pageIndex + 1).find((item) => item.kind !== 'ending');
      if (target) setPageId(target.page_id);
      return;
    }
    const target = visiblePages.slice(pageIndex + 1).find((item) => item.kind !== 'ending');
    if (target) setPageId(target.page_id);
    else void submit();
  };
  const onAction = (action: 'start' | 'prev' | 'next' | 'submit') => {
    if (busy || submitted) return;
    if (action === 'prev') previous();
    else if (action === 'start' || action === 'next') next();
    else void submit();
  };
  const theme = definition!.theme as FormTheme;
  // خلاصه‌ی خطا فقط برای فیلدهای همین صفحه ساخته می‌شود؛ خطای سرور برای صفحه‌ی دیگر در پیام کلی می‌آید.
  const errorItems = page.body.items.flatMap((item) => {
    if (item.kind !== 'field') return [];
    const error = fieldErrors[item.field_id];
    return error ? [{ id: `answer-${item.field_id}`, label: item.label, message: answerErrorText(error) }] : [];
  });
  const body = submitted && page.kind !== 'ending' ? (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CircleCheckIcon className="size-12" style={{ color: theme.primary_color }} />
      <h2 className="text-xl font-bold">پاسخ شما ثبت شد.</h2>
      <p className="text-sm text-muted-foreground">از وقتی که برای پاسخ‌گویی گذاشتید سپاسگزاریم.</p>
    </div>
  ) : (
    <>
      {errorItems.length > 1 && <ErrorSummary items={errorItems} focusKey={errorFocusKey} />}
      {currentItems.length === 0 && page.kind === 'main' && <p className="text-center text-sm text-muted-foreground">در این صفحه پرسشی برای نمایش وجود ندارد.</p>}
      <div
        className={cn(
          'grid gap-4',
          definition!.layout?.main_columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {currentItems.map((item) => {
          const colSpan =
            item.kind === 'field' && (item.settings as Record<string, unknown>)?.col_span === 2
              ? 'col-span-1 md:col-span-2'
              : 'col-span-1';
          return (
            <section
              key={item.item_id}
              className={cn(
                'bg-card/90 p-5 text-card-foreground shadow-sm ring-1 ring-border',
                definition!.layout?.main_columns === 2 && colSpan,
              )}
              style={{ borderRadius: radiusCss(theme.radius) }}
            >
              {item.kind === 'field' ? (
                <FieldInput
                  field={item}
                  value={answersRaw[item.field_id]}
                  color={theme.primary_color}
                  error={fieldErrors[item.field_id]}
                  onChange={(value) =>
                    setAnswersRaw((previous) => ({ ...previous, [item.field_id]: value }))
                  }
                />
              ) : (
                <ContentItem item={item} />
              )}
            </section>
          );
        })}
      </div>
      {submitError && <p role="alert" className="rounded-lg bg-destructive-surface px-4 py-3 text-sm text-destructive-ink">{submitError}</p>}
    </>
  );

  return (
    <main
      dir="rtl"
      className={cn(
        'relative min-h-dvh overflow-hidden px-3 pt-6 text-foreground md:px-6 md:pb-6',
        bottomBarVisible ? 'pb-[calc(5.5rem_+_env(safe-area-inset-bottom))]' : 'pb-6',
      )}
      style={{ fontFamily: fontCss(theme.font), fontSize: `${textScale(theme.text_size)}em` }}
    >
      <FormBackground value={backgroundFromTheme(theme)} />
      <div className="relative z-10 mx-auto flex w-full max-w-160 flex-col gap-4">
        <header
          data-area="header"
          data-sticky={definition!.layout?.header_sticky ? 'true' : undefined}
          className={cn(
            'overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-border',
            definition!.layout?.header_sticky && 'sticky top-0 z-20 bg-card/90 backdrop-blur',
          )}
          style={{ borderRadius: radiusCss(theme.radius) }}
        >
          <div className="h-2" style={{ backgroundColor: theme.primary_color }} />
          <div className="flex flex-col gap-2 px-5 py-5">
            {zones.header && (zones.header.logo_url || zones.header.brand_title || zones.header.brand_subtitle) ? (
              <div className="mb-2">
                <LogoTitle
                  value={{
                    title: zones.header.brand_title,
                    subtitle: zones.header.brand_subtitle,
                    logo_url: zones.header.logo_url,
                    align: 'start',
                    visible: true,
                    show_logo: Boolean(zones.header.logo_url),
                    show_title: Boolean(zones.header.brand_title),
                    show_subtitle: Boolean(zones.header.brand_subtitle),
                  }}
                  formTitle={form.title}
                />
              </div>
            ) : null}
            <h1 className="text-2xl font-bold">{form.title}</h1>
            {page.title && <p className="text-sm text-muted-foreground">{page.title}</p>}
            {page.kind === 'main' && visibleMainPages.length > 1 && (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((mainPageIndex + 1) / visibleMainPages.length) * 100}%`,
                      backgroundColor: theme.primary_color,
                    }}
                  />
                </div>
                صفحه‌ی {fa(mainPageIndex + 1)} از {fa(visibleMainPages.length)}
              </div>
            )}
          </div>
        </header>

        {zones.top_bar && (!submitted || page.kind === 'ending') && (
          <div data-area="topBar" className="rounded-lg bg-card/80 p-3 shadow-sm ring-1 ring-border text-sm flex flex-col gap-2">
            {zones.top_bar.notice_text ? (
              <div className="flex items-center gap-2 text-primary">
                <InfoIcon className="size-4 shrink-0" />
                <span>{zones.top_bar.notice_text}</span>
              </div>
            ) : null}
            {zones.top_bar.description ? (
              <p className="text-muted-foreground">{zones.top_bar.description}</p>
            ) : null}
          </div>
        )}

        <div className={cn('grid gap-4', zones.sidebar && page.kind === 'main' && 'lg:grid-cols-[minmax(0,1fr)_16rem]')}>
          <form className="flex min-w-0 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); next(); }}>
            <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
              <label htmlFor="website">وب‌سایت</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </div>
            {body}
          </form>
          {zones.sidebar && page.kind === 'main' && !submitted && (
            <aside data-area="sidebar" className="rounded-lg bg-card/80 p-3 shadow-sm ring-1 ring-border flex flex-col gap-3">
              {zones.sidebar.title ? <h3 className="text-sm font-semibold">{zones.sidebar.title}</h3> : null}
              {visiblePages.length > 1 && (
                <nav className="flex flex-col gap-1 text-xs">
                  {visiblePages.map((p, idx) => (
                    <button
                      key={p.page_id}
                      type="button"
                      disabled={busy}
                      onClick={() => setPageId(p.page_id)}
                      className={cn(
                        'flex items-center justify-between rounded px-2 py-1.5 text-right transition-colors',
                        p.page_id === page.page_id
                          ? 'bg-primary/10 font-bold text-primary'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      <span>{p.title || `صفحه ${fa(idx + 1)}`}</span>
                      {p.page_id === page.page_id && <span className="size-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </nav>
              )}
            </aside>
          )}
        </div>

        {bottomBarVisible && (
          <div
            data-area="bottomBar"
            data-fixed={definition!.layout?.bottom_bar_fixed ? 'true' : 'false'}
            className={cn('w-full', !definition!.layout?.bottom_bar_fixed && 'rounded-lg bg-card/80 p-3 shadow-sm ring-1 ring-border')}
          >
            {bottomNavVisible && (
              <BottomNav
                buttons={buttons}
                theme={theme}
                busy={busy}
                onAction={onAction}
              />
            )}
          </div>
        )}

        {zones.footer && zones.footer.text && (!submitted || page.kind === 'ending') && (
          <div data-area="footer" className="text-center text-xs text-muted-foreground py-2">
            <p>{zones.footer.text}</p>
          </div>
        )}
      </div>
      {showWatermark && (
        <footer className="relative z-10 mx-auto mt-6 flex w-full max-w-160 justify-center md:mt-3">
          <a
            href={LICENSE_BADGE.href}
            dir="ltr"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="select-none text-[11px] tracking-wide text-muted-foreground/80 transition-colors hover:text-muted-foreground"
          >
            {LICENSE_BADGE.label}
          </a>
        </footer>
      )}
    </main>
  );
}



/* PublicMessage و buttonStyle به public-form-parts.tsx منتقل شدند. */
