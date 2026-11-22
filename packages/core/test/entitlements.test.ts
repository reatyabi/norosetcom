import { describe, expect, it } from 'vitest';
import { entitlementIssues, FREE_ENTITLEMENTS, resolveEntitlements, tehranMonthRange } from '../src/entitlements';
import { parseUtmCookie } from '../src/utm';

describe('entitlements', () => {
  it('free values match the launch decision (docs/architecture.md §9.11)', () => {
    expect(FREE_ENTITLEMENTS).toEqual({
      'noroform.forms': 3,
      'noroform.submissions_monthly': 100,
      'norolink.pages': 1,
      'norolink.elements_per_page': 30,
      'norolink.detailed_stats': false,
      'norolink.seo': false,
      'norofile.storage_mb': 100,
      'branding.remove': false,
    });
  });

  it('merges stored values over free defaults and ignores bad ones', () => {
    const e = resolveEntitlements({ 'noroform.forms': 10, 'branding.remove': true, 'norolink.pages': -1, 'nope': 5, 'norofile.storage_mb': '9' });
    expect(e['noroform.forms']).toBe(10);
    expect(e['branding.remove']).toBe(true);
    expect(e['norolink.pages']).toBe(1);
    expect(e['norofile.storage_mb']).toBe(100);
    expect(resolveEntitlements(null)).toEqual(FREE_ENTITLEMENTS);
  });

  it('reports invalid admin input', () => {
    expect(entitlementIssues({ 'noroform.forms': 5, 'branding.remove': true })).toEqual([]);
    expect(entitlementIssues({ 'noroform.forms': 1.5, x: 1, 'branding.remove': 1 })).toEqual(['invalid:noroform.forms', 'unknown:x', 'invalid:branding.remove']);
    expect(entitlementIssues([])).toEqual(['not_object']);
  });
});

describe('tehranMonthRange', () => {
  it('returns the Persian month in Tehran time, including month lengths', () => {
    // ۵ آبان ۱۴۰۵ ← آبان از ۱ آبان (۲۳ اکتبر ۲۰۲۶) نیمه‌شب تهران، ۳۰ روز
    const aban = tehranMonthRange(new Date('2026-10-27T12:00:00Z'));
    expect(aban.key).toBe('1405-8');
    expect(aban.start.toISOString()).toBe('2026-10-22T20:30:00.000Z');
    expect(aban.end.toISOString()).toBe('2026-11-21T20:30:00.000Z');
    // ماه‌های اول سال ۳۱ روزه‌اند
    const farvardin = tehranMonthRange(new Date('2026-04-01T12:00:00Z'));
    expect((farvardin.end.getTime() - farvardin.start.getTime()) / 86_400_000).toBe(31);
    // ۲۳:۴۵ تهرانِ آخرین روز مهر هنوز مهر است، ۰۰:۱۵ روز بعد آبان
    expect(tehranMonthRange(new Date('2026-10-22T20:15:00Z')).key).toBe('1405-7');
    expect(tehranMonthRange(new Date('2026-10-22T20:45:00Z')).key).toBe('1405-8');
  });
});

describe('parseUtmCookie', () => {
  it('keeps known keys, trims and drops junk', () => {
    const raw = encodeURIComponent(JSON.stringify({ source: ' instagram ', campaign: 'یلدا', medium: 7, evil: 'x', term: 'a\u0007b' }));
    expect(parseUtmCookie(raw)).toEqual({ source: 'instagram', campaign: 'یلدا', term: 'ab' });
    expect(parseUtmCookie('not json')).toBeNull();
    expect(parseUtmCookie(encodeURIComponent('{}'))).toBeNull();
    expect(parseUtmCookie(undefined)).toBeNull();
  });
});
