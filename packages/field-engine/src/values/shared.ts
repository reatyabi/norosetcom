import { z } from 'zod';
import type { IssueParams, ValueResult } from './contract';
import { codePointLength } from './digits';

/** سقف‌های نوع مقدار (سقف‌های تعریف فرم در limits.ts از همین‌ها می‌خوانند). */
export const VALUE_LIMITS = { maxOptions: 100, maxLabelLength: 500 } as const;

export function ok<V>(value: V): ValueResult<V> {
  return { ok: true, value };
}

export function fail(code: string, params?: IssueParams): ValueResult<never> {
  return params ? { ok: false, code, params } : { ok: false, code };
}

/** رشته را trim کرده و طول را بررسی می‌کند. */
export function validateText(
  value: unknown,
  constraints: { min_length: number; max_length: number },
): ValueResult<string> {
  if (typeof value !== 'string') return fail('invalid_type');
  const v = value.replace(/\r\n?/g, '\n').trim();
  const len = codePointLength(v);
  if (len < constraints.min_length) return fail('too_short', { min: constraints.min_length });
  if (len > constraints.max_length) return fail('too_long', { max: constraints.max_length });
  return ok(v);
}

export function lengthCheck(c: { min_length: number; max_length: number }): string | null {
  return c.min_length <= c.max_length ? null : 'min_gt_max';
}

/** گزینه‌های انتخابی؛ value یکتا (قاعده‌ی ۸ از §8.5). */
export const optionsSchema = z
  .array(
    z.strictObject({
      value: z.string().trim().min(1).max(100),
      label: z.string().trim().min(1).max(VALUE_LIMITS.maxLabelLength),
    }),
  )
  .min(1)
  .max(VALUE_LIMITS.maxOptions)
  .superRefine((options, ctx) => {
    const seen = new Set<string>();
    options.forEach((o, i) => {
      if (seen.has(o.value)) {
        ctx.addIssue({ code: 'custom', message: 'duplicate_option_value', path: [i, 'value'] });
      }
      seen.add(o.value);
    });
  })
  .default([
    { value: 'option_1', label: 'گزینه ۱' },
    { value: 'option_2', label: 'گزینه ۲' },
  ]);
