'use client';

import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ImageIcon, ImageUpIcon, Trash2Icon, XIcon } from 'lucide-react';
import type { FormTheme } from '@noroset/field-engine';
import { Button, FilePicker, ScrollArea, type PickedFile } from '@noroset/ui';
import type { FormBackgroundValue } from '@noroset/noroform/ui';
import { FormBackground, PATTERN_ICONS, ensurePatternContrast, readablePatternColor, type PatternIconId } from '@noroset/noroform/ui';
import { errorMessage } from '@/lib/api';
import { norofileSource } from '@/lib/file-sources';
import { IconAction, Overlay, UnderlineTabs } from '@/components/editor-ui';

type BackgroundTab = FormTheme['background_style'];

const TABS: { value: BackgroundTab; label: string }[] = [
  { value: 'solid', label: 'یک‌رنگ' },
  { value: 'gradient', label: 'گرادیان' },
  { value: 'mesh', label: 'پترن' },
  { value: 'image', label: 'تصویر' },
];

const BACKGROUND_COLORS = [
  '#d03939', '#d05f39', '#d08539', '#d0ab39', '#d0d039', '#abd039',
  '#85d039', '#5fd039', '#39d039', '#39d05f', '#39d085', '#39d0ab',
  '#39d0d0', '#39abd0', '#3985d0', '#395fd0', '#3939d0', '#5f39d0',
  '#8539d0', '#ab39d0', '#d039d0', '#d039ab', '#d03985', '#d0395f',
] as const;

const clampPct = (value: number) => Math.round(Math.min(100, Math.max(0, value)));

function backgroundOf(theme: FormTheme): FormBackgroundValue {
  return {
    mode: theme.background_style,
    color: theme.background_color,
    secondary_color: theme.background_secondary_color,
    angle: theme.background_angle,
    pattern_icon: theme.background_pattern_icon ?? '',
    pattern_size: theme.background_pattern_size ?? 36,
    pattern_color: theme.background_pattern_color ?? '',
    image_url: theme.background_image_url ?? '',
    image_opacity: theme.background_image_opacity ?? 1,
    focal_x: theme.background_focal_x ?? 50,
    focal_y: theme.background_focal_y ?? 50,
    overlay: theme.background_overlay ?? 'none',
    overlay_color: theme.background_overlay_color ?? '',
    overlay_opacity: theme.background_overlay_opacity ?? 0.45,
  };
}

