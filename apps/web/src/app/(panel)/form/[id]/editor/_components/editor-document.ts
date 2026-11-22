import { formThemeSchema, richTextSchema, type FormTheme } from '@noroset/field-engine';
import { isBasicElementType } from './settings-spec';
import { EMPTY_HEADER_LOGO, newId, type EditorCondition, type EditorField, type EditorPage, type HeaderAlign, type HeaderLogo } from './types';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const PAGE_ID = /^p_[a-z0-9]{8}$/;
const ITEM_ID = /^i_[a-z0-9]{8}$/;
const FIELD_ID = /^f_[a-z0-9]{8}$/;
const CONDITION_OPS = new Set(['eq', 'neq', 'gt', 'lt', 'contains', 'is_empty']);
const TYPE_LABELS: Record<string, string> = {
  short_text: 'متن کوتاه',
  long_text: 'متن بلند',
  number: 'عدد',
  email: 'ایمیل',
  phone: 'موبایل',
  single_choice: 'تک‌انتخابی',
  multi_choice: 'چندانتخابی',
  date: 'تاریخ',
  rating: 'امتیاز',
  text: 'متن',
  image: 'تصویر',
  video: 'ویدیو',
};

function readCondition(value: unknown): EditorCondition | undefined {
  if (
    !isObject(value) ||
    (value.effect !== 'show' && value.effect !== 'hide') ||
    typeof value.field_id !== 'string' ||
    !FIELD_ID.test(value.field_id) ||
    typeof value.op !== 'string' ||
    !CONDITION_OPS.has(value.op)
  ) {
    return undefined;
  }
  if (
    value.value !== undefined &&
    typeof value.value !== 'string' &&
    typeof value.value !== 'number' &&
    typeof value.value !== 'boolean'
  ) {
    return undefined;
  }
  return {
    effect: value.effect,
    field_id: value.field_id,
    op: value.op as EditorCondition['op'],
    ...(value.value === undefined ? {} : { value: value.value }),
  };
}

function readField(value: unknown): EditorField {
  if (!isObject(value) || (value.kind !== 'field' && value.kind !== 'content')) {
    throw new Error('ساختار یکی از المان‌های پیش‌نویس قابل ویرایش نیست.');
  }
  const itemId = value.item_id;
  if (typeof itemId !== 'string' || !ITEM_ID.test(itemId)) {
    throw new Error('شناسه‌ی یکی از المان‌های پیش‌نویس معتبر نیست.');
  }
  if (typeof value.type !== 'string' || !isBasicElementType(value.type)) {
    throw new Error('نوع یکی از المان‌های پیش‌نویس در این نسخه از ادیتور پشتیبانی نمی‌شود.');
  }
  const type = value.type;
  const family = value.kind;
  if ((family === 'field' && ['text', 'image', 'video'].includes(type)) ||
      (family === 'content' && !['text', 'image', 'video'].includes(type))) {
    throw new Error('نوع و دسته‌ی یکی از المان‌های پیش‌نویس با هم سازگار نیستند.');
  }
  if (value.settings !== undefined && !isObject(value.settings)) {
    throw new Error('تنظیمات یکی از المان‌های پیش‌نویس ساختار معتبری ندارد.');
  }

  const description =
    typeof value.description === 'string'
      ? value.description
      : richTextSchema.parse(value.description ?? { blocks: [] });
  let fieldId: string;
  if (family === 'field') {
    const rawFieldId = value.field_id;
    if (typeof rawFieldId !== 'string' || !FIELD_ID.test(rawFieldId)) {
      throw new Error('شناسه‌ی یکی از پرسش‌های پیش‌نویس معتبر نیست.');
    }
    fieldId = rawFieldId;
  } else {
    fieldId = newId('field');
  }

  return {
    id: itemId,
    fieldId,
    type,
    family,
    typeLabel: TYPE_LABELS[type] ?? type,
    label: typeof value.label === 'string' ? value.label : '',
    description,
    required: value.required === true,
    settings: structuredClone(isObject(value.settings) ? value.settings : {}),
    condition: readCondition(value.condition),
    conditionDirty: false,
    dirtyKeys: [],
    source: structuredClone(value),
  };
}

