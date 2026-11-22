// نرمال‌سازی متن فارسی برای نشانی، جست‌وجو و تحلیل سئو (docs/architecture.md §9.12). خالص و بدون وابستگی.

const ARABIC_TO_PERSIAN: Record<string, string> = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا', 'ؤ': 'و' };
const DIGITS = /[۰-۹٠-٩]/g;
// اعراب، کشیده و نویسه‌های کنترلی جهت
const MARKS = /[ً-ٰٟـ‎‏‪-‮]/g;

/** ارقام فارسی/عربی ← لاتین. */
export function toLatinDigits(s: string): string {
  return s.replace(DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/**
 * ي/ك عربی ← ی/ک، حذف اعراب و کشیده، نیم‌فاصله ← فاصله، ارقام ← لاتین، حروف کوچک و فاصله‌ی یکتا.
 * هر دو طرف مقایسه (متن و کلمه‌ی کلیدی) با همین تابع نرمال می‌شوند.
 */
export function normalizeFa(s: string): string {
  return toLatinDigits(s)
    .replace(/[يىكةأإٱؤ]/g, (c) => ARABIC_TO_PERSIAN[c] ?? c)
    .replace(MARKS, '')
    .replace(/‌/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** کلمه‌های متن نرمال‌شده (حروف و ارقام هر زبان). */
export function words(s: string): string[] {
  return normalizeFa(s).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** شمار رخدادهای عبارت (نرمال‌شده) در متن نرمال‌شده، فقط در مرز کلمه. */
export function countPhrase(text: string, phrase: string): number {
  const t = words(text);
  const p = words(phrase);
  if (!p.length || t.length < p.length) return 0;
  let n = 0;
  for (let i = 0; i <= t.length - p.length; i++) {
    if (p.every((w, j) => t[i + j] === w)) n++;
  }
  return n;
}

export function containsPhrase(text: string, phrase: string): boolean {
  return countPhrase(text, phrase) > 0;
}
