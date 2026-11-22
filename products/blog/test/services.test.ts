import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  adminAuditLog,
  and,
  db,
  eq,
  platformUsers,
  withPlatformAdmin,
  type Db,
  type FileService,
  type IpHasher,
  type PlatformAdminContext,
  type RateLimiter,
} from '@noroset/core';
import { AdminCommentsService } from '../api/comments.service';
import { AdminPostsService } from '../api/posts.service';
import { PublicBlogService, type PublicPostResult } from '../api/public.service';
import { AdminTermsService } from '../api/terms.service';
import type { PublicPostResponse } from '../shared';

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

let adminId = '';
beforeAll(async () => {
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('blog-admin')}@test.local`, platformRole: 'superadmin' }).returning();
  adminId = u!.id;
});

const ctx: PlatformAdminContext = {
  adminId: () => adminId,
  ip: () => '127.0.0.1',
  run: <T>(fn: (tx: Db) => Promise<T>) => withPlatformAdmin(adminId, fn),
};

const fileId = randomUUID();
const files = {
  publicBaseUrl: () => 'https://noroset.test/api/norofile/public/files',
  uploadPlatform: async () => ({ id: fileId, width: 1200, height: 630, url: 'x' }),
} as unknown as FileService;

let allow = true;
const limiter: RateLimiter = { consume: () => allow };
const hasher: IpHasher = { hash: (ip) => `h:${ip}`.padEnd(64, '0') };

const posts = () => new AdminPostsService(ctx, files);
const terms = () => new AdminTermsService(ctx);
const comments = () => new AdminCommentsService(ctx);
const pub = () => new PublicBlogService(files, limiter, hasher);

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const asPost = (r: PublicPostResult) => {
  if ('redirect' in r) throw new Error('unexpected redirect');
  return r as PublicPostResponse;
};

async function publishedPost(title: string, extra: Parameters<AdminPostsService['update']>[1] = {}) {
  const p = await posts().create({ title });
  await posts().update(p.id, { content: doc(`${title} متن مقاله`), ...extra });
  return posts().publish(p.id);
}

describe('admin posts', () => {
  it('creates a draft with a Persian slug from the title and keeps it unique', async () => {
    const title = uniq('راهنمای نورولینک');
    const a = await posts().create({ title });
    const b = await posts().create({ title });
    expect(a.status).toBe('draft');
    expect(a.slug).toMatch(/^راهنمای-نورولینک-/);
    expect(b.slug).toBe(`${a.slug}-2`);
  });

  it('sanitizes content, computes reading stats and upserts tags', async () => {
    const p = await posts().create({ title: uniq('برچسب') });
    const tag = uniq('سئو');
    const updated = await posts().update(p.id, {
      content: { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'یک دو سه' }] }] },
      tags: [tag, tag, ` ${tag} `],
      seo: { focus_keyword: 'سه', title: 'عنوان سئو', unknown: 'x', canonical: '' },
    });
    expect(updated.content).toEqual(doc('یک دو سه'));
    expect(updated.wordCount).toBe(3);
    expect(updated.tags.map((t) => t.name)).toEqual([tag]);
    expect(updated.seo).toEqual({ focus_keyword: 'سه', title: 'عنوان سئو' });
    await expect(posts().update(p.id, { content: { type: 'doc', content: [{ type: 'script' }] } })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(posts().update(p.id, { seo: { canonical: 'javascript:alert(1)' } })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(posts().update(p.id, { cover: { fileId: 'https://evil/x.png' } })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('refuses to publish incomplete posts and logs publish in the audit log', async () => {
    const p = await posts().create({});
    await expect(posts().publish(p.id)).rejects.toMatchObject({ response: { message: 'not_publishable', issues: ['missing_title', 'empty_content'] } });
    await posts().update(p.id, { title: uniq('کامل'), content: doc('متن') });
    const published = await posts().publish(p.id);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
    const log = await withPlatformAdmin(adminId, (tx) =>
      tx.select().from(adminAuditLog).where(and(eq(adminAuditLog.targetId, p.id), eq(adminAuditLog.action, 'blog_post.publish'))),
    );
    expect(log).toHaveLength(1);
    // زمان‌بندی نداریم
    await expect(posts().update(p.id, { publishedAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('redirects old slugs of published posts and blocks taking them', async () => {
    const p = await publishedPost(uniq('نشانی'));
    const old = p.slug;
    const next = uniq('نشانی-تازه');
    await posts().update(p.id, { slug: next });
    expect(await pub().read(old)).toEqual({ redirect: next });
    expect(asPost(await pub().read(next)).post.slug).toBe(next);

    const other = await posts().create({ title: uniq('دیگری') });
    await expect(posts().update(other.id, { slug: old })).rejects.toBeInstanceOf(ConflictException);
    await expect(posts().update(other.id, { slug: 'category' })).rejects.toBeInstanceOf(UnprocessableEntityException);

    // برگشت به نشانی قبلی همان مقاله
    const back = await posts().update(p.id, { slug: old });
    expect(back.previousSlugs).toEqual([next]);
  });
});

describe('public blog', () => {
  it('lists only published posts, filters by category and tag and never shows drafts', async () => {
    const cat = await terms().createCategory({ name: uniq('آموزش') });
    const tag = uniq('برچسب-عمومی');
    const a = await publishedPost(uniq('عمومی'), { categoryId: cat.id, tags: [tag] });
    const draft = await posts().create({ title: uniq('پنهان') });
    await posts().update(draft.id, { categoryId: cat.id, content: doc('پیش‌نویس') });

    const byCat = await pub().list({ category: cat.slug });
    expect(byCat.items.map((i) => i.slug)).toEqual([a.slug]);
    expect(byCat.items[0]!.category).toEqual({ slug: cat.slug, name: cat.name });
    const byTag = await pub().list({ tag: a.tags[0]!.slug });
    expect(byTag.items.map((i) => i.slug)).toEqual([a.slug]);
    await expect(pub().read(draft.slug)).rejects.toBeInstanceOf(NotFoundException);

    const categories = await pub().categories();
    expect(categories.find((c) => c.slug === cat.slug)?.postCount).toBe(1);

    await posts().unpublish(a.id);
    await expect(pub().read(a.slug)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('excludes noindex and canonicalized posts from the sitemap', async () => {
    const listed = await publishedPost(uniq('نقشه'));
    const hidden = await publishedPost(uniq('مخفی'), { seo: { noindex: true } });
    const map = await pub().sitemap();
    const slugs = map.posts.map((p) => p.slug);
    expect(slugs).toContain(listed.slug);
    expect(slugs).not.toContain(hidden.slug);
    const detail = asPost(await pub().read(hidden.slug));
    expect(detail.post.seo.noindex).toBe(true);
  });

  it('related posts prefer shared tags', async () => {
    const tag = uniq('مرتبط');
    const a = await publishedPost(uniq('اول'), { tags: [tag] });
    const b = await publishedPost(uniq('دوم'), { tags: [tag] });
    const r = asPost(await pub().read(a.slug));
    expect(r.related[0]!.slug).toBe(b.slug);
    expect(r.related.map((x) => x.slug)).not.toContain(a.slug);
  });
});

describe('comments', () => {
  it('stores comments as pending, shows them after approval and threads admin replies', async () => {
    const p = await publishedPost(uniq('نظر'));
    await pub().comment(p.slug, { name: ' علی ', body: 'مقاله‌ی خوبی بود', email: 'Ali@Example.com' }, '1.2.3.4');
    expect(asPost(await pub().read(p.slug)).comments).toHaveLength(0);

    const pending = await comments().list({ postId: p.id, status: 'pending' });
    expect(pending.items).toHaveLength(1);
    const c = pending.items[0]!;
    expect(c.authorName).toBe('علی');
    expect(c.authorEmail).toBe('ali@example.com');

    await comments().reply(c.id, 'ممنون از شما');
    const visible = asPost(await pub().read(p.slug)).comments;
    expect(visible.map((v) => [v.authorName, v.parentId, v.fromAdmin])).toEqual([
      ['علی', null, false],
      ['تیم نوروست', c.id, true],
    ]);
    expect(visible[0]).not.toHaveProperty('authorEmail');

    // پاسخ کاربر به پاسخ ادمین زیر همان نظر ریشه می‌رود
    await pub().comment(p.slug, { name: 'رضا', body: 'من هم موافقم', parentId: visible[1]!.id }, '1.2.3.5');
    const reply = (await comments().list({ postId: p.id, status: 'pending' })).items[0]!;
    expect(reply.parentId).toBe(c.id);
  });

  it('honeypot, closed comments, rate limit and pending parents', async () => {
    const p = await publishedPost(uniq('اسپم'));
    expect(await pub().comment(p.slug, { name: 'ربات', body: 'spam', website: 'http://spam' }, '9.9.9.9')).toEqual({ ok: true });
    expect((await comments().list({ postId: p.id })).total).toBe(0);

    await pub().comment(p.slug, { name: 'الف', body: 'در انتظار' }, '9.9.9.9');
    const pendingId = (await comments().list({ postId: p.id })).items[0]!.id;
    await expect(pub().comment(p.slug, { name: 'ب', body: 'پاسخ', parentId: pendingId }, '9.9.9.9')).rejects.toBeInstanceOf(UnprocessableEntityException);

    await posts().update(p.id, { allowComments: false });
    await expect(pub().comment(p.slug, { name: 'الف', body: 'بسته' }, '9.9.9.9')).rejects.toBeInstanceOf(ConflictException);

    allow = false;
    try {
      await expect(pub().comment(p.slug, { name: 'الف', body: 'زیاد' }, '9.9.9.9')).rejects.toBeInstanceOf(HttpException);
    } finally {
      allow = true;
    }
  });
});

describe('terms', () => {
  it('deleting a category keeps its posts without a category', async () => {
    const cat = await terms().createCategory({ name: uniq('موقت') });
    const p = await publishedPost(uniq('بی‌دسته'), { categoryId: cat.id });
    await expect(terms().createCategory({ name: 'x', slug: cat.slug })).rejects.toBeInstanceOf(ConflictException);
    await terms().removeCategory(cat.id);
    expect((await posts().get(p.id)).categoryId).toBeNull();
  });
});
