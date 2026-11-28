import { multiChoiceValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const multiChoiceField = defineField(multiChoiceValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['contains', 'is_empty'],
  // contains: مقدار شرط باید یکی از گزینه‌ها باشد.
  normalizeConditionValue: (op, value, settings) =>
    op === 'contains' && typeof value === 'string' && settings.options.some((o) => o.value === value)
      ? { ok: true, value }
      : { ok: false, code: 'invalid_condition_value' },
});
