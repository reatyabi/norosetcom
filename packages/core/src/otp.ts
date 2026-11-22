import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/** تولید کد OTP شش‌رقمی امن. */
export function generateOtpCode(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, '0');
}

/** هش کد OTP با HMAC-SHA256 (pepper از env). فقط هش ذخیره می‌شود. */
export function hashOtp(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex');
}

/** مقایسهٔ timing-safe هش کد OTP. */
export function verifyOtpTimingSafe(code: string, secret: string, expectedHash: string): boolean {
  const actual = hashOtp(code, secret);
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
