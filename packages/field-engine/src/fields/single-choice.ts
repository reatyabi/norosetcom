import { z } from 'zod';
import { singleChoiceValue } from '../values';
import { defineField, baseDisplay1 } from './shared';

export const singleChoiceField = defineField(singleChoiceValue, {
  display: {
    ...baseDisplay1,
    display: z.enum(['radio', 'dropdown']).default('radio'),
  },
  conditionOps: ['eq', 'neq', 'is_empty'],
});
