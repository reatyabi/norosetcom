import { ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  and,
  asc,
  blogCategories,
  blogComments,
  blogPostTags,
  blogPosts,
  blogSlugRedirects,
  blogTags,
  count,
  db,
  desc,
  eq,
  FILE_SERVICE,
  ilike,
  inArray,
  IP_HASHER,
  ne,
  notInArray,
  RATE_LIMITER,
  sql,
  type FileService,
  type IpHasher,
  type RateLimiter,
  type SQL,
} from '@noroset/core';
import {
  effectiveSeoDescription,
  effectiveSeoTitle,
  normalizeFa,
  type BlogDoc,
  type PostDetail,
  type PostListResponse,
  type PostSeo,
  type PostSummary,
  type PublicCategory,
  type PublicComment,
  type PublicPostResponse,
  type PublicTag,
  type SitemapResponse,
  type StoredImage,
  type TermRef,
} from '../shared';
import { imageView, likeEscape, platformBase } from './access';
import type { PublicCommentDto, PublicPostQuery } from './dto';

// مسیر عمومی بلاگ (بدون نشست؛ docs/architecture.md §9.12). بدون هیچ setting، RLS فقط مقاله‌ی منتشرشده، برچسب‌های آن
// و نظرهای تأییدشده را نشان می‌دهد؛ ثبت نظر فقط INSERT با وضعیت pending است.

type PostRow = typeof blogPosts.$inferSelect;

/** ثبت نظر به‌ازای IP. خواندن محدود نمی‌شود چون رندر سرور وب همه از یک IP می‌خواند. */
const COMMENT_LIMIT = { limit: 5, windowMs: 10 * 60_000 };
const PAGE_SIZE = 12;
const RELATED = 3;

export type PublicPostResult = PublicPostResponse | { redirect: string };

@Injectable()
export class PublicBlogService {
  constructor(
    @Inject(FILE_SERVICE) private readonly files: FileService,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(IP_HASHER) private readonly hasher: IpHasher,
  ) {}

  private get base(): string {
    return platformBase(this.files.publicBaseUrl());
  }

