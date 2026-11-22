'use client';

import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ImageUpIcon, SquareDashedIcon, Trash2Icon } from 'lucide-react';
import { Segmented, Spinner } from '@noroset/ui';
import {
  assetUrlFor,
  autoTone,
  CARD_MAX_OVERLAY,
  readableOverlay,
  MAX_OVERLAY,
  type Background,
  type ImageRef,
  type ImageTone,
  type Theme,
} from '@noroset/norolink/ui';
import { measureImageLuma } from '@/lib/image-luma';
import { useImageUpload, type UploadContext } from './fields';

type ImageBackground = Extract<Background, { kind: 'image' }>;

/** شدت لایه‌ی عکس تازه: همان مرز کانتینر تا عکس دیده شود و کانتینر خودکار خوانایی را تأمین کند. */
const INITIAL_OVERLAY = CARD_MAX_OVERLAY;
const CARD_MAX_PCT = Math.round(CARD_MAX_OVERLAY * 100);

const clampPct = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

/**
 * پس‌زمینه‌ی صفحه: پس‌زمینه‌ی خود قالب یا عکس. روی عکس لایه‌ی روشن/تیره و شدتش خودکار از روشنایی عکس انتخاب
 * می‌شود؛ شدت آزاد است و با آن محوشدن عکس هم عوض می‌شود. زیر شدت خوانایی (image-tone.ts) کانتینر شیشه‌ای خودکار زیر
 * المان‌ها می‌آید (theme.ts) تا بقیه‌ی عکس تا جای ممکن دیده شود؛ عکس تازه با لایه‌ی کم شروع می‌کند.
 */
export function BackgroundSection({
  theme,
  upload,
  onChange,
}: {
  theme: Theme;
  upload: UploadContext | null;
  onChange: (theme: Theme) => void;
}) {
  const [measuring, setMeasuring] = useState(false);
  const bg = theme.overrides.background;
  // پیش‌نویس‌های پیش از لایه‌ی هوشمند فیلدهای تازه را ندارند (همان پیش‌فرض‌های schema)
  const image: ImageBackground | null =
    bg?.kind === 'image'
      ? {
          ...bg,
          tone: bg.tone ?? 'dark',
          tone_source: bg.tone_source ?? 'manual',
          focal: bg.focal ?? { x: 50, y: 50 },
          luma: bg.luma ?? null,
        }
      : null;

  const setBackground = (background: Background | undefined) =>
    onChange({ ...theme, overrides: { ...theme.overrides, background } });
  const setImage = (patch: Partial<ImageBackground>) => image && setBackground({ ...image, ...patch });

  const onPicked = async (picked: ImageRef) => {
    if (!upload) return;
    setMeasuring(true);
    const luma = await measureImageLuma(assetUrlFor(upload.assetBaseUrl)(picked));
    setMeasuring(false);
    const auto = luma ? autoTone(luma) : { tone: 'dark' as const, overlay: INITIAL_OVERLAY };
    setBackground({
      kind: 'image',
      image: picked,
      // لایه‌ی کم تا عکس دیده شود؛ اگر کم‌تر از حد خوانایی باشد کانتینر خودکار می‌آید
      overlay: Math.min(auto.overlay, INITIAL_OVERLAY),
      tone: auto.tone,
      tone_source: 'auto',
      focal: { x: 50, y: 50 },
      luma,
    });
  };
  const picker = useImageUpload(upload ?? { pageId: '', tenantId: '', assetBaseUrl: '' }, (img) => void onPicked(img), 'background');

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">پس‌زمینه</span>
      <Segmented
        value={image ? 'image' : 'preset'}
        onChange={(v) => (v === 'preset' ? setBackground(undefined) : upload && picker.pick())}
        items={[
          { value: 'preset', label: 'قالب' },
          { value: 'image', label: 'عکس' },
        ]}
      />
      {picker.input}
      {measuring ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Spinner className="size-3.5" />
          بررسی روشنایی عکس…
        </div>
      ) : null}
      {image && upload ? (
        <ImageControls image={image} src={assetUrlFor(upload.assetBaseUrl)(image.image)} onPatch={setImage} onReplace={picker.pick} onRemove={() => setBackground(undefined)} />
      ) : null}
    </div>
  );
}

