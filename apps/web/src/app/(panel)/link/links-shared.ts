// انواع، برچسب‌ها و کمک‌تابع‌های مشترک صفحه‌های نورولینک (پنل).
import type { ComponentProps } from 'react';
import type { Badge } from '@noroset/ui';
import {
  defaultSettings,
  detectSocialPlatform,
  normalizeHttpUrl,
  suggestLinkLabel,
  type AnyElement,
  type LinkButtonSettings,
  type LinkTemplateCategory,
  type ModerationReason,
  type ModerationStatus,
  type NorolinkLimits,
  type PageContent,
  type PublishIssue,
} from '@noroset/norolink/ui';
import { ApiError } from '@/lib/api';
import { publicLinkUrl } from '@/lib/routes';

export type LinkStatus = 'draft' | 'published';

export interface LinkSummary {
  id: string;
  slug: string;
  /** چند بار نشانی عوض شده (سقف: MAX_SLUG_CHANGES). */
  slugChanges: number;
  title: string;
  status: LinkStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasUnpublishedChanges: boolean;
  createdBy: string | null;
  createdByName: string | null;
  /** محدودیت مؤثر مدیریت پلتفرم (§9.13)؛ قالب‌ها و صفحه‌ی بدون محدودیت ← null/نبودن. */
  moderation?: LinkModeration | null;
}

export interface LinkModeration {
  status: Exclude<ModerationStatus, 'none'>;
  reason: ModerationReason;
  notice: string | null;
  until: string | null;
  /** انتشار، تغییر نشانی و حذف قفل است. */
  locked: boolean;
}

/** ردیف فهرست با پیش‌نویس کوتاه برای تصویر بندانگشتی (چند المان اول قابل‌نمایش). */
export interface LinkListItem extends LinkSummary {
  preview: { content: PageContent; elements: AnyElement[]; assetBaseUrl: string };
}

export type EditorElement = AnyElement & { visible: boolean; sortKey: string };

export interface LinkDetail extends LinkSummary {
  content: PageContent;
  elements: EditorElement[];
  issues: PublishIssue[];
  assetBaseUrl: string;
  limits: NorolinkLimits;
}

/** قالب آماده در ادیتور: هم‌شکل صفحه (API هم‌شکل /norolink/pages) + مشخصات گالری. */
export interface TemplateDetail extends LinkDetail {
  description: string;
  category: LinkTemplateCategory;
  /** لینک واگذاری فعال (تحویل‌نگرفته و ابطال‌نشده). */
  claimLink: ClaimLinkView | null;
  /** آخرین تحویل از این قالب. */
  claimedAt: string | null;
}

/** لینک واگذاری فعال در ادیتور قالب (§9.8). */
export interface ClaimLinkView {
  id: string;
  token: string;
  url: string;
  /** نشانی رزروشده؛ null فقط برای لینک‌های قدیمی (تصادفی هنگام تحویل). */
  slug: string | null;
  businessName: string;
  note: string;
  createdAt: string;
  openCount: number;
  lastOpenedAt: string | null;
}

/** ردیف فهرست قالب‌ها در مدیریت پلتفرم؛ قالب پیش‌فرض (کد) ویرایش نمی‌شود و فقط از گالری برداشته می‌شود. */
export interface AdminTemplateItem {
  id: string;
  source: 'builtin' | 'custom';
  title: string;
  description: string;
  category: LinkTemplateCategory;
  status: LinkStatus;
  removed: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string | null;
  createdByName: string | null;
  preview: { content: PageContent; elements: AnyElement[]; assetBaseUrl: string };
}

/** مسیر عمومی فایل‌ها روی همین origin (rewrite `/api`)؛ تصویر قالب‌های پلتفرم در گالری از اینجا باز می‌شود. */
export const PUBLIC_FILES_BASE = '/api/norofile/public/files';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

export const STATUS: Record<LinkStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'منتشرنشده', variant: 'secondary' },
  published: { label: 'منتشرشده', variant: 'info' },
};

export const ISSUE_LABELS: Record<PublishIssue['code'], string> = {
  missing_name: 'نام پروفایل خالی است.',
  no_elements: 'حداقل یک المان قابل‌نمایش اضافه کنید.',
  missing_label: 'متن دکمه خالی است.',
  missing_url: 'لینک دکمه وارد نشده است.',
  invalid_url: 'این لینک کامل نیست؛ مثلاً example.com یا https://example.com/page',
  blocked_url: 'این لینک مجاز نیست: نشانی IP خام یا دامنه‌ی شبیه درگاه پرداخت را نمی‌توان منتشر کرد.',
  invalid_social: 'یکی از شبکه‌ها مقدار نامعتبر دارد؛ شناسه (مثلاً @name)، لینک، ایمیل یا شماره وارد کنید.',
  empty_social: 'هیچ شبکه‌ی اجتماعی وارد نشده است.',
  empty_text: 'متن خالی است.',
  missing_image: 'تصویر آپلود نشده است.',
  missing_alt: 'متن جایگزین تصویر (alt) وارد نشده است.',
  missing_video: 'لینک ویدیو وارد نشده است.',
  missing_location: 'مکان نقشه مشخص نشده است؛ لینکی با مکان معتبر وارد کنید.',
};

export const PLAN_LIMIT_LABELS: Record<string, string> = {
  max_pages: 'به سقف تعداد صفحه‌های لینک در پلن فعلی رسیده‌اید.',
  max_elements: 'به سقف تعداد المان‌های صفحه رسیده‌اید.',
  element_kind: 'این نوع المان در پلن فعلی نیست.',
};

const PLAN_EXPIRED_TEXT = 'پلن شما تمام شده است؛ برای انتشار صفحه، پلن بخرید.';

/** این متن خطا با خرید پلن رفع می‌شود؟ کنارش دکمه‌ی ارتقا نشان داده می‌شود. */
export function isPlanLimitText(text: string): boolean {
  return text === PLAN_EXPIRED_TEXT || text === 'به سقف پلن فعلی رسیده‌اید.' || Object.values(PLAN_LIMIT_LABELS).includes(text);
}

/** پیام خطای اختصاصی سقف پلن، اگر خطا از این نوع بود. */
export function planLimitMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.code !== 'plan_limit') return null;
  const limit = (err.body as { limit?: string } | null)?.limit;
  return (limit && PLAN_LIMIT_LABELS[limit]) || 'به سقف پلن فعلی رسیده‌اید.';
}

export const PUBLIC_HOST = process.env.NOROSET_PUBLIC_HOST ?? 'n8l.localhost';

export function publicUrl(slug: string): string {
  return publicLinkUrl(PUBLIC_HOST, slug, typeof window === 'undefined' ? undefined : window.location.port);
}

const DEFAULT_LINK_LABEL = defaultSettings('link_button').label;

/** لینک تازه برای دکمه: نرمال‌سازی، آیکون شبکه (اگر آیکونی نیست) و عنوان پیشنهادی (اگر عنوان پیش‌فرض/خالی است). */
export function applyLinkUrl(s: LinkButtonSettings, input: string): LinkButtonSettings {
  const url = normalizeHttpUrl(input);
  const platform = detectSocialPlatform(url);
  const label = !s.label || s.label === DEFAULT_LINK_LABEL ? (suggestLinkLabel(url) ?? s.label) : s.label;
  return { ...s, url, label, icon: s.icon ?? (platform ? { kind: 'preset', value: platform } : null) };
}
