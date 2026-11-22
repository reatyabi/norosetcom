import { describe, expect, it } from 'vitest';
import { generateOtpCode, hashOtp, verifyOtpTimingSafe } from '../src/otp';

describe('otp', () => {
  it('generates a 6-digit code', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('hashes and verifies (timing-safe)', () => {
    const hash = hashOtp('123456', 'secret');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyOtpTimingSafe('123456', 'secret', hash)).toBe(true);
    expect(verifyOtpTimingSafe('654321', 'secret', hash)).toBe(false);
  });

  it('different secrets produce different hashes', () => {
    expect(hashOtp('123456', 'a')).not.toBe(hashOtp('123456', 'b'));
  });
});
