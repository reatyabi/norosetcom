import { BALAD_TOKEN, GOOGLE_PB } from './embeds';
import { z } from 'zod';
import { HEX_COLOR } from './contrast';
import { imageRefSchema, type ImageRef } from './assets';
import { isEmptyDoc, richDocSchema } from './rich-text';
import { isBlockedUrl, isHttpUrl, normalizeEmbedSource, normalizeHttpUrl, normalizeSocialValue } from './links';
import { ICON_PRESETS, isValidSocialValue, SOCIAL_PLATFORMS } from './social';

// المان‌های صفحه‌ی لینک (docs/architecture.md §9.2). settings پیش‌نویس می‌تواند ناقص باشد
// (مثلاً لینک خالی)؛ کامل‌بودن هنگام انتشار با elementIssues بررسی می‌شود.

export const ELEMENT_KINDS = ['link_button', 'social_icons', 'rich_text', 'image', 'video_embed', 'map_embed'] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

export const ELEMENT_LABELS: Record<ElementKind, string> = {
  link_button: 'دکمه‌ی لینک',
  social_icons: 'شبکه‌های اجتماعی',
  rich_text: 'متن',
  image: 'تصویر',
  video_embed: 'ویدیو',
  map_embed: 'نقشه',
};

// لینک پیش‌نویس هر متنی می‌تواند باشد تا یک لینک ناقص بقیه‌ی تغییرات المان را از ذخیره بازندارد؛
// سرور هر چه قابل اصلاح است نرمال می‌کند (بدون https، @شناسه) و لینک نامعتبر فقط مانع انتشار است.
/**
 * نام آیکون Lucide به همان شکل کلید مجموعه‌ی `icons` در lucide-react (PascalCase، مثل `Coffee`، `ArrowUpRight`،
 * `Grid2x2`) تا بدون تبدیل پیدا شود. نسخه‌ی lucide pin است؛ نام حذف‌شده در ارتقای بعدی ← جای خالی در رندر.
 */
export const LUCIDE_NAME = /^[A-Z][A-Za-z0-9]*$/;

const optionalUrl = z.string().trim().max(2048).transform(normalizeHttpUrl);

export const linkButtonSchema = z
  .object({
    label: z.string().trim().max(80),
    url: optionalUrl,
    icon: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('preset'), value: z.enum(ICON_PRESETS) }).strict(),
        z.object({ kind: z.literal('upload'), image: imageRefSchema }).strict(),
        /** هر آیکون Lucide با نام کلید `icons`؛ رندر از resolver وب (norolink به lucide وابسته نیست). */
        z.object({ kind: z.literal('lucide'), value: z.string().max(64).regex(LUCIDE_NAME) }).strict(),
      ])
      .nullable()
      .default(null),
    open_in_new_tab: z.boolean().default(true),
    track_clicks: z.boolean().default(true),
    style: z.object({ bg_color: z.string().regex(HEX_COLOR).nullable().default(null) }).strict().default({ bg_color: null }),
  })
  .strict();

export const socialIconsSchema = z
  .object({
    items: z
      .array(
        z
          .object({ platform: z.enum(SOCIAL_PLATFORMS), value: z.string().trim().max(2048) })
          .strict()
          .transform((i) => ({ ...i, value: normalizeSocialValue(i.platform, i.value) })),
      )
      .max(12),
  })
  .strict();

export const richTextSchema = z.object({ doc: richDocSchema }).strict();

/** بیشترین تعداد تصویر در المان تصویر (اسلایدر؛ تصمیم مالک محصول ۱۴۰۵/۸/۷). */
export const MAX_IMAGE_SLIDES = 10;

/**
 * کادر غیرمخرب برای نسبت ثابت: نقطه‌ی کانونی (درصد) و بزرگ‌نمایی؛ فایل اصلی دست نمی‌خورد و
 * کادر هر وقت قابل تغییر است. در نسبت «اصلی» اعمال نمی‌شود.
 */
const cropSchema = z
  .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), zoom: z.number().min(1).max(3) })
  .strict()
  .default({ x: 50, y: 50, zoom: 1 });

/** اسلاید دوم به بعد؛ در حالت اسلایدر alt و لینک اختیاری‌اند. */
const imageSlideSchema = z
  .object({
    image: imageRefSchema,
    alt: z.string().trim().max(200).default(''),
    link: optionalUrl.default(''),
    crop: cropSchema,
  })
  .strict();

