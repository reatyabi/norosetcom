import { z } from 'zod';
import { defineValueType } from './contract';
import { lengthCheck, validateText } from './shared';

export const shortTextValue = defineValueType({
  type: 'short_text',
  constraints: {
    min_length: z.int().min(0).max(1000).default(0),
    max_length: z.int().min(1).max(1000).default(255),
  },
  check: lengthCheck,
  validate: validateText,
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value) => value,
});

export const longTextValue = defineValueType({
  type: 'long_text',
  constraints: {
    min_length: z.int().min(0).max(20000).default(0),
    max_length: z.int().min(1).max(20000).default(5000),
  },
  check: lengthCheck,
  validate: validateText,
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value) => value,
});
