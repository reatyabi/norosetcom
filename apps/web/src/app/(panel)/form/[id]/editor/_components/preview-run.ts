// اجرای پیش‌نمایش فرم در ادیتور با همان قواعد field-engine (§8.4، §8.6): شرط‌ها به ترتیب سند
// ارزیابی می‌شوند، فیلد پنهان در پاسخ نمی‌آید، و «بعدی» فقط با پاسخ‌های معتبر همین صفحه جلو می‌رود.
// هیچ‌چیز ذخیره نمی‌شود.

import { fieldTypes, isEmptyValue, isShown, type Answers, type Condition } from '@noroset/field-engine';
import type { EditorField, EditorPage } from './types';
import type { AnswerError } from '@noroset/noroform/ui';

export type RawAnswers = Record<string, unknown>;
export type { AnswerError } from '@noroset/noroform/ui';

/** پاسخ‌های serializeشده‌ی فیلدهای قابل‌نمایش و شناسه‌ی آیتم‌های قابل‌نمایش. */
export function runPreview(pages: readonly EditorPage[], raw: RawAnswers): { answers: Answers; visible: Set<string> } {
  const answers: Answers = {};
  const visible = new Set<string>();
  for (const page of pages) {
    for (const item of page.fields) {
      if (!isShown(item.condition as Condition | undefined, answers)) continue;
      visible.add(item.id);
      if (item.family !== 'field') continue;
      const input = raw[item.fieldId];
      if (isEmptyValue(input)) continue;
      const type = fieldTypes.get(item.type);
      const result = type?.validate(input, item.settings);
      if (type && result?.ok) answers[item.fieldId] = type.serialize(result.value);
    }
  }
  return { answers, visible };
}

/** خطای فیلدهای قابل‌نمایش یک صفحه (اجباری خالی یا مقدار نامعتبر). */
export function pageErrors(fields: readonly EditorField[], raw: RawAnswers): Record<string, AnswerError> {
  const errors: Record<string, AnswerError> = {};
  for (const f of fields) {
    if (f.family !== 'field') continue;
    const input = raw[f.fieldId];
    if (isEmptyValue(input)) {
      if (f.required) errors[f.fieldId] = { code: 'required' };
      continue;
    }
    const result = fieldTypes.get(f.type)?.validate(input, f.settings);
    if (result && !result.ok) errors[f.fieldId] = result.params ? { code: result.code, params: result.params } : { code: result.code };
  }
  return errors;
}

export { answerErrorText } from '@noroset/noroform/ui';
