import { describe, expect, it } from 'vitest';
import { utmCookieValue } from '../src/lib/utm';

describe('utmCookieValue', () => {
  it('keeps utm_* parameters only, trimmed', () => {
    const v = utmCookieValue(new URLSearchParams('utm_source=%20instagram%20&utm_campaign=yalda&ref=x'));
    expect(JSON.parse(v!)).toEqual({ source: 'instagram', campaign: 'yalda' });
    expect(utmCookieValue(new URLSearchParams('ref=x'))).toBeNull();
  });
});
