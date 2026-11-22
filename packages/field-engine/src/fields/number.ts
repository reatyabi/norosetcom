import { numberValue } from '../values';
import { defineField, placeholder } from './shared';

export const numberField = defineField(numberValue, {
  display: { placeholder },
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
