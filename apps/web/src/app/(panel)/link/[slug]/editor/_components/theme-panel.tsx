'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { Button, cn, NativeSelect, NativeSelectOption, Segmented, Skeleton } from '@noroset/ui';
import { assetUrlFor, presetOf, PRESETS, resolveTheme, type ButtonStyle, type Preset, type Radius, type TextSize, type Theme } from '@noroset/norolink/ui';
import { hoverNativeScroll, IconAction } from '@/components/editor-ui';
import { BackgroundSection } from './background-section';
import type { UploadContext } from './fields';

const BUTTON_STYLE_ITEMS: { value: ButtonStyle; label: string }[] = [
  { value: 'filled', label: 'پر' },
  { value: 'outline', label: 'خطی' },
  { value: 'soft', label: 'ملایم' },
  { value: 'tonal', label: 'رنگی ملایم' },
  { value: 'glass', label: 'شیشه‌ای' },
  { value: 'shadow', label: 'سایه‌دار' },
];

const ACCENTS: { color: string; name: string }[] = [
  { color: '#111111', name: 'مشکی' },
  { color: '#005fb8', name: 'آبی' },
  { color: '#0f7b0f', name: 'سبز' },
  { color: '#9d5d00', name: 'قهوه‌ای' },
  { color: '#c42b1c', name: 'قرمز' },
  { color: '#e11d48', name: 'سرخابی' },
  { color: '#7c3aed', name: 'بنفش' },
  { color: '#0891b2', name: 'فیروزه‌ای' },
  { color: '#ffffff', name: 'سفید' },
];

const TEXT_SIZE_ITEMS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'کوچک' },
  { value: 'md', label: 'متوسط' },
  { value: 'lg', label: 'بزرگ' },
];

/** چهار گوشه با آیکون شکل گوشه (sm در هیچ قالبی نیست و در پنل نمی‌آید؛ مقدار ذخیره‌شده‌ی قبلی همچنان رندر می‌شود). */
const RADIUS_ITEMS: { value: Radius; label: string; corner: number }[] = [
  { value: 'none', label: 'تیز', corner: 0 },
  { value: 'md', label: 'متوسط', corner: 5 },
  { value: 'lg', label: 'زیاد', corner: 9 },
  { value: 'full', label: 'گرد', corner: 16 },
];

