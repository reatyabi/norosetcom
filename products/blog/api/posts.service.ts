import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  and,
  asc,
  blogCategories,
  blogPostTags,
  blogPosts,
  blogSlugRedirects,
  blogTags,
  count,
  desc,
  eq,
  FILE_SERVICE,
  ilike,
  inArray,
  ne,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  sql,
  type Db,
  type FileService,
  type PlatformAdminContext,
} from '@noroset/core';
import {
  docText,
  DocError,
  isEmptyDoc,
  isValidSlug,
  normalizeFa,
  readingStats,
  sanitizeDoc,
  SEO_MAX,
  slugify,
  safeHref,
  type AdminPost,
  type AdminPostItem,
  type AdminPostList,
  type BlogDoc,
  type BlogUploadResult,
  type PostSeo,
  type PublishIssue,
  type StoredImage,
  type TermRef,
} from '../shared';
import { audit, imageView, likeEscape, MAX_CONTENT_BYTES, MAX_IMAGE_BYTES, MAX_TAGS, parseImage, pgCode, platformBase } from './access';
import type { CreatePostDto, PostListQuery, UpdatePostDto } from './dto';

// مدیریت مقاله‌ها (docs/architecture.md §9.12؛ فقط superadmin). ذخیره صریح است (بدون ذخیره‌ی خودکار)، پس
// ویرایش مقاله‌ی منتشرشده همان لحظه دیده می‌شود و در لاگ ممیزی می‌آید.

type PostRow = typeof blogPosts.$inferSelect;

const LIST_LIMIT = 50;

/** شکل سئوی ذخیره‌شده؛ کلید ناشناس کنار می‌رود. */
export function parseSeo(raw: Record<string, unknown>): PostSeo {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const seo: PostSeo = {};
  const title = str(raw.title, SEO_MAX.title);
  const description = str(raw.description, SEO_MAX.description);
  const keyword = str(raw.focus_keyword, SEO_MAX.keyword);
  const ogTitle = str(raw.og_title, SEO_MAX.title);
  const ogDescription = str(raw.og_description, SEO_MAX.description);
  const canonical = str(raw.canonical, SEO_MAX.canonical);
  if (title) seo.title = title;
  if (description) seo.description = description;
  if (keyword) seo.focus_keyword = keyword;
  if (ogTitle) seo.og_title = ogTitle;
  if (ogDescription) seo.og_description = ogDescription;
  if (canonical) {
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(canonical) || safeHref(canonical) !== canonical) throw new UnprocessableEntityException('invalid_canonical');
    seo.canonical = canonical;
  }
  if (raw.noindex === true) seo.noindex = true;
  const og = parseImage(raw.og_image ?? null, false);
  if (og) seo.og_image = { file_id: og.file_id, width: og.width, height: og.height };
  return seo;
}

export function publishIssues(row: Pick<PostRow, 'title' | 'slug' | 'content'>): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!row.title.trim()) issues.push('missing_title');
  if (!isValidSlug(row.slug)) issues.push('missing_slug');
  if (isEmptyDoc(row.content as BlogDoc)) issues.push('empty_content');
  return issues;
}

export const searchTextOf = (title: string, excerpt: string, doc: BlogDoc) => normalizeFa([title, excerpt, docText(doc)].join('\n'));