function ImageControls({
  image,
  src,
  onPatch,
  onReplace,
  onRemove,
}: {
  image: ImageBackground;
  src: string;
  onPatch: (patch: Partial<ImageBackground>) => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const readable = readableOverlay(image);

  const setFocal = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPatch({ focal: { x: clampPct(((e.clientX - r.left) / r.width) * 100), y: clampPct(((e.clientY - r.top) / r.height) * 100) } });
  };
  const nudgeFocal = (e: KeyboardEvent<HTMLDivElement>) => {
    // جهت‌ها فیزیکی‌اند (تصویر در RTL آینه نمی‌شود).
    const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!d) return;
    e.preventDefault();
    onPatch({ focal: { x: clampPct(image.focal.x + d[0]!), y: clampPct(image.focal.y + d[1]!) } });
  };
  const setTone = (tone: ImageTone) => onPatch({ tone, tone_source: 'manual' });

  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label="نقطه‌ی کانونی عکس"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={image.focal.x}
        aria-valuetext={`افقی ${image.focal.x}٪، عمودی ${image.focal.y}٪`}
        className="relative cursor-crosshair overflow-hidden rounded-lg ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        onClick={setFocal}
        onKeyDown={nudgeFocal}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- فایل نوروفایل یا تصویر ثابت قالب */}
        <img src={src} alt="" draggable={false} className="block max-h-40 w-full object-contain" />
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,.6)]"
          style={{ left: `${image.focal.x}%`, top: `${image.focal.y}%` }}
        />

        {/* دکمه‌های این‌لاین روی تصویر بندانگشتی برای کاهش اشغال فضا */}
        <div className="absolute top-2 start-2 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplace();
            }}
            title="تعویض عکس"
            aria-label="تعویض عکس"
            className="flex h-7 items-center gap-1.5 rounded-md bg-black/65 px-2 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ImageUpIcon className="size-3.5" />
            <span>تعویض</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="حذف عکس پس‌زمینه"
            aria-label="حذف عکس پس‌زمینه"
            className="flex size-7 items-center justify-center rounded-md bg-black/65 text-white/90 shadow-sm backdrop-blur-md transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground">روی عکس بزنید تا بخش مهم آن در موبایل و دسکتاپ دیده شود.</span>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          لایه‌ی روی عکس
          {image.tone_source === 'auto' ? <span className="text-[11px]">(خودکار)</span> : null}
        </span>
        <Segmented
          value={image.tone}
          onChange={setTone}
          items={[
            { value: 'light', label: 'روشن' },
            { value: 'dark', label: 'تیره' },
          ]}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        شدت لایه
        <input
          type="range"
          min={0}
          max={MAX_OVERLAY}
          step={0.01}
          value={image.overlay}
          aria-valuetext={`${Math.round(image.overlay * 100)}٪`}
          onChange={(e) => onPatch({ overlay: Number(e.target.value) })}
          className="accent-foreground"
        />
        <span className="flex items-start gap-1 text-[11px]">
          <SquareDashedIcon className="mt-px size-3.5 shrink-0" />
          {image.overlay <= CARD_MAX_OVERLAY
            ? `تا ${CARD_MAX_PCT}٪ کانتینر شیشه‌ای زیر المان‌ها خودکار روشن است تا متن خوانا بماند و بقیه‌ی عکس دیده شود.`
            : image.overlay < readable
              ? `بالای ${CARD_MAX_PCT}٪ کانتینر برداشته می‌شود؛ زیر ${Math.round(readable * 100)}٪ ممکن است متن روی بخش‌هایی از عکس خوانا نباشد.`
              : `بالای ${CARD_MAX_PCT}٪ کانتینر برداشته می‌شود و متن روی خود عکس خواناست.`}
        </span>
      </label>
    </div>
  );
}
