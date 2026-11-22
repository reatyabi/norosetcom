import { z } from 'zod';
import type { FieldResult, FieldType, JsonValue } from '../contract';
import type { ConditionOp } from '../schema';
import { withCheck, type ValueType } from '../values';

/** تنظیم نمایشی مشترک فیلدهای متنی. */
export const placeholder = z.string().max(200).default('');

/**
 * فیلد فرم = نوع مقدار + تنظیمات نمایشی + رفتار شرطی. settings ذخیره‌شده تخت می‌ماند
 * (قیدهای داده و تنظیمات نمایشی کنار هم)، ولی هر کلید فقط به یکی از این دو دسته تعلق دارد.
 */
export function defineField<C, V, Sh extends z.ZodRawShape, D extends z.ZodRawShape>(
  value: ValueType<C, V, Sh>,
  options: {
    display: D;
    conditionOps: readonly ConditionOp[];
    normalizeConditionValue?: (op: ConditionOp, input: unknown, settings: C) => FieldResult<JsonValue>;
  },
): FieldType<C & z.output<z.ZodObject<D>>, V> {
  type S = C & z.output<z.ZodObject<D>>;
  for (const key of Object.keys(options.display)) {
    if (key in value.constraintsShape) throw new Error(`display key collides with constraint: ${value.type}.${key}`);
  }
  const check = value.checkConstraints?.bind(value);
  const settingsSchema = withCheck(
    z.strictObject({ ...options.display, ...value.constraintsShape }),
    check ? (s) => check(s as C) : undefined,
  ) as unknown as z.ZodType<S>;
  return {
    kind: 'field',
    type: value.type,
    value,
    displayKeys: Object.keys(options.display),
    settingsSchema,
    defaultSettings: settingsSchema.parse({}),
    conditionOps: options.conditionOps,
    validate: (input, settings) => value.validate(input, settings),
    serialize: (v) => value.serialize(v),
    deserialize: (stored) => value.deserialize(stored),
    format: (v, settings) => value.format(v, settings),
    ...(options.normalizeConditionValue ? { normalizeConditionValue: options.normalizeConditionValue } : {}),
  };
}
