import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** تولید refresh token تصادفی ۳۲ بایتی (base64url). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** هش توکن (sha256 hex) برای ذخیره در DB. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTokenTimingSafe(token: string, expectedHash: string): boolean {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
