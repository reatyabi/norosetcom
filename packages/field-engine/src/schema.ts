import { z } from 'zod';
import { ID_PATTERNS } from './ids';
import { LIMITS } from './limits';
import { richTextSchema } from './rich-text';
import { isHttpsUrl } from './text';

// ساختار definition (docs/architecture.md §8.3). این schema فقط ساختار را بررسی می‌کند؛
// settings هر نوع و قواعد معنایی (§8.5) در validateDefinition با رجیستری‌ها بررسی می‌شوند.

export const PAGE_KINDS = ['welcome', 'main', 'ending'] as const;
export const CHROME_AREAS = ['header', 'topBar', 'sidebar', 'bottomBar', 'footer'] as const;
export const CONDITION_OPS = ['eq', 'neq', 'gt', 'lt', 'contains', 'is_empty'] as const;

export type PageKind = (typeof PAGE_KINDS)[number];
export type ChromeArea = (typeof CHROME_AREAS)[number];
export type ConditionOp = (typeof CONDITION_OPS)[number];

export const httpsUrlSchema = z
  .string()
  .max(LIMITS.maxUrlLength)
  .refine(isHttpsUrl, { message: 'https_only' });

const pageId = z.string().regex(ID_PATTERNS.page);
const itemId = z.string().regex(ID_PATTERNS.item);
const fieldId = z.string().regex(ID_PATTERNS.field);
const elementType = z.string().min(1).max(64);
const rawSettings = z.record(z.string(), z.unknown()).default({});

/** URL تصویر پس‌زمینه: https در production، اما آپلود نوروفایل در توسعه http://localhost است. */
const isLocalHttpUrl = (value: string): boolean => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value);
const backgroundImageUrl = z
  .string()
  .max(LIMITS.maxUrlLength)
  .refine((value) => value === '' || isHttpsUrl(value) || isLocalHttpUrl(value), { message: 'https_only' });

export const conditionSchema = z.strictObject({
  /** show: فقط وقتی شرط برقرار است نمایش بده؛ hide: وقتی برقرار است پنهان کن (صفحه main رد می‌شود). */
  effect: z.enum(['show', 'hide']),
  field_id: fieldId,
  op: z.enum(CONDITION_OPS),
  value: z.union([z.string().max(1000), z.number(), z.boolean()]).optional(),
});

export const fieldElementSchema = z.strictObject({
  kind: z.literal('field'),
  item_id: itemId,
  field_id: fieldId,
  type: elementType,
  label: z.string().trim().min(1).max(LIMITS.maxLabelLength),
  /**
   * راهنمای پرسش: متن ساده (فرم‌ها و قالب‌های قبلی) یا متن غنی محدود (پررنگ، کج، لینک https، فهرست)؛
   * هر دو پذیرفته و همان‌طور ذخیره می‌شوند. متن ساده‌ی هر دو: richTextPlain.
   */
  description: z.union([z.string().max(2000), richTextSchema]).default(''),
  required: z.boolean().default(false),
  settings: rawSettings,
  condition: conditionSchema.optional(),
});

export const contentElementSchema = z.strictObject({
  kind: z.literal('content'),
  item_id: itemId,
  type: elementType,
  settings: rawSettings,
  condition: conditionSchema.optional(),
});

/** chrome شرطی نیست. */
export const chromeElementSchema = z.strictObject({
  kind: z.literal('chrome'),
  item_id: itemId,
  type: elementType,
  settings: rawSettings,
});

export const bodyItemSchema = z.discriminatedUnion('kind', [fieldElementSchema, contentElementSchema]);

const chromeList = z.array(chromeElementSchema).max(LIMITS.maxElementsPerArea);

const pageAreaSchema = z
  .strictObject({
    mode: z.enum(['inherit', 'custom', 'hidden']).default('inherit'),
    elements: chromeList.optional(),
  })
  .superRefine((area, ctx) => {
    if (area.mode === 'custom' && !area.elements) {
      ctx.addIssue({ code: 'custom', message: 'custom_requires_elements', path: ['elements'] });
    }
    if (area.mode !== 'custom' && area.elements) {
      ctx.addIssue({ code: 'custom', message: 'elements_only_for_custom', path: ['elements'] });
    }
  })
  .prefault({});

