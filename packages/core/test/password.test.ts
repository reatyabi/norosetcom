import { describe, expect, it } from 'vitest';
import { hashPassword, isAcceptablePassword, verifyPassword } from '../src/password';

describe('password', () => {
  it('hashes with scrypt and a random salt, verifies correct password only', async () => {
    const a = await hashPassword('correct horse battery');
    const b = await hashPassword('correct horse battery');
    expect(a).toMatch(/^scrypt\$131072\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword('correct horse battery', a)).toBe(true);
    expect(await verifyPassword('correct horse batterx', a)).toBe(false);
  });

  it('reads parameters from the stored hash (older/lower params still verify)', async () => {
    const stored = await hashPassword('رمز فارسی ۱۲۳');
    expect(await verifyPassword('رمز فارسی ۱۲۳', stored)).toBe(true);
  });

  it('rejects malformed hashes without throwing', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$whatever')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$abc$8$1$AAAA$AAAA')).toBe(false);
  });

  it('enforces 8..128 characters (counted as characters, not bytes)', () => {
    expect(isAcceptablePassword('1234567')).toBe(false);
    expect(isAcceptablePassword('12345678')).toBe(true);
    expect(isAcceptablePassword('۱۲۳۴۵۶۷۸')).toBe(true);
    expect(isAcceptablePassword('a'.repeat(128))).toBe(true);
    expect(isAcceptablePassword('a'.repeat(129))).toBe(false);
  });
});
