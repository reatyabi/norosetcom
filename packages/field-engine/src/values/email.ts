import { defineValueType } from './contract';
import { fail, ok } from './shared';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailValue = defineValueType({
  type: 'email',
  constraints: {},
  validate: (value) => {
    if (typeof value !== 'string') return fail('invalid_type');
    const v = value.trim();
    if (v.length > 254 || !EMAIL.test(v)) return fail('invalid_email');
    // فقط دامنه lowercase می‌شود؛ بخش محلی دست نمی‌خورد.
    const at = v.lastIndexOf('@');
    return ok(v.slice(0, at) + v.slice(at).toLowerCase());
  },
  serialize: (value: string) => value,
  deserialize: (stored) => String(stored),
  format: (value) => value,
});
