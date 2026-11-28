import { dateValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const dateField = defineField(dateValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
