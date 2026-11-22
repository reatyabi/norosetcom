import { defaultContent, PAGE_SLUG, PAGE_SLUG_MIN, type ImageRef, type LinkTemplate } from '@noroset/norolink/ui';

export const MAX_PAGE_NAME = 80;
export const MAX_PAGE_BIO = 300;

/** ورودی نشانی هنگام تایپ: فقط حروف کوچک لاتین، رقم و خط تیره. */
export const cleanSlugInput = (value: string) => value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
export const isValidPageSlug = (slug: string) => slug.length >= PAGE_SLUG_MIN && PAGE_SLUG.test(slug);

/**
 * بدنه‌ی ساخت صفحه از پاسخ‌های دیالوگ؛ توضیحات و عکسِ ردشده از قالب می‌آید و در صفحه‌ی خالی خالی می‌ماند.
 * «نمایش در جستجو و اشتراک‌گذاری» خالی است، یعنی همان عنوان، توضیحات و عکس صفحه (نه مقادیر نمونه‌ی قالب) و با آن‌ها به‌روز می‌ماند.
 */
export function newLinkPageBody({
  name,
  bio,
  slug = '',
  avatar,
  template,
}: {
  name: string;
  bio: string;
  /** خالی: نشانی تصادفی در سرور. */
  slug?: string;
  avatar: ImageRef | null;
  template: LinkTemplate | null;
}) {
  const title = name.trim();
  const base = template?.content ?? defaultContent(title);
  return {
    title,
    ...(slug ? { slug } : {}),
    content: {
      ...base,
      profile: { ...base.profile, name: title, bio: bio.trim() || base.profile.bio, avatar: avatar ?? base.profile.avatar },
      seo: { title: '', description: '', og_image: null, indexable: false, entity: null },
    },
    ...(template ? { elements: template.elements } : {}),
  };
}
