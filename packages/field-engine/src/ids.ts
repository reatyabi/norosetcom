const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 8;

export const ID_PATTERNS = {
  page: /^p_[a-z0-9]{8}$/,
  item: /^i_[a-z0-9]{8}$/,
  field: /^f_[a-z0-9]{8}$/,
} as const;

export type IdKind = keyof typeof ID_PATTERNS;

const PREFIX: Record<IdKind, string> = { page: 'p_', item: 'i_', field: 'f_' };

/**
 * تولید شناسه‌ی پایدار (مثل `f_8k2mq1xz`). منبع تصادفی تزریق می‌شود تا هسته قطعی بماند:
 * `randomInt(max)` باید عدد صحیح در بازه‌ی [0, max) برگرداند (در production مبتنی بر crypto).
 */
export function generateId(kind: IdKind, randomInt: (max: number) => number): string {
  let out = PREFIX[kind];
  for (let i = 0; i < ID_LENGTH; i++) {
    const n = randomInt(ALPHABET.length);
    if (!Number.isInteger(n) || n < 0 || n >= ALPHABET.length) {
      throw new RangeError(`randomInt returned out-of-range value: ${n}`);
    }
    out += ALPHABET[n];
  }
  return out;
}
