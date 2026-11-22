import { z } from 'zod';
import { defineValueType } from './contract';
import { toAsciiDigits } from './digits';
import { fail, ok } from './shared';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** تاریخ میلادی معتبر YYYY-MM-DD؛ ارقام فارسی پذیرفته می‌شود. */
export function parseIsoDate(value: string): string | null {
  const s = toAsciiDigits(value.trim());
  const m = ISO_DATE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return s;
}

const isoDate = z.string().refine((s) => parseIsoDate(s) === s, { message: 'invalid_date' });

const jalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

/** ذخیره میلادی ISO؛ نمایش شمسی (مثلاً ۱۴۰۵/۰۷/۲۸). */
export function formatJalali(iso: string): string {
  return jalali.format(new Date(`${iso}T00:00:00Z`));
}

export const dateValue = defineValueType({
  type: 'date',
  constraints: { min: isoDate.optional(), max: isoDate.optional() },
  check: (c) => (c.min === undefined || c.max === undefined || c.min <= c.max ? null : 'min_gt_max'),
  validate: (value, c) => {
    if (typeof value !== 'string') return fail('invalid_type');
    const iso = parseIsoDate(value);
    if (!iso) return fail('invalid_date');
    if (c.min !== undefined && iso < c.min) return fail('too_early', { min: c.min });
    if (c.max !== undefined && iso > c.max) return fail('too_late', { max: c.max });
    return ok(iso);
  },
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value) => formatJalali(value),
});
