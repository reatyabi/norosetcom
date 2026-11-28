import { describe, expect, it } from 'vitest';
import { fieldTypes, pickConstraints, valueTypes } from '../src';

// لایه‌ی «نوع مقدار» (docs/architecture.md §8.6): قید داده از تنظیم نمایشی جداست.

const BASE_DISPLAY = ['col_span', 'placeholder', 'text_align'];

/** کلیدهای settings هر نوع فیلد */
const SETTINGS_KEYS: Record<string, { constraints: string[]; display: string[] }> = {
  short_text: { constraints: ['max_length', 'min_length'], display: [...BASE_DISPLAY] },
  long_text: { constraints: ['max_length', 'min_length'], display: [...BASE_DISPLAY] },
  number: { constraints: ['integer', 'max', 'min'], display: [...BASE_DISPLAY] },
  email: { constraints: [], display: [...BASE_DISPLAY] },
  phone: { constraints: [], display: [...BASE_DISPLAY] },
  single_choice: { constraints: ['options'], display: [...BASE_DISPLAY, 'display'] },
  multi_choice: { constraints: ['max_selected', 'min_selected', 'options'], display: [...BASE_DISPLAY] },
  date: { constraints: ['max', 'min'], display: [...BASE_DISPLAY] },
  rating: { constraints: ['max'], display: [...BASE_DISPLAY] },
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
      expect(Object.keys(field.value.constraintsShape).sort(), field.type).toEqual(expected!.constraints.sort());
      expect([...field.displayKeys].sort(), field.type).toEqual(expected!.display.sort());
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
    for (const field of fieldTypes.values()) {
      if (!field.displayKeys.length) continue;
      const invalidConstraints = { ...(field.value.defaultConstraints as Record<string, unknown>), [field.displayKeys[0]!]: 'x' };
      expect(field.value.constraintsSchema.safeParse(invalidConstraints).success, field.type).toBe(false);
    }
  });

  it('cross-key checks report the same machine code at both levels', () => {
    const invalid = { min_length: 10, max_length: 5 };
    const fieldResult = fieldTypes.get('short_text')!.settingsSchema.safeParse(invalid);
    const valueResult = valueTypes.get('short_text')!.constraintsSchema.safeParse(invalid);
    expect(fieldResult.success).toBe(false);
    expect(valueResult.success).toBe(false);
    if (!fieldResult.success && !valueResult.success) {
      expect(fieldResult.error.issues[0]?.message).toBe(valueResult.error.issues[0]?.message);
    }
  });

  it('a value validated with constraints alone equals the field validated with full settings', () => {
    const field = fieldTypes.get('number')!;
    const settings = { min: 10, max: 20, integer: true, placeholder: '15' };
    const constraints = pickConstraints(field.value, settings);
    expect(field.validate('15', settings)).toEqual(field.value.validate('15', constraints));
  });
});
