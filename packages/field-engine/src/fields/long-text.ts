import { longTextValue } from '../values';
import { defineField, placeholder } from './shared';

export const longTextField = defineField(longTextValue, {
  display: { placeholder },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
