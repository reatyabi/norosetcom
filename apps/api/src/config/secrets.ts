// secretها، هر کدام فقط برای یک کار: JWT_SECRET امضای access token، OTP_PEPPER HMAC کد OTP،
// IP_HASH_SECRET هش IP در پاسخ‌های فرم عمومی.

export const DEV_JWT_SECRET = 'dev-secret';
export const DEV_OTP_PEPPER = 'dev-otp-pepper';
export const DEV_IP_HASH_SECRET = 'dev-ip-hash-secret';

export const MIN_SECRET_LENGTH = 32;

const SECRET_NAMES = ['JWT_SECRET', 'OTP_PEPPER', 'IP_HASH_SECRET'] as const;

/** مقادیر پیش‌فرض/نمونه که در production هرگز نباید استفاده شوند. */
const KNOWN_DEFAULTS: Record<(typeof SECRET_NAMES)[number], readonly string[]> = {
  JWT_SECRET: [DEV_JWT_SECRET, 'change-me-in-production'],
  OTP_PEPPER: [DEV_OTP_PEPPER, 'change-me-in-production'],
  IP_HASH_SECRET: [DEV_IP_HASH_SECRET, 'change-me-in-production'],
};

type Env = Record<string, string | undefined>;

export function getJwtSecret(env: Env = process.env): string {
  return env.JWT_SECRET ?? DEV_JWT_SECRET;
}

export function getOtpPepper(env: Env = process.env): string {
  return env.OTP_PEPPER ?? DEV_OTP_PEPPER;
}

export function getIpHashSecret(env: Env = process.env): string {
  return env.IP_HASH_SECRET ?? DEV_IP_HASH_SECRET;
}

/**
 * در production اگر secretها تنظیم نشده، برابر مقدار پیش‌فرض یا کوتاه‌تر از
 * MIN_SECRET_LENGTH باشند خطا می‌دهد تا برنامه بالا نیاید. در محیط‌های دیگر کاری نمی‌کند.
 */
export function assertSecureSecrets(env: Env = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  for (const name of SECRET_NAMES) {
    const value = env[name];
    if (!value) {
      problems.push(`${name} is not set`);
    } else if (KNOWN_DEFAULTS[name].includes(value)) {
      problems.push(`${name} uses a default/example value`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters (got ${value.length})`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Insecure auth configuration for NODE_ENV=production:\n  - ${problems.join('\n  - ')}`,
    );
  }
}
