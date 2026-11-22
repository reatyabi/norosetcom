// کلید مرتب‌سازی کسری (fractional index) برای norolink_elements.sort_key.
// ترتیب ارقام همان ترتیب بایتی ASCII است تا با COLLATE "C" یکی باشد؛ کلید هرگز به '0' ختم نمی‌شود.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const SORT_KEY_PATTERN = /^[0-9A-Za-z]+$/;

function midpoint(a: string, b: string | null): string {
  if (b !== null && a >= b) throw new Error(`invalid sort key range: ${a} >= ${b}`);
  if (b !== null) {
    let n = 0;
    while ((a[n] ?? '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const da = a ? DIGITS.indexOf(a[0]!) : 0;
  const db = b !== null ? DIGITS.indexOf(b[0]!) : DIGITS.length;
  if (db - da > 1) return DIGITS[Math.round((da + db) / 2)]!;
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[da]! + midpoint(a.slice(1), null);
}

/** کلیدی اکیداً بین `before` و `after` (null = ابتدا/انتهای فهرست). */
export function keyBetween(before: string | null, after: string | null): string {
  return midpoint(before ?? '', after);
}
