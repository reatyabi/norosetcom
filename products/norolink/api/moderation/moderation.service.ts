import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  adminAuditLog,
  and,
  count,
  desc,
  eq,
  FILE_SERVICE,
  ilike,
  isNotNull,
  ne,
  norolinkPageReports,
  norolinkPages,
  or,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  sql,
  tenants,
  type Db,
  type FileService,
  type PlatformAdminContext,
  type SQL,
} from '@noroset/core';
import {
  effectiveModeration,
  type ModerationReason,
  type ModerationStatus,
  type ReportReason,
  type ReportStatus,
  type Snapshot,
} from '../../shared';
import type { ListModerationPagesQuery, ListReportsQuery, ResolveReportDto, SetModerationDto } from './dto';

// کنترل صفحه‌ها از سوی مدیریت پلتفرم (docs/architecture.md §9.13). فقط superadmin؛ RLS فقط صفحه‌هایی را نشان می‌دهد
// که دست‌کم یک بار منتشر شده‌اند و این سرویس فقط snapshot منتشرشده را می‌خواند (پیش‌نویس و المان‌ها هرگز). هر تغییر در
// همان تراکنش در لاگ ممیزی می‌آید؛ یادداشت داخلی فقط همان‌جاست.

const AUDIT_TARGET = 'link_page';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ModerationState {
  status: ModerationStatus;
  /** وضعیت مؤثر (محدودیت موقتِ مهلت‌گذشته ← none). */
  effective: ModerationStatus;
  reason: ModerationReason | null;
  notice: string | null;
  until: Date | null;
  at: Date | null;
}

export interface ModerationPageItem {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt: Date | null;
  tenant: { id: string; name: string; slug: string; status: 'active' | 'suspended' };
  moderation: ModerationState;
  openReports: number;
}

export interface ModerationHistoryItem {
  id: string;
  createdAt: Date;
  actorName: string | null;
  note: string | null;
  details: Record<string, unknown>;
}

export interface PageReportItem {
  id: string;
  pageId: string;
  slug: string;
  reason: ReportReason;
  details: string;
  contact: string | null;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  /** صفحه هنوز هست (حذف‌نشده و دست‌کم یک بار منتشرشده). */
  page: { title: string; moderation: ModerationStatus } | null;
}

export interface ModerationPageDetail extends ModerationPageItem {
  snapshot: Snapshot;
  assetBaseUrl: string;
  history: ModerationHistoryItem[];
  reports: PageReportItem[];
}

/** نشانی، نشانی کامل یا زیردامنه (`x.n8l.ir`) ← بخشی که با slug مقایسه می‌شود. */
export function searchTerm(raw: string): string {
  let q = raw.trim().toLowerCase();
  try {
    if (q.includes('://')) q = new URL(q).hostname;
  } catch {
    // متن آزاد
  }
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/.test(q)) q = q.split('.')[0]!;
  return q.replace(/[%_\\]/g, (c) => `\\${c}`);
}

const openReportCount = sql<number>`(SELECT count(*)::int FROM ${norolinkPageReports} r WHERE r.page_id = ${norolinkPages.id} AND r.status = 'open')`;

const pageColumns = {
  id: norolinkPages.id,
  slug: norolinkPages.slug,
  title: norolinkPages.title,
  status: norolinkPages.status,
  publishedAt: norolinkPages.publishedAt,
  tenantId: tenants.id,
  tenantName: tenants.name,
  tenantSlug: tenants.slug,
  tenantStatus: tenants.status,
  moderationStatus: norolinkPages.moderationStatus,
  moderationReason: norolinkPages.moderationReason,
  moderationNotice: norolinkPages.moderationNotice,
  moderationUntil: norolinkPages.moderationUntil,
  moderatedAt: norolinkPages.moderatedAt,
  openReports: openReportCount,
};

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt: Date | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: 'active' | 'suspended';
  moderationStatus: ModerationStatus;
  moderationReason: ModerationReason | null;
  moderationNotice: string | null;
  moderationUntil: Date | null;
  moderatedAt: Date | null;
  openReports: number;
};

