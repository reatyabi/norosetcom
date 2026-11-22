'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { LockIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Segmented,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import { ELEMENT_LABELS, type LinkButtonSettings } from '@noroset/norolink/ui';
import { PageHeader } from '@/components/settings-ui';
import { api, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useTenant } from '../../../session';
import { AnalyticsSkeleton } from '../../../_components/page-skeletons';
import type { EditorElement, LinkDetail } from '../../links-shared';

interface Breakdown {
  key: string | null;
  count: number;
}

interface PageStats {
  from: string;
  to: string;
  totals: { views: number; clicks: number; uniqueVisitors: number };
  daily: Array<{ day: string; views: number; clicks: number }>;
  elements: Array<{ elementId: string; clicks: number }>;
  detailed: { devices: Breakdown[]; browsers: Breakdown[]; os: Breakdown[]; referrers: Breakdown[] } | null;
}

type Range = '7' | '30' | '90';

const fa = (n: number) => n.toLocaleString('fa-IR');
const DEVICE: Record<string, string> = { mobile: 'موبایل', tablet: 'تبلت', desktop: 'دسکتاپ', other: 'سایر' };

/** YYYY-MM-DD امروز به وقت تهران و n روز قبل از آن. */
function rangeDays(days: number): { from: string; to: string } {
  const to = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return { from: d.toISOString().slice(0, 10), to };
}

function allDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const shamsi = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', ...opts }).format(new Date(`${day}T00:00:00Z`));

function elementName(el: EditorElement | undefined): string {
  if (!el) return 'المان حذف‌شده';
  if (el.kind === 'link_button') return (el.settings as LinkButtonSettings).label || ELEMENT_LABELS.link_button;
  return ELEMENT_LABELS[el.kind];
}

export default function LinkAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const tenant = useTenant();
  return <Analytics key={`${tenant.tenantId}:${slug}`} slug={decodeURIComponent(slug)} />;
}

function Analytics({ slug }: { slug: string }) {
  const tenant = useTenant();
  const [page, setPage] = useState<LinkDetail | null>(null);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [range, setRange] = useState<Range>('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<LinkDetail>(`/norolink/pages/by-slug/${encodeURIComponent(slug)}`, { tenantId: tenant.tenantId })
      .then(setPage)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [slug, tenant.tenantId]);

  useEffect(() => {
    if (!page) return;
    const { from, to } = rangeDays(Number(range));
    api<PageStats>(`/norolink/pages/${page.id}/stats?from=${from}&to=${to}`, { tenantId: tenant.tenantId })
      .then(setStats)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [page, range, tenant.tenantId]);

  const series = useMemo(() => {
    if (!stats) return [];
    const map = new Map(stats.daily.map((d) => [d.day, d]));
    return allDays(stats.from, stats.to).map((day) => map.get(day) ?? { day, views: 0, clicks: 0 });
  }, [stats]);

  const elementsById = useMemo(() => new Map((page?.elements ?? []).map((e) => [e.id, e])), [page]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: routes.link.home, label: 'صفحه‌های لینک' }}
        title={`آمار ${page?.title ?? ''}`}
        description={tenant.name}
        action={
          <Segmented
            className="w-56 whitespace-nowrap"
            value={range}
            onChange={setRange}
            items={[
              { value: '7', label: '۷ روز' },
              { value: '30', label: '۳۰ روز' },
              { value: '90', label: '۹۰ روز' },
            ]}
          />
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!stats && !error ? (
        <AnalyticsSkeleton />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="بازدید" value={stats.totals.views} />
            <StatTile label="بازدیدکننده‌ی یکتا (روزانه)" value={stats.totals.uniqueVisitors} />
            <StatTile
              label="کلیک"
              value={stats.totals.clicks}
              hint={stats.totals.views ? `نرخ کلیک ${fa(Math.round((stats.totals.clicks / stats.totals.views) * 100))}٪` : undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">بازدید روزانه</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyBars series={series} />
            </CardContent>
          </Card>

          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المان</TableHead>
                  <TableHead className="text-end">کلیک</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.elements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                      هنوز کلیکی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.elements.map((e) => (
                    <TableRow key={e.elementId}>
                      <TableCell>{elementName(elementsById.get(e.elementId))}</TableCell>
                      <TableCell className="text-end tabular-nums">{fa(e.clicks)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {stats.detailed ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <BreakdownCard title="دستگاه" rows={stats.detailed.devices} format={(k) => DEVICE[k] ?? k} />
              <BreakdownCard title="منبع ورود" rows={stats.detailed.referrers} format={(k) => k} empty="مستقیم" />
              <BreakdownCard title="مرورگر" rows={stats.detailed.browsers} format={(k) => k} />
              <BreakdownCard title="سیستم‌عامل" rows={stats.detailed.os} format={(k) => k} />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 py-5 text-sm text-muted-foreground">
                <Badge variant="outline" className="gap-1">
                  <LockIcon className="size-3" />
                  پلن حرفه‌ای
                </Badge>
                آمار دستگاه، مرورگر، سیستم‌عامل و منبع ورود در پلن حرفه‌ای نمایش داده می‌شود.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-3xl font-bold tabular-nums">{fa(value)}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

/** نمودار ستونی تک‌سری بازدید روزانه با tooltip روی هر ستون. */
function DailyBars({ series }: { series: Array<{ day: string; views: number; clicks: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.views));
  const h = hover !== null ? series[hover] : null;
  const labelEvery = Math.ceil(series.length / 6);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-44" onMouseLeave={() => setHover(null)}>
        {/* خط مبنا و خط بیشینه (کم‌رنگ) */}
        <div className="absolute inset-x-0 bottom-0 border-t border-foreground/20" />
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-foreground/10" />
        <span className="absolute -top-2 end-0 bg-card ps-1 text-[10px] text-muted-foreground tabular-nums">{fa(max)}</span>
        <div className="absolute inset-0 flex items-end gap-0.5" dir="ltr">
          {series.map((d, i) => (
            <div
              key={d.day}
              className="flex h-full min-w-0 flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
              aria-label={`${shamsi(d.day, { month: 'long', day: 'numeric' })}: ${fa(d.views)} بازدید`}
            >
              <div
                className={`w-full rounded-t-[4px] bg-primary transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
                style={{ height: d.views ? `${Math.max(2, (d.views / max) * 100)}%` : '0' }}
              />
            </div>
          ))}
        </div>
        {h ? (
          <div className="pointer-events-none absolute top-1 start-1 rounded-lg bg-popover px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-border">
            <div className="font-semibold">{shamsi(h.day, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="text-muted-foreground">
              {fa(h.views)} بازدید · {fa(h.clicks)} کلیک
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground" dir="ltr">
        {series.map((d, i) => (
          <span key={d.day} className="min-w-0 flex-1 text-center">
            {i % labelEvery === 0 ? shamsi(d.day, { month: 'numeric', day: 'numeric' }) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  format,
  empty = 'نامشخص',
}: {
  title: string;
  rows: Breakdown[];
  format: (key: string) => string;
  empty?: string;
}) {
  const total = rows.reduce((n, r) => n + r.count, 0) || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.length === 0 ? <span className="text-sm text-muted-foreground">داده‌ای نیست.</span> : null}
        {rows.map((r) => (
          <div key={r.key ?? '-'} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{r.key ? format(r.key) : empty}</span>
              <span className="text-muted-foreground tabular-nums">{fa(r.count)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
