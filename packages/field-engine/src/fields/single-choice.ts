import { z } from 'zod';
import { singleChoiceValue } from '../values';
import { defineField } from './shared';

export const singleChoiceField = defineField(singleChoiceValue, {
  display: { display: z.enum(['radio', 'dropdown']).default('radio') },
  conditionOps: ['eq', 'neq', 'is_empty'],
});
