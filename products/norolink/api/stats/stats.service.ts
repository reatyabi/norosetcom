import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gte,
  lt,
  norolinkPages,
  norolinkPageStats,
  PLAN_RESOLVER,
  sql,
  TENANT_CONTEXT,
  type Db,
  type PlanResolver,
  type TenantContext,
} from '@noroset/core';
import { limitsFor } from '../access';

// آمار صفحه از رویدادهای خام (docs/architecture.md §9.5). روزها به وقت تهران بریده می‌شوند.

export const STATS_TIME_ZONE = 'Asia/Tehran';
const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;
const TOP = 10;

export interface StatsBreakdownRow {
  key: string | null;
  count: number;
}

export interface PageStats {
  from: string;
  to: string;
  totals: { views: number; clicks: number; uniqueVisitors: number };
  daily: Array<{ day: string; views: number; clicks: number }>;
  elements: Array<{ elementId: string; clicks: number }>;
  /** فقط در پلن حرفه‌ای؛ در غیر این صورت null. */
  detailed: {
    devices: StatsBreakdownRow[];
    browsers: StatsBreakdownRow[];
    os: StatsBreakdownRow[];
    referrers: StatsBreakdownRow[];
  } | null;
}

/** تاریخ امروز تهران به‌صورت YYYY-MM-DD. */
export function tehranToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STATS_TIME_ZONE }).format(now);
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// ثابت و literal (نه پارامتر) تا عبارت SELECT و GROUP BY از نظر PostgreSQL یکی باشند.
const TZ = sql.raw(`'${STATS_TIME_ZONE}'`);

function dayStart(day: string) {
  return sql`((${day}::date)::timestamp AT TIME ZONE ${TZ})`;
}

const localDay = sql<string>`to_char(${norolinkPageStats.occurredAt} AT TIME ZONE ${TZ}, 'YYYY-MM-DD')`;
const views = sql<number>`count(*) FILTER (WHERE ${norolinkPageStats.kind} = 'page_view')::int`;
const clicks = sql<number>`count(*) FILTER (WHERE ${norolinkPageStats.kind} = 'element_click')::int`;

@Injectable()
export class StatsService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  async get(pageId: string, query: { from?: string; to?: string }): Promise<PageStats> {
    const to = query.to ?? tehranToday();
    const from = query.from ?? shiftDay(to, -(DEFAULT_DAYS - 1));
    const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (!Number.isFinite(span) || span < 0 || span >= MAX_DAYS) throw new BadRequestException('invalid_range');
    const limits = await limitsFor(this.plans, this.ctx.tenantId());

    return this.ctx.run(async (tx) => {
      const [page] = await tx.select({ id: norolinkPages.id }).from(norolinkPages).where(eq(norolinkPages.id, pageId));
      if (!page) throw new NotFoundException();
      const where = and(
        eq(norolinkPageStats.pageId, pageId),
        gte(norolinkPageStats.occurredAt, dayStart(from)),
        lt(norolinkPageStats.occurredAt, dayStart(shiftDay(to, 1))),
      );

      const [totals] = await tx
        .select({
          views,
          clicks,
          // هش بازدیدکننده روزانه می‌چرخد؛ یکتا یعنی «بازدیدکننده‌ی یکتای روزانه» جمع روزها.
          uniqueVisitors: sql<number>`count(DISTINCT (${localDay}, ${norolinkPageStats.visitorHash})) FILTER (WHERE ${norolinkPageStats.kind} = 'page_view' AND ${norolinkPageStats.visitorHash} IS NOT NULL)::int`,
        })
        .from(norolinkPageStats)
        .where(where);

      const daily = await tx
        .select({ day: localDay, views, clicks })
        .from(norolinkPageStats)
        .where(where)
        .groupBy(localDay)
        .orderBy(localDay);

      const elementClicks = sql<number>`count(*)::int`;
      const elements = await tx
        .select({ elementId: sql<string>`${norolinkPageStats.elementId}`, clicks: elementClicks })
        .from(norolinkPageStats)
        .where(and(where, eq(norolinkPageStats.kind, 'element_click')))
        .groupBy(norolinkPageStats.elementId)
        .orderBy(desc(elementClicks));

      return {
        from,
        to,
        totals: totals ?? { views: 0, clicks: 0, uniqueVisitors: 0 },
        daily,
        elements,
        detailed: limits.detailedStats ? await this.detailed(tx, where) : null,
      };
    });
  }

  private async detailed(tx: Db, where: ReturnType<typeof and>): Promise<NonNullable<PageStats['detailed']>> {
    const viewsOnly = and(where, eq(norolinkPageStats.kind, 'page_view'));
    const n = sql<number>`count(*)::int`;
    const breakdown = (
      column:
        | typeof norolinkPageStats.os
        | typeof norolinkPageStats.browser
        | typeof norolinkPageStats.referrerDomain
        | typeof norolinkPageStats.deviceType,
    ) =>
      tx
        .select({ key: sql<string | null>`${column}::text`, count: n })
        .from(norolinkPageStats)
        .where(viewsOnly)
        .groupBy(column)
        .orderBy(desc(n))
        .limit(TOP);
    return {
      devices: await breakdown(norolinkPageStats.deviceType),
      browsers: await breakdown(norolinkPageStats.browser),
      os: await breakdown(norolinkPageStats.os),
      referrers: await breakdown(norolinkPageStats.referrerDomain),
    };
  }
}
