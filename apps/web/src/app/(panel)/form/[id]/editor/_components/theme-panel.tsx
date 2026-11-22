'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronDownIcon, PaletteIcon, XIcon } from 'lucide-react';
import { type FormTheme } from '@noroset/field-engine';
import { Button, cn, NativeSelect, NativeSelectOption, Segmented, Skeleton } from '@noroset/ui';
import { hoverNativeScroll, IconAction } from '@/components/editor-ui';
import { FORM_THEME_PRESETS } from '@noroset/noroform/ui';
import { BackgroundDialog } from './background-dialog';

const BACKGROUND_LABELS: Record<FormTheme['background_style'], string> = {
  solid: 'یک‌رنگ',
  gradient: 'گرادیان',
  mesh: 'پترن',
  image: 'تصویر',
};

const ACCENTS = [
  { color: '#111111', name: 'مشکی' },
  { color: '#005fb8', name: 'آبی' },
  { color: '#0f7b0f', name: 'سبز' },
  { color: '#9d5d00', name: 'قهوه‌ای' },
  { color: '#c42b1c', name: 'قرمز' },
  { color: '#e11d48', name: 'سرخابی' },
  { color: '#7c3aed', name: 'بنفش' },
  { color: '#0891b2', name: 'فیروزه‌ای' },
];

const BUTTON_STYLES: { value: FormTheme['button_style']; label: string }[] = [
  { value: 'filled', label: 'پر' },
  { value: 'outline', label: 'خطی' },
  { value: 'soft', label: 'ملایم' },
  { value: 'tonal', label: 'رنگی ملایم' },
  { value: 'glass', label: 'شیشه‌ای' },
  { value: 'shadow', label: 'سایه‌دار' },
];

const RADII: { value: FormTheme['radius']; label: string; radius: string }[] = [
  { value: 'none', label: 'تیز', radius: '0px' },
  { value: 'md', label: 'متوسط', radius: '5px' },
  { value: 'lg', label: 'زیاد', radius: '10px' },
  { value: 'full', label: 'گرد', radius: '999px' },
];

