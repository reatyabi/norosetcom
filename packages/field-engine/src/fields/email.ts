import { emailValue } from '../values';
import { defineField, placeholder } from './shared';

export const emailField = defineField(emailValue, {
  display: { placeholder },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
