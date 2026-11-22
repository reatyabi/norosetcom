'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BanIcon, ImageUpIcon, SearchIcon } from 'lucide-react';
import { cn, FilePicker, Segmented, type FilePickerOptions, type FileSource, type ImageOptions } from '@noroset/ui';
import { GENERIC_ICONS, ICON_LABELS, ICON_PRESETS, LinkIcon, SOCIAL_PLATFORMS, type ImageRef, type LinkButtonSettings } from '@noroset/norolink/ui';
import { hoverNativeScroll } from '@/components/editor-ui';
import { errorMessage } from '@/lib/api';
import { norolinkImageSource } from '@/lib/file-sources';
import { renderLucide, useLucideSet } from '@/lib/lucide-icons';

// اجزای پایه‌ی ادیتور صفحه‌ی لینک: فیلد و بخش (دراور)، آپلود تصویر، پاپ‌اوور و انتخاب آیکون (درجا).

export interface UploadContext {
  pageId: string;
  tenantId: string;
  assetBaseUrl: string;
  /** جای کتابخانه و بارگذاری پیش‌فرض صفحه (مثلاً قالب آماده در فضای پلتفرم). */
  source?: FileSource;
}

export const ltr = 'text-left [direction:ltr]';

export function Field({ label, hint, className, children }: { label: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-xs text-muted-foreground', className)}>
      {label}
      {children}
      {hint ? <span className="text-[11px]">{hint}</span> : null}
    </label>
  );
}

/** گروه معنایی در تنظیمات پیشرفته (رفتار، ظاهر). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 md:col-span-2">
      <h3 className="border-b pb-1.5 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-x-4.5 gap-y-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** کاربردهای تصویر صفحه: هر کدام نسبت کراپ و اندازه‌ی خروجی خودش را دارد (سقف سرور ۵MB، public). */
export const IMAGE_USES = {
  avatar: { aspect: 1, shape: 'round', maxSize: 512 },
  icon: { aspect: 1, shape: 'rect', maxSize: 256 },
  og: { aspect: 1.91, shape: 'rect', maxSize: 1200 },
  content: { shape: 'rect', maxSize: 2000 },
  // پس‌زمینه محو نمایش داده می‌شود؛ وضوح بیشتر فقط حجم است
  background: { shape: 'rect', maxSize: 1600 },
} satisfies Record<string, ImageOptions>;

export type ImageUse = keyof typeof IMAGE_USES;

export function imagePickerOptions(use: ImageUse): FilePickerOptions {
  return { accept: ['image'], maxBytes: 5 * 1024 * 1024, requirePublic: true, image: IMAGE_USES[use] };
}

/**
 * انتخاب تصویر با کارت آپلود مشترک (بارگذاری با کراپ، یا انتخاب از فایل‌های public نوروفایل).
 * `input` کارت را رندر می‌کند و `pick` آن را باز می‌کند.
 */
export function useImageUpload(ctx: UploadContext, onUploaded: (image: ImageRef, name?: string) => void, use: ImageUse = 'content') {
  const [open, setOpen] = useState(false);
  const source = useMemo(() => ctx.source ?? norolinkImageSource(ctx.tenantId, ctx.pageId), [ctx.source, ctx.tenantId, ctx.pageId]);
  const input = (
    <FilePicker
      open={open}
      onOpenChange={setOpen}
      source={source}
      options={imagePickerOptions(use)}
      errorMessage={errorMessage}
      title="انتخاب تصویر"
      onPick={(f) => {
        if (f.width && f.height) onUploaded({ file_id: f.id, width: f.width, height: f.height }, f.name);
      }}
    />
  );
  return { pick: () => setOpen(true), busy: false, error: null as string | null, input };
}

