// خلاصه‌ی سبک تعریف فرم برای تصویر بندانگشتی فهرست فرم‌ها و گالری قالب‌ها. ورودی پیش‌نویس است و
// ممکن است ناقص یا نامعتبر باشد؛ هر چه قابل خواندن نیست کنار می‌رود و هرگز خطا نمی‌دهد.

export interface FormPreviewItem {
  /** نوع فیلد (short_text، single_choice، …) یا `text` برای متن محتوایی. */
  type: string;
  label: string;
  /** چند گزینه‌ی اول فیلدهای انتخابی. */
  options?: string[];
  /** بیشینه‌ی امتیاز فیلد rating. */
  max?: number;
}

export interface FormPreview {
  primaryColor: string;
  backgroundColor: string;
  backgroundStyle: 'solid' | 'gradient' | 'mesh' | 'image';
  backgroundSecondaryColor: string;
  backgroundAngle: number;
  buttonStyle: 'filled' | 'outline' | 'soft' | 'tonal' | 'glass' | 'shadow';
  radius: 'none' | 'md' | 'lg' | 'full';
  textSize: 'sm' | 'md' | 'lg';
  font: 'vazirmatn' | 'system';
  items: FormPreviewItem[];
}

export const PREVIEW_MAX_ITEMS = 4;
const PREVIEW_MAX_OPTIONS = 3;
const PREVIEW_MAX_LABEL = 80;
const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY = '#4f46e5';
const DEFAULT_BACKGROUND = '#ffffff';
const DEFAULT_SECONDARY_BACKGROUND = '#e8edf5';
const BACKGROUND_STYLES = new Set(['solid', 'gradient', 'mesh', 'image']);
const BUTTON_STYLES = new Set(['filled', 'outline', 'soft', 'tonal', 'glass', 'shadow']);
const RADII = new Set(['none', 'md', 'lg', 'full']);
const TEXT_SIZES = new Set(['sm', 'md', 'lg']);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, PREVIEW_MAX_LABEL) : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** متن ساده‌ی اولین بلوک یک متن غنی (پاراگراف/تیتر/فهرست). */
function firstText(doc: unknown): string {
  for (const block of list(isObj(doc) ? doc.blocks : undefined)) {
    if (!isObj(block)) continue;
    const runs = block.type === 'list' ? list(block.items)[0] : block.children;
    const text = list(runs)
      .map((run) => (isObj(run) ? (run.type === 'link' ? list(run.children).map((c) => (isObj(c) ? str(c.text) : '')).join('') : str(run.text)) : ''))
      .join('')
      .trim();
    if (text) return text.slice(0, PREVIEW_MAX_LABEL);
  }
  return '';
}

function previewItem(item: unknown): FormPreviewItem | null {
  if (!isObj(item)) return null;
  const settings = isObj(item.settings) ? item.settings : {};
  if (item.kind === 'field') {
    const label = str(item.label);
    const type = str(item.type);
    if (!label || !type) return null;
    const out: FormPreviewItem = { type, label };
    const options = list(settings.options)
      .map((o) => (isObj(o) ? str(o.label) : ''))
      .filter(Boolean)
      .slice(0, PREVIEW_MAX_OPTIONS);
    if (options.length) out.options = options;
    if (type === 'rating') out.max = typeof settings.max === 'number' && settings.max >= 3 && settings.max <= 10 ? settings.max : 5;
    return out;
  }
  if (item.kind === 'content' && item.type === 'text') {
    const label = firstText(settings.doc);
    return label ? { type: 'text', label } : null;
  }
  return null;
}

/** رنگ‌های تم و چند آیتم اول صفحه‌های اصلی (فیلدها و متن). */
export function formPreview(definition: unknown): FormPreview {
  const def = isObj(definition) ? definition : {};
  const theme = isObj(def.theme) ? def.theme : {};
  const items: FormPreviewItem[] = [];
  for (const page of list(def.pages)) {
    if (!isObj(page) || page.kind !== 'main') continue;
    for (const item of list(isObj(page.body) ? page.body.items : undefined)) {
      const p = previewItem(item);
      if (p) items.push(p);
      if (items.length >= PREVIEW_MAX_ITEMS) break;
    }
    if (items.length >= PREVIEW_MAX_ITEMS) break;
  }
  return {
    primaryColor: typeof theme.primary_color === 'string' && HEX.test(theme.primary_color) ? theme.primary_color : DEFAULT_PRIMARY,
    backgroundColor: typeof theme.background_color === 'string' && HEX.test(theme.background_color) ? theme.background_color : DEFAULT_BACKGROUND,
    backgroundStyle: typeof theme.background_style === 'string' && BACKGROUND_STYLES.has(theme.background_style)
      ? theme.background_style as FormPreview['backgroundStyle']
      : 'solid',
    backgroundSecondaryColor: typeof theme.background_secondary_color === 'string' && HEX.test(theme.background_secondary_color)
      ? theme.background_secondary_color
      : DEFAULT_SECONDARY_BACKGROUND,
    backgroundAngle: typeof theme.background_angle === 'number' && Number.isInteger(theme.background_angle) && theme.background_angle >= 0 && theme.background_angle <= 360
      ? theme.background_angle
      : 135,
    buttonStyle: typeof theme.button_style === 'string' && BUTTON_STYLES.has(theme.button_style)
      ? theme.button_style as FormPreview['buttonStyle']
      : 'filled',
    radius: typeof theme.radius === 'string' && RADII.has(theme.radius)
      ? theme.radius as FormPreview['radius']
      : 'md',
    textSize: typeof theme.text_size === 'string' && TEXT_SIZES.has(theme.text_size)
      ? theme.text_size as FormPreview['textSize']
      : 'md',
    font: theme.font === 'system' ? 'system' : 'vazirmatn',
    items,
  };
}
