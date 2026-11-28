import { ratingValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const ratingField = defineField(ratingValue, {
  display: { ...baseDisplay1 },
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
