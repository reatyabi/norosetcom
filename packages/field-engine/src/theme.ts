import type { FormTheme, FormThemePreset } from './schema';
import { FORM_THEME_PRESETS } from './schema';
export { FORM_THEME_PRESETS } from './schema';

export type CanvasContrast = 'light' | 'dark';

export interface FormThemeBaseTokens {
  '--nf-canvas-bg': string;
  '--nf-card-bg': string;
  '--nf-card-fg': string;
  '--nf-muted': string;
  '--nf-muted-fg': string;
  '--nf-border': string;
  '--nf-border-hover': string;
  '--nf-shadow-card': string;
  '--nf-primary': string;
}

export interface FormPresetDefinition {
  id: FormThemePreset;
  label: string;
  theme: FormTheme;
  defaultTokens: FormThemeBaseTokens;
}

/** محاسبه روشنایی نسبی رنگ بر اساس استاندارد WCAG برای تعیین کنتراست */
export function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return (a[0] ?? 0) * 0.2126 + (a[1] ?? 0) * 0.7152 + (a[2] ?? 0) * 0.0722;
}

/** تعیین رنگ متن خوانا (سفید یا تیره) بر اساس روشنایی پس‌زمینه */
export function getReadableForeground(bgColor: string): string {
  return getLuminance(bgColor) > 0.4 ? '#0f172a' : '#ffffff';
}

/** تعیین کنتراست کلی بوم (روشن یا تیره) */
export function getCanvasContrast(theme?: FormTheme | null): CanvasContrast {
  if (!theme) return 'light';
  if (theme.background_style === 'image') {
    if (theme.background_overlay === 'dark') return 'dark';
    if (theme.background_overlay === 'light') return 'light';
  }
  const bg = theme.background_color || '#ffffff';
  return getLuminance(bg) < 0.25 ? 'dark' : 'light';
}

/** نگاشت شعاع گردی‌ها */
export function resolveRadius(radius: FormTheme['radius'] = 'md'): { card: string; control: string } {
  switch (radius) {
    case 'none':
      return { card: '0px', control: '0px' };
    case 'lg':
      return { card: '1.25rem', control: '0.625rem' };
    case 'full':
      return { card: '1.75rem', control: '9999px' };
    case 'md':
    default:
      return { card: '1rem', control: '0.5rem' };
  }
}

/** مقیاس اندازه متن */
export function resolveTextScale(textSize: FormTheme['text_size'] = 'md'): number {
  switch (textSize) {
    case 'sm':
      return 0.875;
    case 'lg':
      return 1.125;
    case 'md':
    default:
      return 1;
  }
}

/** فونت فرم */
export function resolveFontFamily(font: FormTheme['font'] = 'vazirmatn'): string {
  return font === 'system' ? 'system-ui, -apple-system, sans-serif' : 'var(--font-sans)';
}

/**
 * تعاریف مرکزی ۱۲ قالب آماده (Presets) به همراه پالت کامل توکن‌های معنایی:
 * - قالب‌های روشن: تفکیک شفاف کارت سفید خالص (--nf-card-bg: #ffffff) از بوم رنگی
 * - قالب‌های تیره: پالت یکدست تیره برای کارت، بوردر و متون
 * - بروتالیست: حاشیه ضخیم و سایه جعبه‌ای ۴ پیکسلی مشکی
 */
