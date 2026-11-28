import { longTextValue } from '../values';
import { defineField, baseDisplay2 } from './shared';

export const longTextField = defineField(longTextValue, {
  display: { ...baseDisplay2 },
  conditionOps: ['eq', 'neq', 'contains', 'is_empty'],
});
