import { z } from 'zod';
import { contrastText, grayHex, HEX_COLOR, mixHex, ratio, relativeLuminance } from './contrast';
import { imageRefSchema, type ImageRef } from './assets';
import { IMAGE_TEXT, IMAGE_TONES, MAX_OVERLAY, minOverlay, worstGray, type ImageTone, type LumaStats } from './image-tone';

// تم صفحه‌ی لینک (docs/architecture.md §9.3): مستقل از دیزاین سیستم پلتفرم.
// تم = یک preset (در کد) + رنگ اصلی اختیاری + override‌های اختیاری (پلن حرفه‌ای).

/**
 * glass: نیمه‌شفاف با blur (روی گرادیان/mesh)؛ shadow: سطح با حاشیه و سایه‌ی تخت (بروتالیست)؛
 * tonal: پس‌زمینه‌ی کم‌رنگ از رنگ اصلی با متن هم‌رنگ (رنگ متن از `--nl-accent-ink` تا خوانا بماند).
 */
export const BUTTON_STYLES = ['filled', 'outline', 'soft', 'tonal', 'glass', 'shadow'] as const;
export const RADII = ['none', 'sm', 'md', 'lg', 'full'] as const;
export const FONTS = ['vazirmatn', 'system'] as const;
/** کانتینر زیر المان‌ها؛ دیگر انتخاب کاربر نیست و خودکار است (resolveTheme)، فقط برای پذیرش داده‌ی قبلی. */
export const CONTAINERS = ['none', 'card'] as const;

export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export type Radius = (typeof RADII)[number];
export type Font = (typeof FONTS)[number];
export type Container = (typeof CONTAINERS)[number];
/** اندازه‌ی کلی متن صفحه (ضریب همه‌ی توکن‌های تایپ؛ styles.ts). */
export const TEXT_SIZES = ['sm', 'md', 'lg'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SCALE: Record<TextSize, number> = { sm: 0.9, md: 1, lg: 1.15 };

const hex = z.string().regex(HEX_COLOR);

export const backgroundSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: hex }).strict(),
  z.object({ kind: z.literal('gradient'), from: hex, to: hex, angle: z.number().int().min(0).max(360) }).strict(),
  /**
   * عکس محو با لایه‌ی شیشه‌ای روشن/تیره (image-tone.ts). `overlay` انتخاب کاربر است و در رندر هرگز از حداقل
   * کنتراست (از `luma`) کمتر نمی‌شود؛ `focal` نقطه‌ی کانونی درصدی برای برش در عرض‌های مختلف.
   * فیلدهای پس از `overlay` بعداً اضافه شدند و snapshotهای قدیمی ندارندشان (رندر پیش‌فرض می‌گیرد).
   */
  z
    .object({
      kind: z.literal('image'),
      image: imageRefSchema,
      overlay: z.number().min(0).max(MAX_OVERLAY),
      tone: z.enum(IMAGE_TONES).default('dark'),
      tone_source: z.enum(['auto', 'manual']).default('auto'),
      focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).strict().default({ x: 50, y: 50 }),
      luma: z.object({ lo: z.number().min(0).max(1), hi: z.number().min(0).max(1) }).strict().nullable().default(null),
    })
    .strict(),
  /** mesh: ۲ تا ۴ لکه‌ی رنگی محو روی رنگ پایه (گرادیان «شفق»/mesh). */
  z.object({ kind: z.literal('mesh'), base: hex, colors: z.array(hex).min(2).max(4) }).strict(),
]);
export type Background = z.infer<typeof backgroundSchema>;

export interface Preset {
  id: string;
  label: string;
  background: Background;
  /** رنگ متن روی پس‌زمینه. */
  foreground: string;
  muted: string;
  /** رنگ دکمه‌ها (accent). */
  accent: string;
  /** سطح کارت‌ها و دکمه‌های soft. */
  surface: string;
  buttonStyle: ButtonStyle;
  radius: Radius;
  font: Font;
}

