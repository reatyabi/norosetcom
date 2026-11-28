import { shortTextValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const shortTextField = defineField(shortTextValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
