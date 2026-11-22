import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertSecureSecrets,
  DEV_IP_HASH_SECRET,
  DEV_JWT_SECRET,
  DEV_OTP_PEPPER,
  getIpHashSecret,
  getJwtSecret,
  getOtpPepper,
  MIN_SECRET_LENGTH,
} from '../src/config/secrets';

const STRONG_JWT = 'j'.repeat(MIN_SECRET_LENGTH);
const STRONG_PEPPER = 'p'.repeat(MIN_SECRET_LENGTH);
const STRONG_IP = 'i'.repeat(MIN_SECRET_LENGTH);

function prod(extra: Record<string, string | undefined>) {
  return { NODE_ENV: 'production', IP_HASH_SECRET: STRONG_IP, ...extra };
}

describe('secret getters', () => {
  it('read JWT_SECRET and OTP_PEPPER independently', () => {
    const env = { JWT_SECRET: STRONG_JWT, OTP_PEPPER: STRONG_PEPPER };
    expect(getJwtSecret(env)).toBe(STRONG_JWT);
    expect(getOtpPepper(env)).toBe(STRONG_PEPPER);
    expect(getIpHashSecret({ IP_HASH_SECRET: STRONG_IP })).toBe(STRONG_IP);
  });

  it('fall back to distinct dev defaults when unset', () => {
    expect(getJwtSecret({})).toBe(DEV_JWT_SECRET);
    expect(getOtpPepper({})).toBe(DEV_OTP_PEPPER);
    expect(getIpHashSecret({})).toBe(DEV_IP_HASH_SECRET);
    expect(new Set([DEV_JWT_SECRET, DEV_OTP_PEPPER, DEV_IP_HASH_SECRET]).size).toBe(3);
  });
});

describe('assertSecureSecrets', () => {
  it('does nothing outside production, even with defaults', () => {
    expect(() => assertSecureSecrets({})).not.toThrow();
    expect(() => assertSecureSecrets({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertSecureSecrets({ NODE_ENV: 'test', JWT_SECRET: 'x' })).not.toThrow();
  });

  it('passes in production with strong, non-default secrets', () => {
    expect(() =>
      assertSecureSecrets(prod({ JWT_SECRET: STRONG_JWT, OTP_PEPPER: STRONG_PEPPER })),
    ).not.toThrow();
  });

  it('fails in production when a secret is missing', () => {
    expect(() => assertSecureSecrets(prod({ JWT_SECRET: STRONG_JWT }))).toThrow(
      /OTP_PEPPER is not set/,
    );
    expect(() => assertSecureSecrets(prod({ OTP_PEPPER: STRONG_PEPPER }))).toThrow(
      /JWT_SECRET is not set/,
    );
  });

  it.each([DEV_JWT_SECRET, 'change-me-in-production'])(
    'fails in production when JWT_SECRET is the default %s',
    (value) => {
      expect(() =>
        assertSecureSecrets(prod({ JWT_SECRET: value, OTP_PEPPER: STRONG_PEPPER })),
      ).toThrow(/JWT_SECRET uses a default\/example value/);
    },
  );

  it.each([DEV_OTP_PEPPER, 'change-me-in-production'])(
    'fails in production when OTP_PEPPER is the default %s',
    (value) => {
      expect(() =>
        assertSecureSecrets(prod({ JWT_SECRET: STRONG_JWT, OTP_PEPPER: value })),
      ).toThrow(/OTP_PEPPER uses a default\/example value/);
    },
  );

  it('fails in production when a secret is shorter than the minimum', () => {
    const short = 'x'.repeat(MIN_SECRET_LENGTH - 1);
    expect(() =>
      assertSecureSecrets(prod({ JWT_SECRET: short, OTP_PEPPER: STRONG_PEPPER })),
    ).toThrow(/JWT_SECRET must be at least 32 characters/);
    expect(() =>
      assertSecureSecrets(prod({ JWT_SECRET: STRONG_JWT, OTP_PEPPER: short })),
    ).toThrow(/OTP_PEPPER must be at least 32 characters/);
  });

  it('fails in production when IP_HASH_SECRET is missing, default or short', () => {
    const base = { JWT_SECRET: STRONG_JWT, OTP_PEPPER: STRONG_PEPPER };
    expect(() => assertSecureSecrets(prod({ ...base, IP_HASH_SECRET: undefined }))).toThrow(/IP_HASH_SECRET is not set/);
    expect(() => assertSecureSecrets(prod({ ...base, IP_HASH_SECRET: DEV_IP_HASH_SECRET }))).toThrow(
      /IP_HASH_SECRET uses a default/,
    );
    expect(() => assertSecureSecrets(prod({ ...base, IP_HASH_SECRET: 'short' }))).toThrow(/IP_HASH_SECRET must be at least/);
  });

  it('reports every problem at once', () => {
    expect(() =>
      assertSecureSecrets(prod({ JWT_SECRET: 'short', OTP_PEPPER: DEV_OTP_PEPPER })),
    ).toThrow(/JWT_SECRET must be at least[\s\S]*OTP_PEPPER uses a default/);
  });
});

describe('boot (config/env)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to load in production with insecure secrets', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'change-me-in-production');
    vi.stubEnv('OTP_PEPPER', STRONG_PEPPER);
    vi.stubEnv('IP_HASH_SECRET', STRONG_IP);
    vi.resetModules();
    await expect(import('../src/config/env.js')).rejects.toThrow(/Insecure auth configuration/);
  });

  it('loads in production with secure secrets', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', STRONG_JWT);
    vi.stubEnv('OTP_PEPPER', STRONG_PEPPER);
    vi.stubEnv('IP_HASH_SECRET', STRONG_IP);
    vi.resetModules();
    await expect(import('../src/config/env.js')).resolves.toBeDefined();
  });
});