export function ThemePanel({
  loading,
  theme,
  tenantId,
  onChange,
  onClose,
  className,
}: {
  loading: boolean;
  theme: FormTheme;
  tenantId: string;
  onChange: (theme: FormTheme) => void;
  onClose: () => void;
  className?: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const pickedPreset = FORM_THEME_PRESETS.find((preset) => preset.id === theme.preset);
  const customAccent = !ACCENTS.some((accent) => accent.color === theme.primary_color);

  const patch = (change: Partial<FormTheme>) => onChange({ ...theme, ...change });
  const reset = () => {
    const preset = pickedPreset ?? FORM_THEME_PRESETS[0]!;
    onChange({ ...preset.theme });
  };

  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col gap-3.5 self-start overflow-y-auto overscroll-contain rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-border',
        hoverNativeScroll,
        className,
      )}
    >
      <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 flex items-center gap-1.5 bg-inherit px-3.5 pt-3.5 pb-1">
        <span className="font-semibold">قالب فرم</span>
        <div className="flex-1" />
        {!loading && (
          <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={reset}>
            بازنشانی
          </Button>
        )}
        <IconAction label="بستن" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-6 w-3/4 rounded-full" />
          <Skeleton className="h-8" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              قالب‌های آماده
              {pickedPreset ? <span className="font-semibold text-foreground"> · {pickedPreset.label}</span> : null}
            </span>
            <div className="grid grid-cols-3 gap-2 p-0.5">
              {FORM_THEME_PRESETS.map((preset) => {
                const active = theme.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    aria-label={`قالب ${preset.label}`}
                    aria-pressed={active}
                    onClick={() => onChange({ ...preset.theme })}
                    className={cn(
                      'flex aspect-[16/10] items-center gap-1.5 overflow-hidden rounded-md px-2 outline-none ring-1 ring-offset-2 ring-offset-card transition-[box-shadow,transform] duration-150 ease-fluent hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'ring-2 ring-foreground' : 'ring-border hover:ring-foreground/40',
                    )}
                    style={{ background: preset.theme.background_color }}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: `${preset.theme.primary_color}66` }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="h-0.5 w-2/3 rounded-full" style={{ background: preset.theme.primary_color }} />
                      <span
                        className="h-1.5 w-full"
                        style={{
                          background: preset.theme.primary_color,
                          borderRadius: RADII.find((radius) => radius.value === preset.theme.radius)?.radius,
                        }}
                      />
                      <span
                        className="h-1.5 w-full opacity-50"
                        style={{
                          background: preset.theme.primary_color,
                          borderRadius: RADII.find((radius) => radius.value === preset.theme.radius)?.radius,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">پس‌زمینه</span>
            <button
              type="button"
              onClick={() => setBackgroundOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-start text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <PaletteIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{BACKGROUND_LABELS[theme.background_style]}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">رنگ اصلی</span>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map(({ color, name }) => (
                <button
                  key={color}
                  type="button"
                  aria-label={name}
                  title={name}
                  aria-pressed={theme.primary_color === color}
                  onClick={() => patch({ primary_color: color })}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-6 rounded-full ring-1 ring-border ring-offset-2 ring-offset-card',
                    theme.primary_color === color && 'ring-2 ring-foreground',
                  )}
                />
              ))}
              <ColorInput
                label="رنگ اصلی دلخواه"
                value={theme.primary_color}
                selected={customAccent}
                onChange={(primary_color) => patch({ primary_color })}
              />
            </div>
          </div>

          <div className="flex flex-col border-t pt-3">
            <button
              type="button"
              aria-expanded={customOpen}
              onClick={() => setCustomOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md py-1 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>شخصی‌سازی بیشتر</span>
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform duration-200', customOpen && 'rotate-180')} />
            </button>
            {customOpen && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">سبک دکمه</span>
                  <div role="radiogroup" aria-label="سبک دکمه" className="grid grid-cols-3 gap-1.5">
                    {BUTTON_STYLES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={theme.button_style === value}
                        onClick={() => patch({ button_style: value })}
                        className={cn(
                          'flex h-11 items-center rounded-md px-1.5 outline-none ring-1 ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring',
                          theme.button_style === value ? 'ring-2 ring-foreground' : 'ring-border hover:ring-foreground/40',
                        )}
                        style={{ background: theme.background_color }}
                      >
                        <span
                          className="flex h-7 w-full items-center justify-center truncate px-1 text-[11px] font-semibold"
                          style={buttonSampleStyle(value, theme)}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">گوشه‌ها</span>
                  <Segmented
                    value={theme.radius}
                    onChange={(radius) => patch({ radius })}
                    items={RADII.map(({ value, label }) => ({ value, label }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">اندازه‌ی متن</span>
                  <Segmented
                    value={theme.text_size}
                    onChange={(text_size) => patch({ text_size })}
                    items={[
                      { value: 'sm', label: 'کوچک' },
                      { value: 'md', label: 'متوسط' },
                      { value: 'lg', label: 'بزرگ' },
                    ]}
                  />
                </div>

                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  فونت
                  <NativeSelect value={theme.font} onChange={(event) => patch({ font: event.target.value as FormTheme['font'] })}>
                    <NativeSelectOption value="vazirmatn">فونت پیش‌فرض</NativeSelectOption>
                    <NativeSelectOption value="system">فونت سیستم</NativeSelectOption>
                  </NativeSelect>
                </label>
              </div>
            )}
          </div>
        </>
      )}
      {backgroundOpen && (
        <BackgroundDialog
          theme={theme}
          tenantId={tenantId}
          onChange={onChange}
          onClose={() => setBackgroundOpen(false)}
        />
      )}
    </aside>
  );
}

function ColorInput({
  label,
  value,
  selected,
  onChange,
}: {
  label: string;
  value: string;
  selected: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        'relative size-6 cursor-pointer overflow-hidden rounded-full ring-1 ring-border ring-offset-2 ring-offset-card',
        selected && 'ring-2 ring-foreground',
      )}
      title={label}
    >
      <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" style={selected ? { background: value } : undefined} />
      <input
        type="color"
        aria-label={label}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function buttonSampleStyle(style: FormTheme['button_style'], theme: FormTheme): CSSProperties {
  const radius = RADII.find((item) => item.value === theme.radius)?.radius;
  switch (style) {
    case 'filled':
      return { background: theme.primary_color, color: readableInk(theme.primary_color), borderRadius: radius };
    case 'outline':
      return { boxShadow: `inset 0 0 0 1.5px ${theme.primary_color}`, color: theme.primary_color, borderRadius: radius };
    case 'soft':
      return { background: `${theme.primary_color}20`, color: theme.primary_color, borderRadius: radius };
    case 'tonal':
      return { background: `${theme.primary_color}32`, color: theme.primary_color, borderRadius: radius };
    case 'glass':
      return {
        background: 'color-mix(in srgb,#ffffff 24%,transparent)',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb,#000000 18%,transparent)',
        color: '#222222',
        borderRadius: radius,
        backdropFilter: 'blur(6px)',
      };
    case 'shadow':
      return {
        background: theme.primary_color,
        color: readableInk(theme.primary_color),
        boxShadow: `inset 0 0 0 1.5px #111, 2px 2px 0 #111`,
        borderRadius: radius,
      };
  }
}

function readableInk(color: string): string {
  const rgb = color.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const luminance = (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
  return luminance > 0.56 ? '#111111' : '#ffffff';
}
