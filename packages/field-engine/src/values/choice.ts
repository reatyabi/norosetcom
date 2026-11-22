import { z } from 'zod';
import { defineValueType } from './contract';
import { fail, ok, optionsSchema } from './shared';

export const singleChoiceValue = defineValueType({
  type: 'single_choice',
  constraints: { options: optionsSchema },
  validate: (value, c) => {
    if (typeof value !== 'string') return fail('invalid_type');
    if (!c.options.some((o) => o.value === value)) return fail('invalid_option');
    return ok(value);
  },
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value, c) => c.options.find((o) => o.value === value)?.label ?? value,
});

export const multiChoiceValue = defineValueType({
  type: 'multi_choice',
  constraints: {
    options: optionsSchema,
    min_selected: z.int().min(0).default(0),
    max_selected: z.int().min(1).optional(),
  },
  check: (c) => (c.max_selected === undefined || c.min_selected <= c.max_selected ? null : 'min_gt_max'),
  validate: (value, c) => {
    if (!Array.isArray(value) || !value.every((v): v is string => typeof v === 'string')) {
      return fail('invalid_type');
    }
    if (new Set(value).size !== value.length) return fail('duplicate_selection');
    const order = new Map(c.options.map((o, i) => [o.value, i]));
    if (!value.every((v) => order.has(v))) return fail('invalid_option');
    if (value.length < c.min_selected) return fail('too_few', { min: c.min_selected });
    if (c.max_selected !== undefined && value.length > c.max_selected) {
      return fail('too_many', { max: c.max_selected });
    }
    // ترتیب ذخیره = ترتیب گزینه‌ها (مستقل از ترتیب کلیک).
    return ok([...value].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
  },
  serialize: (value: string[]) => value,
  deserialize: (stored) => (Array.isArray(stored) ? stored.map(String) : []),
  format: (value, c) => value.map((v) => c.options.find((o) => o.value === v)?.label ?? v).join('، '),
});