/** دیالوگ تنظیمات ناحیه‌ی background فرم؛ تغییرها زنده روی تم اعمال می‌شوند. */
export function BackgroundDialog({
  theme,
  tenantId,
  onChange,
  onClose,
}: {
  theme: FormTheme;
  tenantId: string;
  onChange: (theme: FormTheme) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [tab, setTab] = useState<BackgroundTab>(theme.background_style);
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageSource = useMemo(() => norofileSource(tenantId, 'public'), [tenantId]);
  const value = backgroundOf(theme);
  const patch = (change: Partial<FormTheme>) => onChange({ ...theme, ...change });
  const changeTab = (next: BackgroundTab) => {
    setTab(next);
    if (next === 'mesh') {
      patch({
        background_style: next,
        background_pattern_icon: theme.background_pattern_icon || 'sparkle',
        background_pattern_size: theme.background_pattern_size ?? 36,
        background_pattern_color: theme.background_pattern_color || readablePatternColor(theme.background_color),
      });
      return;
    }
    patch({ background_style: next });
  };

  const onPicked = (file: PickedFile) => {
    if (!file.url) return;
    setTab('image');
    patch({ background_style: 'image', background_image_url: file.url });
    setPickerOpen(false);
  };

  const setFocal = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    patch({
      background_focal_x: clampPct(((event.clientX - rect.left) / rect.width) * 100),
      background_focal_y: clampPct(((event.clientY - rect.top) / rect.height) * 100),
    });
  };

  const nudgeFocal = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[event.key];
    if (!delta) return;
    event.preventDefault();
    patch({
      background_focal_x: clampPct((theme.background_focal_x ?? 50) + delta[0]!),
      background_focal_y: clampPct((theme.background_focal_y ?? 50) + delta[1]!),
    });
  };

  return (
    <Overlay
      onClose={onClose}
      labelledBy={titleId}
      className="inset-x-3 top-3 h-[calc(100svh-1.5rem)] overflow-hidden md:inset-x-auto md:top-1/2 md:left-1/2 md:h-[42rem] md:max-h-[calc(100svh-3rem)] md:w-[34rem] md:-translate-x-1/2 md:-translate-y-1/2"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span id={titleId} className="font-semibold">پس‌زمینه‌ی فرم</span>
        <span className="text-xs text-muted-foreground">ناحیه‌ی background</span>
        <div className="flex-1" />
        <IconAction label="بستن" onClick={onClose}><XIcon /></IconAction>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3">
        <UnderlineTabs value={tab} onChange={changeTab} items={TABS} />
        <div className="mt-4 flex flex-col gap-4">
          {tab === 'solid' ? (
            <div className="grid grid-cols-2 items-start gap-4">
              <PreviewCard value={{ ...value, mode: tab }} />
              <ColorField label="رنگ زمینه" value={theme.background_color} onChange={(background_color) => patch({ background_color })} />
            </div>
          ) : null}

          {tab === 'gradient' ? (
            <>
              <div className="grid grid-cols-2 items-start gap-4">
                <PreviewCard value={{ ...value, mode: tab }} />
                <div className="flex flex-col gap-3">
                  <ColorField label="رنگ زمینه" value={theme.background_color} onChange={(background_color) => patch({ background_color })} />
                  <ColorField label="رنگ دوم" value={theme.background_secondary_color} onChange={(background_secondary_color) => patch({ background_secondary_color })} />
                </div>
              </div>
              <RangeField label="زاویه" value={theme.background_angle} min={0} max={360} step={1} suffix="°" onChange={(background_angle) => patch({ background_angle })} />
            </>
          ) : null}

          {tab === 'mesh' ? (
            <>
              <div className="grid grid-cols-2 items-start gap-4">
                <PreviewCard value={{ ...value, mode: tab }} />
                <div className="flex flex-col gap-3">
                  <ColorField
                    label="رنگ زمینه"
                    value={theme.background_color}
                    onChange={(background_color) =>
                      patch({
                        background_color,
                        // رنگ پترن اگر با زمینه هم‌خوان نباشد به رنگ خوانا اصلاح می‌شود.
                        background_pattern_color: ensurePatternContrast(
                          background_color,
                          theme.background_pattern_color || readablePatternColor(background_color),
                        ),
                      })
                    }
                  />
                  <ColorField
                    label="رنگ پترن"
                    value={theme.background_pattern_color || readablePatternColor(theme.background_color)}
                    onChange={(background_pattern_color) =>
                      patch({ background_pattern_color: ensurePatternContrast(theme.background_color, background_pattern_color) })
                    }
                  />
                </div>
              </div>
              <PatternPicker
                value={(value.pattern_icon || 'sparkle') as PatternIconId}
                onChange={(background_pattern_icon) =>
                  patch({
                    background_pattern_icon,
                    background_pattern_color: theme.background_pattern_color || readablePatternColor(theme.background_color),
                  })
                }
              />
              <RangeField
                label="اندازه‌ی آیکن"
                value={theme.background_pattern_size ?? 36}
                min={12}
                max={120}
                step={1}
                suffix="px"
                onChange={(background_pattern_size) => patch({ background_pattern_size })}
              />
              <p className="text-[11px] leading-5 text-muted-foreground">رنگ پترن با روشنایی رنگ زمینه هماهنگ می‌شود تا خوانایی حفظ شود.</p>
            </>
          ) : null}

          {tab === 'image' ? (
            <ImageBackgroundSettings
              value={value}
              onPickImage={() => setPickerOpen(true)}
              onFocal={setFocal}
              onNudgeFocal={nudgeFocal}
              patch={patch}
            />
          ) : null}
        </div>
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
        <span className="text-[11px] text-muted-foreground">تغییرها فوراً در فرم ذخیره می‌شوند.</span>
        <Button type="button" variant="secondary" onClick={onClose}>بستن</Button>
      </div>

      <FilePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        source={imageSource}
        options={{ accept: ['image'], maxBytes: 5 * 1024 * 1024, requirePublic: true, image: { shape: 'rect', maxSize: 1600 } }}
        onPick={onPicked}
        title="انتخاب تصویر"
        errorMessage={errorMessage}
      />

    </Overlay>
  );
}

