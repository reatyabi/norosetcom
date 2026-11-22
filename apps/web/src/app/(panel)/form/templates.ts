import { generateId, type IdKind } from '@noroset/field-engine';

// قالب‌های آماده‌ی فرم (گالری قالب‌ها). داده‌ی ثابت در کد که هنگام ساخت به پیش‌نویس فرم تبدیل می‌شود
// (POST /noroform/forms با draftDefinition)؛ شناسه‌ها هر بار تازه ساخته می‌شوند. همه‌ی قالب‌ها با
// validateDefinition قابل انتشارند (تست apps/web/test/form-templates.test.ts).

export const FORM_TEMPLATE_CATEGORIES = ['personal', 'work', 'education'] as const;
export type FormTemplateCategory = (typeof FORM_TEMPLATE_CATEGORIES)[number];

export const FORM_TEMPLATE_CATEGORY_LABELS: Record<FormTemplateCategory, string> = {
  personal: 'شخصی',
  work: 'کاری',
  education: 'آموزشی',
};

type Raw = Record<string, unknown>;

interface FieldSpec {
  type: 'short_text' | 'long_text' | 'number' | 'email' | 'phone' | 'single_choice' | 'multi_choice' | 'date' | 'rating';
  label: string;
  required?: boolean;
  description?: string;
  options?: string[];
  max?: number;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: FormTemplateCategory;
  primaryColor: string;
  backgroundColor: string;
  fields: FieldSpec[];
}

const f = (type: FieldSpec['type'], label: string, extra: Omit<FieldSpec, 'type' | 'label'> = {}): FieldSpec => ({ type, label, ...extra });
const req = { required: true };

