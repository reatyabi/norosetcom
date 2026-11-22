import type { CSSProperties } from 'react';
import type { FormTheme } from '@noroset/field-engine';
import { cn } from '@noroset/ui';

export type FormBackgroundMode = 'solid' | 'gradient' | 'mesh' | 'image';
export type FormBackgroundOverlay = 'none' | 'dark' | 'light';

export const PATTERN_ICONS = [
  { id: 'sparkle', label: 'جرقه', path: 'M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z' },
  { id: 'star', label: 'ستاره', path: 'M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5z' },
  { id: 'flower', label: 'گل', path: 'M12 2a3 3 0 0 1 2.8 4.1A3 3 0 0 1 18 12a3 3 0 0 1-3.2 5.9A3 3 0 0 1 12 22a3 3 0 0 1-2.8-4.1A3 3 0 0 1 6 12a3 3 0 0 1 3.2-5.9A3 3 0 0 1 12 2z' },
  { id: 'dot', label: 'نقطه', path: 'M12 5a7 7 0 1 0 0 14a7 7 0 0 0 0-14z' },
  { id: 'ring', label: 'حلقه', path: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 3a6 6 0 1 1 0 12a6 6 0 0 1 0-12z' },
  { id: 'shard', label: 'تراشه', path: 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2z' },
] as const;

export type PatternIconId = (typeof PATTERN_ICONS)[number]['id'];

export interface FormBackgroundValue {
  mode: FormBackgroundMode;
  color: string;
  secondary_color: string;
  angle: number;
  pattern_icon: string;
  pattern_size: number;
  pattern_color: string;
  image_url: string;
  image_opacity: number;
  focal_x: number;
  focal_y: number;
  overlay: FormBackgroundOverlay;
  overlay_color: string;
  overlay_opacity: number;
}

export const DEFAULT_FORM_BACKGROUND: FormBackgroundValue = {
  mode: 'solid',
  color: '#fafaf9',
  secondary_color: '#e7e5e4',
  angle: 180,
  pattern_icon: '',
  pattern_size: 36,
  pattern_color: '#18181b',
  image_url: '',
  image_opacity: 1,
  focal_x: 50,
  focal_y: 50,
  overlay: 'none',
  overlay_color: '',
  overlay_opacity: 0.45,
};

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function readablePatternColor(background: string): string {
  const channels = background.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const luminance = (0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!) / 255;
  return luminance > 0.56 ? '#18181b' : '#ffffff';
}

export function ensurePatternContrast(background: string, pattern: string): string {
  const bg = background.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const fg = pattern.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const lum = (rgb: number[]) => (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
  return Math.abs(lum(bg) - lum(fg)) >= 0.25 ? pattern : readablePatternColor(background);
}

export function patternDataUri(icon: string, color: string): string {
  const symbol = PATTERN_ICONS.find((item) => item.id === icon) ?? PATTERN_ICONS[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${symbol.path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function backgroundFromTheme(theme: FormTheme): FormBackgroundValue {
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

export function backgroundNeedsGlass(value: FormBackgroundValue, contentLayout: 'card' | 'plain'): boolean {
  if (value.mode !== 'image' || !value.image_url || contentLayout !== 'plain') return false;
  return value.overlay !== 'dark' || clamp(value.overlay_opacity) < 0.15;
}

export function FormBackground({ value, className }: { value: FormBackgroundValue; className?: string }) {
  const image = value.mode === 'image' && value.image_url.trim() !== '';
  const pattern = value.mode === 'mesh' && value.pattern_icon.trim() !== '';
  const overlayColor = value.overlay_color || (value.overlay === 'light' ? '#ffffff' : '#000000');
  const paint: CSSProperties =
    value.mode === 'gradient'
      ? { background: `linear-gradient(${value.angle}deg, ${value.secondary_color}, transparent 70%), ${value.color}` }
      : value.mode === 'mesh'
        ? {
            background: `radial-gradient(circle at 18% 22%, ${value.secondary_color} 0, transparent 38%), radial-gradient(circle at 82% 8%, ${value.secondary_color} 0, transparent 34%), radial-gradient(circle at 72% 88%, ${value.secondary_color} 0, transparent 42%), ${value.color}`,
          }
        : { background: value.color };

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      data-mode={value.mode}
      data-has-image={image ? 'true' : undefined}
      data-has-pattern={pattern ? 'true' : undefined}
      style={{ backgroundColor: value.color }}
    >
      {!image && !pattern ? <div className="absolute inset-0" style={paint} /> : null}
      {pattern ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: value.color,
            backgroundImage: `url("${patternDataUri(value.pattern_icon, value.pattern_color || readablePatternColor(value.color))}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: `${Math.max(8, value.pattern_size)}px ${Math.max(8, value.pattern_size)}px`,
          }}
        />
      ) : null}
      {image ? (
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url("${value.image_url.replaceAll('"', '%22')}")`,
            backgroundPosition: `${value.focal_x}% ${value.focal_y}%`,
            opacity: clamp(value.image_opacity),
          }}
        />
      ) : null}
      {image && value.overlay !== 'none' ? (
        <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: clamp(value.overlay_opacity) }} />
      ) : null}
    </div>
  );
}

