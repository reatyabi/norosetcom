import { z } from 'zod';
import { defineValueType } from './contract';
import { parseNumber } from './number';
import { fail, ok } from './shared';

export const ratingValue = defineValueType({
  type: 'rating',
  constraints: { max: z.int().min(3).max(10).default(5) },
  validate: (value, c) => {
    const n = parseNumber(value);
    if (n === null || !Number.isInteger(n)) return fail('invalid_rating');
    if (n < 1 || n > c.max) return fail('out_of_range', { min: 1, max: c.max });
    return ok(n);
  },
  serialize: (value: number) => value,
  deserialize: (stored) => Number(stored),
  format: (value, c) => `${value}/${c.max}`,
});
