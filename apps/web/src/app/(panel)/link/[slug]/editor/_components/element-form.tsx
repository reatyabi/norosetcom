'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardPasteIcon,
  CropIcon,
  ExternalLinkIcon,
  ImageUpIcon,
  PaletteIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PanelTopIcon,
  PlusIcon,
  RotateCcwIcon,
  SmileIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  NativeSelectOption,
  Segmented,
  Switch,
  Textarea,
} from '@noroset/ui';
import {
  applySocialInput,
  DEFAULT_IMAGE_CROP,
  imageCropStyle,
  imageSlides,
  isHttpUrl,
  isValidSocialValue,
  LinkIcon,
  MAX_IMAGE_SLIDES,
  normalizeEmbedSource,
  normalizeHttpUrl,
  normalizeSocialValue,
  parseVideoUrl,
  SOCIAL_COLORS,
  SOCIAL_LABELS,
  SOCIAL_PLATFORMS,
  withImageSlides,
  type ImageRef,
  type ImageSlide,
  type LinkButtonSettings,
  type MapEmbedSettings,
  type PageContent,
  type SocialIconsSettings,
  type SocialPlatform,
  type VideoEmbedSettings,
} from '@noroset/norolink/ui';
import { hoverNativeScroll } from '@/components/editor-ui';
import { applyLinkUrl, type EditorElement } from '../../../links-shared';
import { Field, IconGrid, ltr, useImageUpload, type UploadContext } from './fields';
import { altFromFileName, CropAdjuster, socialPlaceholder } from './inline';
import { RichEditor } from './rich-editor';
import { useUndo } from './undo';

/* ─── فرم دکمه‌ی لینک ─── */

