'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import {
  AlertCircleIcon,
  CameraIcon,
  CropIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ClipboardPasteIcon,
  ExternalLinkIcon,
  ImageUpIcon,
  LinkIcon as LinkLucide,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { cn, Input, NativeSelect, NativeSelectOption } from '@noroset/ui';
import {
  buttonColorVars,
  type ResolvedTheme,
  DEFAULT_IMAGE_CROP,
  imageCropStyle,
  imageSlides,
  isHttpUrl,
  MAX_IMAGE_SLIDES,
  normalizeHttpUrl,
  withImageSlides,
  type ImageSlide,
  isValidSocialValue,
  normalizeSocialValue,
  applySocialInput,
  socialHandlePrefix,
  LinkIcon,
  mapEmbedUrl,
  mapProviderOf,
  parseVideoUrl,
  SOCIAL_COLORS,
  SOCIAL_LABELS,
  SOCIAL_PLATFORMS,
  videoEmbedUrl,
  type ImageCrop,
  type ImageRef,
  type PageContent,
  type SocialPlatform,
} from '@noroset/norolink/ui';
import { hoverNativeScroll, IconAction } from '@/components/editor-ui';
import type { EditorElement } from '../../../links-shared';
import { IconGrid, ltr, Popover, useImageUpload, type UploadContext } from './fields';
import { RichEditor } from './rich-editor';
import { useUndo } from './undo';

// ویرایشگرهای درجای هر المان: همان کلاس‌های دیزاین سیستم صفحه‌ی لینک (ظاهر دقیقاً مثل صفحه‌ی منتشرشده)،
// با این تفاوت که متن‌ها ورودی‌اند و آیکون/تصویر/آیتم‌ها با کلیک روی خودشان ویرایش می‌شوند.

const stop = (e: MouseEvent) => e.stopPropagation();

export function InlineText({
  value,
  onChange,
  placeholder,
  maxLength,
  multiline,
  wrap,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
  /** یک‌خطی از نظر داده (بدون Enter و خط جدید) ولی متن بلند مثل صفحه‌ی منتشرشده می‌شکند. */
  wrap?: boolean;
  label: string;
  className?: string;
}) {
  const common = { className: cn('nl-edit', className), value, placeholder, maxLength, 'aria-label': label, onClick: stop };
  if (wrap)
    return (
      <textarea
        {...common}
        rows={1}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
      />
    );
  return multiline ? (
    <textarea {...common} rows={1} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input {...common} onChange={(e) => onChange(e.target.value)} />
  );
}

/** دکمه‌های کوچک روی تصویر (تعویض/حذف) با سبک پلتفرم. */
function MediaActions({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent p-2 font-sans opacity-0 transition-opacity group-hover/media:opacity-100 focus-within:opacity-100">
      {children}
    </div>
  );
}

function MediaButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e);
        onClick();
      }}
      className="flex h-7 items-center gap-1 rounded-md bg-popover px-2 text-xs text-popover-foreground shadow-xs ring-1 ring-border hover:bg-muted [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

/** راهنمای ورودی هر شبکه؛ شبکه‌های شناسه‌دار «@نام» یا لینک می‌پذیرند. */
export function socialPlaceholder(platform: SocialPlatform): string {
  if (platform === 'email') return 'name@example.com';
  if (platform === 'phone') return '09121234567';
  if (platform === 'whatsapp') return 'شماره (09…) یا لینک wa.me';
  if (platform === 'website') return 'example.com';
  return socialHandlePrefix(platform) ? '@نام‌کاربری یا لینک' : 'لینک';
}