@Injectable()
export class AdminPostsService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(FILE_SERVICE) private readonly files: FileService,
  ) {}

  private get base(): string {
    return platformBase(this.files.publicBaseUrl());
  }

  async list(query: PostListQuery): Promise<AdminPostList> {
    const limit = query.limit ?? LIST_LIMIT;
    const offset = query.offset ?? 0;
    return this.ctx.run(async (tx) => {
      const where = and(
        query.status ? eq(blogPosts.status, query.status) : undefined,
        query.categoryId ? eq(blogPosts.categoryId, query.categoryId) : undefined,
        query.q?.trim() ? ilike(blogPosts.searchText, `%${likeEscape(normalizeFa(query.q))}%`) : undefined,
      );
      const rows = await tx
        .select({
          post: blogPosts,
          categoryName: blogCategories.name,
          categorySlug: blogCategories.slug,
          updatedByName: platformUsers.fullName,
          commentCount: sql<number>`(SELECT count(*)::int FROM blog_comments c WHERE c.post_id = "blog_posts"."id")`,
          pendingComments: sql<number>`(SELECT count(*)::int FROM blog_comments c WHERE c.post_id = "blog_posts"."id" AND c.status = 'pending')`,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
        .leftJoin(platformUsers, eq(platformUsers.id, blogPosts.updatedBy))
        .where(where)
        .orderBy(desc(blogPosts.updatedAt))
        .limit(limit)
        .offset(offset);
      const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(blogPosts).where(where);
      const byStatus = await tx.select({ status: blogPosts.status, n: count() }).from(blogPosts).groupBy(blogPosts.status);
      const n = (s: string) => Number(byStatus.find((r) => r.status === s)?.n ?? 0);
      return {
        items: rows.map(
          (r): AdminPostItem => ({
            id: r.post.id,
            slug: r.post.slug,
            title: r.post.title,
            status: r.post.status,
            featured: r.post.featured,
            category: r.categorySlug ? { slug: r.categorySlug, name: r.categoryName ?? '' } : null,
            cover: imageView(this.base, r.post.cover as StoredImage | null),
            wordCount: r.post.wordCount,
            commentCount: Number(r.commentCount),
            pendingComments: Number(r.pendingComments),
            publishedAt: r.post.publishedAt?.toISOString() ?? null,
            updatedAt: r.post.updatedAt.toISOString(),
            updatedByName: r.updatedByName || null,
          }),
        ),
        total: Number(total),
        counts: { all: n('draft') + n('published'), draft: n('draft'), published: n('published') },
      };
    });
  }

  async create(dto: CreatePostDto): Promise<AdminPost> {
    const title = dto.title?.trim() ?? '';
    const id = await this.ctx.run(async (tx) => {
      const slug = await this.freeSlug(tx, slugify(title) || `post-${randomBytes(3).toString('hex')}`);
      const [row] = await tx
        .insert(blogPosts)
        .values({ slug, title, searchText: normalizeFa(title), createdBy: this.ctx.adminId(), updatedBy: this.ctx.adminId() })
        .returning({ id: blogPosts.id });
      await audit(tx, this.ctx, 'blog_post.create', 'blog_post', row!.id, { title });
      return row!.id;
    });
    return this.get(id);
  }

  async get(id: string): Promise<AdminPost> {
    return this.ctx.run(async (tx) => this.detail(tx, await this.findRow(tx, id)));
  }

  async update(id: string, dto: UpdatePostDto): Promise<AdminPost> {
    return this.ctx.run(async (tx) => {
      const row = await this.findRow(tx, id, true);
      const patch: Partial<typeof blogPosts.$inferInsert> = { updatedAt: new Date(), updatedBy: this.ctx.adminId() };
      const changed: string[] = [];

      if (dto.title !== undefined) patch.title = dto.title.trim();
      if (dto.excerpt !== undefined) patch.excerpt = dto.excerpt.trim();
      if (dto.content !== undefined) {
        if (JSON.stringify(dto.content).length > MAX_CONTENT_BYTES) throw new UnprocessableEntityException('content_too_large');
        try {
          patch.content = sanitizeDoc(dto.content);
        } catch (err) {
          if (err instanceof DocError) throw new UnprocessableEntityException(err.code === 'invalid_content' ? 'invalid_blog_content' : err.code);
          throw err;
        }
        Object.assign(patch, readingStats(patch.content as BlogDoc));
      }
      if (dto.title !== undefined || dto.excerpt !== undefined || dto.content !== undefined) {
        patch.searchText = searchTextOf(patch.title ?? row.title, patch.excerpt ?? row.excerpt, (patch.content ?? row.content) as BlogDoc);
      }
      if (dto.cover !== undefined) patch.cover = parseImage(dto.cover, true);
      if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
      if (dto.featured !== undefined) patch.featured = dto.featured;
      if (dto.allowComments !== undefined) patch.allowComments = dto.allowComments;
      if (dto.seo !== undefined) patch.seo = parseSeo(dto.seo);
      if (dto.publishedAt !== undefined) {
        const at = new Date(dto.publishedAt);
        // زمان‌بندی انتشار نداریم: فقط تاریخ گذشته (برای مقاله‌ی منتقل‌شده از جای دیگر)
        if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 60_000 || row.status !== 'published') {
          throw new UnprocessableEntityException('invalid_published_at');
        }
        patch.publishedAt = at;
      }
      if (dto.slug !== undefined && dto.slug !== row.slug) {
        await this.changeSlug(tx, row, dto.slug);
        patch.slug = dto.slug;
        changed.push('slug');
      }
      for (const key of Object.keys(dto) as (keyof UpdatePostDto)[]) if (dto[key] !== undefined && key !== 'slug') changed.push(key);

      try {
        await tx.update(blogPosts).set(patch).where(eq(blogPosts.id, id));
      } catch (err) {
        if (pgCode(err) === '23503') throw new UnprocessableEntityException('invalid_category');
        if (pgCode(err) === '23505') throw new ConflictException('slug_taken');
        throw err;
      }
      if (dto.tags !== undefined) await this.setTags(tx, id, dto.tags);
      if (row.status === 'published' && changed.length) {
        await audit(tx, this.ctx, 'blog_post.update', 'blog_post', id, { title: patch.title ?? row.title, fields: changed });
      }
      return this.detail(tx, await this.findRow(tx, id));
    });
  }

  async publish(id: string): Promise<AdminPost> {
    return this.ctx.run(async (tx) => {
      const row = await this.findRow(tx, id, true);
      const issues = publishIssues(row);
      if (issues.length) throw new UnprocessableEntityException({ message: 'not_publishable', issues });
      await tx
        .update(blogPosts)
        .set({ status: 'published', publishedAt: row.publishedAt ?? new Date(), updatedAt: new Date(), updatedBy: this.ctx.adminId() })
        .where(eq(blogPosts.id, id));
      await audit(tx, this.ctx, 'blog_post.publish', 'blog_post', id, { title: row.title, slug: row.slug });
      return this.detail(tx, await this.findRow(tx, id));
    });
  }

  async unpublish(id: string): Promise<AdminPost> {
    return this.ctx.run(async (tx) => {
      const row = await this.findRow(tx, id, true);
      if (row.status === 'published') {
        await tx.update(blogPosts).set({ status: 'draft', updatedAt: new Date(), updatedBy: this.ctx.adminId() }).where(eq(blogPosts.id, id));
        await audit(tx, this.ctx, 'blog_post.unpublish', 'blog_post', id, { title: row.title, slug: row.slug });
      }
      return this.detail(tx, await this.findRow(tx, id));
    });
  }

  async remove(id: string): Promise<void> {
    await this.ctx.run(async (tx) => {
      const row = await this.findRow(tx, id, true);
      await audit(tx, this.ctx, 'blog_post.delete', 'blog_post', id, { title: row.title, slug: row.slug, status: row.status });
      await tx.delete(blogPosts).where(eq(blogPosts.id, id));
    });
  }

  /** بدنه‌ی خام تصویر ← فایل پلتفرم norofile (public، بدون سهمیه‌ی فضای کاری؛ حذف نمی‌شود چون مقاله‌ها به آن اشاره می‌کنند). */
  async upload(body: unknown): Promise<BlogUploadResult> {
    if (!(body instanceof Uint8Array)) throw new UnprocessableEntityException('invalid_file');
    const file = await this.files.uploadPlatform(this.ctx.adminId(), { body, name: 'image', source: 'blog', maxBytes: MAX_IMAGE_BYTES });
    return { fileId: file.id, url: `${this.base}/${file.id}`, width: file.width!, height: file.height! };
  }

  // ---------- داخلی ----------

  private async findRow(tx: Db, id: string, lock = false): Promise<PostRow> {
    const q = tx.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    const [row] = lock ? await q.for('update') : await q;
    if (!row) throw new NotFoundException();
    return row;
  }

  /** نشانی آزاد: اگر گرفته باشد `-۲`، `-۳`، … (نشانی‌های قبلی مقاله‌های دیگر هم گرفته‌اند). */
  private async freeSlug(tx: Db, base: string): Promise<string> {
    let root = base;
    if (!isValidSlug(root)) root = `${root}-1`.replace(/^-/, '');
    for (let i = 1; i < 1000; i++) {
      const candidate = i === 1 ? root : `${root.slice(0, 112)}-${i}`;
      if (!(await this.slugInUse(tx, candidate, null))) return candidate;
    }
    return `post-${randomBytes(4).toString('hex')}`;
  }

  private async slugInUse(tx: Db, slug: string, exceptPostId: string | null): Promise<boolean> {
    const [post] = await tx
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), exceptPostId ? ne(blogPosts.id, exceptPostId) : undefined))
      .limit(1);
    if (post) return true;
    const [redirect] = await tx
      .select({ postId: blogSlugRedirects.postId })
      .from(blogSlugRedirects)
      .where(and(eq(blogSlugRedirects.slug, slug), exceptPostId ? ne(blogSlugRedirects.postId, exceptPostId) : undefined))
      .limit(1);
    return !!redirect;
  }

  /**
   * نشانی تازه نباید نشانی (فعلی یا قبلی) مقاله‌ی دیگری باشد. اگر مقاله هرگز منتشر شده، نشانی قبلی برای ریدایرکت ۳۰۸
   * می‌ماند؛ برگشت به نشانی قبلی همان مقاله ریدایرکتش را برمی‌دارد.
   */
  private async changeSlug(tx: Db, row: PostRow, slug: string): Promise<void> {
    if (!isValidSlug(slug)) throw new UnprocessableEntityException('invalid_post_slug');
    if (await this.slugInUse(tx, slug, row.id)) throw new ConflictException('slug_taken');
    await tx.delete(blogSlugRedirects).where(eq(blogSlugRedirects.slug, slug));
    if (row.publishedAt) await tx.insert(blogSlugRedirects).values({ slug: row.slug, postId: row.id }).onConflictDoNothing();
  }

  private async setTags(tx: Db, postId: string, names: string[]): Promise<void> {
    const wanted = new Map<string, string>();
    for (const raw of names) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (!name) continue;
      const slug = slugify(name);
      if (!isValidSlug(slug, 'term')) throw new UnprocessableEntityException('invalid_tag');
      if (!wanted.has(slug)) wanted.set(slug, name);
    }
    if (wanted.size > MAX_TAGS) throw new UnprocessableEntityException('too_many_tags');
    await tx.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
    if (!wanted.size) return;
    await tx
      .insert(blogTags)
      .values([...wanted].map(([slug, name]) => ({ slug, name })))
      .onConflictDoNothing({ target: blogTags.slug });
    const tags = await tx.select({ id: blogTags.id }).from(blogTags).where(inArray(blogTags.slug, [...wanted.keys()]));
    await tx.insert(blogPostTags).values(tags.map((t) => ({ postId, tagId: t.id })));
  }

  private async detail(tx: Db, row: PostRow): Promise<AdminPost> {
    const tags: TermRef[] = await tx
      .select({ slug: blogTags.slug, name: blogTags.name })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
      .where(eq(blogPostTags.postId, row.id))
      .orderBy(asc(blogTags.name));
    const redirects = await tx.select({ slug: blogSlugRedirects.slug }).from(blogSlugRedirects).where(eq(blogSlugRedirects.postId, row.id));
    const cover = row.cover as StoredImage | null;
    const seo = row.seo as PostSeo;
    const og = seo.og_image ? imageView(this.base, seo.og_image) : null;
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content as BlogDoc,
      cover: cover ? { ...cover, alt: cover.alt ?? '', url: `${this.base}/${cover.file_id}` } : null,
      categoryId: row.categoryId,
      tags,
      featured: row.featured,
      allowComments: row.allowComments,
      seo,
      ogImageUrl: og?.url ?? null,
      wordCount: row.wordCount,
      readingMinutes: row.readingMinutes,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      previousSlugs: redirects.map((r) => r.slug),
      assetBaseUrl: this.base,
    };
  }
}
