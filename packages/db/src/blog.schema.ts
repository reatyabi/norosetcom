import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { platformUsers } from './schema';

// بلاگ (docs/architecture.md §9.12) — مالک: محصول blog. سطح پلتفرم (بدون tenant) با RLS + FORCE (در migration):
// نوشتن فقط is_platform_admin()؛ خواندن عمومی فقط مقاله‌ی منتشرشده و نظر تأییدشده؛ ثبت نظر عمومی فقط با وضعیت pending.

export const blogPostStatus = pgEnum('blog_post_status', ['draft', 'published']);
export const blogCommentStatus = pgEnum('blog_comment_status', ['pending', 'approved', 'rejected']);

/** حروف کوچک لاتین، ارقام لاتین و حروف فارسی، جداشده با `-` (هم‌الگوی BLOG_SLUG در `products/blog/shared`). */
const SLUG_CHARS = 'a-z0-9\\u0621-\\u063A\\u0641-\\u064A\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06CC';
const slugCheck = (column: AnyPgColumn) =>
  sql`${column} ~ ${sql.raw(`'^[${SLUG_CHARS}]+(-[${SLUG_CHARS}]+)*$'`)} AND char_length(${column}) <= 120`;

export const blogCategories = pgTable(
  'blog_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 500 }).notNull().default(''),
    /** `{title?, description?}` برای صفحه‌ی دسته. */
    seo: jsonb('seo').notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('blog_categories_slug_pattern', slugCheck(t.slug)),
    check('blog_categories_name_not_empty', sql`char_length(${t.name}) > 0`),
    check('blog_categories_seo_object', sql`jsonb_typeof(${t.seo}) = 'object'`),
  ],
);

export const blogTags = pgTable(
  'blog_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 80 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('blog_tags_slug_pattern', slugCheck(t.slug)), check('blog_tags_name_not_empty', sql`char_length(${t.name}) > 0`)],
);

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** نشانی `/blog/{slug}`؛ در کل بلاگ یکتا و نه یکی از زیرمسیرهای رزرو. */
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    status: blogPostStatus('status').notNull().default('draft'),
    title: varchar('title', { length: 200 }).notNull().default(''),
    excerpt: varchar('excerpt', { length: 500 }).notNull().default(''),
    /** سند TipTap پاک‌سازی‌شده (`sanitizeDoc`)؛ هرگز HTML. */
    content: jsonb('content').notNull().default({ type: 'doc', content: [] }),
    /** متن ساده‌ی نرمال‌شده‌ی عنوان، خلاصه و محتوا برای جست‌وجو (در سرور ساخته می‌شود). */
    searchText: text('search_text').notNull().default(''),
    wordCount: integer('word_count').notNull().default(0),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    /** `{file_id, width, height, alt}`؛ file_id = شناسه‌ی فایل پلتفرم norofile. */
    cover: jsonb('cover'),
    categoryId: uuid('category_id').references(() => blogCategories.id, { onDelete: 'set null' }),
    featured: boolean('featured').notNull().default(false),
    allowComments: boolean('allow_comments').notNull().default(true),
    /** `{title?, description?, canonical?, noindex?, focus_keyword?, og_title?, og_description?, og_image?}`. */
    seo: jsonb('seo').notNull().default({}),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('blog_posts_published_idx').on(t.status, t.publishedAt),
    index('blog_posts_category_idx').on(t.categoryId),
    check('blog_posts_slug_pattern', slugCheck(t.slug)),
    check('blog_posts_slug_reserved', sql`${t.slug} NOT IN ('category', 'tag', 'feed', 'page', 'search', 'author')`),
    check('blog_posts_published_at', sql`${t.status} = 'draft' OR ${t.publishedAt} IS NOT NULL`),
    check('blog_posts_content_object', sql`jsonb_typeof(${t.content}) = 'object'`),
    check('blog_posts_seo_object', sql`jsonb_typeof(${t.seo}) = 'object'`),
    check('blog_posts_cover_object', sql`${t.cover} IS NULL OR jsonb_typeof(${t.cover}) = 'object'`),
  ],
);

export const blogPostTags = pgTable(
  'blog_post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => blogTags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('blog_post_tags_tag_idx').on(t.tagId)],
);

/** نشانی‌های قبلی مقاله‌ی منتشرشده ← ریدایرکت دائمی به نشانی فعلی (بدون زنجیره). */
export const blogSlugRedirects = pgTable(
  'blog_slug_redirects',
  {
    slug: varchar('slug', { length: 120 }).primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('blog_slug_redirects_post_idx').on(t.postId)],
);

export const blogComments = pgTable(
  'blog_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    /** پاسخ یک‌سطحی؛ پاسخ به پاسخ به همان نظر ریشه وصل می‌شود. */
    parentId: uuid('parent_id').references((): AnyPgColumn => blogComments.id, { onDelete: 'cascade' }),
    authorName: varchar('author_name', { length: 80 }).notNull(),
    /** فقط برای ادمین؛ هرگز در API عمومی برنمی‌گردد. */
    authorEmail: varchar('author_email', { length: 200 }),
    body: varchar('body', { length: 3000 }).notNull(),
    status: blogCommentStatus('status').notNull().default('pending'),
    /** پاسخ ادمین با نام «تیم نوروست». */
    fromAdmin: boolean('from_admin').notNull().default(false),
    /** HMAC IP (IP_HASHER)؛ خود IP ذخیره نمی‌شود. */
    ipHash: varchar('ip_hash', { length: 64 }),
    moderatedBy: uuid('moderated_by').references(() => platformUsers.id, { onDelete: 'set null' }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('blog_comments_post_idx').on(t.postId, t.status, t.createdAt),
    index('blog_comments_status_idx').on(t.status, t.createdAt),
    check('blog_comments_name_not_empty', sql`char_length(${t.authorName}) > 0`),
    check('blog_comments_body_not_empty', sql`char_length(${t.body}) > 0`),
  ],
);
