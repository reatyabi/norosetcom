import type { IssueParams } from '@noroset/field-engine';

export interface AnswerError {
  code: string;
  params?: IssueParams;
}

const fa = (value: string | number) => (typeof value === 'number' ? value.toLocaleString('fa-IR') : value);

export function answerErrorText({ code, params = {} }: AnswerError): string {
  switch (code) {
    case 'required':
      return 'پاسخ به این پرسش لازم است.';
    case 'too_short':
      return `دست‌کم ${fa(params.min ?? 0)} نویسه بنویسید.`;
    case 'too_long':
      return `حداکثر ${fa(params.max ?? 0)} نویسه مجاز است.`;
    case 'invalid_number':
      return 'یک عدد وارد کنید.';
    case 'not_integer':
      return 'عدد باید صحیح باشد.';
    case 'too_small':
      return `عدد باید دست‌کم ${fa(params.min ?? 0)} باشد.`;
    case 'too_large':
      return `عدد باید حداکثر ${fa(params.max ?? 0)} باشد.`;
    case 'invalid_email':
      return 'ایمیل معتبر نیست.';
    case 'invalid_phone':
      return 'شماره‌ی موبایل ایران وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).';
    case 'invalid_date':
      return 'تاریخ معتبر نیست.';
    case 'too_early':
      return 'این تاریخ زودتر از حد مجاز است.';
    case 'too_late':
      return 'این تاریخ دیرتر از حد مجاز است.';
    case 'too_few':
      return `دست‌کم ${fa(params.min ?? 0)} گزینه انتخاب کنید.`;
    case 'too_many':
      return `حداکثر ${fa(params.max ?? 0)} گزینه انتخاب کنید.`;
    case 'out_of_range':
    case 'invalid_rating':
      return 'یک امتیاز انتخاب کنید.';
    default:
      return 'پاسخ معتبر نیست.';
  }
}
