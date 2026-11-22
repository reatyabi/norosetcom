// محل هر تنظیم المان‌های پایه در ادیتور فرم (docs/architecture.md §8.8):
// عمومی و ظاهر ← کارت درون‌خطی؛ اعتبارسنجی و منطق شرطی ← دیالوگ «تنظیمات پیشرفته».
// هر کلید تعریف المان (و هر کلید settings نوع آن در field-engine) دقیقاً یک بار این‌جا می‌آید؛
// test/form-editor-settings.test.ts پوشش کامل را با رجیستری‌های field-engine بررسی می‌کند.

export type SettingGroup = 'general' | 'appearance' | 'validation' | 'logic';
export type SettingPlace = 'inline' | 'advanced';

export const GROUP_PLACE: Record<SettingGroup, SettingPlace> = {
  general: 'inline',
  appearance: 'inline',
  validation: 'advanced',
  logic: 'advanced',
};

export type SettingControl =
  | 'label'
  | 'description'
  | 'switch'
  | 'placeholder'
  | 'options'
  | 'select'
  | 'scale'
  | 'int'
  | 'number'
  | 'date'
  | 'rich_text'
  | 'url'
  | 'image_alt'
  | 'video_url'
  | 'condition';

export interface SettingSpec {
  /** element: کلید سطح المان (label، required، condition)؛ settings: کلیدهای settings نوع. */
  scope: 'element' | 'settings';
  /** یک کنترل ممکن است چند کلید را بنویسد (لینک ویدیو ← provider و video_id). */
  keys: readonly string[];
  group: SettingGroup;
  label: string;
  control: SettingControl;
  hint?: string;
  choices?: ReadonlyArray<{ value: string; label: string }>;
}

const el = (key: string, group: SettingGroup, label: string, control: SettingControl, hint?: string): SettingSpec => ({
  scope: 'element',
  keys: [key],
  group,
  label,
  control,
  ...(hint ? { hint } : {}),
});

const set = (
  keys: string | readonly string[],
  group: SettingGroup,
  label: string,
  control: SettingControl,
  extra: Partial<Pick<SettingSpec, 'hint' | 'choices'>> = {},
): SettingSpec => ({ scope: 'settings', keys: typeof keys === 'string' ? [keys] : keys, group, label, control, ...extra });

/** پرسش، راهنما و اجباری‌بودن: مشترک همه‌ی فیلدها. */
const FIELD_COMMON: readonly SettingSpec[] = [
  el('label', 'general', 'عنوان پرسش', 'label'),
  el('description', 'general', 'متن راهنما', 'description'),
  el('required', 'general', 'اجباری', 'switch'),
];

const CONDITION = el('condition', 'logic', 'نمایش شرطی', 'condition', 'فقط به فیلدهای قبل از این المان می‌تواند اشاره کند.');

const placeholder = set('placeholder', 'appearance', 'متن جای‌نگهدار', 'placeholder');
const lengths = [
  set('min_length', 'validation', 'حداقل طول', 'int', { hint: 'بر حسب نویسه' }),
  set('max_length', 'validation', 'حداکثر طول', 'int', { hint: 'بر حسب نویسه' }),
];
const options = set('options', 'general', 'گزینه‌ها', 'options');

