// ابزارهای ارقام و طول در لایه‌ی نوع مقدار تعریف شده‌اند.
export { codePointLength, toAsciiDigits } from './values';

/** طول UTF-8 بر حسب بایت (بدون وابستگی به TextEncoder). */
export function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

// فقط https، host دامنه‌ای (بدون userinfo/IP/فاصله/کاراکترهای خطرناک).
const HTTPS_URL = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s<>"'`\\]*)?$/i;

export function isHttpsUrl(value: string): boolean {
  return HTTPS_URL.test(value);
}