/** عناصر هدر پیش‌فرض (`defaults.header.elements`). */
function headerElements(source: JsonObject): JsonObject[] {
  const defaults = isObject(source.defaults) ? source.defaults : {};
  const header = isObject(defaults.header) ? defaults.header : {};
  return Array.isArray(header.elements) ? (header.elements as JsonObject[]) : [];
}

function readHeaderLogo(source: JsonObject): HeaderLogo {
  const el = headerElements(source).find((e) => e.type === 'logo_title');
  if (!el) return { ...EMPTY_HEADER_LOGO };
  const settings = isObject(el.settings) ? el.settings : {};
  const align: HeaderAlign =
    settings.align === 'center' || settings.align === 'end' ? settings.align : 'start';
  return {
    title: typeof settings.title === 'string' ? settings.title : '',
    subtitle: typeof settings.subtitle === 'string' ? settings.subtitle : '',
    logo_url: typeof settings.logo_url === 'string' ? settings.logo_url : '',
    align,
    visible: settings.visible !== false,
    show_logo: settings.show_logo !== false,
    show_title: settings.show_title !== false,
    show_subtitle: settings.show_subtitle !== false,
  };
}

/** چسبیدن هدر از layout سطح فرم خوانده می‌شود. */
function readHeaderSticky(source: JsonObject): boolean {
  const layout = isObject(source.layout) ? source.layout : {};
  return layout.header_sticky === true;
}

/** لوگو را در `defaults.header.elements` می‌نویسد؛ وقتی چیزی برای نوشتن/حذف نیست دست نمی‌زند. */
function applyHeaderLogo(source: JsonObject, logo: HeaderLogo): JsonObject {
  const defaults = isObject(source.defaults) ? source.defaults : {};
  const header = isObject(defaults.header) ? defaults.header : {};
  const elements = Array.isArray(header.elements) ? [...(header.elements as JsonObject[])] : [];
  const idx = elements.findIndex((e) => e.type === 'logo_title');
  const existing = idx >= 0;
  const hasContent = logo.title.trim() !== '' || logo.subtitle.trim() !== '' || logo.logo_url.trim() !== '';
  // المان خالی ساخته نمی‌شود؛ فقط یک المان موجودِ عمداً مخفی حفظ می‌شود.
  const has = hasContent || (existing && !logo.visible);

  if (!has) {
    if (!existing) return source;
    return { ...source, defaults: { ...defaults, header: { ...header, elements: elements.filter((e) => e.type !== 'logo_title') } } };
  }

  const current = existing && isObject(elements[idx]!.settings) ? (elements[idx]!.settings as JsonObject) : {};
  const settings: JsonObject = { ...current, title: logo.title, logo_url: logo.logo_url };
  // فقط مقادیر غیرپیش‌فرض یا کلیدهای موجود را می‌نویسیم تا تعریف‌های قدیمی بدون تغییر round-trip شوند.
  const put = (key: keyof HeaderLogo, value: unknown, fallback: unknown) => {
    if (value !== fallback || current[key] !== undefined) settings[key] = value;
  };
  put('subtitle', logo.subtitle, '');
  put('align', logo.align, 'start');
  put('visible', logo.visible, true);
  put('show_logo', logo.show_logo, true);
  put('show_title', logo.show_title, true);
  put('show_subtitle', logo.show_subtitle, true);

  const item_id = existing && typeof elements[idx]!.item_id === 'string' ? elements[idx]!.item_id : newId('item');
  const element: JsonObject = { kind: 'chrome', item_id, type: 'logo_title', settings };
  const next = existing ? elements.map((e, i) => (i === idx ? element : e)) : [...elements, element];
  return { ...source, defaults: { ...defaults, header: { ...header, elements: next } } };
}

/** sticky فقط وقتی نوشته می‌شود که روشن باشد یا از قبل در layout وجود داشته باشد. */
function applyHeaderSticky(source: JsonObject, sticky: boolean): JsonObject {
  const layout = isObject(source.layout) ? source.layout : {};
  if (layout.header_sticky === undefined && !sticky) return source;
  return { ...source, layout: { ...layout, header_sticky: sticky } };
}

