import { docImages, docLinks, docText, introText, tableOfContents, type BlogDoc } from './doc';
import { slugify } from './slug';
import { containsPhrase, countPhrase, normalizeFa, words } from './text';

// تحلیل سئوی مقاله (docs/architecture.md §9.12): خالص، در ادیتور هنگام نوشتن و در تست‌ها؛ فقط راهنماست و مانع انتشار نیست.

export interface PostSeo {
  /** عنوان سئو؛ خالی = عنوان مقاله. */
  title?: string;
  /** توضیح متا؛ خالی = خلاصه‌ی مقاله. */
  description?: string;
  /** آدرس canonical دیگر (https)؛ خالی = نشانی خود مقاله. */
  canonical?: string;
  noindex?: boolean;
  focus_keyword?: string;
  og_title?: string;
  og_description?: string;
  /** تصویر اشتراک‌گذاری جدا از تصویر شاخص. */
  og_image?: { file_id: string; width: number | null; height: number | null } | null;
}

/** طول‌های پیشنهادی (نویسه). */
export const SEO_LENGTH = {
  title: { min: 30, max: 60 },
  description: { min: 120, max: 160 },
  slug: 75,
} as const;

/** سقف ذخیره (نه پیشنهاد). */
export const SEO_MAX = { title: 120, description: 320, keyword: 80, canonical: 500 } as const;

export function effectiveSeoTitle(title: string, seo: PostSeo): string {
  return (seo.title?.trim() || title).trim();
}

export function effectiveSeoDescription(excerpt: string, seo: PostSeo): string {
  return (seo.description?.trim() || excerpt).trim();
}

export type SeoCheckStatus = 'good' | 'ok' | 'bad';

export interface SeoCheck {
  id: string;
  status: SeoCheckStatus;
  message: string;
}

export interface SeoAnalysisInput {
  title: string;
  slug: string;
  excerpt: string;
  seo: PostSeo;
  doc: BlogDoc;
  hasCover: boolean;
  /** میزبان سایت برای تشخیص لینک داخلی (مثلاً noroset.com). */
  siteHost?: string;
}

export interface SeoAnalysis {
  /** ۰ تا ۱۰۰. */
  score: number;
  checks: SeoCheck[];
}

const fa = (n: number) => n.toLocaleString('fa-IR');

