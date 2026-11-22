import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  asc,
  blogCategories,
  blogPostTags,
  blogTags,
  eq,
  PLATFORM_ADMIN_CONTEXT,
  sql,
  type Db,
  type PlatformAdminContext,
} from '@noroset/core';
import { isValidSlug, SEO_MAX, slugify, type AdminCategory, type AdminTag } from '../shared';
import { audit, pgCode } from './access';
import type { CategoryDto, TagDto } from './dto';

// دسته‌ها و برچسب‌های بلاگ (فقط superadmin). برچسب تازه از ویرایش مقاله هم ساخته می‌شود؛ حذف دسته مقاله‌ها را بی‌دسته می‌کند.

type CategorySeo = { title?: string; description?: string };

function termSlug(slug: string | undefined, name: string): string {
  const s = slug !== undefined ? slug.trim() : slugify(name);
  if (!isValidSlug(s, 'term')) throw new UnprocessableEntityException('invalid_term_slug');
  return s;
}

function termName(name: string | undefined): string {
  const n = name?.trim().replace(/\s+/g, ' ') ?? '';
  if (!n) throw new UnprocessableEntityException('name_required');
  return n;
}

const conflict = (err: unknown) => (pgCode(err) === '23505' ? new ConflictException('slug_taken') : err);

@Injectable()
export class AdminTermsService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  categories(): Promise<AdminCategory[]> {
    return this.ctx.run((tx) => this.listCategories(tx));
  }

  async createCategory(dto: CategoryDto): Promise<AdminCategory> {
    const name = termName(dto.name);
    return this.ctx.run(async (tx) => {
      const values = {
        name,
        slug: termSlug(dto.slug, name),
        description: dto.description?.trim() ?? '',
        seo: this.categorySeo(dto, {}),
        sortOrder: dto.sortOrder ?? 0,
      };
      const [row] = await tx
        .insert(blogCategories)
        .values(values)
        .returning()
        .catch((err: unknown) => {
          throw conflict(err);
        });
      await audit(tx, this.ctx, 'blog_category.create', 'blog_category', row!.id, { name, slug: values.slug });
      return this.findCategory(tx, row!.id);
    });
  }

  async updateCategory(id: string, dto: CategoryDto): Promise<AdminCategory> {
    return this.ctx.run(async (tx) => {
      const [row] = await tx.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1);
      if (!row) throw new NotFoundException();
      const patch: Partial<typeof blogCategories.$inferInsert> = { updatedAt: new Date() };
      if (dto.name !== undefined) patch.name = termName(dto.name);
      if (dto.slug !== undefined) patch.slug = termSlug(dto.slug, '');
      if (dto.description !== undefined) patch.description = dto.description.trim();
      if (dto.seoTitle !== undefined || dto.seoDescription !== undefined) patch.seo = this.categorySeo(dto, row.seo as CategorySeo);
      if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
      await tx
        .update(blogCategories)
        .set(patch)
        .where(eq(blogCategories.id, id))
        .catch((err: unknown) => {
          throw conflict(err);
        });
      await audit(tx, this.ctx, 'blog_category.update', 'blog_category', id, { name: patch.name ?? row.name, fields: Object.keys(dto) });
      return this.findCategory(tx, id);
    });
  }

  async removeCategory(id: string): Promise<void> {
    await this.ctx.run(async (tx) => {
      const [row] = await tx.delete(blogCategories).where(eq(blogCategories.id, id)).returning();
      if (!row) throw new NotFoundException();
      await audit(tx, this.ctx, 'blog_category.delete', 'blog_category', id, { name: row.name, slug: row.slug });
    });
  }

  tags(): Promise<AdminTag[]> {
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select({
          id: blogTags.id,
          slug: blogTags.slug,
          name: blogTags.name,
          // نام جدول بیرونی صریح: drizzle ستون‌های فهرست select تک‌جدولی را بدون نام جدول می‌نویسد
          postCount: sql<number>`(SELECT count(*)::int FROM blog_post_tags pt WHERE pt.tag_id = "blog_tags"."id")`,
        })
        .from(blogTags)
        .orderBy(asc(blogTags.name));
      return rows.map((r) => ({ ...r, postCount: Number(r.postCount) }));
    });
  }

  async updateTag(id: string, dto: TagDto): Promise<AdminTag> {
    return this.ctx.run(async (tx) => {
      const patch: Partial<typeof blogTags.$inferInsert> = {};
      if (dto.name !== undefined) patch.name = termName(dto.name);
      if (dto.slug !== undefined) patch.slug = termSlug(dto.slug, '');
      if (!Object.keys(patch).length) throw new UnprocessableEntityException('nothing_to_update');
      const [row] = await tx
        .update(blogTags)
        .set(patch)
        .where(eq(blogTags.id, id))
        .returning()
        .catch((err: unknown) => {
          throw conflict(err);
        });
      if (!row) throw new NotFoundException();
      await audit(tx, this.ctx, 'blog_tag.update', 'blog_tag', id, { name: row.name, slug: row.slug });
      const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`count(*)::int` }).from(blogPostTags).where(eq(blogPostTags.tagId, id));
      return { id: row.id, slug: row.slug, name: row.name, postCount: Number(n) };
    });
  }

  async removeTag(id: string): Promise<void> {
    await this.ctx.run(async (tx) => {
      const [row] = await tx.delete(blogTags).where(eq(blogTags.id, id)).returning();
      if (!row) throw new NotFoundException();
      await audit(tx, this.ctx, 'blog_tag.delete', 'blog_tag', id, { name: row.name, slug: row.slug });
    });
  }

  // ---------- داخلی ----------

  private categorySeo(dto: CategoryDto, current: CategorySeo): CategorySeo {
    const title = (dto.seoTitle ?? current.title ?? '').trim().slice(0, SEO_MAX.title);
    const description = (dto.seoDescription ?? current.description ?? '').trim().slice(0, SEO_MAX.description);
    return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
  }

  private async listCategories(tx: Db): Promise<AdminCategory[]> {
    const rows = await tx
      .select({
        row: blogCategories,
        postCount: sql<number>`(SELECT count(*)::int FROM blog_posts p WHERE p.category_id = "blog_categories"."id")`,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));
    return rows.map(({ row, postCount }) => {
      const seo = row.seo as CategorySeo;
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        seoTitle: seo.title ?? '',
        seoDescription: seo.description ?? '',
        sortOrder: row.sortOrder,
        postCount: Number(postCount),
      };
    });
  }

  private async findCategory(tx: Db, id: string): Promise<AdminCategory> {
    const found = (await this.listCategories(tx)).find((c) => c.id === id);
    if (!found) throw new NotFoundException();
    return found;
  }
}
