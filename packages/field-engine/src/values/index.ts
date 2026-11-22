// نوع‌های مقدار: لایه‌ی مستقل از فرم. هیچ import به بیرون از این پوشه ندارد (قانون dependency-cruiser).

import { multiChoiceValue, singleChoiceValue } from './choice';
import type { ValueType } from './contract';
import { dateValue } from './date';
import { emailValue } from './email';
import { numberValue } from './number';
import { phoneValue } from './phone';
import { ratingValue } from './rating';
import { longTextValue, shortTextValue } from './text';

export * from './contract';
export { VALUE_LIMITS } from './shared';
export { codePointLength, toAsciiDigits } from './digits';
export { formatJalali, parseIsoDate } from './date';
export { normalizeIranianMobile } from './phone';
export { parseNumber } from './number';
export {
  dateValue,
  emailValue,
  longTextValue,
  multiChoiceValue,
  numberValue,
  phoneValue,
  ratingValue,
  shortTextValue,
  singleChoiceValue,
};

const all: readonly ValueType[] = [
  shortTextValue,
  longTextValue,
  numberValue,
  emailValue,
  phoneValue,
  singleChoiceValue,
  multiChoiceValue,
  dateValue,
  ratingValue,
];

export const valueTypes: ReadonlyMap<string, ValueType> = new Map(all.map((v) => [v.type, v]));
