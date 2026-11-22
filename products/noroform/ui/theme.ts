import type { FormTheme } from '@noroset/field-engine';
import { patternDataUri, readablePatternColor } from './background';

export type FormThemePreset = FormTheme['preset'];

export const FORM_THEME_PRESETS: readonly { id: FormThemePreset; label: string; theme: FormTheme }[] = [
  {
    id: 'paper',
    label: 'کاغذی',
    theme: {
      preset: 'paper',
      primary_color: '#18181b',
      background_color: '#fafaf9',
      background_style: 'solid',
      background_secondary_color: '#e7e5e4',
      background_angle: 180,
      button_style: 'filled',
      radius: 'md',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
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
  },
  {
    id: 'peach',
    label: 'گلبهی',
    theme: {
      preset: 'peach',
      primary_color: '#be185d',
      background_color: '#fff5f7',
      background_style: 'gradient',
      background_secondary_color: '#fbe3ea',
      background_angle: 180,
      button_style: 'filled',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
    id: 'lavender',
    label: 'اسطوخودوس',
    theme: {
      preset: 'lavender',
      primary_color: '#6d28d9',
      background_color: '#f5f3ff',
      background_style: 'mesh',
      background_secondary_color: '#e9e3ff',
      background_angle: 135,
      button_style: 'tonal',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
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
  },
  {
    id: 'sunset',
    label: 'غروب',
    theme: {
      preset: 'sunset',
      primary_color: '#be123c',
      background_color: '#fff1e8',
      background_style: 'mesh',
      background_secondary_color: '#fecdd3',
      background_angle: 135,
      button_style: 'glass',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
    id: 'forest',
    label: 'جنگل',
    theme: {
      preset: 'forest',
      primary_color: '#d9f99d',
      background_color: '#0d1f17',
      background_style: 'gradient',
      background_secondary_color: '#17402d',
      background_angle: 170,
      button_style: 'filled',
      radius: 'full',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
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
  },
  {
    id: 'aurora',
    label: 'شفق',
    theme: {
      preset: 'aurora',
      primary_color: '#a5f3fc',
      background_color: '#0b1026',
      background_style: 'mesh',
      background_secondary_color: '#3730a3',
      background_angle: 135,
      button_style: 'glass',
      radius: 'lg',
      text_size: 'md',
      font: 'vazirmatn',
    },
  },
  {
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
  },
  {
    id: 'mono',
    label: 'تک‌رنگ',
    theme: {
      preset: 'mono',
      primary_color: '#52525b',
      background_color: '#f4f4f5',
      background_style: 'solid',
      background_secondary_color: '#e4e4e7',
      background_angle: 135,
      button_style: 'outline',
      radius: 'md',
      text_size: 'md',
      font: 'system',
    },
  },
  {
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
  },
];

export const DEFAULT_FORM_THEME = FORM_THEME_PRESETS[0]!.theme;

export function backgroundCss(theme: FormTheme): string {
  if (theme.background_style === 'image' && theme.background_image_url) {
    const x = theme.background_focal_x ?? 50;
    const y = theme.background_focal_y ?? 50;
    return `url("${theme.background_image_url.replaceAll('"', '%22')}") ${x}% ${y}% / cover no-repeat ${theme.background_color}`;
  }
  if (theme.background_style === 'gradient') {
    return `linear-gradient(${theme.background_angle}deg, ${theme.background_color}, ${theme.background_secondary_color})`;
  }
  if (theme.background_style === 'mesh' && theme.background_pattern_icon) {
    const color = theme.background_pattern_color || readablePatternColor(theme.background_color);
    const size = theme.background_pattern_size ?? 36;
    return `url("${patternDataUri(theme.background_pattern_icon, color)}") 0 0 / ${size}px ${size}px repeat, ${theme.background_color}`;
  }
  if (theme.background_style === 'mesh') {
    return `radial-gradient(at 15% 20%, ${theme.background_secondary_color} 0, transparent 55%), radial-gradient(at 85% 75%, ${theme.primary_color}33 0, transparent 55%), ${theme.background_color}`;
  }
  return theme.background_color;
}

export function radiusCss(radius: FormTheme['radius']): string {
  return { none: '0px', md: '10px', lg: '18px', full: '28px' }[radius];
}

export function fontCss(font: FormTheme['font']): string {
  // فونت پلتفرم (IRANYekan + Geist)؛ نام قدیمی --font-vazirmatn منسوخ شده است.
  return font === 'system' ? 'system-ui, sans-serif' : 'var(--font-sans)';
}

export function textScale(textSize: FormTheme['text_size']): number {
  return { sm: 0.9, md: 1, lg: 1.15 }[textSize];
}
