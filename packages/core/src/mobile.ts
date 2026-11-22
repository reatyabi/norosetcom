const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p >= 0) {
      out += String(p);
      continue;
    }
    const a = ARABIC_DIGITS.indexOf(ch);
    if (a >= 0) {
      out += String(a);
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * نرمال‌سازی شمارهٔ موبایل ایران به قالب E.164 (+98XXXXXXXXXX).
 * ورودی: 09xxxxxxxxx، +989xxxxxxxxx، 00989xxxxxxxxx، 989xxxxxxxxx، ارقام فارسی/عربی، فاصله/خط تیره.
 * خروجی نامعتبر → null.
 */
export function normalizeIranianMobile(input: string): string | null {
  let s = toAsciiDigits(input).replace(/[\s-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0098')) s = s.slice(4);
  else if (s.startsWith('98')) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  if (!/^9[0-9]{9}$/.test(s)) return null;
  return `+98${s}`;
}

export function isValidIranianMobile(input: string): boolean {
  return normalizeIranianMobile(input) !== null;
}
