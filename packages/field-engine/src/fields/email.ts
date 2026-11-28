import { emailValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const emailField = defineField(emailValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
