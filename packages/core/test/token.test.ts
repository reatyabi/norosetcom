import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashToken } from '../src/token';

describe('token', () => {
  it('generates a 32-byte token (base64url) and hashes to sha256 hex', () => {
    const token = generateRefreshToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces distinct tokens and hashes', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});
