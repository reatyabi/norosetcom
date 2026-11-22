// رنگ متن/آیکون خودکار با بیشترین کنتراست روی رنگ پس‌زمینه (WCAG relative luminance).

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const LIGHT_TEXT = '#ffffff';
export const DARK_TEXT = '#111111';

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** نسبت کنتراست WCAG دو relative luminance. */
export function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** ترکیب sRGB دو رنگ hex (مثل color-mix in srgb)؛ `t` سهم `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * (1 - t) + ((y >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** خاکستری hex از مقدار sRGB بین ۰ و ۱. */
export function grayHex(v: number): string {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${c}${c}${c}`;
}

/** relative luminance رنگ خاکستری با مقدار sRGB (gamma) بین ۰ و ۱. */
export function grayLuminance(v: number): number {
  return channel(Math.min(1, Math.max(0, v)) * 255);
}

/** سفید یا تقریباً سیاه، هر کدام کنتراست بیشتری با `bg` دارد. */
export function contrastText(bg: string): string {
  if (!HEX_COLOR.test(bg)) return DARK_TEXT;
  const l = relativeLuminance(bg);
  return ratio(l, relativeLuminance(LIGHT_TEXT)) >= ratio(l, relativeLuminance(DARK_TEXT)) ? LIGHT_TEXT : DARK_TEXT;
}