/**
 * تصویر یا اسلایدر تصویر: فیلدهای بالایی اسلاید اول‌اند (سازگار با المان‌ها و snapshotهای قبلی، بدون migration)
 * و `slides` اسلایدهای بعدی (تا MAX_IMAGE_SLIDES روی هم). با بیش از یک تصویر اسلایدر رندر می‌شود. نسبت ابعاد
 * برای همه یکی است تا ارتفاع نپرد.
 */
export const imageSchema = z
  .object({
    image: imageRefSchema.nullable().default(null),
    alt: z.string().trim().max(200).default(''),
    link: optionalUrl.default(''),
    aspect: z.enum(['auto', '1:1', '4:3', '16:9']).default('auto'),
    crop: cropSchema,
    slides: z.array(imageSlideSchema).max(MAX_IMAGE_SLIDES - 1).default([]),
  })
  .strict();

export type ImageCrop = z.infer<typeof imageSchema>['crop'];
export const DEFAULT_IMAGE_CROP: ImageCrop = { x: 50, y: 50, zoom: 1 };

/** یک تصویر المان تصویر (اسلاید اول همان فیلدهای بالایی است). */
export interface ImageSlide {
  image: ImageRef;
  alt: string;
  link: string;
  crop: ImageCrop;
}

/**
 * همه‌ی تصاویر المان به ترتیب (اسلاید اول + `slides`). داده‌ی قبلی/snapshot ممکن است `slides` یا `crop` نداشته
 * باشد؛ بدون تصویر اول ← فهرست خالی.
 */
export function imageSlides(s: ImageSettings): ImageSlide[] {
  if (!s.image) return [];
  const first: ImageSlide = { image: s.image, alt: s.alt, link: s.link, crop: s.crop ?? DEFAULT_IMAGE_CROP };
  return [first, ...(s.slides ?? []).map((x) => ({ ...x, crop: x.crop ?? DEFAULT_IMAGE_CROP }))];
}

/** فهرست تصاویر ← تنظیمات المان (اولی به فیلدهای بالایی، بقیه به `slides`؛ بیش از سقف بریده می‌شود). */
export function withImageSlides(s: ImageSettings, slides: readonly ImageSlide[]): ImageSettings {
  const [first, ...rest] = slides.slice(0, MAX_IMAGE_SLIDES);
  return first
    ? { ...s, image: first.image, alt: first.alt, link: first.link, crop: first.crop, slides: rest }
    : { ...s, image: null, alt: '', link: '', crop: DEFAULT_IMAGE_CROP, slides: [] };
}

/** استایل تصویر داخل کادر نسبت ثابت (object-fit: cover) طبق کادر ذخیره‌شده؛ برای نسبت «اصلی» خالی. */
export function imageCropStyle(aspect: string, crop: ImageCrop | undefined): Record<string, string> {
  if (aspect === 'auto' || !crop) return {};
  const origin = `${crop.x}% ${crop.y}%`;
  return crop.zoom > 1 ? { objectPosition: origin, transform: `scale(${crop.zoom})`, transformOrigin: origin } : { objectPosition: origin };
}

