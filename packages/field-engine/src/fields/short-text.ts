import { shortTextValue } from '../values';
import { defineField, placeholder } from './shared';

export const shortTextField = defineField(shortTextValue, {
  display: { placeholder },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
