import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  blogCategories,
  blogComments,
  blogPostTags,
  blogPosts,
  blogSlugRedirects,
  blogTags,
  db,
  eq,
  inArray,
  platformUsers,
  withPlatformAdmin,
} from '../src/index';

// RLS بلاگ (docs/architecture.md §9.12): نوشتن فقط ادمین؛ عموم فقط مقاله‌ی منتشرشده و نظر تأییدشده را می‌بیند.

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

const createUser = (platformRole: 'user' | 'superadmin' = 'user') =>
  one(db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole }).returning());

const slug = (p: string) => `${p}-${randomUUID().slice(0, 8)}`;

describe('blog RLS', () => {
  it('public reads only published posts and their tags/redirects', async () => {
    const admin = await createUser('superadmin');
    const { draft, published, future, tag } = await withPlatformAdmin(admin.id, async (tx) => {
      const tag = await one(tx.insert(blogTags).values({ slug: slug('tag'), name: 'برچسب' }).returning());
      const draft = await one(tx.insert(blogPosts).values({ slug: slug('draft'), title: 'پیش‌نویس' }).returning());
      const published = await one(
        tx.insert(blogPosts).values({ slug: slug('pub'), title: 'منتشرشده', status: 'published', publishedAt: new Date(Date.now() - 1000) }).returning(),
      );
      const future = await one(
        tx.insert(blogPosts).values({ slug: slug('future'), title: 'آینده', status: 'published', publishedAt: new Date(Date.now() + 3_600_000) }).returning(),
      );
      await tx.insert(blogPostTags).values([
        { postId: draft.id, tagId: tag.id },
        { postId: published.id, tagId: tag.id },
      ]);
      await tx.insert(blogSlugRedirects).values([
        { slug: slug('old-draft'), postId: draft.id },
        { slug: slug('old-pub'), postId: published.id },
      ]);
      return { draft, published, future, tag };
    });

    const ids = [draft.id, published.id, future.id];
    const visible = await db.select({ id: blogPosts.id }).from(blogPosts).where(inArray(blogPosts.id, ids));
    expect(visible.map((r) => r.id)).toEqual([published.id]);

    const tags = await db.select().from(blogPostTags).where(eq(blogPostTags.tagId, tag.id));
    expect(tags.map((r) => r.postId)).toEqual([published.id]);

    const redirects = await db.select().from(blogSlugRedirects).where(inArray(blogSlugRedirects.postId, ids));
    expect(redirects.map((r) => r.postId)).toEqual([published.id]);

    // ادمین همه را می‌بیند
    const all = await withPlatformAdmin(admin.id, (tx) => tx.select({ id: blogPosts.id }).from(blogPosts).where(inArray(blogPosts.id, ids)));
    expect(all).toHaveLength(3);
  });

  it('only admins write posts, categories and tags', async () => {
    const user = await createUser();
    await expect(db.insert(blogPosts).values({ slug: slug('x') })).rejects.toThrow();
    await expect(withPlatformAdmin(user.id, (tx) => tx.insert(blogCategories).values({ slug: slug('c'), name: 'دسته' }))).rejects.toThrow();
    await expect(db.insert(blogTags).values({ slug: slug('t'), name: 'برچسب' })).rejects.toThrow();

    const admin = await createUser('superadmin');
    const post = await withPlatformAdmin(admin.id, (tx) =>
      one(tx.insert(blogPosts).values({ slug: slug('w'), status: 'published', publishedAt: new Date() }).returning()),
    );
    // بدون ادمین، به‌روزرسانی و حذف هیچ ردیفی را نمی‌گیرد
    await db.update(blogPosts).set({ title: 'هک' }).where(eq(blogPosts.id, post.id));
    await db.delete(blogPosts).where(eq(blogPosts.id, post.id));
    const [after] = await withPlatformAdmin(admin.id, (tx) => tx.select().from(blogPosts).where(eq(blogPosts.id, post.id)));
    expect(after?.title).toBe('');
  });

  it('accepts Persian slugs and rejects reserved or malformed ones', async () => {
    const admin = await createUser('superadmin');
    await withPlatformAdmin(admin.id, (tx) => tx.insert(blogPosts).values({ slug: `ساخت-صفحه-لینک-${randomUUID().slice(0, 4)}` }));
    await expect(withPlatformAdmin(admin.id, (tx) => tx.insert(blogPosts).values({ slug: 'category' }))).rejects.toThrow();
    await expect(withPlatformAdmin(admin.id, (tx) => tx.insert(blogPosts).values({ slug: 'Bad Slug' }))).rejects.toThrow();
    await expect(withPlatformAdmin(admin.id, (tx) => tx.insert(blogPosts).values({ slug: 'a--b' }))).rejects.toThrow();
  });

  it('public can only submit pending comments on open posts and only sees approved ones', async () => {
    const admin = await createUser('superadmin');
    const past = new Date(Date.now() - 5000);
    const { open, closed } = await withPlatformAdmin(admin.id, async (tx) => ({
      open: await one(tx.insert(blogPosts).values({ slug: slug('open'), status: 'published', publishedAt: past }).returning()),
      closed: await one(
        tx.insert(blogPosts).values({ slug: slug('closed'), status: 'published', publishedAt: past, allowComments: false }).returning(),
      ),
    }));

    await db.insert(blogComments).values({ postId: open.id, authorName: 'علی', body: 'عالی بود' });
    await expect(db.insert(blogComments).values({ postId: closed.id, authorName: 'علی', body: 'سلام' })).rejects.toThrow();
    await expect(db.insert(blogComments).values({ postId: open.id, authorName: 'علی', body: 'خودم تأیید', status: 'approved' })).rejects.toThrow();
    await expect(db.insert(blogComments).values({ postId: open.id, authorName: 'تیم', body: 'جعل', fromAdmin: true })).rejects.toThrow();

    expect(await db.select().from(blogComments).where(eq(blogComments.postId, open.id))).toHaveLength(0);
    await withPlatformAdmin(admin.id, (tx) => tx.update(blogComments).set({ status: 'approved' }).where(eq(blogComments.postId, open.id)));
    const visible = await db.select().from(blogComments).where(eq(blogComments.postId, open.id));
    expect(visible.map((c) => c.body)).toEqual(['عالی بود']);
  });
});
