import { phoneValue } from '../values';
import { defineField, placeholder } from './shared';

export const phoneField = defineField(phoneValue, {
  display: { placeholder },
  conditionOps: ['eq', 'neq', 'is_empty'],
});