export function readEditorDocument(value: unknown): {
  source: JsonObject;
  pages: EditorPage[];
  theme: FormTheme;
  headerLogo: HeaderLogo;
  headerSticky: boolean;
} {
  if (!isObject(value) || !Array.isArray(value.pages) || value.pages.length === 0) {
    throw new Error('ساختار صفحه‌های پیش‌نویس قابل ویرایش نیست.');
  }

  const pages = value.pages.map((raw): EditorPage => {
    if (!isObject(raw)) {
      throw new Error('شناسه‌ی یکی از صفحه‌های پیش‌نویس معتبر نیست.');
    }
    const pageId = raw.page_id;
    if (typeof pageId !== 'string' || !PAGE_ID.test(pageId)) {
      throw new Error('شناسه‌ی یکی از صفحه‌های پیش‌نویس معتبر نیست.');
    }
    if (raw.kind !== 'welcome' && raw.kind !== 'main' && raw.kind !== 'ending') {
      throw new Error('نوع یکی از صفحه‌های پیش‌نویس در این نسخه از ادیتور پشتیبانی نمی‌شود.');
    }
    const body = isObject(raw.body) ? raw.body : {};
    const items = Array.isArray(body.items) ? body.items : [];
    return {
      id: pageId,
      title: typeof raw.title === 'string' ? raw.title : '',
      kind: raw.kind,
      fields: items.map(readField),
      source: structuredClone(raw),
    };
  });

  let theme: FormTheme;
  try {
    theme = formThemeSchema.parse(isObject(value.theme) ? value.theme : {});
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'issues' in error &&
      Array.isArray(error.issues)
    ) {
      const paths = error.issues
        .map((issue: { path?: unknown }) => (Array.isArray(issue.path) ? issue.path.join('.') : ''))
        .filter(Boolean);
      throw new Error(paths.length
        ? `تنظیمات قالب فرم معتبر نیست (${[...new Set(paths)].join('، ')}).`
        : 'تنظیمات قالب فرم معتبر نیست.');
    }
    throw error;
  }

  return { source: structuredClone(value), pages, theme, headerLogo: readHeaderLogo(value), headerSticky: readHeaderSticky(value) };
}

export function writeEditorDocument(
  source: JsonObject,
  pages: readonly EditorPage[],
  theme: FormTheme,
  themeDirty: boolean,
  headerLogo: HeaderLogo = { ...EMPTY_HEADER_LOGO },
  headerSticky = false,
): JsonObject {
  const base = applyHeaderLogo(structuredClone(source), headerLogo);
  const originalTheme = isObject(base.theme) ? base.theme : {};
  const next: JsonObject = {
    ...base,
    ...(themeDirty ? { theme: { ...originalTheme, ...theme } } : {}),
    pages: pages.map((page) => {
      const originalBody = isObject(page.source.body) ? page.source.body : {};
      const newPage = Object.keys(page.source).length === 0;
      return {
        ...structuredClone(page.source),
        page_id: page.id,
        kind: page.kind,
        title: page.title,
        body: {
          ...structuredClone(originalBody),
          items: page.fields.map((field) => {
            const item: JsonObject = structuredClone(field.source);
            const dirty = new Set(field.dirtyKeys ?? []);
            if (newPage || dirty.has('all')) {
              Object.assign(item, {
                item_id: field.id,
                kind: field.family,
                type: field.type,
                settings: structuredClone(field.settings),
              });
              if (field.family === 'field') {
                Object.assign(item, {
                  field_id: field.fieldId,
                  label: field.label,
                  description: field.description,
                  required: field.required,
                });
              }
            } else {
              if (dirty.has('id')) item.item_id = field.id;
              if (dirty.has('family')) item.kind = field.family;
              if (dirty.has('type')) item.type = field.type;
              if (dirty.has('settings')) item.settings = structuredClone(field.settings);
              if (field.family === 'field') {
                if (dirty.has('fieldId')) item.field_id = field.fieldId;
                if (dirty.has('label')) item.label = field.label;
                if (dirty.has('description')) item.description = field.description;
                if (dirty.has('required')) item.required = field.required;
              }
            }
            if (field.family !== 'field') {
              delete item.field_id;
              delete item.label;
              delete item.description;
              delete item.required;
            }
            if (newPage || dirty.has('condition') || field.conditionDirty) {
              if (field.condition) item.condition = field.condition;
              else delete item.condition;
            }
            return item;
          }),
        },
      };
    }),
  };
  return applyHeaderSticky(next, headerSticky);
}
