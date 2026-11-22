import { z } from 'zod';

// قرارداد «نوع مقدار»: اعتبارسنجی، نرمال‌سازی، قالب ذخیره و نمایش یک مقدار، مستقل از فرم
// (docs/architecture.md §8.6). این پوشه به هیچ فایل دیگری از field-engine وابسته نیست تا
// بعداً بدون تغییر به پکیج مشترک (مثلاً برای norodata) منتقل شود.

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type IssueParams = Record<string, string | number>;

export type ValueResult<V> = { ok: true; value: V } | { ok: false; code: string; params?: IssueParams };

/**
 * یک نوع مقدار با قیدهای داده‌ی خودش (`C`). قیدها فقط آن چیزی‌اند که درستی مقدار را تعیین
 * می‌کند (کمینه/بیشینه، گزینه‌ها)؛ تنظیم نمایشی (placeholder، شکل نمایش) این‌جا جایی ندارد.
 */
export interface ValueType<C = unknown, V = unknown, Sh extends z.ZodRawShape = z.ZodRawShape> {
  readonly type: string;
  /** کلیدهای قید؛ فیلد فرم همین‌ها را کنار تنظیمات نمایشی خودش در settings تخت نگه می‌دارد. */
  readonly constraintsShape: Sh;
  /** قاعده‌ی بین‌کلیدی قیدها؛ کد ماشینی خطا یا null. */
  checkConstraints?(constraints: C): string | null;
  readonly constraintsSchema: z.ZodType<C>;
  readonly defaultConstraints: C;
  /** ورودی غیرخالی را بررسی و نرمال می‌کند (خالی‌بودن/اجباری‌بودن بیرون بررسی می‌شود). */
  validate(value: unknown, constraints: C): ValueResult<V>;
  serialize(value: V): JsonValue;
  deserialize(stored: JsonValue): V;
  /** نمایش انسانی (مثلاً تاریخ شمسی). */
  format(value: V, constraints: C): string;
}

/** قاعده‌ی بین‌کلیدی را به schema اضافه می‌کند؛ خطا با همان کد ماشینی در ریشه گزارش می‌شود. */
export function withCheck<T extends z.ZodType>(schema: T, check?: (value: z.output<T>) => string | null): T {
  if (!check) return schema;
  return schema.superRefine((value, ctx) => {
    const code = check(value);
    if (code) ctx.addIssue({ code: 'custom', message: code });
  }) as T;
}

type ValueTypeInput<Sh extends z.ZodRawShape, V> = {
  type: string;
  constraints: Sh;
  check?: (constraints: z.output<z.ZodObject<Sh>>) => string | null;
  validate: (value: unknown, constraints: z.output<z.ZodObject<Sh>>) => ValueResult<V>;
  serialize: (value: V) => JsonValue;
  deserialize: (stored: JsonValue) => V;
  format: (value: V, constraints: z.output<z.ZodObject<Sh>>) => string;
};

export function defineValueType<Sh extends z.ZodRawShape, V>(
  input: ValueTypeInput<Sh, V>,
): ValueType<z.output<z.ZodObject<Sh>>, V, Sh> {
  type C = z.output<z.ZodObject<Sh>>;
  const check = input.check;
  const constraintsSchema = withCheck(
    z.strictObject(input.constraints),
    check ? (c) => check(c as C) : undefined,
  ) as unknown as z.ZodType<C>;
  return {
    type: input.type,
    constraintsShape: input.constraints,
    ...(check ? { checkConstraints: check } : {}),
    constraintsSchema,
    defaultConstraints: constraintsSchema.parse({}),
    validate: input.validate,
    serialize: input.serialize,
    deserialize: input.deserialize,
    format: input.format,
  };
}

/** فقط کلیدهای قید را از یک شیء تنظیمات (مثلاً settings فیلد فرم) جدا می‌کند. */
export function pickConstraints(value: ValueType, settings: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value.constraintsShape)) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) out[key] = settings[key];
  }
  return out;
}
