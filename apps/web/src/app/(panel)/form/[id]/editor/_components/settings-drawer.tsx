'use client';

/**
 * دیالوگ «تنظیمات پیشرفته»: فقط گروه «اعتبارسنجی» و «منطق شرطی» (settings-spec.ts).
 * عمومی و ظاهر روی خود کارت ویرایش می‌شوند. تغییرها همان لحظه اعمال می‌شوند، مثل کارت.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { fieldTypes, formatJalali, parseIsoDate, parseVideoUrl, type ConditionOp } from '@noroset/field-engine';
import { Button, cn, Input, NativeSelect, NativeSelectOption, ScrollArea, Segmented, Switch } from '@noroset/ui';
import { hoverScroll, IconAction, UnderlineTabs } from '@/components/editor-ui';
import {
  BUILTIN_VALIDATION,
  CONDITION_OP_LABELS,
  SETTING_ISSUES,
  specsIn,
  type SettingSpec,
} from './settings-spec';
import { type EditorCondition, type EditorField, fa, optionsOf } from './types';

type DrawerTab = 'layout' | 'validation' | 'logic';

const defaultsOf = (field: EditorField) =>
  (fieldTypes.get(field.type)?.defaultSettings ?? {}) as Record<string, unknown>;

/** شمار قیدهای اعتبارسنجی تغییرکرده نسبت به پیش‌فرض نوع. */
export function validationCount(field: EditorField): number {
  const defaults = defaultsOf(field);
  return specsIn(field.type, 'validation')
    .flatMap((s) => s.keys)
    .filter((k) => JSON.stringify(field.settings[k]) !== JSON.stringify(defaults[k])).length;
}

/** شمار قاعده‌های فعال دیالوگ پیشرفته (برای نشان روی دکمه‌ی کارت). */
export function advancedCount(field: EditorField): number {
  return validationCount(field) + (field.condition ? 1 : 0);
}

/** کدهای خطای settings با schema همان نوع field-engine (برای کارت و دیالوگ). */
export function settingsIssues(field: EditorField): string[] {
  const parsed = fieldTypes.get(field.type)?.settingsSchema.safeParse(field.settings);
  return parsed && !parsed.success ? [...new Set(parsed.error.issues.map((i) => i.message || i.code))] : [];
}

