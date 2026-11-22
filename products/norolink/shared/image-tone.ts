import { grayLuminance, ratio, relativeLuminance } from './contrast';

// پس‌زمینه‌ی عکس (docs/architecture.md §9.3): لایه‌ی شیشه‌ای روشن (سفید) یا تیره (دودی) روی عکس محو، و متن
// تیره یا روشن روی آن. شدت لایه انتخاب کاربر است (بدون حداقل اجباری)؛ `minOverlay` شدتی که متن کم‌رنگ (بیو) را
// روی بدترین نقطه‌ی عکس ≥ ۴.۵ نگه می‌دارد، پیشنهاد اولیه و مرز هشدار ادیتور است و از آمار روشنایی عکس (`luma`)
// حساب می‌شود که ادیتور هنگام انتخاب عکس در مرورگر می‌گیرد.

export const IMAGE_TONES = ['light', 'dark'] as const;
export type ImageTone = (typeof IMAGE_TONES)[number];

/** صدک ۵ و ۹۵ روشنایی (luma، sRGB بین ۰ و ۱) کل عکس؛ تیره‌ترین/روشن‌ترین ناحیه‌ای که متن ممکن است رویش بنشیند. */
export interface LumaStats {
  lo: number;
  hi: number;
}

export const MAX_OVERLAY = 0.95;
const MIN_TEXT_CONTRAST = 4.5;

/** رنگ متن روی هر لایه؛ متن کم‌رنگ هم باید ≥ ۴.۵ باشد (بیو روی عکس). */
export const IMAGE_TEXT: Record<ImageTone, { fg: string; muted: string; tint: string; fallback: string }> = {
  light: { fg: '#111111', muted: '#3f3f46', tint: '255,255,255', fallback: '#f4f4f5' },
  dark: { fg: '#ffffff', muted: '#e4e4e7', tint: '0,0,0', fallback: '#18181b' },
};

/** بدترین نقطه پس از لایه (sRGB بین ۰ و ۱): روشن ← تیره‌ترین نقطه زیر سفید؛ تیره ← روشن‌ترین نقطه زیر سیاه. */
export function worstGray(tone: ImageTone, alpha: number, luma: LumaStats): number {
  return tone === 'light' ? alpha + (1 - alpha) * luma.lo : (1 - alpha) * luma.hi;
}

function worstLuminance(tone: ImageTone, alpha: number, luma: LumaStats): number {
  return grayLuminance(worstGray(tone, alpha, luma));
}

/** کمترین شدت لایه (گام ۰.۰۱) که متن کم‌رنگ را روی بدترین نقطه‌ی عکس خوانا نگه می‌دارد. */
export function minOverlay(tone: ImageTone, luma: LumaStats): number {
  const muted = relativeLuminance(IMAGE_TEXT[tone].muted);
  for (let step = 0; step <= MAX_OVERLAY * 100; step++) {
    const alpha = step / 100;
    if (ratio(muted, worstLuminance(tone, alpha, luma)) >= MIN_TEXT_CONTRAST) return alpha;
  }
  return MAX_OVERLAY;
}

/** لایه‌ای که کمترین پوشش را لازم دارد تا عکس بیشتر دیده شود؛ برابری ← تیره. */
export function autoTone(luma: LumaStats): { tone: ImageTone; overlay: number } {
  const light = minOverlay('light', luma);
  const dark = minOverlay('dark', luma);
  return light < dark ? { tone: 'light', overlay: light } : { tone: 'dark', overlay: dark };
}

/** صدک‌های روشنایی از پیکسل‌های RGBA (مثلاً canvas کوچک‌شده‌ی عکس)؛ پیکسل شفاف نادیده گرفته می‌شود. */
export function lumaStats(rgba: ArrayLike<number>): LumaStats {
  const values: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3]! < 128) continue;
    values.push((0.2126 * rgba[i]! + 0.7152 * rgba[i + 1]! + 0.0722 * rgba[i + 2]!) / 255);
  }
  if (values.length === 0) return { lo: 0, hi: 1 };
  values.sort((a, b) => a - b);
  const at = (p: number) => Math.round(values[Math.min(values.length - 1, Math.floor(p * values.length))]! * 1000) / 1000;
  return { lo: at(0.05), hi: at(0.95) };
}