export function analyzeSeo(input: SeoAnalysisInput): SeoAnalysis {
  const checks: SeoCheck[] = [];
  const add = (id: string, status: SeoCheckStatus, message: string) => checks.push({ id, status, message });

  const title = effectiveSeoTitle(input.title, input.seo);
  const description = effectiveSeoDescription(input.excerpt, input.seo);
  const body = docText(input.doc);
  const bodyWords = words(body).length;
  const headings = tableOfContents(input.doc);
  const keyword = normalizeFa(input.seo.focus_keyword ?? '');

  if (!keyword) {
    add('keyword', 'bad', 'کلمه‌ی کلیدی اصلی را تعیین کنید تا بقیه‌ی بررسی‌ها دقیق شوند.');
  } else {
    if (normalizeFa(title).startsWith(keyword)) add('keyword_title', 'good', 'عنوان سئو با کلمه‌ی کلیدی شروع می‌شود.');
    else if (containsPhrase(title, keyword)) add('keyword_title', 'ok', 'کلمه‌ی کلیدی در عنوان هست؛ بهتر است اول عنوان بیاید.');
    else add('keyword_title', 'bad', 'کلمه‌ی کلیدی در عنوان سئو نیست.');

    add(
      'keyword_description',
      containsPhrase(description, keyword) ? 'good' : 'bad',
      containsPhrase(description, keyword) ? 'توضیح متا کلمه‌ی کلیدی را دارد.' : 'کلمه‌ی کلیدی در توضیح متا نیست.',
    );

    const inSlug = input.slug.includes(slugify(keyword));
    add('keyword_slug', inSlug ? 'good' : 'ok', inSlug ? 'نشانی کلمه‌ی کلیدی را دارد.' : 'کلمه‌ی کلیدی در نشانی مقاله نیست.');

    const inIntro = containsPhrase(introText(input.doc), keyword);
    add('keyword_intro', inIntro ? 'good' : 'bad', inIntro ? 'کلمه‌ی کلیدی در پاراگراف اول آمده است.' : 'کلمه‌ی کلیدی را در پاراگراف اول بیاورید.');

    const inHeading = headings.some((h) => containsPhrase(h.text, keyword));
    add('keyword_heading', inHeading ? 'good' : 'ok', inHeading ? 'یکی از تیترها کلمه‌ی کلیدی را دارد.' : 'کلمه‌ی کلیدی در هیچ تیتری نیست.');

    const occurrences = countPhrase(body, keyword);
    const density = bodyWords ? ((occurrences * words(keyword).length) / bodyWords) * 100 : 0;
    const d = density.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
    if (!occurrences) add('keyword_density', 'bad', 'کلمه‌ی کلیدی در متن مقاله نیامده است.');
    else if (density < 0.5) add('keyword_density', 'ok', `تراکم کلمه‌ی کلیدی کم است (${d}٪، ${fa(occurrences)} بار)؛ ۰٫۵ تا ۲٫۵٪ مناسب است.`);
    else if (density > 2.5) add('keyword_density', 'bad', `تراکم کلمه‌ی کلیدی زیاد است (${d}٪)؛ تکرار بیش از حد به رتبه آسیب می‌زند.`);
    else add('keyword_density', 'good', `تراکم کلمه‌ی کلیدی مناسب است (${d}٪، ${fa(occurrences)} بار).`);
  }

  const tl = title.length;
  if (!tl) add('title_length', 'bad', 'عنوان سئو خالی است.');
  else if (tl >= SEO_LENGTH.title.min && tl <= SEO_LENGTH.title.max) add('title_length', 'good', `طول عنوان سئو مناسب است (${fa(tl)} نویسه).`);
  else
    add(
      'title_length',
      tl < 20 || tl > 70 ? 'bad' : 'ok',
      tl < SEO_LENGTH.title.min ? `عنوان سئو کوتاه است (${fa(tl)} نویسه؛ ۳۰ تا ۶۰ مناسب است).` : `عنوان سئو بلند است و در نتایج گوگل بریده می‌شود (${fa(tl)} نویسه).`,
    );

  const dl = description.length;
  if (!dl) add('description_length', 'bad', 'توضیح متا (یا خلاصه‌ی مقاله) خالی است.');
  else if (dl >= SEO_LENGTH.description.min && dl <= SEO_LENGTH.description.max) add('description_length', 'good', `طول توضیح متا مناسب است (${fa(dl)} نویسه).`);
  else
    add(
      'description_length',
      dl < 70 || dl > 180 ? 'bad' : 'ok',
      dl < SEO_LENGTH.description.min ? `توضیح متا کوتاه است (${fa(dl)} نویسه؛ ۱۲۰ تا ۱۶۰ مناسب است).` : `توضیح متا بلند است و بریده می‌شود (${fa(dl)} نویسه).`,
    );

  if (bodyWords >= 600) add('content_length', 'good', `متن مقاله ${fa(bodyWords)} کلمه است.`);
  else if (bodyWords >= 300) add('content_length', 'ok', `متن مقاله ${fa(bodyWords)} کلمه است؛ مقاله‌های جامع‌تر (۶۰۰+) شانس بهتری دارند.`);
  else add('content_length', 'bad', `متن مقاله کوتاه است (${fa(bodyWords)} کلمه؛ دست‌کم ۳۰۰).`);

  if (headings.length) add('subheadings', 'good', `مقاله ${fa(headings.length)} تیتر دارد.`);
  else add('subheadings', bodyWords > 300 ? 'bad' : 'ok', 'متن را با تیترها بخش‌بندی کنید.');

  const links = docLinks(input.doc);
  const host = input.siteHost?.toLowerCase();
  const isInternal = (href: string) => href.startsWith('/') || href.startsWith('#') || (!!host && new RegExp(`^https?://(www\\.)?${host.replace(/\./g, '\\.')}(/|$)`, 'i').test(href));
  const internal = links.filter(isInternal).length;
  const external = links.filter((l) => /^https?:/i.test(l) && !isInternal(l)).length;
  add('internal_links', internal ? 'good' : 'ok', internal ? `${fa(internal)} لینک داخلی دارد.` : 'به مقاله‌ها یا صفحه‌های دیگر سایت لینک بدهید.');
  add('external_links', external ? 'good' : 'ok', external ? `${fa(external)} لینک به منبع بیرونی دارد.` : 'لینک به یک منبع معتبر بیرونی اعتماد را بیشتر می‌کند.');

  const images = docImages(input.doc);
  const missingAlt = images.filter((i) => !i.alt).length;
  if (!images.length) add('images', 'ok', 'مقاله تصویری در متن ندارد.');
  else if (missingAlt) add('images', 'bad', `${fa(missingAlt)} تصویر متن جایگزین (alt) ندارد.`);
  else add('images', 'good', 'همه‌ی تصاویر متن جایگزین دارند.');

  add('cover', input.hasCover ? 'good' : 'bad', input.hasCover ? 'تصویر شاخص دارد (برای اشتراک‌گذاری هم).' : 'تصویر شاخص ندارد؛ در شبکه‌های اجتماعی بدون تصویر نمایش داده می‌شود.');

  const sl = input.slug.length;
  add('slug_length', sl && sl <= SEO_LENGTH.slug ? 'good' : 'ok', sl <= SEO_LENGTH.slug ? 'طول نشانی مناسب است.' : 'نشانی بلند است؛ کوتاه‌ترش کنید.');

  if (input.seo.noindex) add('noindex', 'bad', 'نمایش در موتورهای جستجو خاموش است (noindex).');

  const weight: Record<SeoCheckStatus, number> = { good: 1, ok: 0.5, bad: 0 };
  const score = Math.round((checks.reduce((s, c) => s + weight[c.status], 0) / checks.length) * 100);
  return { score, checks };
}