export const FORM_TEMPLATES: readonly FormTemplate[] = [
  {
    id: 'contact',
    title: 'اطلاعات تماس',
    description: 'نام، ایمیل، تلفن و آدرس افراد را جمع کنید.',
    category: 'personal',
    primaryColor: '#0f7b0f',
    backgroundColor: '#eef6ee',
    fields: [f('short_text', 'نام و نام خانوادگی', req), f('email', 'ایمیل', req), f('phone', 'شماره‌ی موبایل'), f('long_text', 'آدرس')],
  },
  {
    id: 'rsvp',
    title: 'تأیید حضور',
    description: 'برای مهمانی یا جلسه: می‌آیید یا نه، با چند نفر.',
    category: 'personal',
    primaryColor: '#9d5d00',
    backgroundColor: '#f7f1e8',
    fields: [
      f('short_text', 'نام شما', req),
      f('single_choice', 'در مراسم شرکت می‌کنید؟', { ...req, options: ['بله، می‌آیم', 'متأسفانه نمی‌توانم'] }),
      f('number', 'تعداد همراهان'),
      f('long_text', 'پیام یا توضیح'),
    ],
  },
  {
    id: 'party',
    title: 'دعوت به جشن',
    description: 'دعوت، انتخاب غذا و پیشنهادهای مهمان‌ها.',
    category: 'personal',
    primaryColor: '#8a3ffc',
    backgroundColor: '#f2edfb',
    fields: [
      f('short_text', 'نام شما', req),
      f('single_choice', 'می‌آیید؟', { ...req, options: ['بله', 'شاید', 'نه'] }),
      f('multi_choice', 'کدام غذاها را دوست دارید؟', { options: ['کباب', 'پیتزا', 'سالاد', 'دسر'] }),
      f('long_text', 'پیشنهاد آهنگ یا برنامه'),
    ],
  },
  {
    id: 'event',
    title: 'ثبت‌نام رویداد',
    description: 'ثبت‌نام شرکت‌کننده‌ها با سازمان و زمان دلخواه.',
    category: 'work',
    primaryColor: '#c42b1c',
    backgroundColor: '#f8efed',
    fields: [
      f('short_text', 'نام و نام خانوادگی', req),
      f('email', 'ایمیل', req),
      f('short_text', 'سازمان یا شرکت'),
      f('single_choice', 'کدام روز شرکت می‌کنید؟', { ...req, options: ['روز اول', 'روز دوم', 'هر دو روز'] }),
      f('long_text', 'نیاز خاص (دسترسی‌پذیری، رژیم غذایی و …)'),
    ],
  },
  {
    id: 'job',
    title: 'درخواست همکاری',
    description: 'رزومه‌ی متقاضیان: مشخصات، سمت، سابقه و زمان شروع.',
    category: 'work',
    primaryColor: '#005fb8',
    backgroundColor: '#ebf2fa',
    fields: [
      f('short_text', 'نام و نام خانوادگی', req),
      f('email', 'ایمیل', req),
      f('phone', 'شماره‌ی موبایل', req),
      f('single_choice', 'برای کدام سمت درخواست می‌دهید؟', { ...req, options: ['برنامه‌نویس', 'طراح', 'پشتیبانی', 'فروش'] }),
      f('number', 'سال‌های سابقه‌ی کار'),
      f('date', 'از چه تاریخی می‌توانید شروع کنید؟'),
      f('long_text', 'لینک رزومه یا نمونه‌کار و توضیح بیشتر'),
    ],
  },
  {
    id: 'feedback',
    title: 'رضایت مشتری',
    description: 'امتیاز و نظر مشتری‌ها درباره‌ی محصول یا خدمات.',
    category: 'work',
    primaryColor: '#0e7a78',
    backgroundColor: '#e9f5f4',
    fields: [
      f('rating', 'به‌طور کلی چقدر راضی بودید؟', { ...req, max: 5 }),
      f('single_choice', 'ما را به دوستانتان پیشنهاد می‌کنید؟', { options: ['حتماً', 'شاید', 'نه'] }),
      f('multi_choice', 'کدام بخش‌ها خوب بود؟', { options: ['کیفیت', 'قیمت', 'سرعت', 'پشتیبانی'] }),
      f('long_text', 'چه چیزی را بهتر کنیم؟'),
    ],
  },
  {
    id: 'order',
    title: 'ثبت سفارش',
    description: 'سفارش محصول با تعداد، نشانی ارسال و تاریخ تحویل.',
    category: 'work',
    primaryColor: '#b4009e',
    backgroundColor: '#f8ecf6',
    fields: [
      f('short_text', 'نام سفارش‌دهنده', req),
      f('phone', 'شماره‌ی تماس', req),
      f('single_choice', 'محصول', { ...req, options: ['محصول ۱', 'محصول ۲', 'محصول ۳'] }),
      f('number', 'تعداد', req),
      f('long_text', 'نشانی ارسال', req),
      f('date', 'تاریخ تحویل دلخواه'),
    ],
  },
  {
    id: 'course',
    title: 'بازخورد کلاس',
    description: 'نظر دانشجوها درباره‌ی محتوا، مدرس و برگزاری دوره.',
    category: 'education',
    primaryColor: '#5c2e91',
    backgroundColor: '#f0ebf7',
    fields: [
      f('short_text', 'نام دوره', req),
      f('rating', 'کیفیت محتوا', { ...req, max: 5 }),
      f('rating', 'تسلط مدرس', { ...req, max: 5 }),
      f('long_text', 'مهم‌ترین چیزی که یاد گرفتید'),
      f('long_text', 'پیشنهاد برای دوره‌های بعد'),
    ],
  },
  {
    id: 'signup',
    title: 'ثبت‌نام دوره',
    description: 'ثبت‌نام در کلاس یا کارگاه با سطح و زمان دلخواه.',
    category: 'education',
    primaryColor: '#1b6e3e',
    backgroundColor: '#ebf4ee',
    fields: [
      f('short_text', 'نام و نام خانوادگی', req),
      f('phone', 'شماره‌ی موبایل', req),
      f('single_choice', 'سطح شما', { ...req, options: ['مبتدی', 'متوسط', 'پیشرفته'] }),
      f('multi_choice', 'زمان‌های مناسب', { options: ['صبح', 'عصر', 'آخر هفته'] }),
    ],
  },
];

const random = (max: number) => Math.floor(Math.random() * max);
const id = (kind: IdKind, gen: (max: number) => number) => generateId(kind, gen);

function settingsOf(spec: FieldSpec): Raw {
  if (spec.options) return { options: spec.options.map((label, i) => ({ value: `o${i + 1}`, label })) };
  if (spec.max !== undefined) return { max: spec.max };
  return {};
}

/** تعریف خام فرم از قالب (یک صفحه‌ی main)؛ `gen` برای شناسه‌ها (تست: قطعی). */
export function templateDefinition(template: FormTemplate, gen: (max: number) => number = random): Raw {
  return {
    version_schema: 1,
    theme: { primary_color: template.primaryColor, background_color: template.backgroundColor },
    pages: [
      {
        page_id: id('page', gen),
        kind: 'main',
        title: '',
        body: {
          items: template.fields.map((spec) => ({
            kind: 'field',
            item_id: id('item', gen),
            field_id: id('field', gen),
            type: spec.type,
            label: spec.label,
            description: spec.description ?? '',
            required: spec.required ?? false,
            settings: settingsOf(spec),
          })),
        },
      },
    ],
  };
}

/** فرم خالی: یک صفحه‌ی main بدون فیلد (مثل پیش‌فرض سرور). */
export const BLANK_FORM_TITLE = 'فرم بدون عنوان';