export const FORM_THEME_PRESET_DEFINITIONS: Record<FormThemePreset, FormPresetDefinition> = {
  paper: {
    id: 'paper',
    label: 'کاغذی',
    theme: {
      preset: 'paper',
      primary_color: '#18181b',
      background_color: '#f4f4f5',
      background_style: 'solid',
      background_secondary_color: '#e4e4e7',
      background_angle: 180,
      button_style: 'filled',
      radius: 'md',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#f4f4f5',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#18181b',
      '--nf-muted': '#f4f4f5',
      '--nf-muted-fg': '#71717a',
      '--nf-border': '#e4e4e7',
      '--nf-border-hover': '#d4d4d8',
      '--nf-shadow-card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
      '--nf-primary': '#18181b',
    },
  },
  mocha: {
    id: 'mocha',
    label: 'موکا',
    theme: {
      preset: 'mocha',
      primary_color: '#8a5a3c',
      background_color: '#f7f0e8',
      background_style: 'gradient',
      background_secondary_color: '#ead8c4',
      background_angle: 180,
      button_style: 'soft',
      radius: 'lg',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#f7f0e8',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#3e2723',
      '--nf-muted': '#f2e8dc',
      '--nf-muted-fg': '#8d6e63',
      '--nf-border': '#e6d7c8',
      '--nf-border-hover': '#d7c2af',
      '--nf-shadow-card': '0 2px 8px -2px rgb(138 90 60 / 0.08)',
      '--nf-primary': '#8a5a3c',
    },
  },
  peach: {
    id: 'peach',
    label: 'گلبهی',
    theme: {
      preset: 'peach',
      primary_color: '#be185d',
      background_color: '#fff1f2',
      background_style: 'gradient',
      background_secondary_color: '#fce7f3',
      background_angle: 180,
      button_style: 'filled',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#fff1f2',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#4c0519',
      '--nf-muted': '#ffe4e6',
      '--nf-muted-fg': '#9f1239',
      '--nf-border': '#fecdd3',
      '--nf-border-hover': '#fda4af',
      '--nf-shadow-card': '0 2px 8px -2px rgb(190 24 93 / 0.08)',
      '--nf-primary': '#be185d',
    },
  },
  lavender: {
    id: 'lavender',
    label: 'اسطوخودوس',
    theme: {
      preset: 'lavender',
      primary_color: '#6d28d9',
      background_color: '#f5f3ff',
      background_style: 'mesh',
      background_secondary_color: '#ede9fe',
      background_angle: 135,
      button_style: 'tonal',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#f5f3ff',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#2e1065',
      '--nf-muted': '#ede9fe',
      '--nf-muted-fg': '#7c3aed',
      '--nf-border': '#ddd6fe',
      '--nf-border-hover': '#c4b5fd',
      '--nf-shadow-card': '0 2px 8px -2px rgb(109 40 217 / 0.08)',
      '--nf-primary': '#6d28d9',
    },
  },
  turquoise: {
    id: 'turquoise',
    label: 'فیروزه‌ای',
    theme: {
      preset: 'turquoise',
      primary_color: '#0f766e',
      background_color: '#e6fffa',
      background_style: 'mesh',
      background_secondary_color: '#ccfbf1',
      background_angle: 135,
      button_style: 'glass',
      radius: 'lg',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#e6fffa',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#042f2e',
      '--nf-muted': '#ccfbf1',
      '--nf-muted-fg': '#0d9488',
      '--nf-border': '#99f6e4',
      '--nf-border-hover': '#5eead4',
      '--nf-shadow-card': '0 2px 8px -2px rgb(15 118 110 / 0.08)',
      '--nf-primary': '#0f766e',
    },
  },
  sunset: {
    id: 'sunset',
    label: 'غروب',
    theme: {
      preset: 'sunset',
      primary_color: '#be123c',
      background_color: '#fff1e8',
      background_style: 'mesh',
      background_secondary_color: '#ffe4e6',
      background_angle: 135,
      button_style: 'glass',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#fff1e8',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#4c0519',
      '--nf-muted': '#fed7aa',
      '--nf-muted-fg': '#ea580c',
      '--nf-border': '#fecdd3',
      '--nf-border-hover': '#fda4af',
      '--nf-shadow-card': '0 2px 8px -2px rgb(190 18 60 / 0.08)',
      '--nf-primary': '#be123c',
    },
  },
  forest: {
    id: 'forest',
    label: 'جنگل',
    theme: {
      preset: 'forest',
      primary_color: '#15803d',
      background_color: '#f0fdf4',
      background_style: 'gradient',
      background_secondary_color: '#dcfce7',
      background_angle: 170,
      button_style: 'filled',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#f0fdf4',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#052e16',
      '--nf-muted': '#dcfce7',
      '--nf-muted-fg': '#16a34a',
      '--nf-border': '#bbf7d0',
      '--nf-border-hover': '#86efac',
      '--nf-shadow-card': '0 2px 8px -2px rgb(21 128 61 / 0.08)',
      '--nf-primary': '#15803d',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'نیمه‌شب',
    theme: {
      preset: 'midnight',
      primary_color: '#818cf8',
      background_color: '#0b1020',
      background_style: 'gradient',
      background_secondary_color: '#141b2e',
      background_angle: 180,
      button_style: 'filled',
      radius: 'lg',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#0b1020',
      '--nf-card-bg': '#151c30',
      '--nf-card-fg': '#f8fafc',
      '--nf-muted': '#1c243d',
      '--nf-muted-fg': '#94a3b8',
      '--nf-border': '#263252',
      '--nf-border-hover': '#3b4b75',
      '--nf-shadow-card': '0 4px 12px 0 rgb(0 0 0 / 0.35)',
      '--nf-primary': '#818cf8',
    },
  },
  aurora: {
    id: 'aurora',
    label: 'شفق',
    theme: {
      preset: 'aurora',
      primary_color: '#38bdf8',
      background_color: '#0b1026',
      background_style: 'mesh',
      background_secondary_color: '#1e1b4b',
      background_angle: 135,
      button_style: 'glass',
      radius: 'lg',
      text_size: 'md',
      font: 'vazirmatn',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#0b1026',
      '--nf-card-bg': '#151b3b',
      '--nf-card-fg': '#f0fdfa',
      '--nf-muted': '#1e2652',
      '--nf-muted-fg': '#7dd3fc',
      '--nf-border': '#293466',
      '--nf-border-hover': '#3d4d8f',
      '--nf-shadow-card': '0 4px 16px 0 rgb(6 182 212 / 0.15)',
      '--nf-primary': '#38bdf8',
    },
  },
  neon: {
    id: 'neon',
    label: 'نئون',
    theme: {
      preset: 'neon',
      primary_color: '#a3e635',
      background_color: '#09090b',
      background_style: 'solid',
      background_secondary_color: '#18181b',
      background_angle: 135,
      button_style: 'filled',
      radius: 'md',
      text_size: 'md',
      font: 'system',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#09090b',
      '--nf-card-bg': '#18181b',
      '--nf-card-fg': '#fafafa',
      '--nf-muted': '#27272a',
      '--nf-muted-fg': '#a1a1aa',
      '--nf-border': '#27272a',
      '--nf-border-hover': '#3f3f46',
      '--nf-shadow-card': '0 0 15px -3px rgb(163 230 53 / 0.15)',
      '--nf-primary': '#a3e635',
    },
  },
  mono: {
    id: 'mono',
    label: 'تک‌رنگ',
    theme: {
      preset: 'mono',
      primary_color: '#27272a',
      background_color: '#f4f4f5',
      background_style: 'solid',
      background_secondary_color: '#e4e4e7',
      background_angle: 135,
      button_style: 'outline',
      radius: 'md',
      text_size: 'md',
      font: 'system',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#f4f4f5',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#18181b',
      '--nf-muted': '#e4e4e7',
      '--nf-muted-fg': '#71717a',
      '--nf-border': '#d4d4d8',
      '--nf-border-hover': '#a1a1aa',
      '--nf-shadow-card': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '--nf-primary': '#27272a',
    },
  },
  brutal: {
    id: 'brutal',
    label: 'بروتالیست',
    theme: {
      preset: 'brutal',
      primary_color: '#111111',
      background_color: '#fff700',
      background_style: 'solid',
      background_secondary_color: '#facc15',
      background_angle: 135,
      button_style: 'shadow',
      radius: 'none',
      text_size: 'lg',
      font: 'system',
    },
    defaultTokens: {
      '--nf-canvas-bg': '#fff700',
      '--nf-card-bg': '#ffffff',
      '--nf-card-fg': '#000000',
      '--nf-muted': '#fef08a',
      '--nf-muted-fg': '#000000',
      '--nf-border': '#000000',
      '--nf-border-hover': '#000000',
      '--nf-shadow-card': '4px 4px 0px #000000',
      '--nf-primary': '#111111',
    },
  },
};

/** لیست آرایه‌ای ۱۲ قالب برای رندر منوها و پنل انتخاب قالب */
export const FORM_THEME_PRESET_ITEMS: readonly FormPresetDefinition[] = FORM_THEME_PRESETS.map(
  (id) => FORM_THEME_PRESET_DEFINITIONS[id]!,
);

export interface FormThemeTokens {
  preset: FormThemePreset;
  contrast: CanvasContrast;
  tokens: {
    '--nf-canvas-bg': string;
    '--nf-card-bg': string;
    '--nf-card-fg': string;
    '--nf-muted': string;
    '--nf-muted-fg': string;
    '--nf-border': string;
    '--nf-border-hover': string;
    '--nf-shadow-card': string;
    '--nf-primary': string;
    '--nf-primary-fg': string;
    '--nf-primary-soft': string;
    '--nf-radius-card': string;
    '--nf-radius-control': string;
    '--nf-on-canvas': string;
    '--nf-on-canvas-muted': string;
    '--nf-on-canvas-border': string;
    '--nf-on-canvas-surface': string;
    '--nf-font-family': string;
    '--nf-text-scale': string;
    '--nf-scale': string;
  };
  cssVars: Record<string, string>;
}

/**
 * ریزولور مرکزی و قطعی توکن‌های تم فرم:
 * ترکیب مشخصات Preset با مقادیر سفارشی کاربر و تولید کلیه CSS variables مورد نیاز.
 */
export function resolveFormThemeTokens(theme: FormTheme): FormThemeTokens {
  const presetId = theme.preset || 'paper';
  const basePreset = FORM_THEME_PRESET_DEFINITIONS[presetId] ?? FORM_THEME_PRESET_DEFINITIONS.paper;
  const contrast = getCanvasContrast(theme);
  const isDark = contrast === 'dark';

  const primary = theme.primary_color || basePreset.defaultTokens['--nf-primary'];
  const primaryFg = getReadableForeground(primary);
  const primarySoft = `color-mix(in srgb, ${primary} 15%, transparent)`;

  let canvasBg = theme.background_color || basePreset.defaultTokens['--nf-canvas-bg'];
  const cardBg = basePreset.defaultTokens['--nf-card-bg'];
  if (!isDark && canvasBg.toLowerCase() === cardBg.toLowerCase()) {
    canvasBg = '#f4f4f5';
  }
  const cardFg = basePreset.defaultTokens['--nf-card-fg'];
  const muted = basePreset.defaultTokens['--nf-muted'];
  const mutedFg = basePreset.defaultTokens['--nf-muted-fg'];
  const border = basePreset.defaultTokens['--nf-border'];
  const borderHover = basePreset.defaultTokens['--nf-border-hover'];
  const shadowCard = basePreset.defaultTokens['--nf-shadow-card'];

  const radius = resolveRadius(theme.radius);
  const textScale = resolveTextScale(theme.text_size);
  const fontFamily = resolveFontFamily(theme.font);

  const onCanvas = isDark ? '#ffffff' : '#0f172a';
  const onCanvasMuted = isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b';
  const onCanvasBorder = isDark ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0';
  const onCanvasSurface = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  const tokens = {
    '--nf-canvas-bg': canvasBg,
    '--nf-card-bg': cardBg,
    '--nf-card-fg': cardFg,
    '--nf-muted': muted,
    '--nf-muted-fg': mutedFg,
    '--nf-border': border,
    '--nf-border-hover': borderHover,
    '--nf-shadow-card': shadowCard,
    '--nf-primary': primary,
    '--nf-primary-fg': primaryFg,
    '--nf-primary-soft': primarySoft,
    '--nf-radius-card': radius.card,
    '--nf-radius-control': radius.control,
    '--nf-on-canvas': onCanvas,
    '--nf-on-canvas-muted': onCanvasMuted,
    '--nf-on-canvas-border': onCanvasBorder,
    '--nf-on-canvas-surface': onCanvasSurface,
    '--nf-font-family': fontFamily,
    '--nf-text-scale': String(textScale),
    '--nf-scale': String(textScale),
  };

  return {
    preset: presetId,
    contrast,
    tokens,
    cssVars: tokens,
  };
}