/** آیکون گوشه‌ی بالا-راست با شعاع `r` (۰ تیز تا ۱۶ کاملاً گرد) در کادر ۲۰×۲۰. */
function CornerIcon({ r }: { r: number }) {
  const d = r === 0 ? 'M18 18V2H2' : `M18 18V${2 + r}a${r} ${r} 0 0 0 -${r} -${r}H2`;
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** گوشه‌ی دکمه‌ی نمونه‌ی سبک‌ها (کوچک‌شده‌ی گوشه‌های صفحه). */
const SAMPLE_RADIUS: Record<Radius, string> = { none: '0px', sm: '3px', md: '5px', lg: '8px', full: '999px' };

/** ظاهر دکمه‌ی نمونه‌ی هر سبک با رنگ‌های همین صفحه (همان قواعد styles.ts، کوچک‌شده). */
function sampleStyle(style: ButtonStyle, v: Record<string, string>): CSSProperties {
  const fg = v['--nl-fg'];
  switch (style) {
    case 'filled':
      return { background: v['--nl-accent'], color: v['--nl-accent-fg'] };
    case 'outline':
      return { boxShadow: `inset 0 0 0 1.5px ${v['--nl-accent-ink']}`, color: v['--nl-accent-ink'] };
    case 'soft':
      return { background: v['--nl-surface'], color: v['--nl-surface-fg'] };
    case 'tonal':
      return { background: `color-mix(in srgb,${v['--nl-accent']} ${v['--nl-tonal-mix']},transparent)`, color: v['--nl-accent-ink'] };
    case 'glass':
      return {
        background: 'color-mix(in srgb,#ffffff 16%,transparent)',
        boxShadow: `inset 0 0 0 1px color-mix(in srgb,${fg} 26%,transparent)`,
        color: fg,
        backdropFilter: 'blur(6px)',
      };
    case 'shadow':
      return { background: v['--nl-surface'], color: v['--nl-surface-fg'], boxShadow: `inset 0 0 0 1.5px ${fg}, 2px 2px 0 ${fg}` };
  }
}

/** انتخاب قالب ظاهر آن را کامل می‌آورد (رنگ، سبک دکمه، گوشه، فونت)؛ عکس پس‌زمینه و کانتینر انتخاب صفحه‌اند و می‌مانند. */
function pickPreset(theme: Theme, preset: string): Theme {
  const { background } = theme.overrides;
  return { ...theme, preset, accent: null, overrides: background ? { background } : {} };
}

const MINI_RADIUS: Record<Preset['radius'], string> = { none: '0px', sm: '1.5px', md: '2.5px', lg: '3.5px', full: '999px' };

/**
 * کارت افقی و فشرده‌ی قالب به سبک کارت‌های تم ویندوز: پس‌زمینه‌ی قالب و روی آن پروفایل و دو دکمه به همان سبک و
 * گوشه، کنار هم. نام فقط در tooltip و فهرست صفحه‌خوان؛ نام قالب انتخاب‌شده کنار عنوان بخش می‌آید.
 */
function TemplateCard({ preset, active, onPick }: { preset: Preset; active: boolean; onPick: () => void }) {
  const vars = resolveTheme({ preset: preset.id, accent: null, overrides: {} }, () => '').vars;
  const r = MINI_RADIUS[preset.radius];
  const fg = vars['--nl-fg']!;
  const button: CSSProperties = {
    filled: { background: vars['--nl-accent'] },
    outline: { boxShadow: `inset 0 0 0 1.5px ${vars['--nl-accent']}` },
    soft: { background: vars['--nl-surface'] },
    tonal: { background: `color-mix(in srgb,${vars['--nl-accent']} 16%,transparent)` },
    glass: { background: 'rgba(255,255,255,.18)', boxShadow: `inset 0 0 0 1px color-mix(in srgb,${fg} 30%,transparent)` },
    shadow: { background: vars['--nl-surface'], boxShadow: `inset 0 0 0 1.5px ${fg}, 2px 2px 0 ${fg}` },
  }[preset.buttonStyle];
  return (
    <button
      type="button"
      title={preset.label}
      aria-label={`قالب ${preset.label}`}
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        'flex aspect-[16/10] w-full items-center gap-1.5 overflow-hidden rounded-md px-2 outline-none ring-1 ring-offset-2 ring-offset-card transition-[box-shadow,transform] duration-150 ease-fluent hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'ring-2 ring-foreground' : 'ring-border hover:ring-foreground/40',
      )}
      style={{ background: vars['--nl-bg'] }}
    >
      <span className="size-3 shrink-0 rounded-full" style={{ background: `color-mix(in srgb,${fg} 28%,transparent)` }} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="h-0.5 w-2/3 rounded-full" style={{ background: fg }} />
        <span className="h-1.5 w-full" style={{ ...button, borderRadius: r }} />
        <span className="h-1.5 w-full" style={{ ...button, borderRadius: r }} />
      </span>
    </button>
  );
}

