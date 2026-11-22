import { normalizeFa } from './text';

// نشانی مقاله، دسته و برچسب (docs/architecture.md §9.12): حروف کوچک لاتین، ارقام لاتین و حروف فارسی، جداشده با `-`.
// همان الگوی CHECK جدول‌ها در `packages/db/src/blog.schema.ts`.

const CHARS = 'a-z0-9\\u0621-\\u063A\\u0641-\\u064A\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06CC';
export const BLOG_SLUG = new RegExp(`^[${CHARS}]+(?:-[${CHARS}]+)*$`);
const NOT_ALLOWED = new RegExp(`[^${CHARS}]+`, 'g');

export const MAX_SLUG_LENGTH = 120;

/** زیرمسیرهای `/blog/…` که مقاله نمی‌تواند بگیرد. */
export const RESERVED_POST_SLUGS = ['category', 'tag', 'feed', 'page', 'search', 'author'] as const;

/** متن ← نشانی (فارسی می‌ماند). خالی اگر هیچ حرف مجازی نداشته باشد. */
export function slugify(input: string): string {
  const s = normalizeFa(input).replace(NOT_ALLOWED, '-').replace(/^-+|-+$/g, '');
  if (s.length <= MAX_SLUG_LENGTH) return s;
  // برش در مرز کلمه
  const cut = s.slice(0, MAX_SLUG_LENGTH);
  const at = cut.lastIndexOf('-');
  return (at > 20 ? cut.slice(0, at) : cut).replace(/-+$/, '');
}

export function isValidSlug(slug: string, kind: 'post' | 'term' = 'post'): boolean {
  if (!slug || slug.length > MAX_SLUG_LENGTH || !BLOG_SLUG.test(slug)) return false;
  return kind !== 'post' || !(RESERVED_POST_SLUGS as readonly string[]).includes(slug);
}