/** پاپ‌اوور کوچک زیر یک نقطه‌ی درجا (بستن با کلیک بیرون یا Escape). */
export function Popover({
  open,
  onClose,
  children,
  center,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  center?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // کارت آپلود (portal) که از داخل پاپ‌اوور باز شده «بیرون» حساب نمی‌شود.
    const inPicker = (e: Event) => e.target instanceof Element && e.target.closest('[data-slot=file-picker-layer]') !== null;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !inPicker(e)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !inPicker(e) && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  // بوم ادیتور لبه‌ها را می‌بُرد (overflow-clip): اگر پایین جا نیست، پاپ‌اوور سمتی باز می‌شود که جای بیشتری دارد و
  // ارتفاعش به همان جا محدود می‌شود (درون خودش اسکرول). با هر تغییر اندازه (مثلاً بارگذاری تنبل آیکون‌ها) دوباره.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const anchor = el.offsetParent?.getBoundingClientRect();
    const place = () => {
      if (!anchor) return;
      const bound = el.closest('[data-nl-canvas]')?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
      // افقی: لنگر پاپ‌اوور مرکز آیتم (center) یا لبه‌ی شروع آن است؛ جای نهایی با left محدود به بوم حساب می‌شود تا
      // آیتم کناری در موبایل از لبه بیرون نزند (transform به انیمیشن ورود سپرده شده).
      const edge = 8;
      el.style.maxWidth = `${bound.right - bound.left - edge * 2}px`;
      const width = el.offsetWidth;
      const wanted = center ? (anchor.left + anchor.right - width) / 2 : anchor.right - width;
      const left = Math.max(bound.left + edge, Math.min(wanted, bound.right - edge - width));
      el.style.left = `${left - anchor.left}px`;
      el.style.right = 'auto';
      const below = bound.bottom - anchor.bottom - 12;
      const above = anchor.top - bound.top - 12;
      const height = el.scrollHeight;
      if (height <= below) return;
      const up = above > below;
      Object.assign(el.style, {
        top: up ? 'auto' : '',
        bottom: up ? '100%' : '',
        marginTop: up ? '0' : '',
        marginBottom: up ? '0.5rem' : '',
        maxHeight: `${Math.max(160, up ? above : below)}px`,
        overflowY: 'auto',
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, center]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'nl-pop absolute top-full z-40 mt-2 w-72 p-3 text-start text-sm leading-normal font-normal animate-in fade-in-0 zoom-in-95 duration-150',
        hoverNativeScroll,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** چند آیکون Lucide در هر نوبت (بقیه با اسکرول، مثل صفحه‌ی ایموجی گوشی). */
const LUCIDE_BATCH = 160;

/**
 * محتوای پاپ‌اوور آیکون دکمه: «شبکه‌ها» و «عمومی» (آیکون‌های عمومی خودی و پس از آن همه‌ی آیکون‌های Lucide، با
 * بارگذاری تنبل و نمایش تدریجی هنگام اسکرول)، در یک شبکه‌ی فشرده مثل صفحه‌ی ایموجی؛ آیکون‌ها بدون زمینه و آیکون
 * انتخاب‌شده با قاب و رنگ اصلی. آپلود و «بدون آیکون». جستجو: برچسب فارسی آیکون‌های خودی و نام انگلیسی Lucide.
 */
export function IconGrid({
  value,
  onChange,
  upload,
}: {
  value: LinkButtonSettings['icon'];
  onChange: (icon: LinkButtonSettings['icon']) => void;
  upload: UploadContext;
}) {
  const isSocial = value?.kind === 'preset' && (SOCIAL_PLATFORMS as readonly string[]).includes(value.value);
  const [tab, setTab] = useState<'social' | 'generic'>(!value || isSocial ? 'social' : 'generic');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(LUCIDE_BATCH);
  const query = q.trim().toLowerCase();
  const wantsLucide = tab === 'generic' || query.length > 0;
  const lucide = useLucideSet(wantsLucide);
  const presets = query
    ? ICON_PRESETS.filter((n) => ICON_LABELS[n].includes(query) || n.includes(query))
    : tab === 'social'
      ? SOCIAL_PLATFORMS
      : GENERIC_ICONS;
  // نام‌ها PascalCase‌اند؛ جستجو بدون فاصله/خط تیره (مثل «arrow up» ← ArrowUp…)
  const needle = query.replace(/[\s_-]+/g, '');
  const preset = value?.kind === 'preset' ? value.value : null;
  const chosenLucide = value?.kind === 'lucide' ? value.value : null;
  const matches = !lucide || !wantsLucide ? [] : Object.keys(lucide).filter((n) => !needle || n.toLowerCase().includes(needle));
  // آیکون Lucide انتخاب‌شده‌ی فعلی اول می‌آید تا بدون اسکرول دیده شود
  const lucideNames = chosenLucide && matches.includes(chosenLucide) ? [chosenLucide, ...matches.filter((n) => n !== chosenLucide)] : matches;
  const up = useImageUpload(upload, (image) => onChange({ kind: 'upload', image }), 'icon');
  const tile = (active: boolean) =>
    cn(
      'flex size-9 items-center justify-center rounded-lg ring-1 transition-colors [&_svg]:size-4.5',
      active ? 'bg-primary text-primary-foreground ring-primary' : 'ring-border hover:bg-muted',
    );
  // ظاهر (بدون زمینه، انتخاب‌شده با قاب) در CSS پاپ‌اوور ادیتور است (.nl-icon-grid در board.tsx) تا با رنگ‌های صفحه بخواند
  const cell = 'flex aspect-square items-center justify-center rounded-md outline-none [&_svg]:size-5';
  const noResults = presets.length === 0 && (!wantsLucide || (lucide !== null && lucideNames.length === 0));
  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex h-8 items-center gap-1.5 rounded-lg px-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
        <SearchIcon className="size-3.5 shrink-0 opacity-60" />
        <input
          autoFocus
          aria-label="جستجوی آیکون"
          placeholder="جستجو: تلگرام، فروشگاه یا coffee"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(LUCIDE_BATCH);
          }}
        />
      </label>
      {query ? null : (
        <Segmented
          value={tab}
          onChange={(t) => {
            setTab(t);
            setShown(LUCIDE_BATCH);
          }}
          items={[
            { value: 'social', label: 'شبکه‌ها' },
            { value: 'generic', label: 'عمومی' },
          ]}
        />
      )}
      {noResults ? <p className="py-2 text-center text-xs opacity-70">آیکونی پیدا نشد.</p> : null}
      <div
        className={cn('-mx-1 flex max-h-48 flex-col gap-2 overflow-y-auto overscroll-contain px-1', hoverNativeScroll)}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight > el.scrollHeight - 120) setShown((n) => Math.min(n + LUCIDE_BATCH, lucideNames.length));
        }}
      >
        {query && lucideNames.length ? (
          <span className="text-[11px] text-muted-foreground">{(presets.length + lucideNames.length).toLocaleString('fa-IR')} آیکون</span>
        ) : null}
        {/* یک شبکه‌ی فشرده: آیکون‌های خودی و سپس Lucide؛ نام در tooltip */}
        <div className="nl-icon-grid grid grid-cols-8 gap-0.5 p-0.5">
          {presets.map((name) => (
            <button
              key={name}
              type="button"
              title={ICON_LABELS[name]}
              aria-label={ICON_LABELS[name]}
              aria-pressed={preset === name}
              onClick={() => onChange({ kind: 'preset', value: name })}
              className={cell}
            >
              <LinkIcon name={name} />
            </button>
          ))}
          {lucide
            ? lucideNames.slice(0, shown).map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={chosenLucide === name}
                  onClick={() => onChange({ kind: 'lucide', value: name })}
                  className={cell}
                >
                  {renderLucide(lucide, name)}
                </button>
              ))
            : null}
        </div>
        {wantsLucide && !lucide ? <p className="py-3 text-center text-xs opacity-70">در حال بارگذاری آیکون‌ها…</p> : null}
      </div>
      <div className="flex items-center gap-1.5 border-t pt-2.5">
        <button type="button" onClick={up.pick} disabled={up.busy} className={cn(tile(value?.kind === 'upload'), 'w-auto gap-1.5 px-2.5 text-xs')}>
          <ImageUpIcon className="size-4" />
          {up.busy ? 'در حال آپلود…' : 'آیکون سفارشی'}
        </button>
        <button type="button" onClick={() => onChange(null)} disabled={!value} className={cn(tile(!value), 'w-auto gap-1.5 px-2.5 text-xs')}>
          <BanIcon className="size-4" />
          بدون آیکون
        </button>
        {up.input}
      </div>
      {up.error ? <span className="text-xs text-destructive">{up.error}</span> : null}
    </div>
  );
}
