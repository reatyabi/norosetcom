import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// هش رمز عبور با scrypt کتابخانه‌ی استاندارد Node (پارامترهای پیشنهادی OWASP).
// قالب ذخیره: scrypt$N$r$p$salt$hash (base64url) — پارامترها کنار هش می‌مانند تا بعداً قابل افزایش باشند.

const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  // scrypt حدود 128·N·r بایت حافظه می‌خواهد؛ سقف پیش‌فرض Node (۳۲MB) برای N=2^17 کافی نیست.
  const options: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

/** مقایسه‌ی timing-safe؛ هش نامعتبر/ناشناخته ← false. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [n, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return false;
  const salt = Buffer.from(parts[4]!, 'base64url');
  const expected = Buffer.from(parts[5]!, 'base64url');
  const actual = await derive(password, salt, n, r, p);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** طول بر حسب کاراکتر (نه بایت)؛ سقف برای جلوگیری از DoS با رمزهای خیلی بلند. */
export function isAcceptablePassword(password: string): boolean {
  const length = [...password].length;
  return length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH;
}
