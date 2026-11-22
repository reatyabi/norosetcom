import { describe, expect, it } from 'vitest';
import { contentTypes, fieldTypes } from '@noroset/field-engine';
import {
  BASIC_ELEMENTS,
  elementSpecs,
  GROUP_PLACE,
  isBasicElementType,
  specsAt,
} from '../src/app/(panel)/form/[id]/editor/_components/settings-spec';

// قاعده‌ی ادیتور فرم (docs/architecture.md §8.8): عمومی و ظاهر در کارت، اعتبارسنجی و منطق در دیالوگ.

const settingsKeys = (type: string): string[] => {
  const field = fieldTypes.get(type);
  if (field) return [...Object.keys(field.value.constraintsShape), ...field.displayKeys];
  const content = contentTypes.get(type);
  if (!content) throw new Error(`unknown type ${type}`);
  // انواع محتوا schema شیء دارند؛ کلیدهای shape همان کلیدهای settings است.
  return Object.keys((content.settingsSchema as unknown as { shape: Record<string, unknown> }).shape);
};

describe('form editor settings placement', () => {
  it('covers exactly the field and content types of field-engine', () => {
    expect(Object.keys(BASIC_ELEMENTS).sort()).toEqual([...fieldTypes.keys(), ...contentTypes.keys()].sort());
    for (const [type, def] of Object.entries(BASIC_ELEMENTS)) {
      expect(def.family, type).toBe(fieldTypes.has(type) ? 'field' : 'content');
    }
  });

  it('assigns every settings key of every element exactly once', () => {
    for (const type of Object.keys(BASIC_ELEMENTS)) {
      if (!isBasicElementType(type)) throw new Error(type);
      const covered = elementSpecs(type)
        .filter((s) => s.scope === 'settings')
        .flatMap((s) => s.keys);
      expect(new Set(covered).size, type).toBe(covered.length);
      expect([...covered].sort(), type).toEqual(settingsKeys(type).sort());
    }
  });

  it('places element keys: fields get label, description, required inline; every element gets its condition in advanced', () => {
    for (const type of Object.keys(BASIC_ELEMENTS)) {
      if (!isBasicElementType(type)) throw new Error(type);
      const inline = specsAt(type, 'inline').filter((s) => s.scope === 'element').flatMap((s) => s.keys);
      const advanced = specsAt(type, 'advanced').filter((s) => s.scope === 'element').flatMap((s) => s.keys);
      expect(inline, type).toEqual(fieldTypes.has(type) ? ['label', 'description', 'required'] : []);
      expect(advanced, type).toEqual(['condition']);
    }
  });

  it('general/appearance are inline and validation/logic are advanced', () => {
    expect(GROUP_PLACE).toEqual({ general: 'inline', appearance: 'inline', validation: 'advanced', logic: 'advanced' });
  });

  it('validation settings are data constraints and display settings never leave the card', () => {
    for (const field of fieldTypes.values()) {
      if (!isBasicElementType(field.type)) throw new Error(field.type);
      const constraints = new Set(Object.keys(field.value.constraintsShape));
      for (const spec of elementSpecs(field.type)) {
        if (spec.scope !== 'settings') continue;
        if (spec.group === 'validation') for (const k of spec.keys) expect(constraints.has(k), `${field.type}.${k}`).toBe(true);
        if (spec.keys.some((k) => field.displayKeys.includes(k))) expect(GROUP_PLACE[spec.group], field.type).toBe('inline');
      }
    }
  });
});