export function ThemePanel({
  theme,
  upload,
  onChange,
  onClose,
  className,
}: {
  theme: Theme | null;
  upload: UploadContext | null;
  onChange: (theme: Theme) => void;
  onClose: () => void;
  className?: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const currentAccent = theme ? (theme.accent ?? presetOf(theme.preset).accent) : '';
  // رنگ‌ها، گوشه و پس‌زمینه‌ی همین صفحه برای نمونه‌های سبک دکمه
  const resolved = theme ? resolveTheme(theme, upload ? assetUrlFor(upload.assetBaseUrl) : () => '') : null;
  const sample = {
    vars: resolved?.vars ?? {},
    // روی عکس، خود عکس با لایه‌اش (همان چیزی که دکمه‌ها رویش می‌نشینند)
    background: resolved?.image
      ? `linear-gradient(${resolved.image.tint},${resolved.image.tint}), url("${resolved.image.url}") ${resolved.image.position} / cover, ${resolved.image.fallback}`
      : (resolved?.vars['--nl-bg'] ?? 'transparent'),
    radius: theme ? (theme.overrides.radius ?? presetOf(theme.preset).radius) : ('md' as Radius),
  };
  const customAccent = theme !== null && !ACCENTS.some((a) => a.color === currentAccent);
  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col gap-3.5 self-start overflow-y-auto overscroll-contain rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-border',
        hoverNativeScroll,
        className,
      )}
    >
      {/* سرتیتر هنگام اسکرول پنل بلند دیده می‌ماند */}
      <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 flex items-center gap-1.5 bg-inherit px-3.5 pt-3.5 pb-1">
        <span className="font-semibold">قالب صفحه</span>
        <div className="flex-1" />
        {theme ? (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => onChange({ preset: theme.preset, accent: null, overrides: {} })}
          >
            بازنشانی
          </Button>
        ) : null}
        <IconAction label="بستن" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      {!theme ? (
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
              <span className="font-semibold text-foreground"> · {presetOf(theme.preset).label}</span>
            </span>
            <div className="grid grid-cols-3 gap-2 p-0.5">
              {PRESETS.map((p) => (
                <TemplateCard
                  key={p.id}
                  preset={p}
                  active={theme.preset === p.id}
                  onPick={() => onChange(pickPreset(theme, p.id))}
                />
              ))}
            </div>
          </div>

          <BackgroundSection theme={theme} upload={upload} onChange={onChange} />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">رنگ اصلی (دکمه‌ها)</span>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map(({ color, name }) => (
                <button
                  key={color}
                  type="button"
                  aria-label={name}
                  title={name}
                  aria-pressed={currentAccent === color}
                  onClick={() => onChange({ ...theme, accent: color })}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-6 rounded-full ring-1 ring-border ring-offset-2 ring-offset-card',
                    currentAccent === color && 'ring-2 ring-foreground',
                  )}
                />
              ))}
              {/* رنگ قالب یا رنگ دلخواهی که در فهرست نیست روی همین دایره نشان داده می‌شود */}
              <label
                className={cn(
                  'relative size-6 cursor-pointer overflow-hidden rounded-full ring-1 ring-border ring-offset-2 ring-offset-card',
                  customAccent && 'ring-2 ring-foreground',
                )}
                title={customAccent ? `رنگ فعلی ${currentAccent}` : 'رنگ دلخواه'}
              >
                <span
                  className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]"
                  style={customAccent ? { background: currentAccent } : undefined}
                />
                <input
                  type="color"
                  aria-label="رنگ دلخواه"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  value={currentAccent}
                  onChange={(e) => onChange({ ...theme, accent: e.target.value })}
                />
              </label>
            </div>
            <span className="text-[11px] text-muted-foreground">رنگ متن و آیکون دکمه‌ها خودکار با بیشترین خوانایی انتخاب می‌شود.</span>
          </div>

          <div className="flex flex-col border-t pt-3">
            <button
              type="button"
              aria-expanded={customOpen}
              onClick={() => setCustomOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md py-1 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>شخصی‌سازی بیشتر</span>
              <ChevronDownIcon
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200 ease-fluent',
                  customOpen && 'rotate-180',
                )}
              />
            </button>
            {customOpen ? (
              <div className="mt-3 flex flex-col gap-3 animate-in fade-in-0 duration-150">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">سبک دکمه</span>
                  {/* هر گزینه خودش به همان سبک کشیده می‌شود، روی پس‌زمینه و با رنگ و گوشه‌ی همین صفحه */}
                  <div role="radiogroup" aria-label="سبک دکمه" className="grid grid-cols-3 gap-1.5">
                    {BUTTON_STYLE_ITEMS.map(({ value, label }) => {
                      const active = (theme.overrides.button_style ?? presetOf(theme.preset).buttonStyle) === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          title={label}
                          onClick={() => onChange({ ...theme, overrides: { ...theme.overrides, button_style: value } })}
                          className={cn(
                            'flex h-11 items-center rounded-md px-1.5 outline-none ring-1 ring-offset-2 ring-offset-card transition-shadow duration-150 ease-fluent focus-visible:ring-2 focus-visible:ring-ring',
                            active ? 'ring-2 ring-foreground' : 'ring-border hover:ring-foreground/40',
                          )}
                          style={{ background: sample.background, fontFamily: sample.vars['--nl-font'] }}
                        >
                          <span
                            className={cn('flex h-7 w-full items-center justify-center truncate px-1 text-[11px]', active ? 'font-bold' : 'font-semibold')}
                            style={{ ...sampleStyle(value, sample.vars), borderRadius: SAMPLE_RADIUS[sample.radius] }}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">گوشه‌ها</span>
                  <div role="radiogroup" aria-label="گوشه‌ها" className="grid grid-cols-4 gap-1.5">
                    {RADIUS_ITEMS.map(({ value, label, corner }) => {
                      const active = sample.radius === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={label}
                          title={label}
                          onClick={() => onChange({ ...theme, overrides: { ...theme.overrides, radius: value } })}
                          className={cn(
                            'flex h-9 items-center justify-center rounded-md ring-1 transition-colors duration-150 ease-fluent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active ? 'bg-muted text-foreground ring-2 ring-foreground' : 'text-muted-foreground ring-border hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <CornerIcon r={corner} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">اندازه‌ی متن</span>
                  <Segmented
                    value={theme.text_size ?? 'md'}
                    onChange={(v) => onChange({ ...theme, text_size: v })}
                    items={TEXT_SIZE_ITEMS}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">فونت</span>
                  <NativeSelect
                    value={theme.overrides.font ?? presetOf(theme.preset).font}
                    onChange={(e) =>
                      onChange({ ...theme, overrides: { ...theme.overrides, font: e.target.value as 'vazirmatn' | 'system' } })
                    }
                  >
                    <NativeSelectOption value="vazirmatn">فونت پیش‌فرض</NativeSelectOption>
                    <NativeSelectOption value="system">فونت سیستم</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