function LinkButtonForm({
  s,
  visible,
  onToggleVisible,
  onChange,
  upload,
  assetUrl,
  lucideIcon,
}: {
  s: LinkButtonSettings;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: LinkButtonSettings) => void;
  upload: UploadContext;
  assetUrl: (image: ImageRef) => string;
  lucideIcon?: (name: string) => ReactNode;
}) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const isValidUrl = s.url ? isHttpUrl(normalizeHttpUrl(s.url)) : false;

  const handlePaste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        onChange(applyLinkUrl(s, text));
      }
    } catch {
      // مرورگر اجازه دسترسی نداد
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {/* سطر اول: فیلد نشانی لینک و پیست */}
      <div className="flex items-center gap-1.5">
        <Input
          dir="ltr"
          inputMode="url"
          className="h-9 flex-1 text-xs"
          value={s.url}
          placeholder="نشانی لینک (https://...)"
          onChange={(e) => onChange({ ...s, url: e.target.value })}
          onBlur={() => {
            if (s.url) onChange(applyLinkUrl(s, s.url));
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text/plain').trim();
            if (text) {
              e.preventDefault();
              onChange(applyLinkUrl(s, text));
            }
          }}
        />
        {!s.url ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1 px-2.5 text-xs text-muted-foreground"
            title="چسباندن از کلیپ‌بورد"
            onClick={handlePaste}
          >
            <ClipboardPasteIcon className="size-3.5" />
            <span>چسباندن</span>
          </Button>
        ) : null}
        {isValidUrl ? (
          <a
            href={normalizeHttpUrl(s.url)}
            target="_blank"
            rel="noopener noreferrer"
            title="آزمایش لینک در تب جدید"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
        ) : null}
      </div>

      {/* سطر دوم: متن عنوان لینک */}
      <Input
        className="h-9 w-full text-xs"
        value={s.label}
        maxLength={80}
        placeholder="متن عنوان لینک"
        onChange={(e) => onChange({ ...s, label: e.target.value })}
      />

      {/* سطر سوم: آیکون و رنگ در یک سطر جدا بعد از متن لینک همراه با نوشته */}
      <div className="flex h-9 items-center justify-between gap-3 rounded-xl border border-input bg-card px-3">
        {/* بخش آیکون دکمه همراه با نوشته */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            title={s.icon ? 'تغییر آیکون' : 'انتخاب آیکون'}
            aria-label="انتخاب آیکون"
            className="flex size-6.5 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/50 text-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted [&_svg]:size-3.5"
          >
            {s.icon?.kind === 'preset' ? (
              <LinkIcon name={s.icon.value} />
            ) : s.icon?.kind === 'lucide' ? (
              lucideIcon?.(s.icon.value) ?? <PlusIcon className="size-3 text-muted-foreground" />
            ) : s.icon?.kind === 'upload' ? (
              <img src={assetUrl(s.icon.image)} alt="" className="size-full rounded-md object-cover" />
            ) : (
              <PlusIcon className="size-3 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="text-xs text-foreground/80 transition-colors hover:text-foreground select-none"
          >
            {s.icon ? 'تغییر آیکون' : 'انتخاب آیکون'}
          </button>
          {s.icon ? (
            <button
              type="button"
              title="حذف آیکون"
              aria-label="حذف آیکون"
              onClick={() => onChange({ ...s, icon: null })}
              className="flex size-6 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2Icon className="size-3" />
            </button>
          ) : null}
        </div>

        <div className="h-4 w-px bg-border/70" />

        {/* بخش رنگ دکمه همراه با نوشته */}
        <div className="flex items-center gap-2">
          <label
            className="relative flex size-5.5 cursor-pointer items-center justify-center rounded-full border border-input shadow-xs transition-transform hover:scale-110"
            title={s.style.bg_color ? `رنگ دکمه: ${s.style.bg_color}` : 'انتخاب رنگ دکمه'}
            aria-label="انتخاب رنگ دکمه"
            style={{ backgroundColor: s.style.bg_color ?? 'transparent' }}
          >
            <input
              type="color"
              aria-label="رنگ دکمه"
              className="sr-only"
              value={s.style.bg_color ?? '#111111'}
              onChange={(e) => onChange({ ...s, style: { bg_color: e.target.value } })}
            />
            {!s.style.bg_color ? <PaletteIcon className="size-3 text-muted-foreground" /> : null}
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...s, style: { bg_color: s.style.bg_color ? null : '#111111' } })}
            className="text-xs text-foreground/80 transition-colors hover:text-foreground select-none"
          >
            {s.style.bg_color ? 'رنگ قالب' : 'پیش‌فرض تم'}
          </button>
          {s.style.bg_color ? (
            <button
              type="button"
              title="بازنشانی رنگ به پیش‌فرض تم"
              aria-label="بازنشانی رنگ"
              onClick={() => onChange({ ...s, style: { bg_color: null } })}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcwIcon className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* سطر چهارم: تاگل‌ها همه در یک سطر */}
      <div className="flex h-9 items-center justify-between gap-1.5 rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
        <div className="h-4 w-px bg-border/60" />
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch
            checked={s.open_in_new_tab}
            onCheckedChange={(v) => onChange({ ...s, open_in_new_tab: v })}
          />
          <span className="text-[11px] font-medium text-foreground">تب جدید</span>
        </label>
        <div className="h-4 w-px bg-border/60" />
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch
            checked={s.track_clicks}
            onCheckedChange={(v) => onChange({ ...s, track_clicks: v })}
          />
          <span className="text-[11px] font-medium text-foreground">شمارش کلیک</span>
        </label>
      </div>

      {/* دیالوگ جداگانه انتخاب آیکون بدون تغییر ارتفاع یا بازشو درون دراور */}
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <DialogContent className="max-w-sm p-4" dir="rtl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-sm font-semibold">انتخاب آیکون دکمه</DialogTitle>
          </DialogHeader>
          <IconGrid
            value={s.icon}
            onChange={(icon) => {
              onChange({ ...s, icon });
              setIconPickerOpen(false);
            }}
            upload={upload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── فرم شبکه‌های اجتماعی (تب‌بندی شده مشابه این‌لاین ادیت) ─── */

function SocialIconsForm({
  s,
  visible,
  onToggleVisible,
  onChange,
}: {
  s: SocialIconsSettings;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: SocialIconsSettings) => void;
}) {
  const showUndo = useUndo();
  const [activeTab, setActiveTab] = useState(0);
  const used = new Set(s.items.map((i) => i.platform));
  const idx = Math.min(activeTab, Math.max(0, s.items.length - 1));
  const current = s.items[idx];

  const setItem = (k: number, patch: Partial<(typeof s.items)[number]>) =>
    onChange({ items: s.items.map((it, j) => (j === k ? { ...it, ...patch } : it)) });

  const removeItem = (k: number) => {
    const before = s.items;
    const removed = s.items[k];
    onChange({ items: before.filter((_, j) => j !== k) });
    setActiveTab(Math.max(0, k - 1));
    if (removed) {
      showUndo(`${SOCIAL_LABELS[removed.platform]} حذف شد`, () => onChange({ items: before }));
    }
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= s.items.length) return;
    const items = [...s.items];
    const [moved] = items.splice(from, 1);
    if (moved) items.splice(to, 0, moved);
    onChange({ items });
    setActiveTab(to);
  };

  const addItem = () => {
    if (s.items.length >= 12) return;
    const platform = SOCIAL_PLATFORMS.find((p) => !used.has(p)) ?? 'website';
    onChange({ items: [...s.items, { platform, value: '' }] });
    setActiveTab(s.items.length);
  };

  const applyItem = (k: number, raw: string) => {
    const cur = s.items[k];
    if (!cur) return;
    const taken = s.items.filter((_, j) => j !== k).map((it) => it.platform);
    setItem(k, applySocialInput(cur.platform, raw, { taken, pinned: true }));
  };

  const handlePaste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && current) {
        applyItem(idx, text);
      }
    } catch {
      // مرورگر اجازه دسترسی نداد
    }
  };

  const isValid = current?.value
    ? isValidSocialValue(current.platform, normalizeSocialValue(current.platform, current.value))
    : true;

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {/* سطر اول: تب‌های شبکه‌های اجتماعی (مشابه دکمه‌های گرد این‌لاین ادیت) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {s.items.map((it, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActiveTab(k)}
            className={cn(
              'group relative flex shrink-0 flex-col items-center gap-1 rounded-xl p-0.5 transition-[color,background-color,border-color,box-shadow,opacity,transform] outline-none',
              idx === k ? 'scale-105' : 'opacity-70 hover:opacity-100',
            )}
            title={SOCIAL_LABELS[it.platform]}
          >
            <div
              className={cn(
                'relative flex size-9 items-center justify-center rounded-full text-white shadow-xs transition-[color,background-color,border-color,box-shadow,opacity,transform] [&_svg]:size-4.5',
                idx === k ? 'ring-2 ring-primary ring-offset-2 ring-offset-popover shadow-md' : '',
                !it.value && 'opacity-40',
              )}
              style={{ background: SOCIAL_COLORS[it.platform] }}
            >
              <LinkIcon name={it.platform} />
              {it.value && !isValidSocialValue(it.platform, normalizeSocialValue(it.platform, it.value)) ? (
                <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-destructive ring-1 ring-popover" />
              ) : null}
            </div>
            <span className="max-w-11 truncate text-center text-[10px] font-medium text-foreground">
              {SOCIAL_LABELS[it.platform]}
            </span>
          </button>
        ))}

        {s.items.length < 12 ? (
          <button
            type="button"
            onClick={addItem}
            className="group flex shrink-0 flex-col items-center gap-1 rounded-xl p-0.5 opacity-70 transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:opacity-100 outline-none"
            title="افزودن شبکه جدید"
          >
            <div className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary [&_svg]:size-4">
              <PlusIcon />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">افزودن</span>
          </button>
        ) : null}
      </div>

      {current ? (
        <>
          {/* سطر دوم: انتخاب نوع شبکه، دکمه‌های جابه‌جایی و حذف */}
          <div className="flex h-9 items-center gap-2">
            <NativeSelect
              aria-label="نوع شبکه"
              className="h-9 flex-1 text-xs"
              value={current.platform}
              onChange={(e) => {
                const platform = e.target.value as SocialPlatform;
                setItem(idx, { platform, value: normalizeSocialValue(platform, current.value) });
              }}
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <NativeSelectOption key={p} value={p} disabled={p !== current.platform && used.has(p)}>
                  {SOCIAL_LABELS[p]}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 text-muted-foreground"
                title="انتقال به راست"
                disabled={idx === 0}
                onClick={() => moveItem(idx, idx - 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 text-muted-foreground"
                title="انتقال به چپ"
                disabled={idx === s.items.length - 1}
                onClick={() => moveItem(idx, idx + 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="حذف شبکه"
                onClick={() => removeItem(idx)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>

          {/* سطر سوم: ورودی نشانی یا نام‌کاربری */}
          <div className="flex items-center gap-1.5">
            <Input
              className={cn('h-9 flex-1 text-xs', ltr)}
              dir="ltr"
              placeholder={socialPlaceholder(current.platform)}
              value={current.value}
              maxLength={2048}
              onChange={(e) => applyItem(idx, e.target.value)}
              onBlur={() => setItem(idx, { value: normalizeSocialValue(current.platform, current.value) })}
            />
            {!current.value ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1 px-2.5 text-xs text-muted-foreground"
                title="چسباندن از کلیپ‌بورد"
                onClick={handlePaste}
              >
                <ClipboardPasteIcon className="size-3.5" />
                <span>چسباندن</span>
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex h-20 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
          <span className="text-xs text-muted-foreground">شبکه‌ای اضافه نشده است</span>
          <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 gap-1.5 text-xs">
            <PlusIcon className="size-3.5" />
            افزودن اولین شبکه
          </Button>
        </div>
      )}

      {/* سطر چهارم: تاگل نمایش */}
      <div className="flex h-9 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
        {current?.value && !isValid ? (
          <span className="text-[11px] text-destructive">
            مقدار کامل نیست؛ {socialPlaceholder(current.platform)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ─── فرم متن (Rich Text) ─── */

function RichTextForm({
  s,
  visible,
  onToggleVisible,
  onChange,
}: {
  s: { doc: any };
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: { doc: any }) => void;
}) {
  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      <div className="rounded-xl border border-input bg-card p-3 shadow-xs focus-within:ring-1 focus-within:ring-primary">
        <RichEditor
          doc={s.doc}
          autoFocus={true}
          onChange={(doc) => onChange({ doc })}
          editorClassName="min-h-[160px] max-h-[300px] overflow-y-auto"
        />
      </div>

      <div className="flex h-9 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
      </div>
    </div>
  );
}

/* ─── فرم تصویر ─── */

function ImageForm({
  s,
  visible,
  onToggleVisible,
  onChange,
  upload,
  assetUrl,
}: {
  s: Extract<EditorElement, { kind: 'image' }>['settings'];
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: EditorElement['settings']) => void;
  upload: UploadContext;
  assetUrl: (image: ImageRef) => string;
}) {
  const slides = imageSlides(s);
  const [active, setActive] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const idx = Math.min(active, Math.max(0, slides.length - 1));
  const current = slides[idx];
  const setSlides = (next: ImageSlide[]) => onChange(withImageSlides(s, next));
  const patch = (p: Partial<ImageSlide>) => setSlides(slides.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const fresh = (image: ImageRef, name?: string): ImageSlide => ({ image, alt: altFromFileName(name), link: '', crop: DEFAULT_IMAGE_CROP });

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

  if (current && fixed && adjusting) {
    return (
      <div className="flex flex-col gap-3 font-sans text-xs">
        <CropAdjuster
          key={idx}
          image={current.image}
          aspect={s.aspect}
          crop={current.crop}
          src={assetUrl(current.image)}
          onChange={(crop) => patch({ crop })}
          onDone={() => setAdjusting(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      {/* پیش‌نمایش تصویر و اکشن‌های آن */}
      {current ? (
        <div className="flex flex-col gap-2.5">
          <div className="relative overflow-hidden rounded-xl border border-input bg-card shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(current.image)}
              alt={current.alt}
              className="max-h-56 w-full object-cover"
              style={imageCropStyle(fixed ? s.aspect : 'auto', current.crop)}
            />
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 p-2">
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={replace.pick} disabled={replace.busy}>
                  <ImageUpIcon className="size-3.5" />
                  {replace.busy ? 'در حال آپلود…' : 'تعویض'}
                </Button>
                {fixed ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdjusting(true)}>
                    <CropIcon className="size-3.5" />
                    تنظیم کادر
                  </Button>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}>
                <Trash2Icon className="size-3.5" />
                حذف
              </Button>
            </div>
          </div>

          {/* نوار تصاویر اسلایدر */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            {slides.map((x, i) => (
              <button
                key={i}
                type="button"
                aria-label={`تصویر ${i + 1}`}
                aria-pressed={i === idx}
                onClick={() => {
                  setActive(i);
                  setAdjusting(false);
                }}
                className={cn(
                  'relative size-12 shrink-0 overflow-hidden rounded-lg border-2 transition-[color,background-color,border-color,box-shadow,opacity,transform]',
                  i === idx ? 'border-primary shadow-sm' : 'border-border/80 opacity-70 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(x.image)} alt="" className="size-full object-cover" />
              </button>
            ))}
            {slides.length < MAX_IMAGE_SLIDES ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="size-12 shrink-0 border-dashed"
                title="افزودن تصویر (اسلایدر)"
                onClick={add.pick}
                disabled={add.busy}
              >
                {add.busy ? '…' : <PlusIcon className="size-4" />}
              </Button>
            ) : null}
            {slides.length > 1 ? (
              <div className="ms-auto flex items-center gap-1">
                <button
                  type="button"
                  title="انتقال به قبل"
                  disabled={idx === 0}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  onClick={() => move(idx - 1)}
                >
                  <ChevronRightIcon className="size-4" />
                </button>
                <button
                  type="button"
                  title="انتقال به بعد"
                  disabled={idx === slides.length - 1}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  onClick={() => move(idx + 1)}
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input p-6 text-center transition-colors hover:bg-muted/40"
          onClick={replace.pick}
          disabled={replace.busy}
        >
          <ImageUpIcon className="size-8 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {replace.busy ? 'در حال بارگذاری تصویر…' : 'برای بارگذاری تصویر کلیک کنید'}
          </span>
          <span dir="ltr" className="text-[11px] text-muted-foreground">
            PNG · JPEG · WebP · GIF — حداکثر ۵ مگابایت
          </span>
        </button>
      )}

      {current ? (
        <>
          <Field label={slides.length > 1 ? `توضیح این تصویر (${idx + 1}) - Alt (اختیاری)` : 'توضیح تصویر - Alt (اختیاری)'}>
            <Input
              value={current.alt}
              maxLength={200}
              placeholder="توضیح کوتاه تصویر (اختیاری)…"
              onChange={(e) => patch({ alt: e.target.value })}
            />
          </Field>

          <Field label={slides.length > 1 ? `لینک این تصویر (${idx + 1})` : 'لینک با کلیک روی تصویر (اختیاری)'}>
            <Input
              dir="ltr"
              inputMode="url"
              value={current.link}
              placeholder="https://example.com"
              onChange={(e) => patch({ link: e.target.value.trim() })}
            />
          </Field>
        </>
      ) : null}

      <Field label="نسبت ابعاد تصویر">
        <Segmented
          value={s.aspect}
          onChange={(aspect) => onChange({ ...s, aspect })}
          items={[
            { value: 'auto', label: 'اصلی' },
            { value: '1:1', label: '۱:۱' },
            { value: '4:3', label: '۴:۳' },
            { value: '16:9', label: '۱۶:۹' },
          ]}
        />
      </Field>

      <div className="flex h-9 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
      </div>

      {replace.error || add.error ? (
        <p className="text-center text-xs text-destructive">{replace.error ?? add.error}</p>
      ) : null}
      {replace.input}
      {add.input}
    </div>
  );
}

/* ─── فرم ویدیو ─── */

function VideoEmbedForm({
  s,
  visible,
  onToggleVisible,
  onChange,
}: {
  s: VideoEmbedSettings;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: VideoEmbedSettings) => void;
}) {
  const parsed = s.video ?? (s.source_url ? parseVideoUrl(normalizeHttpUrl(s.source_url)) : null);
  const providerLabel = parsed ? { aparat: 'آپارات', youtube: 'یوتیوب', vimeo: 'ویمیو' }[parsed.provider] : null;

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      <Field label="نشانی لینک ویدیو" hint="از آپارات (aparat.com)، یوتیوب (youtube.com) یا ویمیو (vimeo.com) پشتیبانی می‌شود.">
        <Input
          dir="ltr"
          inputMode="url"
          value={s.source_url}
          placeholder="https://www.aparat.com/v/... یا یوتیوب"
          onChange={(e) => onChange({ ...s, source_url: e.target.value })}
        />
      </Field>

      {parsed ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs text-success dark:text-success">
          <CheckIcon className="size-4 shrink-0" />
          <span>ویدیو با موفقیت شناسایی شد ({providerLabel})</span>
        </div>
      ) : s.source_url.trim() ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>لینک ویدیو معتبر نیست؛ لطفاً نشانی ویدیوی آپارات، یوتیوب یا ویمیو را وارد کنید.</span>
        </div>
      ) : null}

      <div className="flex h-9 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
      </div>
    </div>
  );
}

/* ─── فرم نقشه ─── */

function MapEmbedForm({
  s,
  visible,
  onToggleVisible,
  onChange,
}: {
  s: MapEmbedSettings;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (s: MapEmbedSettings) => void;
}) {
  const providerLabel = s.location ? { google: 'گوگل‌مپ', neshan: 'نشان', balad: 'بلد' }[s.location.provider] : null;

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      <Field label="عنوان نقشه (اختیاری)">
        <Input
          value={s.label}
          maxLength={100}
          placeholder="مثلاً دفتر مرکزی، فروشگاه شماره ۱"
          onChange={(e) => onChange({ ...s, label: e.target.value })}
        />
      </Field>

      <Field
        label="لینک یا کد مکان"
        hint="در گوگل‌مپ، نشان یا بلد روی مکان بزنید، «اشتراک‌گذاری» را انتخاب و لینک یا کد iframe را کپی کنید."
      >
        <Input
          dir="ltr"
          value={s.source_url}
          placeholder="لینک مکان یا کد iframe"
          onChange={(e) => onChange({ ...s, source_url: normalizeEmbedSource(e.target.value) })}
        />
      </Field>

      {s.location ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-xs text-success dark:text-success">
          <CheckIcon className="size-4 shrink-0" />
          <span>مکان با موفقیت شناسایی شد ({providerLabel})</span>
        </div>
      ) : s.source_url.trim() ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>مکانی در این لینک پیدا نشد.</span>
        </div>
      ) : null}

      <Field label="ارتفاع کادر نقشه">
        <Segmented
          value={s.height}
          onChange={(height) => onChange({ ...s, height })}
          items={[
            { value: 'sm', label: 'کم' },
            { value: 'md', label: 'متوسط' },
            { value: 'lg', label: 'زیاد' },
          ]}
        />
      </Field>

      <div className="flex h-9 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch checked={visible} onCheckedChange={onToggleVisible} />
          <span className="text-[11px] font-medium text-foreground">نمایش</span>
        </label>
      </div>
    </div>
  );
}

/* ─── کامپوننت مادر فرم المان ─── */

export function ElementForm({
  el,
  upload,
  assetUrl,
  lucideIcon,
  onChange,
  onToggleVisible,
}: {
  el: EditorElement;
  upload: UploadContext;
  assetUrl: (image: ImageRef) => string;
  lucideIcon?: (name: string) => ReactNode;
  onChange: (settings: EditorElement['settings']) => void;
  onToggleVisible: () => void;
}) {
  switch (el.kind) {
    case 'link_button':
      return (
        <LinkButtonForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
          upload={upload}
          assetUrl={assetUrl}
          lucideIcon={lucideIcon}
        />
      );
    case 'social_icons':
      return (
        <SocialIconsForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
        />
      );
    case 'rich_text':
      return (
        <RichTextForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
        />
      );
    case 'image':
      return (
        <ImageForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
          upload={upload}
          assetUrl={assetUrl}
        />
      );
    case 'video_embed':
      return (
        <VideoEmbedForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
        />
      );
    case 'map_embed':
      return (
        <MapEmbedForm
          s={el.settings}
          visible={el.visible}
          onToggleVisible={onToggleVisible}
          onChange={onChange}
        />
      );
  }
}

/* ─── فرم پروفایل ─── */

const PROFILE_LAYOUT_OPTIONS = [
  { value: 'side_right', label: 'افقی (راست)', icon: PanelRightIcon },
  { value: 'side_left', label: 'افقی (چپ)', icon: PanelLeftIcon },
  { value: 'stacked', label: 'عمودی (وسط چین)', icon: PanelTopIcon },
] as const;

export function ProfileForm({
  profile,
  upload,
  assetUrl,
  onChange,
}: {
  profile: PageContent['profile'];
  upload: UploadContext;
  assetUrl: (image: ImageRef) => string;
  onChange: (profile: PageContent['profile']) => void;
}) {
  const up = useImageUpload(upload, (avatar) => onChange({ ...profile, avatar }), 'avatar');

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {/* سطر بالا: تعویض تصویر آواتار در راست، و گروه دکمه و متن چیدمان در چپ */}
      <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-border/60 bg-muted/20 p-2">
        {/* بخش تعویض تصویر آواتار (سمت راست در RTL) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={up.pick}
            disabled={up.busy}
            className="group/avatar relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-muted/40 font-bold text-foreground shadow-xs transition-transform active:scale-95"
            title="تعویض تصویر آواتار"
            aria-label="تعویض تصویر آواتار"
          >
            {profile.avatar ? (
              <img src={assetUrl(profile.avatar)} alt="" className="size-full object-cover" />
            ) : profile.name.trim() ? (
              <span className="text-sm">{profile.name.trim().charAt(0)}</span>
            ) : (
              <UserIcon className="size-4.5 text-muted-foreground" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover/avatar:opacity-100">
              <CameraIcon className="size-3.5" />
            </span>
          </button>
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-6.5 gap-1 px-2 text-[11px]"
              onClick={up.pick}
              disabled={up.busy}
            >
              <CameraIcon className="size-3" />
              <span>{up.busy ? 'در حال آپلود…' : profile.avatar ? 'تغییر تصویر' : 'افزودن تصویر'}</span>
            </Button>
            {profile.avatar ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4.5 justify-start px-1 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange({ ...profile, avatar: null })}
              >
                حذف تصویر
              </Button>
            ) : null}
          </div>
        </div>

        {/* گروه دکمه و متن چیدمان (سمت چپ در RTL) */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="self-start text-[10px] font-medium text-muted-foreground">چیدمان</span>
          <div
            role="group"
            aria-label="چیدمان بخش پروفایل"
            className="flex flex-col gap-0.5 rounded-xl border border-border/50 bg-muted/60 p-0.5"
          >
            {PROFILE_LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = profile.layout === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...profile, layout: value })}
                  aria-pressed={active}
                  className={cn(
                    'flex h-5.5 items-center gap-1.5 rounded-lg px-2 text-[10.5px] font-medium transition-colors duration-150',
                    active
                      ? 'bg-card text-foreground shadow-xs font-semibold ring-1 ring-border/50'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {up.error ? <p className="text-xs text-destructive">{up.error}</p> : null}
      {up.input}

      <Field label="نام پروفایل / عنوان صفحه">
        <Input
          value={profile.name}
          maxLength={80}
          className="h-8 text-xs"
          placeholder="نام شما، نام برند یا عنوان صفحه"
          onChange={(e) => onChange({ ...profile, name: e.target.value })}
        />
      </Field>

      <Field label="بیوگرافی (توضیح کوتاه)">
        <Textarea
          value={profile.bio}
          maxLength={300}
          rows={2}
          className="min-h-[46px] max-h-[72px] text-xs py-1.5 leading-relaxed"
          placeholder="معرفی کوتاه، زمینه فعالیت یا شعار (اختیاری)"
          onChange={(e) => onChange({ ...profile, bio: e.target.value })}
        />
      </Field>
    </div>
  );
}