function ImageBackgroundSettings({
  value,
  onPickImage,
  onFocal,
  onNudgeFocal,
  patch,
}: {
  value: FormBackgroundValue;
  onPickImage: () => void;
  onFocal: (event: MouseEvent<HTMLDivElement>) => void;
  onNudgeFocal: (event: KeyboardEvent<HTMLDivElement>) => void;
  patch: (change: Partial<FormTheme>) => void;
}) {
  return (
    <>
      {value.image_url ? (
        <>
          <div
            role="slider"
            tabIndex={0}
            aria-label="نقطه‌ی کانونی تصویر"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value.focal_x}
            aria-valuetext={`افقی ${value.focal_x}٪، عمودی ${value.focal_y}٪`}
            className="relative aspect-video cursor-crosshair overflow-hidden rounded-lg bg-black/5 ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            onClick={onFocal}
            onKeyDown={onNudgeFocal}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- تصویر آپلودشده‌ی نوروفایل */}
            <img src={value.image_url} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
            <span
              aria-hidden
              className="pointer-events-none absolute size-4 -translate-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,.6)]"
              style={{ left: `${value.focal_x}%`, top: `${value.focal_y}%` }}
            />
            <div className="absolute top-2 start-2 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onPickImage(); }}
                title="تعویض تصویر"
                aria-label="تعویض تصویر"
                className="flex h-7 items-center gap-1.5 rounded-md bg-black/65 px-2 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ImageUpIcon className="size-3.5" />
                تعویض
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); patch({ background_image_url: '' }); }}
                title="حذف تصویر"
                aria-label="حذف تصویر"
                className="flex size-7 items-center justify-center rounded-md bg-black/65 text-white/90 shadow-sm backdrop-blur-md transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">روی تصویر بزنید تا بخش مهم آن در موبایل و دسکتاپ دیده شود.</span>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">لایه‌ی روی تصویر</span>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() =>
                patch({
                  background_overlay: value.overlay === 'none' ? 'dark' : 'none',
                  background_overlay_color: value.overlay_color || '#000000',
                })
              }
            >
              {value.overlay === 'none' ? 'افزودن لایه' : 'حذف لایه'}
            </Button>
          </div>
          {value.overlay !== 'none' ? (
            <>
              <ColorField
                label="رنگ لایه"
                value={value.overlay_color || (value.overlay === 'light' ? '#ffffff' : '#000000')}
                onChange={(background_overlay_color) => patch({ background_overlay: 'dark', background_overlay_color })}
              />
              <RangeField
                label="شدت لایه"
                value={value.overlay_opacity}
                min={0}
                max={1}
                step={0.01}
                percent
                onChange={(background_overlay_opacity) => patch({ background_overlay_opacity })}
              />
            </>
          ) : null}
          <RangeField
            label="شفافیت تصویر"
            value={value.image_opacity}
            min={0.1}
            max={1}
            step={0.01}
            percent
            onChange={(background_image_opacity) => patch({ background_image_opacity })}
          />
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground">
            <ImageIcon className="mt-0.5 size-3.5 shrink-0" />
            زیر ۱۵٪ لایه‌ی تیره، کانتینر شیشه‌ای زیر محتوا خودکار روشن می‌شود تا متن خوانا بماند.
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onPickImage}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/20 bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-foreground/35 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ImageUpIcon className="size-6" />
          <span>انتخاب تصویر از نوروفایل</span>
        </button>
      )}
    </>
  );
}


function PatternPicker({ value, onChange }: { value: PatternIconId; onChange: (value: PatternIconId) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">آیکون پترن</span>
      <div role="radiogroup" aria-label="آیکون پترن" className="grid grid-cols-6 gap-1.5">
        {PATTERN_ICONS.map((icon) => (
          <button
            key={icon.id}
            type="button"
            role="radio"
            aria-checked={value === icon.id}
            aria-label={icon.label}
            title={icon.label}
            onClick={() => onChange(icon.id)}
            className="flex aspect-square items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-foreground aria-checked:bg-secondary aria-checked:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path d={icon.path} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ value }: { value: FormBackgroundValue }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border">
      <FormBackground value={value} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span dir="ltr" className="font-mono text-[11px] uppercase text-foreground">{value}</span>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-2">
        {BACKGROUND_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-label={color}
            aria-checked={value.toLowerCase() === color}
            title={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className="aspect-square rounded-md ring-1 ring-border ring-offset-1 ring-offset-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:ring-2 aria-checked:ring-foreground"
          />
        ))}
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  percent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  percent?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{percent ? `${Math.round(value * 100)}٪` : `${value}${suffix ?? ''}`}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="accent-primary" />
    </label>
  );
}