export const pageSchema = z.strictObject({
  page_id: pageId,
  kind: z.enum(PAGE_KINDS),
  title: z.string().max(200).default(''),
  header: pageAreaSchema,
  topBar: pageAreaSchema,
  body: z.strictObject({ items: z.array(bodyItemSchema).default([]) }).prefault({}),
  sidebar: pageAreaSchema,
  bottomBar: pageAreaSchema,
  footer: pageAreaSchema,
  /** فقط برای صفحه main مجاز است. */
  condition: conditionSchema.optional(),
});

const defaultAreaSchema = z.strictObject({ elements: chromeList.default([]) }).prefault({});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const FORM_THEME_PRESETS = [
  'paper',
  'mocha',
  'peach',
  'lavender',
  'turquoise',
  'sunset',
  'forest',
  'midnight',
  'aurora',
  'neon',
  'mono',
  'brutal',
] as const;
export const FORM_THEME_BACKGROUNDS = ['solid', 'gradient', 'mesh', 'image'] as const;
export const FORM_THEME_BUTTON_STYLES = ['filled', 'outline', 'soft', 'tonal', 'glass', 'shadow'] as const;
export const FORM_THEME_RADII = ['none', 'md', 'lg', 'full'] as const;
export const FORM_THEME_TEXT_SIZES = ['sm', 'md', 'lg'] as const;

export const formThemeSchema = z
  .strictObject({
    preset: z.enum(FORM_THEME_PRESETS).default('paper'),
    primary_color: hexColor.default('#4f46e5'),
    background_color: hexColor.default('#ffffff'),
    background_style: z.enum(FORM_THEME_BACKGROUNDS).default('solid'),
    background_secondary_color: hexColor.default('#e8edf5'),
    background_angle: z.int().min(0).max(360).default(135),
    /** حالت تصویر؛ برای سازگاری، تعریف‌های قدیمی بدون این فیلدها معتبر می‌مانند. */
    background_image_url: backgroundImageUrl.optional(),
    background_pattern_icon: z.string().max(64).optional(),
    background_pattern_size: z.number().min(8).max(200).optional(),
    background_pattern_color: hexColor.optional(),
    background_image_opacity: z.number().min(0).max(1).optional(),
    background_overlay: z.enum(['none', 'light', 'dark']).optional(),
    background_overlay_color: hexColor.optional(),
    background_overlay_opacity: z.number().min(0).max(1).optional(),
    background_focal_x: z.int().min(0).max(100).optional(),
    background_focal_y: z.int().min(0).max(100).optional(),
    button_style: z.enum(FORM_THEME_BUTTON_STYLES).default('filled'),
    radius: z.enum(FORM_THEME_RADII).default('md'),
    text_size: z.enum(FORM_THEME_TEXT_SIZES).default('md'),
    font: z.enum(['vazirmatn', 'system']).default('vazirmatn'),
  })
  .prefault({});

export const formLayoutSchema = z
  .strictObject({
    header_sticky: z.boolean().default(false),
    bottom_bar_fixed: z.boolean().default(true),
    sidebar_collapsible: z.boolean().default(true),
  })
  .prefault({});

export const definitionSchema = z.strictObject({
  version_schema: z.literal(1),
  theme: formThemeSchema,
  layout: formLayoutSchema,
  defaults: z
    .strictObject({
      header: defaultAreaSchema,
      topBar: defaultAreaSchema,
      sidebar: defaultAreaSchema,
      bottomBar: defaultAreaSchema,
      footer: defaultAreaSchema,
    })
    .prefault({}),
  pages: z.array(pageSchema).min(1).max(LIMITS.maxPages),
  settings: z.strictObject({ closed_message: z.string().max(1000).default('') }).prefault({}),
  ending: z
    .strictObject({
      redirect: z
        .strictObject({
          url: httpsUrlSchema,
          delay_seconds: z.int().min(0).max(60).default(0),
        })
        .optional(),
    })
    .prefault({}),
});

export type Condition = z.output<typeof conditionSchema>;
export type FieldElement = z.output<typeof fieldElementSchema>;
export type ContentElement = z.output<typeof contentElementSchema>;
export type ChromeElement = z.output<typeof chromeElementSchema>;
export type BodyItem = z.output<typeof bodyItemSchema>;
export type FormPage = z.output<typeof pageSchema>;
export type FormTheme = z.output<typeof formThemeSchema>;
export type FormLayout = z.output<typeof formLayoutSchema>;
export type FormDefinition = z.output<typeof definitionSchema>;
