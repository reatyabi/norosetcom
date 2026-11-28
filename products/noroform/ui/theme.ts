import type { FormTheme } from '@noroset/field-engine';
import {
  FORM_THEME_PRESET_ITEMS,
  FORM_THEME_PRESET_DEFINITIONS,
  resolveFormThemeTokens,
  getCanvasContrast,
  type FormThemePreset,
} from '@noroset/field-engine';
import { patternDataUri, readablePatternColor } from './background';

export type { FormThemePreset };
export { FORM_THEME_PRESET_DEFINITIONS, resolveFormThemeTokens, getCanvasContrast };
export const FORM_THEME_PRESETS = FORM_THEME_PRESET_ITEMS;
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
