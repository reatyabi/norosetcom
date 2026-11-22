import { VALUE_LIMITS } from './values';

/** سقف‌های تعریف فرم (docs/architecture.md §8.5). */
export const LIMITS = {
  maxPages: 20,
  maxElementsPerArea: 8,
  maxBodyItems: 200,
  maxDefinitionBytes: 500 * 1024,
  maxOptions: VALUE_LIMITS.maxOptions,
  maxLabelLength: VALUE_LIMITS.maxLabelLength,
  maxUrlLength: 2048,
} as const;