/**
 * قالب‌های آماده (نام در UI: «قالب»). شناسه‌ها در پیش‌نویس/snapshot صفحه‌ها ذخیره شده‌اند و نباید حذف یا
 * عوض شوند؛ ظاهرشان آزادانه به‌روز می‌شود. الهام از روندهای رایج link-in-bio و رنگ وب: دارک‌مود نزدیک به
 * مشکی (نه مشکی خالص)، خنثی‌های گرم و خاکی (موکا/کرم)، اسطوخودوس دیجیتال، آبی‌سبز، پالت «الکتریک» روی
 * زمینه‌ی تیره، پس‌زمینه‌ی mesh («شفق»)، دکمه‌ی شیشه‌ای روی گرادیان و سبک بروتالیست (رنگ تخت، گوشه‌ی تیز،
 * سایه‌ی تخت). کنتراست همه با تست WCAG بررسی می‌شود.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: 'minimal',
    label: 'کاغذی',
    background: { kind: 'solid', color: '#fafaf9' },
    foreground: '#18181b',
    muted: '#71717a',
    accent: '#18181b',
    surface: '#f0efed',
    buttonStyle: 'filled',
    radius: 'md',
    font: 'vazirmatn',
  },
  {
    id: 'sand',
    label: 'موکا',
    background: { kind: 'gradient', from: '#f7f0e8', to: '#ead8c4', angle: 180 },
    foreground: '#3b2a1e',
    muted: '#7d6656',
    accent: '#8a5a3c',
    surface: '#efe2d3',
    buttonStyle: 'soft',
    radius: 'lg',
    font: 'vazirmatn',
  },
  {
    id: 'rose',
    label: 'گلبهی',
    background: { kind: 'gradient', from: '#fff5f7', to: '#fbe3ea', angle: 180 },
    foreground: '#4a1d2c',
    muted: '#9a5a6c',
    accent: '#be185d',
    surface: '#fce7ef',
    buttonStyle: 'filled',
    radius: 'full',
    font: 'vazirmatn',
  },
  {
    id: 'lavender',
    label: 'اسطوخودوس',
    background: { kind: 'mesh', base: '#f5f3ff', colors: ['#e9e3ff', '#fce7f3', '#e0f2fe'] },
    foreground: '#2e1065',
    muted: '#6b5b9a',
    accent: '#6d28d9',
    surface: '#ffffff',
    buttonStyle: 'soft',
    radius: 'full',
    font: 'vazirmatn',
  },
  {
    id: 'ocean',
    label: 'فیروزه‌ای',
    background: { kind: 'mesh', base: '#0c3b38', colors: ['#0f766e', '#0e7490', '#115e59'] },
    foreground: '#ffffff',
    muted: '#ccf3ec',
    accent: '#ffffff',
    surface: '#e6fffa',
    buttonStyle: 'glass',
    radius: 'lg',
    font: 'vazirmatn',
  },
  {
    id: 'sunset',
    label: 'غروب',
    background: { kind: 'mesh', base: '#9f1239', colors: ['#c2410c', '#be123c', '#b45309'] },
    foreground: '#ffffff',
    muted: '#ffe4d6',
    accent: '#ffffff',
    surface: '#fff4ea',
    buttonStyle: 'glass',
    radius: 'full',
    font: 'vazirmatn',
  },
  {
    id: 'forest',
    label: 'جنگل',
    background: { kind: 'gradient', from: '#0d1f17', to: '#17402d', angle: 170 },
    foreground: '#ecfdf3',
    muted: '#9cc5ae',
    accent: '#d9f99d',
    surface: '#1d4a35',
    buttonStyle: 'filled',
    radius: 'full',
    font: 'vazirmatn',
  },
  {
    id: 'midnight',
    label: 'نیمه‌شب',
    background: { kind: 'gradient', from: '#0b1020', to: '#141b2e', angle: 180 },
    foreground: '#f1f5f9',
    muted: '#94a3b8',
    accent: '#818cf8',
    surface: '#1e2740',
    buttonStyle: 'filled',
    radius: 'lg',
    font: 'vazirmatn',
  },
  {
    id: 'aurora',
    label: 'شفق',
    background: { kind: 'mesh', base: '#0b1026', colors: ['#3730a3', '#0f766e', '#6d28d9'] },
    foreground: '#ffffff',
    muted: '#c7d2fe',
    accent: '#a5f3fc',
    surface: '#2b2a6b',
    buttonStyle: 'glass',
    radius: 'lg',
    font: 'vazirmatn',
  },
  {
    id: 'neon',
    label: 'نئون',
    background: { kind: 'solid', color: '#09090b' },
    foreground: '#fafafa',
    muted: '#a1a1aa',
    accent: '#a3e635',
    surface: '#18181b',
    buttonStyle: 'filled',
    radius: 'md',
    font: 'system',
  },
  {
    id: 'mono',
    label: 'تک‌رنگ',
    background: { kind: 'solid', color: '#0a0a0a' },
    foreground: '#fafafa',
    muted: '#a3a3a3',
    accent: '#fafafa',
    surface: '#171717',
    buttonStyle: 'outline',
    radius: 'none',
    font: 'system',
  },
  {
    id: 'brutal',
    label: 'بروتال',
    background: { kind: 'solid', color: '#fde047' },
    foreground: '#0a0a0a',
    muted: '#3f3f46',
    accent: '#0a0a0a',
    surface: '#ffffff',
    buttonStyle: 'shadow',
    radius: 'none',
    font: 'system',
  },
];

export const DEFAULT_PRESET_ID = 'minimal';

export const themeSchema = z
  .object({
    preset: z.enum(PRESETS.map((p) => p.id) as [string, ...string[]]),
    /** رنگ اصلی (دکمه‌ها)؛ null = رنگ preset. */
    accent: hex.nullable().default(null),
    /** منسوخ: کانتینر خودکار از شدت لایه‌ی عکس است؛ مقدار ذخیره‌شده‌ی قبلی پذیرفته و نادیده گرفته می‌شود. */
    container: z.enum(CONTAINERS).optional(),
    /** اندازه‌ی کلی متن؛ نبودن = md. با انتخاب قالب می‌ماند (انتخاب کاربر است، نه ویژگی قالب). */
    text_size: z.enum(TEXT_SIZES).optional(),
    /** تغییر ویژگی‌های preset (در همه‌ی پلن‌ها آزاد؛ §9.3). */
    overrides: z
      .object({
        background: backgroundSchema.optional(),
        button_style: z.enum(BUTTON_STYLES).optional(),
        radius: z.enum(RADII).optional(),
        font: z.enum(FONTS).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export type Theme = z.infer<typeof themeSchema>;

export function defaultTheme(): Theme {
  return { preset: DEFAULT_PRESET_ID, accent: null, overrides: {} };
}

export function presetOf(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}

// گوشه‌های کم/متوسط/زیاد توکن سیال صفحه‌اند (ui/styles.ts) تا با بقیه‌ی اندازه‌ها هم‌نسبت تغییر کنند.
const RADIUS_PX: Record<Radius, string> = { none: '0px', sm: 'var(--nl-r-sm)', md: 'var(--nl-r-md)', lg: 'var(--nl-r-lg)', full: '999px' };
const FONT_STACK: Record<Font, string> = {
  vazirmatn: 'var(--font-fa, iranyekan, Vazirmatn), Tahoma, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
};

/** لایه‌ی عکس پس‌زمینه (جدا از .nl-root تا محو و چسبان باشد). */
export interface BackgroundImageLayer {
  url: string;
  /** لایه‌ی روشن (سفید) یا تیره (سیاه). */
  tone: ImageTone;
  /** مقدار محوشدن و بزرگ‌نمایی عکس (۰ تا ۱)؛ همان شدت لایه تا عکس با لایه‌ی کم واضح دیده شود. */
  amount: number;
  /** object-position از نقطه‌ی کانونی. */
  position: string;
  /** رنگ لایه‌ی شیشه‌ای با شدت مؤثر. */
  tint: string;
  /** رنگ زیر عکس تا بارگذاری شود. */
  fallback: string;
}

export interface ResolvedTheme {
  buttonStyle: ButtonStyle;
  image: BackgroundImageLayer | null;
  /** کانتینر زیر المان‌ها روشن است (خودکار روی عکس با لایه‌ی کم‌تر از حد خوانایی؛ رنگ‌ها در `--nl-card-*`). */
  card: boolean;
  /**
   * رنگ متن هم‌رنگ دکمه (outline/tonal) و سهم رنگ در پس‌زمینه‌ی tonal برای رنگ دلخواه یک دکمه؛
   * `--nl-accent-ink` و `--nl-tonal-mix` همین برای رنگ اصلی‌اند.
   */
  ink: (color: string) => ButtonInk;
  /** CSS custom properties روی ریشه‌ی صفحه. */
  vars: Record<string, string>;
}

/** جای لکه‌های mesh (گوشه‌ها به‌صورت ضربدری تا ترکیب متعادل باشد). */
const MESH_SPOTS = ['15% 10%', '85% 20%', '80% 90%', '10% 80%'];

function cssBackground(bg: Background): string {
  switch (bg.kind) {
    case 'solid':
      return bg.color;
    case 'gradient':
      return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
    case 'image':
      // عکس در لایه‌ی جدا رندر می‌شود (imageLayer)؛ ریشه شفاف می‌ماند.
      return 'transparent';
    case 'mesh':
      return [...bg.colors.map((c, i) => `radial-gradient(at ${MESH_SPOTS[i]}, ${c} 0px, transparent 60%)`), bg.base].join(', ');
  }
}

type ImageBackground = Extract<Background, { kind: 'image' }>;

/** snapshotهای پیش از لایه‌ی هوشمند فقط `{kind, image, overlay}` دارند: لایه‌ی تیره با همان شدت. */
function imageTone(bg: ImageBackground): { tone: ImageTone; luma: LumaStats | null } {
  return { tone: bg.tone === 'light' ? 'light' : 'dark', luma: bg.luma ?? null };
}

function imageLayer(bg: ImageBackground, alpha: number, assetUrl: (image: ImageRef) => string): BackgroundImageLayer {
  const { tone } = imageTone(bg);
  const focal = bg.focal ?? { x: 50, y: 50 };
  return {
    url: assetUrl(bg.image),
    tone,
    amount: Math.min(1, Math.max(0, alpha)),
    position: `${focal.x}% ${focal.y}%`,
    tint: `rgba(${IMAGE_TEXT[tone].tint},${alpha})`,
    fallback: IMAGE_TEXT[tone].fallback,
  };
}

const CARD_BLUR = 'blur(20px) saturate(1.2)';
/** شدت لایه‌ای که برای عکس‌های بدون آمار روشنایی (snapshotهای قبلی) حد خوانایی فرض می‌شود. */
export const LEGACY_READABLE_OVERLAY = 0.45;
/** کمترین پوشش شیشه‌ی کانتینر تا لبه‌اش دیده شود. */
const MIN_CARD_TINT = 0.15;
const CARD_BORDER: Record<ImageTone, string> = { light: 'rgba(255,255,255,.55)', dark: 'rgba(255,255,255,.14)' };

/** کانتینر زیر المان‌ها روی عکس در شدت لایه‌ی ۱۵٪ و کمتر خودکار روشن می‌شود (تصمیم مالک محصول ۱۴۰۵/۸/۷). */
export const CARD_MAX_OVERLAY = 0.15;

/** شدتی که زیر آن متن کم‌رنگ روی خود عکس (بدون کانتینر) کنتراست ۴.۵ ندارد. */
export function readableOverlay(bg: ImageBackground): number {
  const { tone, luma } = imageTone(bg);
  return luma ? minOverlay(tone, luma) : LEGACY_READABLE_OVERLAY;
}

/**
 * کانتینر خودکار روی عکس: در لایه‌ی ≤ ۱۵٪ (عکس بیرون از کانتینر تا جای ممکن دیده می‌شود). پوشش شیشه‌ی کانتینر
 * فقط به اندازه‌ای است که با لایه‌ی صفحه روی هم به حد خوانایی برسد: 1 − (1 − لایه)(1 − کانتینر) ≥ حد خوانایی.
 */
function imageCard(tone: ImageTone, alpha: number, readable: number): { card: boolean; combined: number; vars: Record<string, string> } {
  if (alpha > CARD_MAX_OVERLAY) return { card: false, combined: alpha, vars: {} };
  const tint = Math.min(MAX_OVERLAY, Math.max(MIN_CARD_TINT, Math.ceil((1 - (1 - readable) / (1 - alpha)) * 100) / 100));
  return {
    card: true,
    combined: 1 - (1 - alpha) * (1 - tint),
    vars: {
      '--nl-card-bg': `rgba(${IMAGE_TEXT[tone].tint},${tint})`,
      '--nl-card-border': CARD_BORDER[tone],
      '--nl-card-filter': CARD_BLUR,
    },
  };
}

/** بیشترین سهم رنگ دکمه در پس‌زمینه‌ی tonal؛ اگر هیچ رنگ متنی رویش خوانا نماند کمتر می‌شود. */
export const TONAL_MIX = 0.16;
const TONAL_MIXES = [TONAL_MIX, 0.12, 0.08, 0.04, 0];
const INK_STEP = 0.05;

export interface ButtonInk {
  /** رنگ متن/حاشیه‌ی outline و tonal. */
  ink: string;
  /** سهم رنگ در پس‌زمینه‌ی tonal (۰ تا TONAL_MIX). */
  mix: number;
}

/** رنگ‌هایی که متن outline/tonal ممکن است رویشان بنشیند (بدترین حالت‌ها؛ روی عکس با پوشش لایه + کانتینر). */
function backdropColors(background: Background, alpha: number): string[] {
  return background.kind === 'solid'
      ? [background.color]
      : background.kind === 'gradient'
        ? [background.from, background.to]
        : background.kind === 'mesh'
          ? [background.base, ...background.colors]
          : [grayHex(worstGray(imageTone(background).tone, alpha, background.luma ?? { lo: 0, hi: 1 }))];
}

/**
 * همان رنگ، تا جایی که لازم است به سمت رنگ متن صفحه (تیره یا روشن) برده می‌شود تا روی همه‌ی پس‌زمینه‌ها و
 * پس‌زمینه‌ی tonal خودش کنتراست ≥ ۴.۵ داشته باشد؛ اگر حتی سیاه/سفید روی tonal کافی نباشد (مثلاً سفید روی
 * فیروزه‌ای)، سهم رنگ در tonal کمتر می‌شود.
 */
function inkFor(color: string, backdrops: string[], towardDark: boolean): ButtonInk {
  const target = towardDark ? '#000000' : '#ffffff';
  if (!HEX_COLOR.test(color)) return { ink: target, mix: TONAL_MIX };
  for (const mix of TONAL_MIXES) {
    const surfaces = backdrops.flatMap((b) => [b, mixHex(b, color, mix)]).map(relativeLuminance);
    for (let t = 0; t <= 1 + 1e-9; t += INK_STEP) {
      const ink = t === 0 ? color : mixHex(color, target, Math.min(1, t));
      const l = relativeLuminance(ink);
      if (surfaces.every((s) => ratio(l, s) >= 4.5)) return { ink, mix };
    }
  }
  return { ink: target, mix: 0 };
}

const percent = (mix: number) => `${Math.round(mix * 100)}%`;

/** متغیرهای رنگ یک دکمه با رنگ دلخواه (همه‌ی سبک‌ها؛ CSS هر سبک متغیر خودش را برمی‌دارد). */
export function buttonColorVars(color: string, theme: ResolvedTheme): Record<string, string> {
  const { ink, mix } = theme.ink(color);
  return { '--nl-btn-bg': color, '--nl-btn-fg': contrastText(color), '--nl-btn-ink': ink, '--nl-btn-mix': percent(mix) };
}

/** تم ← متغیرهای CSS. رنگ متن روی دکمه‌ها همیشه خودکار (کنتراست بالا) است؛ روی عکس رنگ متن از لایه می‌آید. */
export function resolveTheme(theme: Theme, assetUrl: (image: ImageRef) => string): ResolvedTheme {
  const preset = presetOf(theme.preset);
  const accent = theme.accent ?? preset.accent;
  const o = theme.overrides;
  const buttonStyle = o.button_style ?? preset.buttonStyle;
  const background = o.background ?? preset.background;
  const image = background.kind === 'image' ? imageTone(background) : null;
  const tone = image?.tone ?? null;
  const alpha = background.kind === 'image' ? background.overlay : 0;
  const fg = tone ? IMAGE_TEXT[tone].fg : preset.foreground;
  const muted = tone ? IMAGE_TEXT[tone].muted : preset.muted;
  // کانتینر فقط روی عکس و خودکار (theme.container دیگر خوانده نمی‌شود)
  const card = background.kind === 'image' && tone ? imageCard(tone, alpha, readableOverlay(background)) : { card: false, combined: alpha, vars: {} };
  // همه‌ی متن‌ها داخل کانتینر است، پس پس‌زمینه‌ی واقعی‌شان پوشش ترکیبی لایه و کانتینر است
  const backdrops = backdropColors(background, card.combined);
  const towardDark = contrastText(fg) === '#ffffff';
  const ink = (color: string) => inkFor(color, backdrops, towardDark);
  const accentInk = ink(accent);
  return {
    buttonStyle,
    image: background.kind === 'image' ? imageLayer(background, alpha, assetUrl) : null,
    card: card.card,
    ink,
    vars: {
      '--nl-bg': cssBackground(background),
      '--nl-fg': fg,
      '--nl-muted': muted,
      ...card.vars,
      '--nl-accent': accent,
      '--nl-accent-ink': accentInk.ink,
      '--nl-tonal-mix': percent(accentInk.mix),
      '--nl-accent-fg': contrastText(accent),
      '--nl-surface': preset.surface,
      '--nl-surface-fg': contrastText(preset.surface),
      '--nl-radius': RADIUS_PX[o.radius ?? preset.radius],
      '--nl-font': FONT_STACK[o.font ?? preset.font],
      '--nl-type-scale': String(TEXT_SCALE[theme.text_size ?? 'md']),
    },
  };
}
