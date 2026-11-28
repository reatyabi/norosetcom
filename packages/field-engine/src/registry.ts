import { licenseBadgeChrome } from './chrome/simple';
import { navButtonsChrome } from './chrome/nav-buttons';
import { imageContent } from './content/image';
import { textContent } from './content/text';
import { videoContent } from './content/video';
import type { ChromeType, ContentType, FieldType } from './contract';
import { dateField } from './fields/date';
import { emailField } from './fields/email';
import { longTextField } from './fields/long-text';
import { multiChoiceField } from './fields/multi-choice';
import { numberField } from './fields/number';
import { phoneField } from './fields/phone';
import { ratingField } from './fields/rating';
import { shortTextField } from './fields/short-text';
import { singleChoiceField } from './fields/single-choice';

// سه رجیستری جدا. افزودن نوع جدید = یک ماژول + افزودن به فهرست همین‌جا.

function buildRegistry<T extends { type: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.type)) throw new Error(`duplicate element type: ${item.type}`);
    map.set(item.type, item);
  }
  return map;
}

export const fieldTypes: ReadonlyMap<string, FieldType> = buildRegistry<FieldType>([
  shortTextField,
  longTextField,
  numberField,
  emailField,
  phoneField,
  singleChoiceField,
  multiChoiceField,
  dateField,
  ratingField,
]);

export const contentTypes: ReadonlyMap<string, ContentType> = buildRegistry<ContentType>([
  textContent,
  imageContent,
  videoContent,
]);

export const chromeTypes: ReadonlyMap<string, ChromeType> = buildRegistry<ChromeType>([
  navButtonsChrome,
  licenseBadgeChrome,
]);
