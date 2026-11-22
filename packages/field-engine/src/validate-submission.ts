import { isEmptyValue, walkDefinition, type Answers } from './conditions';
import type { IssueParams } from './contract';
import { fieldTypes } from './registry';
import type { FormDefinition } from './schema';

export interface SubmissionError {
  field_id: string;
  code: string;
  params?: IssueParams;
}

export type ValidateSubmissionResult = { ok: true; answers: Answers } | { ok: false; errors: SubmissionError[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * پاسخ ورودی را با تعریف (نسخه‌ی منتشرشده‌ی معتبر) بررسی می‌کند:
 * شرط‌ها را خودش ارزیابی می‌کند، مقدار فیلدهای پنهان را دور می‌ریزد، کلید ناشناس را رد می‌کند،
 * هر مقدار را validate و serialize می‌کند و answers تخت `{ field_id: value }` برمی‌گرداند.
 */
export function validateSubmission(definition: FormDefinition, raw: unknown): ValidateSubmissionResult {
  if (!isPlainObject(raw)) return { ok: false, errors: [{ field_id: '', code: 'invalid_payload' }] };

  const errors: SubmissionError[] = [];
  const known = new Set<string>();
  for (const page of definition.pages) {
    for (const item of page.body.items) if (item.kind === 'field') known.add(item.field_id);
  }
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) errors.push({ field_id: key, code: 'unknown_field' });
  }

  const { answers } = walkDefinition(definition, (field) => {
    const input = Object.prototype.hasOwnProperty.call(raw, field.field_id) ? raw[field.field_id] : undefined;
    if (isEmptyValue(input)) {
      if (field.required) errors.push({ field_id: field.field_id, code: 'required' });
      return undefined;
    }
    const type = fieldTypes.get(field.type);
    if (!type) {
      errors.push({ field_id: field.field_id, code: 'unknown_type' });
      return undefined;
    }
    const result = type.validate(input, field.settings);
    if (!result.ok) {
      errors.push(
        result.params
          ? { field_id: field.field_id, code: result.code, params: result.params }
          : { field_id: field.field_id, code: result.code },
      );
      return undefined;
    }
    return type.serialize(result.value);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, answers };
}