function toItem(row: PageRow, now = new Date()): ModerationPageItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    publishedAt: row.publishedAt,
    tenant: { id: row.tenantId, name: row.tenantName, slug: row.tenantSlug, status: row.tenantStatus },
    moderation: {
      status: row.moderationStatus,
      effective: effectiveModeration(
        { status: row.moderationStatus, reason: row.moderationReason, notice: row.moderationNotice, until: row.moderationUntil },
        now,
      ),
      reason: row.moderationReason,
      notice: row.moderationNotice,
      until: row.moderationUntil,
      at: row.moderatedAt,
    },
    openReports: Number(row.openReports),
  };
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(FILE_SERVICE) private readonly files: FileService,
  ) {}

  async list(query: ListModerationPagesQuery): Promise<{ items: ModerationPageItem[]; total: number; openReports: number }> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const conditions: SQL[] = [isNotNull(norolinkPages.publishedSnapshot)];
    if (query.q) {
      const term = `%${searchTerm(query.q)}%`;
      conditions.push(or(ilike(norolinkPages.slug, term), ilike(norolinkPages.title, term))!);
    }
    if (query.filter === 'moderated') conditions.push(ne(norolinkPages.moderationStatus, 'none'));
    else if (query.filter === 'reported') conditions.push(sql`${openReportCount} > 0`);
    else if (query.filter) conditions.push(eq(norolinkPages.moderationStatus, query.filter));
    const where = and(...conditions);
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select(pageColumns)
        .from(norolinkPages)
        .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
        .where(where)
        .orderBy(desc(openReportCount), desc(sql`COALESCE(${norolinkPages.moderatedAt}, ${norolinkPages.publishedAt})`))
        .limit(limit)
        .offset(offset);
      const [{ n } = { n: 0 }] = await tx
        .select({ n: count() })
        .from(norolinkPages)
        .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
        .where(where);
      const [{ open } = { open: 0 }] = await tx
        .select({ open: count() })
        .from(norolinkPageReports)
        .where(eq(norolinkPageReports.status, 'open'));
      const now = new Date();
      return { items: rows.map((r) => toItem(r as PageRow, now)), total: Number(n), openReports: Number(open) };
    });
  }

  async get(id: string): Promise<ModerationPageDetail> {
    return this.ctx.run((tx) => this.detail(tx, id));
  }

  async setModeration(id: string, dto: SetModerationDto): Promise<ModerationPageDetail> {
    if (dto.status !== 'none' && !dto.reason) throw new UnprocessableEntityException('moderation_reason_required');
    const lifting = dto.status === 'none';
    const now = new Date();
    const until = !lifting && dto.days ? new Date(now.getTime() + dto.days * DAY_MS) : null;
    const notice = lifting ? null : dto.notice || null;
    const reason = lifting ? null : dto.reason!;
    return this.ctx.run(async (tx) => {
      const [row] = await tx
        .select({
          slug: norolinkPages.slug,
          tenantId: norolinkPages.tenantId,
          status: norolinkPages.moderationStatus,
          reason: norolinkPages.moderationReason,
          notice: norolinkPages.moderationNotice,
          until: norolinkPages.moderationUntil,
        })
        .from(norolinkPages)
        .where(and(eq(norolinkPages.id, id), isNotNull(norolinkPages.publishedSnapshot)))
        .for('update');
      if (!row) throw new NotFoundException();
      // فقط از این مسیر ستون‌های moderation_* عوض می‌شوند و همین مسیر ستون دیگری را عوض نمی‌کند (trigger migration ‏0026).
      await tx.execute(sql`SELECT set_config('app.page_moderation', 'on', true)`);
      await tx
        .update(norolinkPages)
        .set({ moderationStatus: dto.status, moderationReason: reason, moderationNotice: notice, moderationUntil: until, moderatedAt: now })
        .where(eq(norolinkPages.id, id));
      await tx.execute(sql`SELECT set_config('app.page_moderation', '', true)`);

      let resolvedReports = 0;
      if (dto.resolveReports) {
        const resolved = await tx
          .update(norolinkPageReports)
          .set({ status: 'actioned', resolvedBy: this.ctx.adminId(), resolvedAt: now, resolutionNote: dto.note.slice(0, 1000) })
          .where(and(eq(norolinkPageReports.pageId, id), eq(norolinkPageReports.status, 'open')))
          .returning({ id: norolinkPageReports.id });
        resolvedReports = resolved.length;
      }

      await this.audit(tx, 'link_page.moderate', id, dto.note, {
        slug: row.slug,
        tenantId: row.tenantId,
        from: effectiveModeration(row, now),
        to: dto.status,
        reason,
        notice,
        reference: dto.reference || null,
        until: until?.toISOString() ?? null,
        resolvedReports,
      });
      return this.detail(tx, id);
    });
  }

  async reports(query: ListReportsQuery): Promise<{ items: PageReportItem[]; total: number }> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where = query.status ? eq(norolinkPageReports.status, query.status) : undefined;
    return this.ctx.run(async (tx) => {
      const items = await this.reportRows(tx, where, limit, offset);
      const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(norolinkPageReports).where(where);
      return { items, total: Number(n) };
    });
  }

  async resolveReport(id: string, dto: ResolveReportDto): Promise<PageReportItem> {
    return this.ctx.run(async (tx) => {
      const [updated] = await tx
        .update(norolinkPageReports)
        .set({ status: dto.status, resolvedBy: this.ctx.adminId(), resolvedAt: new Date(), resolutionNote: dto.note || null })
        .where(and(eq(norolinkPageReports.id, id), eq(norolinkPageReports.status, 'open')))
        .returning({ id: norolinkPageReports.id, pageId: norolinkPageReports.pageId, slug: norolinkPageReports.slug });
      if (!updated) {
        const [exists] = await tx.select({ id: norolinkPageReports.id }).from(norolinkPageReports).where(eq(norolinkPageReports.id, id));
        if (!exists) throw new NotFoundException();
        throw new ConflictException('report_resolved');
      }
      await this.audit(tx, 'link_report.resolve', updated.pageId, dto.note || null, { reportId: id, slug: updated.slug, status: dto.status });
      const [item] = await this.reportRows(tx, eq(norolinkPageReports.id, id), 1, 0);
      return item!;
    });
  }

  private async detail(tx: Db, id: string): Promise<ModerationPageDetail> {
    const [row] = await tx
      .select({ ...pageColumns, snapshot: norolinkPages.publishedSnapshot })
      .from(norolinkPages)
      .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
      .where(and(eq(norolinkPages.id, id), isNotNull(norolinkPages.publishedSnapshot)))
      .limit(1);
    if (!row) throw new NotFoundException();
    const { snapshot, ...page } = row;
    const history = await tx
      .select({
        id: adminAuditLog.id,
        createdAt: adminAuditLog.createdAt,
        actorName: platformUsers.fullName,
        note: adminAuditLog.reason,
        details: adminAuditLog.details,
      })
      .from(adminAuditLog)
      .leftJoin(platformUsers, eq(platformUsers.id, adminAuditLog.actorUserId))
      .where(and(eq(adminAuditLog.targetType, AUDIT_TARGET), eq(adminAuditLog.targetId, id)))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(100);
    return {
      ...toItem(page as PageRow),
      snapshot: snapshot as Snapshot,
      assetBaseUrl: this.files.publicBaseUrl(),
      history: history.map((h) => ({ ...h, actorName: h.actorName || null, details: (h.details ?? {}) as Record<string, unknown> })),
      reports: await this.reportRows(tx, eq(norolinkPageReports.pageId, id), 100, 0),
    };
  }

  private async reportRows(tx: Db, where: SQL | undefined, limit: number, offset: number): Promise<PageReportItem[]> {
    const rows = await tx
      .select({
        id: norolinkPageReports.id,
        pageId: norolinkPageReports.pageId,
        slug: norolinkPageReports.slug,
        reason: norolinkPageReports.reason,
        details: norolinkPageReports.details,
        contact: norolinkPageReports.contact,
        status: norolinkPageReports.status,
        createdAt: norolinkPageReports.createdAt,
        resolvedAt: norolinkPageReports.resolvedAt,
        resolvedByName: platformUsers.fullName,
        resolutionNote: norolinkPageReports.resolutionNote,
        pageTitle: norolinkPages.title,
        pageModeration: norolinkPages.moderationStatus,
        pageUntil: norolinkPages.moderationUntil,
      })
      .from(norolinkPageReports)
      .leftJoin(platformUsers, eq(platformUsers.id, norolinkPageReports.resolvedBy))
      .leftJoin(norolinkPages, eq(norolinkPages.id, norolinkPageReports.pageId))
      .where(where)
      .orderBy(desc(norolinkPageReports.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(({ pageTitle, pageModeration, pageUntil, reason, ...r }) => ({
      ...r,
      reason: reason as ReportReason,
      resolvedByName: r.resolvedByName || null,
      page:
        pageTitle === null || pageModeration === null
          ? null
          : { title: pageTitle, moderation: effectiveModeration({ status: pageModeration, reason: null, notice: null, until: pageUntil }) },
    }));
  }

  private async audit(tx: Db, action: string, targetId: string, reason: string | null, details: Record<string, unknown>): Promise<void> {
    await tx.insert(adminAuditLog).values({
      actorUserId: this.ctx.adminId(),
      action,
      targetType: AUDIT_TARGET,
      targetId,
      reason,
      details,
      ip: this.ctx.ip(),
    });
  }
}
