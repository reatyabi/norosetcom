import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, blogComments, blogPosts, count, desc, eq, PLATFORM_ADMIN_CONTEXT, type PlatformAdminContext } from '@noroset/core';
import { BLOG_AUTHOR, type AdminComment, type AdminCommentList, type CommentStatus } from '../shared';
import { audit } from './access';
import type { CommentListQuery } from './dto';

// تأیید نظرها (docs/architecture.md §9.12؛ فقط superadmin). پاسخ ادمین با نام «تیم نوروست» همان لحظه تأییدشده است
// و نظر در انتظاری را که به آن پاسخ داده شده هم تأیید می‌کند.

@Injectable()
export class AdminCommentsService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  async list(query: CommentListQuery): Promise<AdminCommentList> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.ctx.run(async (tx) => {
      const where = and(
        query.status ? eq(blogComments.status, query.status) : undefined,
        query.postId ? eq(blogComments.postId, query.postId) : undefined,
      );
      const rows = await tx
        .select({ c: blogComments, postTitle: blogPosts.title, postSlug: blogPosts.slug, postStatus: blogPosts.status })
        .from(blogComments)
        .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
        .where(where)
        .orderBy(desc(blogComments.createdAt))
        .limit(limit)
        .offset(offset);
      const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(blogComments).where(where);
      const byStatus = await tx
        .select({ status: blogComments.status, n: count() })
        .from(blogComments)
        .where(query.postId ? eq(blogComments.postId, query.postId) : undefined)
        .groupBy(blogComments.status);
      const n = (s: CommentStatus) => Number(byStatus.find((r) => r.status === s)?.n ?? 0);
      return {
        items: rows.map(
          (r): AdminComment => ({
            id: r.c.id,
            post: { id: r.c.postId, title: r.postTitle, slug: r.postSlug, status: r.postStatus },
            parentId: r.c.parentId,
            authorName: r.c.authorName,
            authorEmail: r.c.authorEmail,
            body: r.c.body,
            status: r.c.status,
            fromAdmin: r.c.fromAdmin,
            createdAt: r.c.createdAt.toISOString(),
          }),
        ),
        total: Number(total),
        counts: { pending: n('pending'), approved: n('approved'), rejected: n('rejected') },
      };
    });
  }

  async setStatus(id: string, status: CommentStatus): Promise<void> {
    await this.ctx.run(async (tx) => {
      const [row] = await tx
        .update(blogComments)
        .set({ status, moderatedBy: this.ctx.adminId(), moderatedAt: new Date() })
        .where(eq(blogComments.id, id))
        .returning({ postId: blogComments.postId });
      if (!row) throw new NotFoundException();
      await audit(tx, this.ctx, 'blog_comment.status', 'blog_comment', id, { status, postId: row.postId });
    });
  }

  async reply(id: string, raw: string): Promise<{ id: string }> {
    const body = raw.trim();
    if (body.length < 2) throw new UnprocessableEntityException('body_required');
    return this.ctx.run(async (tx) => {
      const [target] = await tx.select().from(blogComments).where(eq(blogComments.id, id)).limit(1);
      if (!target) throw new NotFoundException();
      const now = new Date();
      if (target.status !== 'approved') {
        await tx.update(blogComments).set({ status: 'approved', moderatedBy: this.ctx.adminId(), moderatedAt: now }).where(eq(blogComments.id, id));
      }
      // پاسخ یک‌سطحی: پاسخ به پاسخ زیر همان نظر ریشه
      const [row] = await tx
        .insert(blogComments)
        .values({
          postId: target.postId,
          parentId: target.parentId ?? target.id,
          authorName: BLOG_AUTHOR,
          body,
          status: 'approved',
          fromAdmin: true,
          moderatedBy: this.ctx.adminId(),
          moderatedAt: now,
        })
        .returning({ id: blogComments.id });
      await audit(tx, this.ctx, 'blog_comment.reply', 'blog_comment', row!.id, { postId: target.postId, replyTo: id });
      return { id: row!.id };
    });
  }

  async remove(id: string): Promise<void> {
    await this.ctx.run(async (tx) => {
      const [row] = await tx.delete(blogComments).where(eq(blogComments.id, id)).returning({ postId: blogComments.postId, authorName: blogComments.authorName });
      if (!row) throw new NotFoundException();
      await audit(tx, this.ctx, 'blog_comment.delete', 'blog_comment', id, { postId: row.postId, authorName: row.authorName });
    });
  }
}
