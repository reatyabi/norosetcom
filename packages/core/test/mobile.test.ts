import { describe, expect, it } from 'vitest';
import { normalizeIranianMobile } from '../src/mobile';

describe('normalizeIranianMobile', () => {
  it('normalizes 09xxxxxxxxx', () => {
    expect(normalizeIranianMobile('09123456789')).toBe('+989123456789');
  });

  it('normalizes +989xxxxxxxxx', () => {
    expect(normalizeIranianMobile('+989123456789')).toBe('+989123456789');
  });

  it('normalizes 00989xxxxxxxxx', () => {
    expect(normalizeIranianMobile('00989123456789')).toBe('+989123456789');
  });

  it('normalizes 989xxxxxxxxx', () => {
    expect(normalizeIranianMobile('989123456789')).toBe('+989123456789');
  });

  it('normalizes Persian digits', () => {
    expect(normalizeIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('+989123456789');
  });

  it('normalizes Arabic digits', () => {
    expect(normalizeIranianMobile('٠٩١٢٣٤٥٦٧٨٩')).toBe('+989123456789');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeIranianMobile('0912 345-6789')).toBe('+989123456789');
  });

  it('returns null for invalid input', () => {
    expect(normalizeIranianMobile('12345')).toBeNull();
    expect(normalizeIranianMobile('')).toBeNull();
    expect(normalizeIranianMobile('0912345')).toBeNull();
  });
});