export const videoEmbedSchema = z
  .object({
    source_url: z.string().trim().max(2048).transform(normalizeHttpUrl),
    /** از source_url در سرور استخراج می‌شود (مقدار کلاینت نادیده گرفته می‌شود). */
    video: z
      .object({ provider: z.enum(['youtube', 'vimeo', 'aparat']), video_id: z.string().max(64) })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();

export const mapEmbedSchema = z
  .object({
    source_url: z.string().trim().max(4096).transform(normalizeEmbedSource).pipe(z.string().max(2048)),
    /** از source_url در سرور استخراج می‌شود (لینک کوتاه با دنبال‌کردن redirect). */
    location: z
      .object({
        provider: z.enum(['google', 'neshan', 'balad']),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        zoom: z.number().int().min(3).max(20),
        place_token: z.string().regex(BALAD_TOKEN).optional(),
        pb: z.string().regex(GOOGLE_PB).optional(),
      })
      .strict()
      .nullable()
      .default(null),
    label: z.string().trim().max(100).default(''),
    height: z.enum(['sm', 'md', 'lg']).default('md'),
  })
  .strict();

export const ELEMENT_SCHEMAS = {
  link_button: linkButtonSchema,
  social_icons: socialIconsSchema,
  rich_text: richTextSchema,
  image: imageSchema,
  video_embed: videoEmbedSchema,
  map_embed: mapEmbedSchema,
} as const;

export type ElementSettings = { [K in ElementKind]: z.infer<(typeof ELEMENT_SCHEMAS)[K]> };
export type LinkButtonSettings = ElementSettings['link_button'];
export type SocialIconsSettings = ElementSettings['social_icons'];
export type RichTextSettings = ElementSettings['rich_text'];
export type ImageSettings = ElementSettings['image'];
export type VideoEmbedSettings = ElementSettings['video_embed'];
export type MapEmbedSettings = ElementSettings['map_embed'];

export type AnyElement = { [K in ElementKind]: { id: string; kind: K; settings: ElementSettings[K] } }[ElementKind];

export function defaultSettings<K extends ElementKind>(kind: K): ElementSettings[K] {
  const defaults: ElementSettings = {
    link_button: { label: 'لینک جدید', url: '', icon: null, open_in_new_tab: true, track_clicks: true, style: { bg_color: null } },
    social_icons: { items: [] },
    rich_text: { doc: { blocks: [{ type: 'p', content: [{ text: 'متن خود را اینجا بنویسید.' }] }] } },
    image: { image: null, alt: '', link: '', aspect: 'auto', crop: { x: 50, y: 50, zoom: 1 }, slides: [] },
    video_embed: { source_url: '', video: null },
    map_embed: { source_url: '', location: null, label: '', height: 'md' },
  };
  return defaults[kind];
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: string[] };

export function parseSettings<K extends ElementKind>(kind: K, raw: unknown): ParseResult<ElementSettings[K]> {
  const r = ELEMENT_SCHEMAS[kind].safeParse(raw);
  if (r.success) return { ok: true, value: r.data as ElementSettings[K] };
  return { ok: false, issues: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}

/** کدهای مشکل که انتشار را مانع می‌شوند (متن فارسی در UI). */
export type ElementIssue =
  | 'missing_label'
  | 'missing_url'
  | 'invalid_url'
  | 'blocked_url'
  | 'invalid_social'
  | 'empty_social'
  | 'empty_text'
  | 'missing_image'
  | 'missing_alt'
  | 'missing_video'
  | 'missing_location';

export function elementIssues(el: AnyElement): ElementIssue[] {
  const s = el.settings;
  switch (el.kind) {
    case 'link_button': {
      const b = s as LinkButtonSettings;
      return [
        ...(b.label ? [] : (['missing_label'] as const)),
        ...(!b.url ? (['missing_url'] as const) : !isHttpUrl(b.url) ? (['invalid_url'] as const) : isBlockedUrl(b.url) ? (['blocked_url'] as const) : []),
      ];
    }
    case 'social_icons': {
      const items = (s as SocialIconsSettings).items.filter((i) => i.value);
      if (!items.length) return ['empty_social'];
      return items.every((i) => isValidSocialValue(i.platform, i.value)) ? [] : ['invalid_social'];
    }
    case 'rich_text':
      return isEmptyDoc((s as RichTextSettings).doc) ? ['empty_text'] : [];
    case 'image': {
      const i = s as ImageSettings;
      const slides = imageSlides(i);
      // alt برای همه‌ی تصاویر اختیاری است
      return [
        ...(!slides.length ? (['missing_image'] as const) : []),
        ...(slides.some((x) => x.link && !isHttpUrl(x.link)) ? (['invalid_url'] as const) : []),
        ...(slides.some((x) => x.link && isBlockedUrl(x.link)) ? (['blocked_url'] as const) : []),
      ];
    }
    case 'video_embed':
      return (s as VideoEmbedSettings).video ? [] : ['missing_video'];
    case 'map_embed':
      return (s as MapEmbedSettings).location ? [] : ['missing_location'];
  }
}

/** همه‌ی تصاویر آپلودی که settings به آن‌ها اشاره می‌کند. */
export function elementImages(el: AnyElement): ImageRef[] {
  if (el.kind === 'image') return imageSlides(el.settings).map((x) => x.image);
  if (el.kind === 'link_button' && el.settings.icon?.kind === 'upload') return [el.settings.icon.image];
  return [];
}
