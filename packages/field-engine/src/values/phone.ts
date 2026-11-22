import { defineValueType } from './contract';
import { toAsciiDigits } from './digits';
import { fail, ok } from './shared';

/**
 * نرمال‌سازی موبایل ایران به E.164 (+989xxxxxxxxx). منطق مشابه packages/core
 * ولی عمداً بدون وابستگی به آن (field-engine به هیچ پکیج داخلی وابسته نیست).
 */
export function normalizeIranianMobile(input: string): string | null {
  let s = toAsciiDigits(input).replace(/[\s-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0098')) s = s.slice(4);
  else if (s.startsWith('98')) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  if (!/^9[0-9]{9}$/.test(s)) return null;
  return `+98${s}`;
}

export const phoneValue = defineValueType({
  type: 'phone',
  constraints: {},
  validate: (value) => {
    if (typeof value !== 'string') return fail('invalid_type');
    const normalized = normalizeIranianMobile(value);
    return normalized ? ok(normalized) : fail('invalid_phone');
  },
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value) => (value.startsWith('+98') ? `0${value.slice(3)}` : value),
});
