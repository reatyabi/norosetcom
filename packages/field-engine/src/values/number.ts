import { z } from 'zod';
import { defineValueType } from './contract';
import { toAsciiDigits } from './digits';
import { fail, ok } from './shared';

/** عدد یا رشته‌ی عددی (ارقام فارسی و ممیز «٫» پذیرفته می‌شود). */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const s = toAsciiDigits(value.trim()).replace('٫', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const numberValue = defineValueType({
  type: 'number',
  constraints: {
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().default(false),
  },
  check: (c) => (c.min === undefined || c.max === undefined || c.min <= c.max ? null : 'min_gt_max'),
  validate: (value, c) => {
    const n = parseNumber(value);
    if (n === null) return fail('invalid_number');
    if (c.integer && !Number.isInteger(n)) return fail('not_integer');
    if (c.min !== undefined && n < c.min) return fail('too_small', { min: c.min });
    if (c.max !== undefined && n > c.max) return fail('too_large', { max: c.max });
    return ok(n);
  },
  serialize: (value: number) => value,
  deserialize: (stored) => Number(stored),
  format: (value) => String(value),
});