  async list(query: PublicPostQuery): Promise<PostListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? PAGE_SIZE;
    const conds: (SQL | undefined)[] = [eq(blogPosts.status, 'published')];
    if (query.category) {
      const [cat] = await db.select({ id: blogCategories.id }).from(blogCategories).where(eq(blogCategories.slug, query.category)).limit(1);
      if (!cat) return { items: [], total: 0, page, limit };
      conds.push(eq(blogPosts.categoryId, cat.id));
    }
    if (query.tag) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM blog_post_tags pt INNER JOIN blog_tags t ON t.id = pt.tag_id
          WHERE pt.post_id = "blog_posts"."id" AND t.slug = ${query.tag})`,
      );
    }
    const q = query.q ? normalizeFa(query.q) : '';
    if (q) conds.push(ilike(blogPosts.searchText, `%${likeEscape(q)}%`));
    if (query.featured) conds.push(eq(blogPosts.featured, true));
    const where = and(...conds);
    const rows = await db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(blogPosts).where(where);
    return { items: await this.summaries(rows), total: Number(total), page, limit };
  }

  async read(slug: string): Promise<PublicPostResult> {
    const [row] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published'))).limit(1);
    if (!row) {
      // نشانی قبلی ← نشانی فعلی (بدون زنجیره؛ RLS فقط ریدایرکت مقاله‌ی منتشرشده را نشان می‌دهد)
      const [redirect] = await db
        .select({ slug: blogPosts.slug })
        .from(blogSlugRedirects)
        .innerJoin(blogPosts, eq(blogPosts.id, blogSlugRedirects.postId))
        .where(eq(blogSlugRedirects.slug, slug))
        .limit(1);
      if (redirect) return { redirect: redirect.slug };
      throw new NotFoundException();
    }
    const [summary] = await this.summaries([row]);
    const seo = row.seo as PostSeo;
    const title = effectiveSeoTitle(row.title, seo);
    const description = effectiveSeoDescription(row.excerpt, seo);
    const post: PostDetail = {
      ...summary!,
      content: row.content as BlogDoc,
      wordCount: row.wordCount,
      allowComments: row.allowComments,
      assetBaseUrl: this.base,
      seo: {
        title,
        description,
        canonical: seo.canonical ?? null,
        noindex: !!seo.noindex,
        ogTitle: seo.og_title || title,
        ogDescription: seo.og_description || description,
        ogImage: imageView(this.base, seo.og_image) ?? summary!.cover,
      },
    };
    const comments = await db
      .select()
      .from(blogComments)
      .where(and(eq(blogComments.postId, row.id), eq(blogComments.status, 'approved')))
      .orderBy(asc(blogComments.createdAt));
    return {
      post,
      related: await this.related(row),
      comments: comments.map(
        (c): PublicComment => ({
          id: c.id,
          parentId: c.parentId,
          authorName: c.authorName,
          body: c.body,
          fromAdmin: c.fromAdmin,
          createdAt: c.createdAt.toISOString(),
        }),
      ),
    };
  }

  async categories(): Promise<PublicCategory[]> {
    const rows = await db
      .select({
        row: blogCategories,
        // نام جدول بیرونی صریح: drizzle ستون‌های فهرست select تک‌جدولی را بدون نام جدول می‌نویسد
        postCount: sql<number>`(SELECT count(*)::int FROM blog_posts p WHERE p.category_id = "blog_categories"."id" AND p.status = 'published')`,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));
    return rows.map(({ row, postCount }) => {
      const seo = row.seo as { title?: string; description?: string };
      return {
        slug: row.slug,
        name: row.name,
        description: row.description,
        seoTitle: seo.title ?? '',
        seoDescription: seo.description ?? '',
        postCount: Number(postCount),
      };
    });
  }

  async tag(slug: string): Promise<PublicTag> {
    const [row] = await db
      .select({
        slug: blogTags.slug,
        name: blogTags.name,
        postCount: sql<number>`(SELECT count(*)::int FROM blog_post_tags pt WHERE pt.tag_id = "blog_tags"."id")`,
      })
      .from(blogTags)
      .where(eq(blogTags.slug, slug))
      .limit(1);
    if (!row) throw new NotFoundException();
    return { ...row, postCount: Number(row.postCount) };
  }

  /** مقاله‌های noindex یا با canonical دیگر در نقشه‌ی سایت نمی‌آیند. */
  async sitemap(): Promise<SitemapResponse> {
    const posts = await db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt, seo: blogPosts.seo, categoryId: blogPosts.categoryId, id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedAt));
    const listed = posts.filter((p) => !(p.seo as PostSeo).noindex && !(p.seo as PostSeo).canonical);
    const latest = new Map<string, Date>();
    const bump = (key: string, at: Date) => {
      const cur = latest.get(key);
      if (!cur || cur < at) latest.set(key, at);
    };
    for (const p of posts) if (p.categoryId) bump(`c:${p.categoryId}`, p.updatedAt);
    const postTags = posts.length
      ? await db
          .select({ postId: blogPostTags.postId, slug: blogTags.slug })
          .from(blogPostTags)
          .innerJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
      : [];
    const updatedById = new Map(posts.map((p) => [p.id, p.updatedAt]));
    for (const t of postTags) bump(`t:${t.slug}`, updatedById.get(t.postId) ?? new Date(0));
    const categories = await db.select({ id: blogCategories.id, slug: blogCategories.slug }).from(blogCategories);
    return {
      posts: listed.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })),
      categories: categories
        .filter((c) => latest.has(`c:${c.id}`))
        .map((c) => ({ slug: c.slug, updatedAt: latest.get(`c:${c.id}`)!.toISOString() })),
      tags: [...new Set(postTags.map((t) => t.slug))].map((slug) => ({ slug, updatedAt: latest.get(`t:${slug}`)?.toISOString() ?? null })),
    };
  }

  async comment(slug: string, dto: PublicCommentDto, ip: string | undefined): Promise<{ ok: true }> {
    if (!this.rateLimiter.consume(`blog-comment:${ip ?? 'unknown'}`, COMMENT_LIMIT.limit, COMMENT_LIMIT.windowMs)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    // ربات: همان پاسخ موفق، بدون ذخیره
    if (dto.website) return { ok: true };
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const body = dto.body.trim().replace(/\n{3,}/g, '\n\n');
    if (!name) throw new UnprocessableEntityException('name_required');
    if (body.length < 2) throw new UnprocessableEntityException('body_required');

    const [post] = await db
      .select({ id: blogPosts.id, allowComments: blogPosts.allowComments })
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
      .limit(1);
    if (!post) throw new NotFoundException();
    if (!post.allowComments) throw new ConflictException('comments_closed');

    let parentId: string | null = null;
    if (dto.parentId) {
      // فقط پاسخ به نظر تأییدشده‌ی همین مقاله (RLS نظرهای دیگر را نشان نمی‌دهد)
      const [parent] = await db
        .select({ id: blogComments.id, parentId: blogComments.parentId })
        .from(blogComments)
        .where(and(eq(blogComments.id, dto.parentId), eq(blogComments.postId, post.id)))
        .limit(1);
      if (!parent) throw new UnprocessableEntityException('invalid_parent');
      parentId = parent.parentId ?? parent.id;
    }
    // بدون RETURNING: ردیف pending برای عموم قابل خواندن نیست
    await db.insert(blogComments).values({
      postId: post.id,
      parentId,
      authorName: name,
      authorEmail: dto.email?.trim().toLowerCase() || null,
      body,
      ipHash: ip ? this.hasher.hash(`blog|${ip}`) : null,
    });
    return { ok: true };
  }

  // ---------- داخلی ----------

  private async summaries(rows: PostRow[]): Promise<PostSummary[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter((v): v is string => !!v))];
    const cats = categoryIds.length
      ? await db.select({ id: blogCategories.id, slug: blogCategories.slug, name: blogCategories.name }).from(blogCategories).where(inArray(blogCategories.id, categoryIds))
      : [];
    const tags = await db
      .select({ postId: blogPostTags.postId, slug: blogTags.slug, name: blogTags.name })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
      .where(inArray(blogPostTags.postId, ids))
      .orderBy(asc(blogTags.name));
    return rows.map((r) => {
      const cat = cats.find((c) => c.id === r.categoryId);
      return {
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        cover: imageView(this.base, r.cover as StoredImage | null, r.title),
        category: cat ? { slug: cat.slug, name: cat.name } : null,
        tags: tags.filter((t) => t.postId === r.id).map((t): TermRef => ({ slug: t.slug, name: t.name })),
        featured: r.featured,
        readingMinutes: r.readingMinutes,
        publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  /** هم‌دسته یا با برچسب مشترک (بیشترین برچسب مشترک اول)، سپس جدیدترین‌ها تا ۳ مقاله. */
  private async related(row: PostRow): Promise<PostSummary[]> {
    const tagIds = (await db.select({ id: blogPostTags.tagId }).from(blogPostTags).where(eq(blogPostTags.postId, row.id))).map((t) => t.id);
    const shared = tagIds.length
      ? sql<number>`(SELECT count(*)::int FROM blog_post_tags pt WHERE pt.post_id = "blog_posts"."id" AND pt.tag_id IN ${tagIds})`
      : sql<number>`0`;
    const sameCategory = row.categoryId ? sql<number>`CASE WHEN "blog_posts"."category_id" = ${row.categoryId} THEN 1 ELSE 0 END` : sql<number>`0`;
    // بدون برچسب و دسته چیزی «مرتبط» نیست؛ فقط جدیدترین‌ها
    const picked =
      !tagIds.length && !row.categoryId
        ? []
        : await db
            .select()
            .from(blogPosts)
            .where(and(eq(blogPosts.status, 'published'), ne(blogPosts.id, row.id), sql`(${shared} + ${sameCategory}) > 0`))
            // ثابت در ORDER BY شماره‌ی ستون حساب می‌شود، پس فقط امتیازهای موجود
            .orderBy(...[tagIds.length ? desc(shared) : null, row.categoryId ? desc(sameCategory) : null].filter((o) => o !== null), desc(blogPosts.publishedAt))
            .limit(RELATED);
    if (picked.length < RELATED) {
      const fill = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.status, 'published'), notInArray(blogPosts.id, [row.id, ...picked.map((p) => p.id)])))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(RELATED - picked.length);
      picked.push(...fill);
    }
    return this.summaries(picked);
  }
}
