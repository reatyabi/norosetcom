import { z } from 'zod';
import { generateId } from './ids';
import { ID_PATTERNS } from './ids';
import { LIMITS } from './limits';
import { richTextSchema } from './rich-text';
import { isHttpsUrl } from './text';

// ساختار definition (docs/architecture.md §8.3) با معماری ۶ ناحیه‌ای.
// این schema ساختار داده‌ها را بررسی می‌کند؛ settings هر نوع در validateDefinition بررسی می‌شود.

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

export const bodyItemSchema = z.discriminatedUnion('kind', [fieldElementSchema, contentElementSchema]);

export const pageSchema = z.strictObject({
  page_id: pageId,
  kind: z.enum(PAGE_KINDS),
  title: z.string().max(200).default(''),
  body: z.strictObject({ items: z.array(bodyItemSchema).default([]) }).prefault({}),
  condition: conditionSchema.optional(),
});

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
export type FormThemePreset = (typeof FORM_THEME_PRESETS)[number];
export const FORM_THEME_BACKGROUNDS = ['solid', 'gradient', 'mesh', 'image'] as const;
export const FORM_THEME_BUTTON_STYLES = ['filled', 'outline', 'soft', 'tonal', 'glass', 'shadow'] as const;
export const FORM_THEME_RADII = ['none', 'md', 'lg', 'full'] as const;
export const FORM_THEME_TEXT_SIZES = ['sm', 'md', 'lg'] as const;

export const formThemeSchema = z
  .strictObject({
    preset: z.enum(FORM_THEME_PRESETS).default('paper'),
    primary_color: hexColor.default('#4f46e5'),
    background_color: hexColor.default('#f4f4f5'),
    background_style: z.enum(FORM_THEME_BACKGROUNDS).default('solid'),
    background_secondary_color: hexColor.default('#e8edf5'),
    background_angle: z.int().min(0).max(360).default(135),
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

/* ─── اسکیمای نواحی قالب فرم (Defaults) ─── */

export const headerDefaultsSchema = z
  .object({
    logo_url: z.string().default(''),
    brand_title: z.string().default(''),
    brand_subtitle: z.string().default(''),
    align: z.enum(['start', 'center', 'end']).default('start'),
    show_logo: z.boolean().default(true),
    show_title: z.boolean().default(true),
    show_subtitle: z.boolean().default(true),
  })
  .prefault({});

export const topBarDefaultsSchema = z
  .object({
    mode: z.enum(['progress', 'notice', 'none']).default('progress'),
    description: z.string().default(''),
    notice_text: z.string().default(''),
  })
  .prefault({});

export const sidebarDefaultsSchema = z
  .object({
    title: z.string().default('مراحل فرم'),
  })
  .prefault({});

export const bottomBarDefaultsSchema = z
  .object({
    prev_label: z.string().default('مرحله قبلی'),
    next_label: z.string().default('مرحله بعدی'),
    submit_label: z.string().default('ثبت و ارسال'),
  })
  .prefault({});

export const footerDefaultsSchema = z
  .object({
    text: z.string().default('این فرم با نوروست طراحی شده است.'),
    show_branding: z.boolean().default(true),
  })
  .prefault({});

export const formDefaultsSchema = z
  .object({
    header: headerDefaultsSchema,
    top_bar: topBarDefaultsSchema,
    sidebar: sidebarDefaultsSchema,
    bottom_bar: bottomBarDefaultsSchema,
    footer: footerDefaultsSchema,
  })
  .prefault({});

/* ─── اسکیمای چیدمان و وضعیت نواحی (Layout & Zones) ─── */

export const formZonesSchema = z
  .object({
    header: z.boolean().default(true),
    top_bar: z.boolean().default(true),
    sidebar: z.boolean().default(true),
    bottom_bar: z.boolean().default(true),
    footer: z.boolean().default(true),
  })
  .prefault({});

export const formLayoutSchema = z
  .object({
    header_sticky: z.boolean().default(false),
    bottom_bar_fixed: z.boolean().default(true),
    sidebar_collapsible: z.boolean().default(true),
    sidebar_collapsed: z.boolean().default(false),
    main_columns: z.union([z.literal(1), z.literal(2)]).default(1),
    zones: formZonesSchema,
  })
  .prefault({});

/* ─── تعریف کل فرم (FormDefinition) ─── */

export const definitionSchema = z.strictObject({
  version_schema: z.literal(1),
  theme: formThemeSchema,
  layout: formLayoutSchema,
  defaults: formDefaultsSchema,
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

const defaultRandom = (max: number) => Math.floor(Math.random() * max);

/** سازنده فرم پیش‌فرض با ساختار تمیز فارسی و معماری ۶ ناحیه‌ای */
export function createDefaultFormDefinition(options?: {
  title?: string;
  generateIdFn?: (kind: 'page' | 'item' | 'field') => string;
}): FormDefinition {
  const gen = options?.generateIdFn ?? ((kind) => generateId(kind, defaultRandom));
  return {
    version_schema: 1,
    theme: formThemeSchema.parse({}),
    layout: formLayoutSchema.parse({}),
    defaults: formDefaultsSchema.parse({
      top_bar: {
        notice_text: 'لطفاً تمامی موارد را با دقت مطالعه و تکمیل فرمایید.',
      },
    }),
    pages: [
      {
        page_id: gen('page'),
        kind: 'main',
        title: 'صفحه ۱',
        body: { items: [] },
      },
    ],
    settings: { closed_message: '' },
    ending: {},
  };
}

export type Condition = z.output<typeof conditionSchema>;
export type FieldElement = z.output<typeof fieldElementSchema>;
export type ContentElement = z.output<typeof contentElementSchema>;
export type BodyItem = z.output<typeof bodyItemSchema>;
export type FormPage = z.output<typeof pageSchema>;
export type FormTheme = z.output<typeof formThemeSchema>;
export type HeaderDefaults = z.output<typeof headerDefaultsSchema>;
export type TopBarDefaults = z.output<typeof topBarDefaultsSchema>;
export type SidebarDefaults = z.output<typeof sidebarDefaultsSchema>;
export type BottomBarDefaults = z.output<typeof bottomBarDefaultsSchema>;
export type FooterDefaults = z.output<typeof footerDefaultsSchema>;
export type FormDefaults = z.output<typeof formDefaultsSchema>;
export type FormZones = z.output<typeof formZonesSchema>;
export type FormLayout = z.output<typeof formLayoutSchema>;
export type FormDefinition = z.output<typeof definitionSchema>;