export const BASIC_ELEMENTS = {
  short_text: { family: 'field', settings: [placeholder, ...lengths] },
  long_text: { family: 'field', settings: [placeholder, ...lengths] },
  number: {
    family: 'field',
    settings: [
      placeholder,
      set('min', 'validation', 'کمترین مقدار', 'number'),
      set('max', 'validation', 'بیشترین مقدار', 'number'),
      set('integer', 'validation', 'فقط عدد صحیح', 'switch'),
    ],
  },
  email: { family: 'field', settings: [placeholder] },
  phone: { family: 'field', settings: [placeholder] },
  single_choice: {
    family: 'field',
    settings: [
      options,
      set('display', 'appearance', 'شکل نمایش', 'select', {
        choices: [
          { value: 'radio', label: 'دکمه‌های رادیویی' },
          { value: 'dropdown', label: 'فهرست کشویی' },
        ],
      }),
    ],
  },
  multi_choice: {
    family: 'field',
    settings: [
      options,
      set('min_selected', 'validation', 'حداقل انتخاب', 'int'),
      set('max_selected', 'validation', 'حداکثر انتخاب', 'int', { hint: 'خالی = بدون سقف' }),
    ],
  },
  date: {
    family: 'field',
    settings: [
      set('min', 'validation', 'زودترین تاریخ', 'date'),
      set('max', 'validation', 'دیرترین تاریخ', 'date'),
    ],
  },
  rating: { family: 'field', settings: [set('max', 'general', 'مقیاس امتیاز', 'scale')] },
  text: { family: 'content', settings: [set('doc', 'general', 'متن', 'rich_text')] },
  image: {
    family: 'content',
    settings: [
      set('url', 'general', 'نشانی تصویر', 'url', { hint: 'فقط https' }),
      set('alt', 'general', 'متن جایگزین', 'image_alt', { hint: 'برای صفحه‌خوان‌ها' }),
    ],
  },
  video: {
    family: 'content',
    settings: [set(['provider', 'video_id'], 'general', 'لینک ویدیو', 'video_url', { hint: 'آپارات، یوتیوب یا ویمیو' })],
  },
} as const satisfies Record<string, { family: 'field' | 'content'; settings: readonly SettingSpec[] }>;

export type BasicElementType = keyof typeof BASIC_ELEMENTS;

export function isBasicElementType(type: string): type is BasicElementType {
  return Object.prototype.hasOwnProperty.call(BASIC_ELEMENTS, type);
}

/** همه‌ی تنظیمات یک المان، به ترتیب نمایش. */
export function elementSpecs(type: BasicElementType): readonly SettingSpec[] {
  const def = BASIC_ELEMENTS[type];
  return def.family === 'field' ? [...FIELD_COMMON, ...def.settings, CONDITION] : [...def.settings, CONDITION];
}

export function specsAt(type: BasicElementType, place: SettingPlace): SettingSpec[] {
  return elementSpecs(type).filter((s) => GROUP_PLACE[s.group] === place);
}

export function specsIn(type: BasicElementType, group: SettingGroup): SettingSpec[] {
  return elementSpecs(type).filter((s) => s.group === group);
}

/** توضیح تب اعتبارسنجی وقتی قید قابل‌تنظیمی نیست ولی قالب همیشه بررسی می‌شود. */
export const BUILTIN_VALIDATION: Partial<Record<BasicElementType, string>> = {
  email: 'قالب ایمیل همیشه بررسی می‌شود.',
  phone: 'فقط شماره‌ی موبایل ایران پذیرفته و به قالب استاندارد ذخیره می‌شود.',
  single_choice: 'پاسخ فقط یکی از گزینه‌های تعریف‌شده می‌تواند باشد.',
  rating: 'پاسخ عددی صحیح از ۱ تا مقیاس امتیاز است.',
};

/** متن فارسی کدهای خطای تنظیمات (field-engine). */
export const SETTING_ISSUES: Record<string, string> = {
  min_gt_max: 'کمینه نباید از بیشینه بزرگ‌تر باشد.',
  duplicate_option_value: 'دو گزینه نباید مقدار یکسان داشته باشند.',
  https_only: 'نشانی باید با https شروع شود.',
  invalid_date: 'تاریخ معتبر نیست.',
  too_small: 'مقدار کوچک‌تر از حد مجاز است.',
  too_big: 'مقدار بزرگ‌تر از حد مجاز است.',
  invalid_type: 'مقدار معتبر نیست.',
};

export const CONDITION_OP_LABELS: Record<string, string> = {
  eq: 'برابر باشد با',
  neq: 'برابر نباشد با',
  gt: 'بزرگ‌تر باشد از',
  lt: 'کوچک‌تر باشد از',
  contains: 'شامل باشد',
  is_empty: 'خالی باشد',
};
