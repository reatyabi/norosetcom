import { z } from 'zod';
import { imageRefSchema, type ImageRef } from './assets';
import { elementImages, elementIssues, type AnyElement, type ElementIssue } from './elements';
import { SEO_ENTITIES } from './seo';
import { defaultTheme, themeSchema } from './theme';

// محتوای سطح صفحه (پیش‌نویس در draft_content؛ در انتشار داخل snapshot).

export const PROFILE_LAYOUTS = ['stacked', 'side_right', 'side_left'] as const;
export type ProfileLayout = (typeof PROFILE_LAYOUTS)[number];

/** زیردامنه‌ی صفحه. */
export const PAGE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PAGE_SLUG_MIN = 2;
export const PAGE_SLUG_MAX = 63;
/** چند بار نشانی صفحه عوض می‌شود؛ هر نشانی قبلی برای همان صفحه رزرو می‌ماند و ریدایرکت می‌شود. */
export const MAX_SLUG_CHANGES = 3;

export const pageContentSchema = z
  .object({
    profile: z
      .object({
        name: z.string().trim().max(80),
        bio: z.string().trim().max(300).default(''),
        avatar: imageRefSchema.nullable().default(null),
        // چیدمان آواتار و متن: عمودی (وسط‌چین)، کنار هم با آواتار در راست یا در چپ
        layout: z.enum(PROFILE_LAYOUTS).default('stacked'),
      })
      .strict(),
    theme: themeSchema,
    seo: z
      .object({
        title: z.string().trim().max(70).default(''),
        description: z.string().trim().max(200).default(''),
        og_image: imageRefSchema.nullable().default(null),
        /** قرارگیری در نتایج موتورهای جستجو؛ پیش‌فرض noindex. */
        indexable: z.boolean().default(false),
        /** صاحب صفحه برای JSON-LD (شخص/سازمان؛ shared/seo.ts)؛ null ← بدون داده‌ی ساختاریافته. */
        entity: z.enum(SEO_ENTITIES).nullable().default(null),
      })
      .strict()
      .default({ title: '', description: '', og_image: null, indexable: false, entity: null }),
    layout: z.literal('single_column').default('single_column'),
  })
  .strict();
export type PageContent = z.infer<typeof pageContentSchema>;

export function defaultContent(name: string): PageContent {
  return {
    profile: { name, bio: '', avatar: null, layout: 'stacked' },
    theme: defaultTheme(),
    seo: { title: '', description: '', og_image: null, indexable: false, entity: null },
    layout: 'single_column',
  };
}

/** آنچه منتشر و در صفحه‌ی عمومی رندر می‌شود. */
export interface Snapshot {
  content: PageContent;
  elements: AnyElement[];
  /** فقط قالب‌های مدیریت پلتفرم: تصویر بندانگشتی گالری که مرورگر ادمین هنگام انتشار می‌سازد (`platform/{uuid}`). */
  thumb?: string;
}

export interface PublishIssue {
  elementId: string | null;
  code: ElementIssue | 'missing_name' | 'no_elements';
}

export function publishIssues(content: PageContent, visibleElements: AnyElement[]): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!content.profile.name) issues.push({ elementId: null, code: 'missing_name' });
  if (visibleElements.length === 0) issues.push({ elementId: null, code: 'no_elements' });
  for (const el of visibleElements) for (const code of elementIssues(el)) issues.push({ elementId: el.id, code });
  return issues;
}

export function contentImages(content: PageContent): ImageRef[] {
  const bg = content.theme.overrides.background;
  return [
    ...(content.profile.avatar ? [content.profile.avatar] : []),
    ...(content.seo.og_image ? [content.seo.og_image] : []),
    ...(bg?.kind === 'image' ? [bg.image] : []),
  ];
}

export function snapshotImages(snapshot: Snapshot): ImageRef[] {
  return [...contentImages(snapshot.content), ...snapshot.elements.flatMap(elementImages)];
}
