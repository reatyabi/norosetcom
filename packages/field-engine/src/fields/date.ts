import { dateValue } from '../values';
import { defineField } from './shared';

export const dateField = defineField(dateValue, {
  display: {},
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
