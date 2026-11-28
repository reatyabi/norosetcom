import { phoneValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const phoneField = defineField(phoneValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'is_empty'],
});
