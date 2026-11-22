import { describe, expect, it } from 'vitest';
import { fieldTypes, pickConstraints, valueTypes } from '../src';

// لایه‌ی «نوع مقدار» (docs/architecture.md §8.6): قید داده از تنظیم نمایشی جداست و قالب settings
// ذخیره‌شده‌ی فرم‌ها تغییر نکرده است.

/** کلیدهای settings هر نوع فیلد؛ تغییر این جدول یعنی تغییر قالب ذخیره‌شده‌ی تعریف فرم. */
const SETTINGS_KEYS: Record<string, { constraints: string[]; display: string[] }> = {
  short_text: { constraints: ['max_length', 'min_length'], display: ['placeholder'] },
  long_text: { constraints: ['max_length', 'min_length'], display: ['placeholder'] },
  number: { constraints: ['integer', 'max', 'min'], display: ['placeholder'] },
  email: { constraints: [], display: ['placeholder'] },
  phone: { constraints: [], display: ['placeholder'] },
  single_choice: { constraints: ['options'], display: ['display'] },
  multi_choice: { constraints: ['max_selected', 'min_selected', 'options'], display: [] },
  date: { constraints: ['max', 'min'], display: [] },
  rating: { constraints: ['max'], display: [] },
};

describe('value types', () => {
  it('every field type is backed by the value type of the same name', () => {
    expect([...valueTypes.keys()].sort()).toEqual([...fieldTypes.keys()].sort());
    for (const field of fieldTypes.values()) {
      expect(field.value, field.type).toBe(valueTypes.get(field.type));
    }
  });

  it('each settings key is either a data constraint or a display setting, never both', () => {
    for (const field of fieldTypes.values()) {
      const expected = SETTINGS_KEYS[field.type];
      expect(expected, field.type).toBeDefined();
      expect(Object.keys(field.value.constraintsShape).sort(), field.type).toEqual(expected!.constraints);
      expect([...field.displayKeys].sort(), field.type).toEqual(expected!.display);
    }
  });

  it('field settings stay flat: unknown keys and nested groups are rejected', () => {
    for (const field of fieldTypes.values()) {
      expect(field.settingsSchema.safeParse({ nope: 1 }).success, field.type).toBe(false);
      expect(field.settingsSchema.safeParse({ constraints: {} }).success, field.type).toBe(false);
    }
  });

  it('constraints of a field settings object pass the value type schema on their own', () => {
    for (const field of fieldTypes.values()) {
      const settings = field.defaultSettings as Record<string, unknown>;
      const constraints = pickConstraints(field.value, settings);
      expect(field.value.constraintsSchema.parse(constraints), field.type).toEqual(field.value.defaultConstraints);
      for (const key of field.displayKeys) expect(constraints, field.type).not.toHaveProperty(key);
    }
  });

  it('display settings are not constraints: the value schema rejects them', () => {
    const number = valueTypes.get('number')!;
    expect(number.constraintsSchema.safeParse({ placeholder: 'x' }).success).toBe(false);
    expect(valueTypes.get('single_choice')!.constraintsSchema.safeParse({ display: 'dropdown' }).success).toBe(false);
  });

  it('cross-key checks report the same machine code at both levels', () => {
    const number = fieldTypes.get('number')!;
    for (const schema of [number.settingsSchema, number.value.constraintsSchema]) {
      const r = schema.safeParse({ min: 5, max: 1 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.map((i) => [i.path, i.message])).toEqual([[[], 'min_gt_max']]);
    }
  });

  it('a value validated with constraints alone equals the field validated with full settings', () => {
    const cases: Array<[string, Record<string, unknown>, unknown]> = [
      ['short_text', { placeholder: 'نام', min_length: 2 }, '  علی  '],
      ['number', { placeholder: '۰', integer: true, max: 10 }, '۷'],
      ['number', { integer: true }, '۷٫۵'],
      ['phone', { placeholder: '09…' }, '۰۹۱۲ ۳۴۵ ۶۷۸۹'],
      ['email', {}, 'A@Example.COM'],
      ['date', { min: '2026-01-01' }, '2025-12-31'],
      ['single_choice', { display: 'dropdown' }, 'option_2'],
      ['multi_choice', { max_selected: 1 }, ['option_2', 'option_1']],
      ['rating', { max: 3 }, 4],
    ];
    for (const [type, overrides, input] of cases) {
      const field = fieldTypes.get(type)!;
      const settings = field.settingsSchema.parse(overrides) as Record<string, unknown>;
      const constraints = field.value.constraintsSchema.parse(pickConstraints(field.value, settings));
      expect(field.value.validate(input, constraints), type).toEqual(field.validate(input, settings));
    }
  });
});
