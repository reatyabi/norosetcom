import { ratingValue } from '../values';
import { defineField } from './shared';

export const ratingField = defineField(ratingValue, {
  display: {},
  conditionOps: ['eq', 'neq', 'gt', 'lt', 'is_empty'],
});
