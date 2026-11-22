// @noroset/ui — API تم (نسخه ۲: shadcn Nova + آبی مدرن)
// -----------------------------------------------------------------------------
// سه محور مستقل: base color (data-base)، brand color (--brand)، روشن/تیره (next-themes).
// سند: docs/design-system.md · برنامه: docs/design-system-migration.md
// هیچ وابستگی بیرونی ندارد و در سرور بی‌اثر است (typeof window guard).

export type BaseColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';

export const BASE_COLORS: readonly BaseColor[] = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;

/** پالت‌های آماده‌ی برند (همه AA روی سفید و روی تیره). */
export const BRAND_PRESETS = {
  blue: '#2563eb',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  emerald: '#059669',
  rose: '#e11d48',
  amber: '#b45309',
  graphite: '#0f172a',
} as const satisfies Record<string, string>;

export type BrandPreset = keyof typeof BRAND_PRESETS;

const STORAGE_BASE = 'noroset.baseColor';
const STORAGE_BRAND = 'noroset.brandColor';

/** متن تیره‌ای که در تم تیره روی برند روشن استفاده می‌شود. */
const ON_DARK = '#0b1220';
const ON_LIGHT = '#ffffff';

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** روشنایی نسبی WCAG 2.x */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** نسبت کنتراست WCAG (۱ تا ۲۱) */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * رنگ متن/آیکون روی یک پس‌زمینه: گزینه‌ی با کنتراست بالاتر بین سفید و تیره.
 * برای برندهای روشن (زرد/فیروزه‌ای) متن تیره و برای برندهای تیره متن سفید برمی‌گرداند.
 */
export function pickOnColor(background: string): typeof ON_LIGHT | typeof ON_DARK {
  return contrastRatio(background, ON_LIGHT) >= contrastRatio(background, ON_DARK) ? ON_LIGHT : ON_DARK;
}

/** اعمال رنگ پایه (رامپ خنثی) روی <html data-base="…"> */
export function setBaseColor(color: BaseColor): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.base = color;
  try {
    localStorage.setItem(STORAGE_BASE, color);
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

/** اعمال برند: --brand + --brand-on (رنگ متن AA روی دکمه‌ی اصلی) */
export function setBrandColor(hex: string): void {
  if (typeof document === 'undefined') return;
  const rgb = parseHex(hex);
  if (!rgb) return;
  const normalized = `#${[rgb.r, rgb.g, rgb.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  const root = document.documentElement;
  root.style.setProperty('--brand', normalized);
  root.style.setProperty('--brand-on', pickOnColor(normalized));
  try {
    localStorage.setItem(STORAGE_BRAND, normalized);
  } catch {
    /* ignore */
  }
}

export function getBaseColor(): BaseColor {
  if (typeof document === 'undefined') return 'slate';
  const value = document.documentElement.dataset.base;
  return (BASE_COLORS as readonly string[]).includes(value ?? '') ? (value as BaseColor) : 'slate';
}

export function getBrandColor(): string {
  if (typeof document === 'undefined') return BRAND_PRESETS.blue;
  try {
    return localStorage.getItem(STORAGE_BRAND) ?? BRAND_PRESETS.blue;
  } catch {
    return BRAND_PRESETS.blue;
  }
}

/** بازگرداندن تم ذخیره‌شده (در mount سمت کلاینت صدا زده شود). */
export function applyStoredTheme(): void {
  if (typeof window === 'undefined') return;
  try {
    const base = localStorage.getItem(STORAGE_BASE);
    if (base && (BASE_COLORS as readonly string[]).includes(base)) {
      document.documentElement.dataset.base = base;
    }
    const brand = localStorage.getItem(STORAGE_BRAND);
    if (brand) setBrandColor(brand);
  } catch {
    /* ignore */
  }
}

/** پاک‌کردن تنظیمات سفارشی (بازگشت به پیش‌فرض آبی/slate). */
export function resetTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  delete root.dataset.base;
  root.style.removeProperty('--brand');
  root.style.removeProperty('--brand-on');
  try {
    localStorage.removeItem(STORAGE_BASE);
    localStorage.removeItem(STORAGE_BRAND);
  } catch {
    /* ignore */
  }
}

/**
 * اسکریپت کوچک پیش از هیدریشن برای جلوگیری از فلش رنگ پایه.
 * در `layout.tsx` با `<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />` در <head>.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var b=localStorage.getItem('${STORAGE_BASE}');if(b&&/^(slate|gray|zinc|neutral|stone)$/.test(b)){d.dataset.base=b}}catch(e){}})();`;
