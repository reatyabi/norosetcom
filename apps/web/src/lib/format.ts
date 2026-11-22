const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** ارقام فارسی/عربی ← ASCII (برای ورودی موبایل و کد). */
export function toAsciiDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    return String(p >= 0 ? p : ARABIC_DIGITS.indexOf(ch));
  });
}

const dateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
});

/** تاریخ و ساعت شمسی (تهران). */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === 'string' ? new Date(value) : value);
}

const tehranDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' });
const shortDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
const shortTime = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });

/** تاریخ شمسی (تهران). */
export function formatDate(value: string | Date): string {
  return shortDate.format(typeof value === 'string' ? new Date(value) : value);
}

/** کوتاه مثل فهرست گوگل: امروز ← ساعت، وگرنه تاریخ شمسی (تهران). `now` برای تست. */
export function formatShort(value: string | Date, now: Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return tehranDay.format(d) === tehranDay.format(now) ? shortTime.format(d) : shortDate.format(d);
}
