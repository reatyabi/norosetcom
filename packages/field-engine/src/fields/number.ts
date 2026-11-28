import { numberValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const numberField = defineField(numberValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
