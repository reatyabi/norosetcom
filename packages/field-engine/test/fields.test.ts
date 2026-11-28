import { describe, expect, it } from 'vitest';
import { chromeTypes, contentTypes, fieldTypes, formatJalali, type FieldType } from '../src';

function get(type: string): FieldType {
  const t = fieldTypes.get(type);
  if (!t) throw new Error(`missing ${type}`);
  return t;
}

function settings(type: string, overrides: Record<string, unknown> = {}) {
  return get(type).settingsSchema.parse({ ...overrides });
}

describe('registries', () => {
  it('contain exactly the launch types', () => {
    expect([...fieldTypes.keys()].sort()).toEqual(
      ['date', 'email', 'long_text', 'multi_choice', 'number', 'phone', 'rating', 'short_text', 'single_choice'].sort(),
    );
    expect([...contentTypes.keys()].sort()).toEqual(['image', 'text', 'video']);
    expect([...chromeTypes.keys()].sort()).toEqual(
      ['license_badge', 'nav_buttons'].sort(),
    );
  });

  it('every type has defaultSettings that pass its own schema', () => {
    for (const t of [...fieldTypes.values(), ...contentTypes.values(), ...chromeTypes.values()]) {
      expect(t.settingsSchema.safeParse(t.defaultSettings).success, t.type).toBe(true);
    }
  });

  it('license_badge is footer-only', () => {
    expect(chromeTypes.get('license_badge')?.allowedAreas).toEqual(['footer']);
  });
});

describe('field validate/serialize/format', () => {
  it('short_text trims and enforces length', () => {
    const t = get('short_text');
    const s = settings('short_text', { min_length: 2, max_length: 5 });
    expect(t.validate('  علی  ', s)).toEqual({ ok: true, value: 'علی' });
    expect(t.validate('a', s)).toMatchObject({ ok: false, code: 'too_short' });
    expect(t.validate('abcdef', s)).toMatchObject({ ok: false, code: 'too_long', params: { max: 5 } });
    expect(t.validate(12, s)).toMatchObject({ ok: false, code: 'invalid_type' });
  });

  it('short_text counts code points, not UTF-16 units', () => {
    const s = settings('short_text', { max_length: 2 });
    expect(get('short_text').validate('😀😀', s).ok).toBe(true);
  });

  it('long_text normalizes newlines', () => {
    expect(get('long_text').validate('a\r\nb', settings('long_text'))).toEqual({ ok: true, value: 'a\nb' });
  });

  it('number accepts Persian digits and decimal separator, enforces integer/min/max', () => {
    const t = get('number');
    expect(t.validate('۱۲٫۵', settings('number'))).toEqual({ ok: true, value: 12.5 });
    expect(t.validate('1.5', settings('number', { integer: true }))).toMatchObject({ code: 'not_integer' });
    expect(t.validate(0, settings('number', { min: 1 }))).toMatchObject({ code: 'too_small' });
    expect(t.validate(11, settings('number', { max: 10 }))).toMatchObject({ code: 'too_large' });
    expect(t.validate('12abc', settings('number'))).toMatchObject({ code: 'invalid_number' });
    expect(t.validate(Number.NaN, settings('number'))).toMatchObject({ code: 'invalid_number' });
  });

  it('email lowercases the domain only', () => {
    expect(get('email').validate(' Ali@Example.COM ', settings('email'))).toEqual({ ok: true, value: 'Ali@example.com' });
    expect(get('email').validate('not-an-email', settings('email'))).toMatchObject({ code: 'invalid_email' });
  });

  it('phone normalizes Iranian mobiles to E.164 and formats back', () => {
    const t = get('phone');
    expect(t.validate('۰۹۱۲ ۳۴۵ ۶۷۸۹', settings('phone'))).toEqual({ ok: true, value: '+989123456789' });
    expect(t.validate('0098 912 345 6789', settings('phone'))).toEqual({ ok: true, value: '+989123456789' });
    expect(t.validate('02112345678', settings('phone'))).toMatchObject({ code: 'invalid_phone' });
    expect(t.format('+989123456789', settings('phone'))).toBe('09123456789');
  });

  it('single_choice accepts only option values and formats the label', () => {
    const s = settings('single_choice', { options: [{ value: 'a', label: 'الف' }, { value: 'b', label: 'ب' }] });
    expect(get('single_choice').validate('a', s)).toEqual({ ok: true, value: 'a' });
    expect(get('single_choice').validate('z', s)).toMatchObject({ code: 'invalid_option' });
    expect(get('single_choice').format('a', s)).toBe('الف');
  });

  it('choice options must have unique values', () => {
    const r = get('single_choice').settingsSchema.safeParse({
      options: [{ value: 'a', label: '1' }, { value: 'a', label: '2' }],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('duplicate_option_value');
  });

  it('multi_choice stores in option order, enforces bounds and uniqueness', () => {
    const s = settings('multi_choice', {
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }],
      min_selected: 1,
      max_selected: 2,
    });
    const t = get('multi_choice');
    expect(t.validate(['c', 'a'], s)).toEqual({ ok: true, value: ['a', 'c'] });
    expect(t.validate(['a', 'b', 'c'], s)).toMatchObject({ code: 'too_many' });
    expect(t.validate(['a', 'a'], s)).toMatchObject({ code: 'duplicate_selection' });
    expect(t.validate(['x'], s)).toMatchObject({ code: 'invalid_option' });
    expect(t.validate('a', s)).toMatchObject({ code: 'invalid_type' });
    expect(t.format(['a', 'c'], s)).toBe('A، C');
  });

  it('date stores Gregorian ISO, rejects impossible dates, formats as Jalali', () => {
    const t = get('date');
    expect(t.validate('۲۰۲۶-۱۰-۲۰', settings('date'))).toEqual({ ok: true, value: '2026-10-20' });
    expect(t.validate('2026-02-30', settings('date'))).toMatchObject({ code: 'invalid_date' });
    expect(t.validate('2026-01-01', settings('date', { min: '2026-06-01' }))).toMatchObject({ code: 'too_early' });
    expect(formatJalali('2026-10-20')).toBe('۱۴۰۵/۰۷/۲۸');
    expect(formatJalali('2025-03-21')).toBe('۱۴۰۴/۰۱/۰۱');
  });

  it('rating is an integer in 1..max', () => {
    const s = settings('rating', { max: 5 });
    expect(get('rating').validate(5, s)).toEqual({ ok: true, value: 5 });
    expect(get('rating').validate(6, s)).toMatchObject({ code: 'out_of_range' });
    expect(get('rating').validate(2.5, s)).toMatchObject({ code: 'invalid_rating' });
  });

  it('serialize/deserialize round-trips', () => {
    expect(get('number').deserialize(get('number').serialize(42))).toBe(42);
    expect(get('multi_choice').deserialize(get('multi_choice').serialize(['a', 'b']))).toEqual(['a', 'b']);
  });
});
