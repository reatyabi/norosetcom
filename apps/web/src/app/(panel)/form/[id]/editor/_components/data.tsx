import {
  AlignRightIcon,
  CalendarIcon,
  CircleDotIcon,
  HashIcon,
  ImageIcon,
  MailIcon,
  PhoneIcon,
  SquareCheckIcon,
  StarIcon,
  TextIcon,
  TypeIcon,
  VideoIcon,
} from 'lucide-react';
import type { ElementDef } from './types';
import type { BasicElementType } from './settings-spec';

// TODO(10b): از fieldTypes / contentTypes رجیستری field-engine ساخته شود.
export const BASIC_GROUPS: { title: string; items: ElementDef[] }[] = [
  {
    title: 'متنی',
    items: [
      { key: 'short_text', label: 'متن کوتاه', icon: <TypeIcon /> },
      { key: 'long_text', label: 'متن بلند', icon: <AlignRightIcon /> },
      { key: 'number', label: 'عدد', icon: <HashIcon /> },
      { key: 'email', label: 'ایمیل', icon: <MailIcon /> },
      { key: 'phone', label: 'موبایل', icon: <PhoneIcon /> },
      { key: 'date', label: 'تاریخ', icon: <CalendarIcon /> },
    ],
  },
  {
    title: 'انتخابی',
    items: [
      { key: 'single_choice', label: 'تک‌انتخابی', icon: <CircleDotIcon /> },
      { key: 'multi_choice', label: 'چندانتخابی', icon: <SquareCheckIcon /> },
      { key: 'rating', label: 'امتیاز', icon: <StarIcon /> },
    ],
  },
  {
    title: 'محتوا',
    items: [
      { key: 'text', label: 'متن', icon: <TextIcon /> },
      { key: 'image', label: 'تصویر', icon: <ImageIcon /> },
      { key: 'video', label: 'ویدیو', icon: <VideoIcon /> },
    ],
  },
];

/** پیش‌نمایش المان پیش از افزودن: کاربرد و یک نمونه‌ی واقعی (عنوان و تنظیمات نمونه). */
export const ELEMENT_INFO: Record<
  BasicElementType,
  { description: string; sample: { label?: string; settings?: Record<string, unknown> } }
> = {
  short_text: { description: 'پاسخ یک‌خطی مثل نام، شهر یا کد ملی.', sample: { label: 'نام و نام خانوادگی' } },
  long_text: { description: 'پاسخ چندخطی برای توضیح، نظر یا پیشنهاد.', sample: { label: 'پیشنهاد شما برای بهتر شدن خدمات' } },
  number: { description: 'فقط عدد؛ ارقام فارسی هم پذیرفته می‌شود و می‌توان کمینه و بیشینه گذاشت.', sample: { label: 'تعداد شرکت‌کنندگان' } },
  email: { description: 'نشانی ایمیل که قالبش همیشه بررسی می‌شود.', sample: { label: 'ایمیل' } },
  phone: { description: 'شماره‌ی موبایل ایران؛ به هر شکلی وارد شود یکسان ذخیره می‌شود.', sample: { label: 'شماره‌ی موبایل' } },
  date: { description: 'انتخاب یک روز؛ در پاسخ‌ها به تاریخ شمسی نمایش داده می‌شود.', sample: { label: 'تاریخ مراجعه' } },
  single_choice: {
    description: 'انتخاب فقط یک گزینه؛ به‌صورت دکمه‌های رادیویی یا فهرست کشویی.',
    sample: {
      label: 'از کجا با ما آشنا شدید؟',
      settings: {
        options: [
          { value: 'option_1', label: 'اینستاگرام' },
          { value: 'option_2', label: 'معرفی دوستان' },
          { value: 'option_3', label: 'جست‌وجوی گوگل' },
        ],
      },
    },
  },
  multi_choice: {
    description: 'انتخاب چند گزینه، با حداقل و حداکثر تعداد انتخاب.',
    sample: {
      label: 'کدام روزها برایتان مناسب است؟',
      settings: {
        options: [
          { value: 'option_1', label: 'شنبه' },
          { value: 'option_2', label: 'دوشنبه' },
          { value: 'option_3', label: 'چهارشنبه' },
        ],
      },
    },
  },
  rating: { description: 'امتیاز با ستاره از ۱ تا مقیاس دلخواه (۳ تا ۱۰).', sample: { label: 'از خدمات ما چقدر راضی بودید؟' } },
  text: {
    description: 'متن توضیحی با قالب‌بندی (پررنگ، لینک، فهرست)؛ پاسخی نمی‌گیرد.',
    sample: {
      settings: {
        doc: {
          blocks: [
            { type: 'paragraph', children: [{ type: 'text', text: 'لطفاً پیش از پاسخ، ' }, { type: 'text', text: 'شرایط ثبت‌نام', bold: true }, { type: 'text', text: ' را بخوانید.' }] },
          ],
        },
      },
    },
  },
  image: { description: 'نمایش یک تصویر از نشانی https با متن جایگزین برای صفحه‌خوان‌ها.', sample: {} },
  video: { description: 'پخش ویدیو از آپارات، یوتیوب یا ویمیو با چسباندن لینک آن.', sample: {} },
};