export function SettingsDrawer({
  field,
  previousFields,
  onChange,
  onClose,
  onPrev,
  onNext,
}: {
  field: EditorField;
  /** فیلدهای قبل از این المان (صفحه‌های قبلی و همین صفحه پیش از آن)؛ فقط این‌ها در شرط مجازند (§8.4). */
  previousFields: EditorField[];
  onChange: (patch: Partial<EditorField>) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hasValidation = field.family === 'field';
  // انواع محتوا به تب ظاهر می‌روند؛ برای فیلدها بدون قید تب منطق باز می‌شود.
  const [tab, setTab] = useState<DrawerTab>(
    field.family === 'content'
      ? 'layout'
      : hasValidation && specsIn(field.type, 'validation').length > 0
        ? 'validation'
        : 'logic',
  );
  const rootRef = useRef<HTMLDivElement>(null);
  // فوکوس پس از بستن به همان دکمه‌ای برمی‌گردد که دیالوگ را باز کرد.
  const returnFocus = useRef<HTMLElement | null>(null);
  const vCount = validationCount(field);
  const invalid = settingsIssues(field).length > 0;

  // همگام‌سازی زنده عرض و موقعیت افقی با کارت بدنه اصلی (#zone-main)
  const [bounds, setBounds] = useState<{ left: number | string; width: number | string }>({
    left: 0,
    width: '100%',
  });

  useEffect(() => {
    const updateBounds = () => {
      const el = document.getElementById('zone-main');
      if (!el) {
        setBounds({ left: 0, width: '100%' });
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setBounds({ left: rect.left, width: rect.width });
      } else {
        setBounds({ left: 0, width: '100%' });
      }
    };

    updateBounds();

    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    const el = document.getElementById('zone-main');
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateBounds();
      });
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
      observer?.disconnect();
    };
  }, []);

  // فوکوس به دیالوگ می‌رود تا Esc و Tab از همان‌جا کار کنند و با بستن برمی‌گردد.
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      const target = returnFocus.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      id="advanced-settings"
      role="dialog"
      aria-modal="false"
      aria-labelledby="advanced-settings-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      style={{
        left: typeof bounds.left === 'number' ? `${bounds.left}px` : bounds.left,
        width: typeof bounds.width === 'number' ? `${bounds.width}px` : bounds.width,
      }}
      className="fixed bottom-0 z-40 flex h-[50dvh] max-h-[50dvh] flex-col rounded-t-nf-card border-t border-x border-border bg-card shadow-lg outline-none animate-in fade-in-0 slide-in-from-bottom-4 duration-250 ease-fluent"
    >
      <div className="flex shrink-0 items-start gap-2 px-4.5 pt-3.5">
        <div className="flex min-w-0 flex-col">
          <span id="advanced-settings-title" className="text-[15px] font-semibold">
            تنظیمات پیشرفته
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {field.typeLabel}
            {field.family === 'field' && ` · ${field.label.trim() || 'بدون عنوان'}`}
          </span>
        </div>
        <div className="flex-1" />
        <IconAction label="المان قبلی" onClick={onPrev}>
          <ChevronRightIcon />
        </IconAction>
        <IconAction label="المان بعدی" onClick={onNext}>
          <ChevronLeftIcon />
        </IconAction>
        <IconAction label="بستن (Esc)" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      <UnderlineTabs
        className="shrink-0 overflow-x-auto px-4.5 pt-2.5 [scrollbar-width:none]"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'layout' as const, label: 'چیدمان و ظاهر' },
          ...(hasValidation
            ? [{ value: 'validation' as const, label: `اعتبارسنجی${invalid ? ' · خطا' : vCount ? ` · ${fa(vCount)}` : ''}` }]
            : []),
          { value: 'logic' as const, label: `منطق شرطی${field.condition ? ' · ۱' : ''}` },
        ]}
      />

      <ScrollArea className={cn('min-h-0 flex-1 overflow-y-auto', hoverScroll)}>
        <div className="px-4.5 py-4">
          {tab === 'layout' ? (
            <LayoutTab field={field} onChange={onChange} />
          ) : tab === 'validation' && hasValidation ? (
            <ValidationTab field={field} onChange={onChange} />
          ) : (
            <LogicTab field={field} previousFields={previousFields} onChange={onChange} />
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4.5 py-3">
        <span className="text-xs text-muted-foreground max-md:hidden">تغییرها همان لحظه اعمال می‌شوند.</span>
        <div className="flex-1" />
        <Button onClick={onClose}>تمام</Button>
      </div>
    </div>
  );
}

function canonicalVideoUrl(provider: string, id: string): string {
  if (provider === 'youtube') return `https://youtu.be/${id}`;
  if (provider === 'vimeo') return `https://vimeo.com/${id}`;
  return `https://www.aparat.com/v/${id}`;
}

/* ─── چیدمان و ظاهر فیلد ─── */