export function ElementEditor({
  el,
  theme,
  assetUrl,
  lucideIcon,
  upload,
  onChange,
}: {
  el: EditorElement;
  theme: ResolvedTheme;
  lucideIcon?: (name: string) => ReactNode;
  assetUrl: (image: ImageRef) => string;
  upload: UploadContext;
  onChange: (settings: EditorElement['settings']) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  // متن خام آیتم در حال تایپ: مقدار نرمال‌شده همان لحظه اعمال می‌شود، ولی ورودی زیر دست کاربر عوض نمی‌شود.
  const [socialDraft, setSocialDraft] = useState<{ k: number; text: string; pinned: boolean } | null>(null);
  const close = () => {
    setOpen(null);
    setSocialDraft(null);
  };
  const showUndo = useUndo();

  switch (el.kind) {
    case 'link_button': {
      const s = el.settings;
      const style = s.style.bg_color ? (buttonColorVars(s.style.bg_color, theme) as CSSProperties) : undefined;
      return (
        <div className="relative">
          <div className={`nl-btn nl-btn--${theme.buttonStyle}`} style={style}>
            <button
              type="button"
              className="nl-btn-icon nl-slot"
              aria-label="آیکون دکمه"
              title="آیکون دکمه"
              onClick={(e) => {
                stop(e);
                setOpen(open === 'icon' ? null : 'icon');
              }}
            >
              {s.icon?.kind === 'preset' ? (
                <LinkIcon name={s.icon.value} />
              ) : s.icon?.kind === 'lucide' ? (
                lucideIcon?.(s.icon.value)
              ) : s.icon?.kind === 'upload' ? (
                // eslint-disable-next-line @next/next/no-img-element -- فایل روی ذخیره‌ساز بیرونی است
                <img src={assetUrl(s.icon.image)} alt="" />
              ) : (
                <PlusIcon className="size-4 opacity-70" />
              )}
            </button>
            <span className="nl-btn-label">
              <InlineText wrap label="متن دکمه" value={s.label} maxLength={80} placeholder="متن دکمه" onChange={(label) => onChange({ ...s, label })} />
            </span>
            <span className="nl-btn-spacer" />
          </div>
          <Popover open={open === 'icon'} onClose={close} className="start-0">
            <IconGrid value={s.icon} onChange={(icon) => onChange({ ...s, icon })} upload={upload} />
          </Popover>
        </div>
      );
    }

    case 'social_icons': {
      const s = el.settings;
      const used = new Set(s.items.map((i) => i.platform));
      const setItem = (k: number, patch: Partial<(typeof s.items)[number]>) =>
        onChange({ items: s.items.map((it, j) => (j === k ? { ...it, ...patch } : it)) });
      /** تایپ یا چسباندن: شبکه و لینک همان لحظه روی بوم اعمال می‌شوند. */
      const applyItem = (k: number, raw: string) => {
        const current = s.items[k];
        if (!current) return;
        const pinned = socialDraft?.k === k && socialDraft.pinned;
        setSocialDraft({ k, text: raw, pinned });
        const taken = s.items.filter((_, j) => j !== k).map((it) => it.platform);
        setItem(k, applySocialInput(current.platform, raw, { taken, pinned }));
      };
      return (
        <div className="nl-social">
          {s.items.map((it, k) => (
            <div
              key={k}
              className={cn('nl-social-item relative', drag === k && 'opacity-40')}
              draggable={s.items.length > 1 && open === null}
              onDragStart={(e) => {
                setDrag(k);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => drag !== null && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag === null || drag === k) return;
                const items = [...s.items];
                const [moved] = items.splice(drag, 1);
                if (moved) items.splice(k, 0, moved);
                onChange({ items });
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
            >
              <button
                type="button"
                className={cn('nl-social-btn nl-slot', !it.value && 'opacity-45')}
                style={{ '--nl-social-bg': SOCIAL_COLORS[it.platform] } as CSSProperties}
                title={`${SOCIAL_LABELS[it.platform]}${s.items.length > 1 ? ' — برای جابه‌جایی بکشید' : ''}`}
                aria-label={`ویرایش ${SOCIAL_LABELS[it.platform]}`}
                onClick={(e) => {
                  stop(e);
                  setSocialDraft(null);
                  setOpen(open === `s${k}` ? null : `s${k}`);
                }}
              >
                <LinkIcon name={it.platform} />
              </button>
              <span className={cn('nl-social-label', !it.value && 'opacity-45')}>{SOCIAL_LABELS[it.platform]}</span>
              {it.value && !isValidSocialValue(it.platform, normalizeSocialValue(it.platform, it.value)) ? (
                <span className="nl-social-warn" title="مقدار کامل نیست" />
              ) : null}
              <Popover open={open === `s${k}`} onClose={close} center>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <NativeSelect
                      aria-label="شبکه"
                      className="flex-1"
                      value={it.platform}
                      onChange={(e) => {
                        // انتخاب دستی: تشخیص خودکار دیگر عوضش نمی‌کند؛ شناسه‌ی تایپ‌شده برای شبکه‌ی جدید دوباره ساخته می‌شود
                        const platform = e.target.value as SocialPlatform;
                        const text = socialDraft?.k === k ? socialDraft.text : it.value;
                        setSocialDraft({ k, text, pinned: true });
                        setItem(k, { platform, value: normalizeSocialValue(platform, text) });
                      }}
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <NativeSelectOption key={p} value={p} disabled={p !== it.platform && used.has(p)}>
                          {SOCIAL_LABELS[p]}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <IconAction
                      label="حذف"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        close();
                        const before = s.items;
                        onChange({ items: before.filter((_, j) => j !== k) });
                        showUndo(`${SOCIAL_LABELS[it.platform]} حذف شد`, () => onChange({ items: before }));
                      }}
                    >
                      <Trash2Icon />
                    </IconAction>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      aria-label={`نشانی ${SOCIAL_LABELS[it.platform]}`}
                      className={cn('flex-1', ltr)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={socialPlaceholder(it.platform)}
                      value={socialDraft?.k === k ? socialDraft.text : it.value}
                      maxLength={2048}
                      onChange={(e) => applyItem(k, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          close();
                        }
                      }}
                    />
                    {!it.value ? (
                      <IconAction
                        label="چسباندن از کلیپ‌بورد"
                        onClick={() => void readClipboard().then((t) => t && applyItem(k, t))}
                      >
                        <ClipboardPasteIcon />
                      </IconAction>
                    ) : null}
                  </div>
                  {it.value && !isValidSocialValue(it.platform, normalizeSocialValue(it.platform, it.value)) ? (
                    <p className="flex items-center gap-1 text-[11px] text-destructive [&_svg]:size-3.5">
                      <AlertCircleIcon />
                      مقدار کامل نیست؛ {socialPlaceholder(it.platform)}
                    </p>
                  ) : it.value ? (
                    <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">
                      <CheckIcon />
                      <span dir="ltr" className="truncate">
                        {it.value.replace(/^https?:\/\//, '')}
                      </span>
                    </p>
                  ) : null}
                </div>
              </Popover>
            </div>
          ))}
          {s.items.length < 12 ? (
            <div className="nl-social-item">
              <button
                type="button"
                className="nl-social-btn nl-slot nl-slot--add"
                aria-label="افزودن شبکه"
                title="افزودن شبکه"
                onClick={(e) => {
                  stop(e);
                  const platform = SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? 'website';
                  onChange({ items: [...s.items, { platform, value: '' }] });
                  setOpen(`s${s.items.length}`);
                }}
              >
                <PlusIcon />
              </button>
              <span className="nl-social-label opacity-60">افزودن</span>
            </div>
          ) : null}
        </div>
      );
    }

    case 'rich_text':
      return <RichEditor key={el.id} doc={el.settings.doc} onChange={(doc) => onChange({ doc })} />;

    case 'image':
      return <ImageEditor el={el} assetUrl={assetUrl} upload={upload} onChange={onChange} />;

    case 'video_embed': {
      const v = el.settings.video ?? (el.settings.source_url ? parseVideoUrl(el.settings.source_url) : null);
      return v ? (
        <div className="nl-media nl-embed">
          <iframe src={videoEmbedUrl(v)} title="ویدیو" loading="lazy" className="pointer-events-none" />
        </div>
      ) : (
        <div className="nl-placeholder">لینک ویدیو را در نوار زیر وارد کنید (آپارات، یوتیوب، ویمیو)</div>
      );
    }

    case 'map_embed': {
      const s = el.settings;
      if (!s.location)
        return (
          <div className="nl-placeholder">
            {s.source_url ? 'مکانی در این لینک پیدا نشد' : 'لینک یا کد iframe مکان را در نوار زیر بچسبانید (گوگل‌مپ، نشان، بلد)'}
            <span className="mt-1 block text-[11px] opacity-80">
              {s.source_url && mapProviderOf(s.source_url) === 'neshan'
                ? 'لینک مکان نشان مختصات ندارد؛ مکان را در سایت نشان باز کنید و نشانی نوار مرورگر را بچسبانید.'
                : 'در نقشه روی مکان بزنید، «اشتراک‌گذاری» را انتخاب و لینک یا کد iframe را کپی کنید.'}
            </span>
          </div>
        );
      const providerName = { google: 'گوگل‌مپ', neshan: 'نشان', balad: 'بلد' }[s.location.provider];
      return (
        <div>
          <div className="nl-media nl-map" data-height={s.height}>
            <iframe src={mapEmbedUrl(s.location)} title="نقشه" loading="lazy" className="pointer-events-none" />
          </div>
          <div className="nl-map-bar">
            <InlineText label="عنوان نقشه" value={s.label} maxLength={100} placeholder="عنوان (اختیاری)" onChange={(label) => onChange({ ...s, label })} />
            <span className="shrink-0">مسیریابی با {providerName}</span>
          </div>
        </div>
      );
    }
  }
}

/** پیش‌نهاد alt از نام فایل (بدون پسوند)؛ نام‌های بی‌معنی دوربین/تصادفی پیشنهاد نمی‌شوند. */
export function altFromFileName(name: string | undefined): string {
  const base = (name ?? '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!base || /^(img|image|dsc|pxl|photo|screenshot|whatsapp image)?[\s\d.:()-]*$/i.test(base) || /^[a-f0-9-]{16,}$/i.test(base)) return '';
  return base.slice(0, 200);
}

const FRAME_ASPECT: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

/**
 * تنظیم کادر: کشیدن تصویر داخل قاب (نقطه‌ی کانونی) + بزرگ‌نمایی؛ کلیدهای جهت برای جابه‌جایی دقیق.
 * حرکت با مقدار بیرون‌زدگی واقعی تصویر از قاب نسبت دارد تا زیر انگشت/ماوس بماند.
 */
export function CropAdjuster({
  image,
  aspect,
  crop,
  src,
  onChange,
  onDone,
}: {
  image: ImageRef;
  aspect: string;
  crop: ImageCrop;
  src: string;
  onChange: (crop: ImageCrop) => void;
  onDone: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: ImageCrop } | null>(null);
  const imgAspect = image.width / image.height;
  const frameAspect = FRAME_ASPECT[aspect] ?? 1;

  const move = (dx: number, dy: number, from: ImageCrop) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    // بیرون‌زدگی تصویر (cover × zoom) از قاب در هر محور؛ صفر یعنی آن محور جای حرکت ندارد
    const overX = box.width * (Math.max(imgAspect / frameAspect, 1) * from.zoom - 1);
    const overY = box.height * (Math.max(frameAspect / imgAspect, 1) * from.zoom - 1);
    onChange({
      ...from,
      x: overX > 1 ? clampPct(from.x - (dx / overX) * 100) : from.x,
      y: overY > 1 ? clampPct(from.y - (dy / overY) * 100) : from.y,
    });
  };

  return (
    <div onClick={stop}>
      <div
        ref={frame}
        className="nl-media nl-crop"
        data-aspect={aspect}
        role="group"
        aria-roledescription="کادر تصویر"
        tabIndex={0}
        aria-label={`جابه‌جایی کادر تصویر با کشیدن یا کلیدهای جهت؛ افقی ${Math.round(crop.x)}٪، عمودی ${Math.round(crop.y)}٪`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, crop };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) move(e.clientX - d.x, e.clientY - d.y, d.crop);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          const delta: Record<string, [number, number]> = {
            // جهت حرکت خود تصویر (مثل کشیدن): تصویر به راست ← نقطه‌ی کانونی به چپ
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const d = delta[e.key];
          if (d) {
            e.preventDefault();
            e.stopPropagation();
            onChange({ ...crop, x: clampPct(crop.x - d[0]), y: clampPct(crop.y - d[1]) });
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onDone();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- فایل روی ذخیره‌ساز بیرونی است */}
        <img src={src} alt="" draggable={false} style={imageCropStyle(aspect, crop) as CSSProperties} />
        <span className="nl-crop-grid" aria-hidden />
      </div>
      <div className="nl-crop-bar">
        <label className="nl-crop-zoom">
          بزرگ‌نمایی
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={crop.zoom}
            aria-label="بزرگ‌نمایی"
            onChange={(e) => onChange({ ...crop, zoom: Number(e.target.value) })}
          />
        </label>
        <span className="nl-ec-spacer" />
        <button type="button" className="nl-ec-btn" onClick={() => onChange(DEFAULT_IMAGE_CROP)}>
          بازنشانی
        </button>
        <button type="button" className="nl-ec-btn nl-ec-btn--active" onClick={onDone}>
          انجام شد
        </button>
      </div>
    </div>
  );
}

/** لینک اختیاری تصویر: تا خالی است فقط دکمه‌ی «افزودن لینک». */
export function ImageLinkRow({ value, onChange, label = 'لینک تصویر' }: { value: string; onChange: (link: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!value && !open) {
    return (
      <button
        type="button"
        className="nl-ec-link"
        onClick={(e) => {
          stop(e);
          setOpen(true);
        }}
      >
        <LinkLucide />
        افزودن لینک به تصویر
      </button>
    );
  }
  return (
    <SourceRow
      label={label}
      placeholder="لینک با کلیک روی تصویر"
      value={value}
      autoFocus={!value}
      normalize={normalizeHttpUrl}
      validate={isHttpUrl}
      openable
      onChange={onChange}
    />
  );
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

/**
 * تصویر یا اسلایدر تصویر درجا (تا MAX_IMAGE_SLIDES): تصویر انتخاب‌شده با کادر، تعویض و حذف؛ نوار بندانگشتی‌ها برای
 * انتخاب، افزودن و جابه‌جایی؛ alt و (در اسلایدر) لینک همان تصویر. تصویر تکی مثل قبل است (alt اجباری، لینک در کارت).
 */
function ImageEditor({
  el,
  assetUrl,
  upload,
  onChange,
}: {
  el: Extract<EditorElement, { kind: 'image' }>;
  assetUrl: (image: ImageRef) => string;
  upload: UploadContext;
  onChange: (settings: EditorElement['settings']) => void;
}) {
  const s = el.settings;
  const slides = imageSlides(s);
  const [active, setActive] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const idx = Math.min(active, Math.max(0, slides.length - 1));
  const current = slides[idx];
  const slider = slides.length > 1;
  const setSlides = (next: ImageSlide[]) => onChange(withImageSlides(s, next));
  const patch = (p: Partial<ImageSlide>) => setSlides(slides.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const fresh = (image: ImageRef, name?: string): ImageSlide => ({ image, alt: altFromFileName(name), link: '', crop: DEFAULT_IMAGE_CROP });
  // تعویض تصویر انتخاب‌شده (یا اولین تصویر) با کادر وسط
  const replace = useImageUpload(upload, (image, name) =>
    current ? patch({ image, alt: current.alt || altFromFileName(name), crop: DEFAULT_IMAGE_CROP }) : setSlides([fresh(image, name)]),
  );
  const add = useImageUpload(upload, (image, name) => {
    setSlides([...slides, fresh(image, name)]);
    setActive(slides.length);
  });
  const remove = () => {
    setSlides(slides.filter((_, i) => i !== idx));
    setActive(Math.max(0, idx - 1));
    setAdjusting(false);
  };
  const move = (to: number) => {
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[idx], next[to]] = [next[to]!, next[idx]!];
    setSlides(next);
    setActive(to);
  };
  const fixed = s.aspect !== 'auto';
  // اسلایدر با نسبت «اصلی»: همه با نسبت تصویر اول (مثل صفحه‌ی منتشرشده)
  const ratio = slider && !fixed ? `${slides[0]!.image.width} / ${slides[0]!.image.height}` : undefined;
  const frame = fixed ? s.aspect : ratio ? 'custom' : 'auto';
  return (
    <div>
      {current && fixed && adjusting ? (
        <CropAdjuster
          key={idx}
          image={current.image}
          aspect={s.aspect}
          crop={current.crop}
          src={assetUrl(current.image)}
          onChange={(crop) => patch({ crop })}
          onDone={() => setAdjusting(false)}
        />
      ) : current ? (
        <div className="nl-media group/media" data-aspect={frame === 'auto' ? undefined : frame} style={ratio ? { aspectRatio: ratio } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element -- فایل روی ذخیره‌ساز بیرونی است */}
          <img src={assetUrl(current.image)} alt={current.alt} style={imageCropStyle(frame, current.crop) as CSSProperties} />
          {slider ? (
            <span className="absolute top-2 end-2 rounded-full bg-black/55 px-2 font-sans text-xs leading-5 text-white">
              {faNum(idx + 1)}/{faNum(slides.length)}
            </span>
          ) : null}
          {fixed ? (
            // همیشه دیده می‌شود (نه فقط با hover) تا روی صفحه‌ی لمسی هم در دسترس باشد
            <button
              type="button"
              className="absolute top-2 start-2 flex h-7 items-center gap-1 rounded-md bg-popover px-2 font-sans text-xs text-popover-foreground shadow-xs ring-1 ring-border hover:bg-muted [&_svg]:size-3.5"
              onClick={(e) => {
                stop(e);
                setAdjusting(true);
              }}
            >
              <CropIcon />
              تنظیم کادر
            </button>
          ) : null}
          <MediaActions>
            <MediaButton onClick={replace.pick}>
              <ImageUpIcon />
              {replace.busy ? 'در حال آپلود…' : 'تعویض'}
            </MediaButton>
            <MediaButton onClick={remove}>
              <Trash2Icon />
              حذف
            </MediaButton>
          </MediaActions>
        </div>
      ) : (
        <button
          type="button"
          className="nl-placeholder nl-slot--block"
          onClick={(e) => {
            stop(e);
            replace.pick();
          }}
        >
          {replace.busy ? (
            'در حال آپلود…'
          ) : (
            <>
              برای بارگذاری تصویر کلیک کنید
              <span dir="ltr" className="mt-1 block text-[11px] opacity-75">
                PNG · JPEG · WebP · GIF — ≤ 5MB
              </span>
            </>
          )}
        </button>
      )}

      {current ? (
        // نوار تصاویر: انتخاب، افزودن تا ۱۰ و جابه‌جایی تصویر انتخاب‌شده
        <div className="mt-2 flex items-center gap-1.5 font-sans">
          <div className={cn('flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-1', hoverNativeScroll)}>
            {slides.map((x, i) => (
              <button
                key={i}
                type="button"
                aria-label={`تصویر ${faNum(i + 1)}`}
                aria-pressed={i === idx}
                onClick={(e) => {
                  stop(e);
                  setActive(i);
                  setAdjusting(false);
                }}
                className="nl-slide-thumb"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- فایل روی ذخیره‌ساز بیرونی است */}
                <img src={assetUrl(x.image)} alt="" />
              </button>
            ))}
            {slides.length < MAX_IMAGE_SLIDES ? (
              <button
                type="button"
                className="nl-slide-thumb nl-slide-thumb--add"
                aria-label="افزودن تصویر به اسلایدر"
                title={slider ? 'افزودن تصویر' : 'افزودن تصویر (اسلایدر)'}
                onClick={(e) => {
                  stop(e);
                  add.pick();
                }}
              >
                {add.busy ? '…' : <PlusIcon />}
              </button>
            ) : null}
          </div>
          {slider ? (
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="nl-ec-btn"
                title="جابه‌جایی به قبل"
                aria-label="جابه‌جایی به قبل"
                aria-disabled={idx === 0}
                onClick={(e) => {
                  stop(e);
                  move(idx - 1);
                }}
              >
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                className="nl-ec-btn"
                title="جابه‌جایی به بعد"
                aria-label="جابه‌جایی به بعد"
                aria-disabled={idx === slides.length - 1}
                onClick={(e) => {
                  stop(e);
                  move(idx + 1);
                }}
              >
                <ChevronLeftIcon />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <InlineText
        key={`alt-${idx}`}
        className="nl-caption"
        label={slider ? 'توضیح این تصویر (alt، اختیاری)' : 'توضیح تصویر (alt، اختیاری)'}
        value={current?.alt ?? s.alt}
        maxLength={200}
        placeholder={slider ? 'توضیح این تصویر (اختیاری)…' : 'توضیح کوتاه تصویر (اختیاری)…'}
        onChange={(alt) => (current ? patch({ alt }) : onChange({ ...s, alt }))}
      />
      {slider && current ? (
        <div className="mt-2">
          <ImageLinkRow key={`link-${idx}`} label="لینک این تصویر" value={current.link} onChange={(link) => patch({ link })} />
        </div>
      ) : null}
      {replace.error || add.error ? <p className="mt-1 text-center font-sans text-xs text-destructive">{replace.error ?? add.error}</p> : null}
      {replace.input}
      {add.input}
    </div>
  );
}

/** پروفایل درجا: کلیک روی تصویر برای آپلود، نام و بیو روی خود صفحه. */
export function ProfileEditor({
  content,
  assetUrl,
  upload,
  onChange,
}: {
  content: PageContent;
  assetUrl: (image: ImageRef) => string;
  upload: UploadContext;
  onChange: (c: PageContent) => void;
}) {
  const p = content.profile;
  const set = (patch: Partial<PageContent['profile']>) => onChange({ ...content, profile: { ...p, ...patch } });
  const up = useImageUpload(upload, (avatar) => set({ avatar }), 'avatar');
  return (
    <header className={`nl-profile nl-profile--${p.layout}`}>
      <button
        type="button"
        className="nl-avatar nl-slot group/media relative"
        aria-label="تصویر پروفایل"
        title="تعویض تصویر پروفایل"
        onClick={(e) => {
          stop(e);
          up.pick();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- فایل روی ذخیره‌ساز بیرونی است */}
        {p.avatar ? <img src={assetUrl(p.avatar)} alt="" /> : p.name.trim().charAt(0) || null}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover/media:opacity-100 [&_svg]:size-6">
          {up.busy ? '…' : <CameraIcon />}
        </span>
      </button>
      <div className="nl-profile-text">
        <h1 className="nl-name">
          <InlineText label="نام" value={p.name} maxLength={80} placeholder="نام شما" onChange={(name) => set({ name })} />
        </h1>
        <p className="nl-bio">
          <InlineText multiline label="بیو" value={p.bio} maxLength={300} placeholder="بیو (اختیاری)" onChange={(bio) => set({ bio })} />
        </p>
      </div>
      {up.error ? <p className="font-sans text-xs text-destructive">{up.error}</p> : null}
      {up.input}
    </header>
  );
}

/** متن کلیپ‌بورد (بی‌صدا null اگر مرورگر اجازه نداد). */
async function readClipboard(): Promise<string | null> {
  try {
    return (await navigator.clipboard.readText()).trim() || null;
  } catch {
    return null;
  }
}

/**
 * ردیف «منبع» در کارت ویرایش: نشانی لینک/ویدیو/نقشه. ورودی هوشمند: هنگام چسباندن و خروج از فیلد نرمال
 * می‌شود (بدون https هم پذیرفته است)، دکمه‌ی «چسباندن» وقتی خالی است، Enter ثبت می‌کند و وضعیت فقط بعد از
 * خروج از فیلد نشان داده می‌شود تا هنگام تایپ خطا نبیند. اگر کارت با فیلد فوکوس‌دار بسته شود (Escape، انتخاب
 * المان دیگر) React برای عنصر حذف‌شده blur نمی‌فرستد؛ پس تایپ ثبت‌نشده هنگام unmount ثبت می‌شود.
 */
export function SourceRow({
  value,
  onChange,
  onCommit,
  normalize = (v) => v.trim(),
  validate,
  placeholder,
  label,
  status,
  autoFocus,
  openable,
}: {
  value: string;
  onChange: (v: string) => void;
  /** مقدار نرمال‌شده هنگام چسباندن/خروج/Enter؛ بدون آن همان onChange صدا زده می‌شود. */
  onCommit?: (v: string) => void;
  normalize?: (v: string) => string;
  /** معتبربودن مقدار نرمال‌شده (برای وضعیت «معتبر / کامل نیست»). */
  validate?: (v: string) => boolean;
  placeholder: string;
  label: string;
  /** ok: true معتبر، false خطا، null در انتظار (خنثی). */
  status?: { ok: boolean | null; text: string } | null;
  autoFocus?: boolean;
  /** دکمه‌ی «آزمایش لینک» (باز کردن در تب جدید) وقتی مقدار معتبر است. */
  openable?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  // تایپ از آخرین ثبت؛ و آخرین props برای ثبت هنگام unmount
  const dirty = useRef(false);
  const latest = useRef({ value, normalize, onChange, onCommit });
  useEffect(() => {
    latest.current = { value, normalize, onChange, onCommit };
  });
  useEffect(
    () => () => {
      if (!dirty.current) return;
      const { value: raw, normalize: norm, onChange: change, onCommit: done } = latest.current;
      const v = norm(raw);
      if (done) done(v);
      else if (v !== raw) change(v);
    },
    [],
  );
  const commit = (raw: string) => {
    const v = normalize(raw);
    dirty.current = false;
    setTouched(true);
    if (onCommit) onCommit(v);
    else if (v !== value) onChange(v);
  };
  const shown =
    status !== undefined
      ? status
      : validate && value && touched
        ? validate(normalize(value))
          ? { ok: true, text: 'معتبر' }
          : { ok: false, text: 'کامل نیست' }
        : null;
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg bg-card px-2.5 ring-1 ring-input focus-within:ring-2 focus-within:ring-ring">
      <LinkLucide className="size-4 shrink-0 text-muted-foreground" />
      <input
        aria-label={label}
        aria-invalid={shown?.ok === false ? true : undefined}
        className={cn('min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground', ltr)}
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onClick={stop}
        onChange={(e) => {
          dirty.current = true;
          setTouched(false);
          onChange(e.target.value);
        }}
        onBlur={(e) => commit(e.target.value)}
        onPaste={(e) => {
          const el = e.currentTarget;
          const replacesAll = !el.value || (el.selectionStart === 0 && el.selectionEnd === el.value.length);
          const text = e.clipboardData.getData('text/plain');
          if (!replacesAll || !text.trim()) return;
          e.preventDefault();
          commit(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {!value ? (
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
          title="چسباندن از کلیپ‌بورد"
          onClick={async (e) => {
            stop(e);
            e.preventDefault();
            const text = await readClipboard();
            if (text) commit(text);
          }}
        >
          <ClipboardPasteIcon />
          چسباندن
        </button>
      ) : shown ? (
        <span
          aria-live="polite"
          className={cn(
            'flex shrink-0 items-center gap-1 text-[11px]',
            shown.ok === true ? 'text-foreground' : shown.ok === false ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {shown.ok === true ? <CheckIcon className="size-3.5" /> : shown.ok === false ? <AlertCircleIcon className="size-3.5" /> : null}
          {shown.text}
        </span>
      ) : null}
      {openable && value && (!validate || validate(normalize(value))) ? (
        <a
          href={normalize(value)}
          target="_blank"
          rel="noopener noreferrer"
          title="آزمایش لینک در تب جدید"
          aria-label="آزمایش لینک در تب جدید"
          className="flex shrink-0 items-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
          onClick={stop}
        >
          <ExternalLinkIcon />
        </a>
      ) : null}
    </label>
  );
}