function LayoutTab({ field, onChange }: { field: EditorField; onChange: (patch: Partial<EditorField>) => void }) {
  const setKey = (key: string, value: unknown) => {
    const settings = { ...field.settings };
    if (value === undefined) delete settings[key];
    else settings[key] = value;
    onChange({ settings });
  };
  const colSpan = Number(field.settings.col_span) === 2 ? 2 : 1;
  const textAlign = (field.settings.text_align as 'right' | 'center' | 'left') || 'right';
  const placeholder = typeof field.settings.placeholder === 'string' ? field.settings.placeholder : '';
  const supportsPlaceholder =
    field.type === 'short_text' ||
    field.type === 'long_text' ||
    field.type === 'number' ||
    field.type === 'email' ||
    field.type === 'phone' ||
    (field.type === 'single_choice' && field.settings.display === 'dropdown');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-nf-card-foreground">عرض فیلد در فرم</label>
          <Segmented
            value={String(colSpan)}
            onChange={(v) => setKey('col_span', Number(v))}
            items={[
              { value: '1', label: 'تک ستون (عادی)' },
              { value: '2', label: 'تمام‌عرض (دو ستون)' },
            ]}
          />
          <span className="text-[11px] text-nf-muted-foreground">در چیدمان دو ستونه بدنه، فیلد می‌تواند کل سطر را بپوشاند.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-nf-card-foreground">تراز متن فیلد</label>
          <Segmented
            value={textAlign}
            onChange={(v) => setKey('text_align', v)}
            items={[
              { value: 'right', label: 'راست' },
              { value: 'center', label: 'وسط' },
              { value: 'left', label: 'چپ' },
            ]}
          />
        </div>

        {field.type === 'single_choice' && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-nf-card-foreground">شکل نمایش گزینه‌ها</label>
            <Segmented
              value={((field.settings as Record<string, unknown>).display as string) || 'radio'}
              onChange={(v) => setKey('display', v)}
              items={[
                { value: 'radio', label: 'دکمه‌های رادیویی' },
                { value: 'dropdown', label: 'منوی کشویی (Dropdown)' },
              ]}
            />
          </div>
        )}

        {field.type === 'rating' && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-nf-card-foreground">تعداد ستاره‌ها (مقیاس امتیاز)</label>
            <Segmented
              value={String(field.settings.max ?? 5)}
              onChange={(v) => setKey('max', Number(v))}
              items={[3, 4, 5, 7, 10].map((n) => ({ value: String(n), label: `${fa(n)} ستاره` }))}
            />
          </div>
        )}

        {field.type === 'image' && (
          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-nf-card-foreground">نشانی اینترنتی تصویر (URL)</label>
              <Input
                dir="ltr"
                value={typeof field.settings.url === 'string' ? field.settings.url : ''}
                onChange={(e) => setKey('url', e.target.value.trim())}
                placeholder="https://example.com/photo.jpg"
                className="text-xs"
              />
              <span className="text-[11px] text-nf-muted-foreground">نشانی تصویر باید با //:https آغاز شود.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-nf-card-foreground">متن جایگزین (Alt / کپشن)</label>
              <Input
                value={typeof field.settings.alt === 'string' ? field.settings.alt : ''}
                onChange={(e) => setKey('alt', e.target.value)}
                placeholder="توضیح مختصر تصویر برای دسترس‌پذیری…"
                className="text-xs"
              />
            </div>
          </div>
        )}

        {field.type === 'video' && (
          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-nf-card-foreground">لینک ویدیو (آپارات، یوتیوب یا ویمیو)</label>
              <Input
                dir="ltr"
                value={
                  typeof field.settings.provider === 'string' && typeof field.settings.video_id === 'string'
                    ? canonicalVideoUrl(field.settings.provider, field.settings.video_id)
                    : ''
                }
                onChange={(e) => {
                  const url = e.target.value.trim();
                  const p = parseVideoUrl(url);
                  if (p) {
                    onChange({
                      settings: {
                        ...field.settings,
                        provider: p.provider,
                        video_id: p.video_id,
                      },
                    });
                  } else if (url === '') {
                    onChange({
                      settings: {
                        ...field.settings,
                        provider: undefined,
                        video_id: undefined,
                      },
                    });
                  }
                }}
                placeholder="https://www.aparat.com/v/... یا https://youtu.be/..."
                className="text-xs"
              />
              <span className="text-[11px] text-nf-muted-foreground">
                پشتیبانی خودکار از لینک‌های آپارات، یوتیوب و ویمیو.
              </span>
            </div>
          </div>
        )}

        {supportsPlaceholder && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-nf-card-foreground">متن نگهدارنده (Placeholder)</label>
            <Input
              value={placeholder}
              onChange={(e) => setKey('placeholder', e.target.value)}
              placeholder="متن کم‌رنگ پیش‌فرض درون کادر ورودی…"
              className="text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── اعتبارسنجی ─── */

function ValidationTab({ field, onChange }: { field: EditorField; onChange: (patch: Partial<EditorField>) => void }) {
  const specs = specsIn(field.type, 'validation');
  const builtin = BUILTIN_VALIDATION[field.type];
  const issues = settingsIssues(field);
  const defaults = defaultsOf(field);
  const setKey = (key: string, value: unknown) => {
    const settings = { ...field.settings };
    if (value === undefined) delete settings[key];
    else settings[key] = value;
    onChange({ settings });
  };
  const changed = specs.some((s) => s.keys.some((k) => JSON.stringify(field.settings[k]) !== JSON.stringify(defaults[k])));

  return (
    <div className="flex flex-col gap-4">
      {builtin && <Note>{builtin}</Note>}
      {specs.length === 0 && !builtin && <Note>این المان قید قابل‌تنظیمی ندارد.</Note>}
      {specs.length > 0 && (
        <div className="grid grid-cols-1 gap-x-4.5 gap-y-3.5 sm:grid-cols-2">
          {specs.map((spec) => (
            <ValidationControl key={spec.keys[0]} spec={spec} field={field} setKey={setKey} invalid={issues.length > 0} />
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {issues.map((code) => (
            <li key={code} className="flex items-center gap-1.5">
              <TriangleAlertIcon className="size-3.5 shrink-0" />
              {SETTING_ISSUES[code] ?? 'مقدار وارد‌شده معتبر نیست.'}
            </li>
          ))}
        </ul>
      )}
      {changed && (
        <button
          type="button"
          onClick={() => {
            const settings = { ...field.settings };
            for (const k of specs.flatMap((s) => s.keys)) {
              if (k in defaults) settings[k] = defaults[k];
              else delete settings[k];
            }
            onChange({ settings });
          }}
          className="self-start text-xs text-primary hover:underline"
        >
          بازگشت به پیش‌فرض
        </button>
      )}
    </div>
  );
}

function ValidationControl({
  spec,
  field,
  setKey,
  invalid,
}: {
  spec: SettingSpec;
  field: EditorField;
  setKey: (key: string, value: unknown) => void;
  invalid: boolean;
}) {
  const key = spec.keys[0]!;
  const value = field.settings[key];
  const defaults = defaultsOf(field);

  if (spec.control === 'switch') {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-input px-3 py-2 text-sm sm:col-span-2">
        {spec.label}
        <Switch checked={value === true} onCheckedChange={(v) => setKey(key, v)} />
      </label>
    );
  }

  if (spec.control === 'date') {
    const iso = typeof value === 'string' ? value : '';
    return (
      <Labeled label={spec.label} hint={iso && parseIsoDate(iso) ? formatJalali(iso) : 'بدون محدودیت'}>
        <Input
          type="date"
          dir="ltr"
          className="text-right"
          aria-invalid={invalid || undefined}
          value={iso}
          onChange={(e) => setKey(key, e.target.value || undefined)}
        />
      </Labeled>
    );
  }

  // int / number: خالی ← پیش‌فرض نوع (برای کلیدهای اختیاری یعنی بدون قید).
  const text = typeof value === 'number' ? String(value) : '';
  return (
    <Labeled label={spec.label} hint={spec.hint}>
      <Input
        type="number"
        // عدد چپ‌به‌راست تا منفی و اعشار درست دیده شوند، ولی هم‌تراز راست مثل بقیه‌ی فرم.
        dir="ltr"
        className="text-right placeholder:text-right"
        inputMode={spec.control === 'int' ? 'numeric' : 'decimal'}
        step={spec.control === 'int' ? 1 : 'any'}
        min={spec.control === 'int' ? 0 : undefined}
        aria-invalid={invalid || undefined}
        value={text}
        placeholder={typeof defaults[key] === 'number' ? String(defaults[key]) : 'بدون محدودیت'}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') return setKey(key, defaults[key]);
          const n = Number(raw);
          if (Number.isFinite(n)) setKey(key, spec.control === 'int' ? Math.trunc(n) : n);
        }}
      />
    </Labeled>
  );
}

/* ─── منطق شرطی ─── */

function LogicTab({
  field,
  previousFields,
  onChange,
}: {
  field: EditorField;
  previousFields: EditorField[];
  onChange: (patch: Partial<EditorField>) => void;
}) {
  // شماره‌ی پرسش در کل فرم تا پرسش‌های هم‌نام از هم تشخیص داده شوند.
  const refs = previousFields.filter((f) => f.family === 'field');
  const condition = field.condition;
  const set = (c: EditorCondition | undefined) => onChange({ condition: c });

  if (refs.length === 0 && !condition) {
    return (
      <Note>
        نمایش شرطی فقط می‌تواند به پرسش‌های قبل از این المان اشاره کند و پیش از آن پرسشی نیست. پرسشی بالاتر اضافه کنید یا این
        المان را پایین‌تر ببرید.
      </Note>
    );
  }

  const enable = (on: boolean) => {
    if (!on) return set(undefined);
    const ref = refs[refs.length - 1]!;
    set({ effect: 'show', field_id: ref.fieldId, op: fieldTypes.get(ref.type)?.conditionOps[0] ?? 'is_empty' });
  };

  const ref = condition ? refs.find((f) => f.fieldId === condition.field_id) : undefined;
  const ops = ref ? (fieldTypes.get(ref.type)?.conditionOps ?? []) : [];
  const problem = !condition
    ? null
    : !ref
      ? 'پرسش مرجع حذف شده یا دیگر قبل از این المان نیست؛ پرسش دیگری انتخاب کنید.'
      : condition.op !== 'is_empty' && condition.value === undefined
        ? 'مقدار شرط را وارد کنید.'
        : null;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-input px-3 py-2 text-sm">
        <span className="flex flex-col">
          نمایش شرطی
          <span className="text-xs text-muted-foreground">
            {field.family === 'field' ? 'پرسش فقط در صورت برقراری شرط دیده می‌شود.' : 'المان فقط در صورت برقراری شرط دیده می‌شود.'}
          </span>
        </span>
        <Switch checked={!!condition} disabled={!condition && refs.length === 0} onCheckedChange={enable} />
      </label>

      {condition && (
        <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Labeled label="اثر">
            <NativeSelect
              value={condition.effect}
              onChange={(e) => set({ ...condition, effect: e.target.value as EditorCondition['effect'] })}
            >
              <NativeSelectOption value="show">نمایش بده اگر</NativeSelectOption>
              <NativeSelectOption value="hide">پنهان کن اگر</NativeSelectOption>
            </NativeSelect>
          </Labeled>
          <Labeled label="پرسش">
            <NativeSelect
              value={ref ? condition.field_id : ''}
              aria-invalid={!ref || undefined}
              onChange={(e) => {
                const next = refs.find((f) => f.fieldId === e.target.value);
                if (!next) return;
                const nextOps = fieldTypes.get(next.type)?.conditionOps ?? [];
                set({
                  effect: condition.effect,
                  field_id: next.fieldId,
                  op: nextOps.includes(condition.op) ? condition.op : (nextOps[0] ?? 'is_empty'),
                });
              }}
            >
              {!ref && <NativeSelectOption value="">انتخاب پرسش</NativeSelectOption>}
              {refs.map((f, i) => (
                <NativeSelectOption key={f.fieldId} value={f.fieldId}>
                  {`${fa(i + 1)}. ${f.label.trim() || f.typeLabel}`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Labeled>
          <Labeled label="شرط">
            <NativeSelect
              value={condition.op}
              disabled={!ref}
              onChange={(e) => {
                const op = e.target.value as ConditionOp;
                set(op === 'is_empty' ? { effect: condition.effect, field_id: condition.field_id, op } : { ...condition, op });
              }}
            >
              {ops.map((op) => (
                <NativeSelectOption key={op} value={op}>
                  {CONDITION_OP_LABELS[op]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Labeled>
          {ref && condition.op !== 'is_empty' && (
            <Labeled label="مقدار">
              <ConditionValue refField={ref} condition={condition} onChange={(value) => set({ ...condition, value })} />
            </Labeled>
          )}
        </div>
      )}

      {problem && (
        <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          <TriangleAlertIcon className="size-3.5 shrink-0" />
          {problem}
        </p>
      )}
      <Note>{field.family === 'field' ? 'پرسشی که پنهان می‌شود ذخیره و اعتبارسنجی نمی‌شود.' : 'المان پنهان در فرم دیده نمی‌شود.'}</Note>
    </div>
  );
}

function ConditionValue({
  refField,
  condition,
  onChange,
}: {
  refField: EditorField;
  condition: EditorCondition;
  onChange: (value: string | number | undefined) => void;
}) {
  const options = optionsOf(refField);
  const missing = condition.value === undefined || undefined;
  if (options.length > 0) {
    return (
      <NativeSelect
        value={String(condition.value ?? '')}
        aria-invalid={missing}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <NativeSelectOption value="">انتخاب گزینه</NativeSelectOption>
        {options.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }
  const numeric = refField.type === 'number' || refField.type === 'rating';
  const ltr = numeric || refField.type === 'date' || refField.type === 'phone' || refField.type === 'email';
  return (
    <Input
      type={numeric ? 'number' : refField.type === 'date' ? 'date' : 'text'}
      dir={ltr ? 'ltr' : undefined}
      className={cn(ltr && 'text-right')}
      aria-invalid={missing}
      value={condition.value === undefined ? '' : String(condition.value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(undefined);
        onChange(numeric && Number.isFinite(Number(raw)) ? Number(raw) : raw);
      }}
    />
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    // NativeSelect پوسته‌ی w-fit دارد؛ این‌جا تمام‌عرض ستون می‌شود.
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground [&_[data-slot=native-select-wrapper]]:w-full">
      <span>
        {label}
        {hint && <span className="text-muted-foreground/70"> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  );
}
