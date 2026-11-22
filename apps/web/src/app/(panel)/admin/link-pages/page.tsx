'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  MotionArt,
  NativeSelect,
  NativeSelectOption,
  Segmented,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import { MODERATION_REASON_LABELS, MODERATION_STATUS_LABELS, MODERATION_STATUSES, type ModerationStatus, type ReportStatus } from '@noroset/norolink/ui';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { ItemTableSkeleton } from '../../_components/page-skeletons';
import { AdminPage, fa, Pager, query, useAdminResource, useDebounced } from '../_components/admin-ui';
import { ModerationBadge, ReportsTable } from './moderation-ui';
import type { ModerationPageItem, PageReportItem } from './types';

// کنترل صفحه‌های لینک منتشرشده و صف گزارش‌های تخلف (docs/architecture.md §9.13).

const LIMIT = 50;
type Tab = 'pages' | 'reports';
type Filter = 'all' | ModerationStatus | 'moderated' | 'reported';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'reported', label: 'گزارش‌شده' },
  { value: 'moderated', label: 'دارای محدودیت' },
  ...MODERATION_STATUSES.map((s) => ({ value: s, label: MODERATION_STATUS_LABELS[s] })),
];
type ReportFilter = ReportStatus | 'all';
const REPORT_FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'در انتظار' },
  { value: 'actioned', label: 'اقدام‌شده' },
  { value: 'dismissed', label: 'ردشده' },
  { value: 'all', label: 'همه' },
];

export default function AdminLinkPagesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'reports' ? 'reports' : 'pages';

  return (
    <AdminPage title="صفحه‌های لینک" description="کنترل صفحه‌های منتشرشده در شرایط حقوقی و امنیتی، و رسیدگی به گزارش‌های تخلف">
      <Segmented<Tab>
        value={tab}
        onChange={(v) => router.replace(v === 'reports' ? `${routes.admin.linkPages}?tab=reports` : routes.admin.linkPages)}
        items={[
          { value: 'pages', label: 'صفحه‌ها' },
          { value: 'reports', label: 'گزارش‌ها' },
        ]}
        className="w-full sm:w-auto"
      />
      {tab === 'pages' ? <PagesTab /> : <ReportsTab />}
    </AdminPage>
  );
}

function PagesTab() {
  const [filter, setFilter] = useState<Filter>('all');
  const [text, setText] = useState('');
  const [offset, setOffset] = useState(0);
  const q = useDebounced(text.trim());
  const { data, error } = useAdminResource<{ items: ModerationPageItem[]; total: number; openReports: number }>(
    `/norolink/admin/pages${query({ q, filter: filter === 'all' ? undefined : filter, limit: LIMIT, offset })}`,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          size="sm"
          aria-label="فیلتر"
          className="w-full sm:w-48"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Filter);
            setOffset(0);
          }}
        >
          {FILTERS.map((f) => (
            <NativeSelectOption key={f.value} value={f.value}>
              {f.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="relative w-full sm:w-80">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="جست‌وجوی صفحه"
            placeholder="نشانی، لینک کامل یا عنوان"
            className="ps-8"
            value={text}
            maxLength={200}
            onChange={(e) => {
              setText(e.target.value);
              setOffset(0);
            }}
          />
        </div>
        {data && data.openReports > 0 ? <Badge variant="destructive">{fa(data.openReports)} گزارش در انتظار بررسی</Badge> : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && !error ? (
        <ItemTableSkeleton count={8} />
      ) : data && data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              <MotionArt name="no-results" className="size-28" />
            </EmptyMedia>
            <EmptyTitle>صفحه‌ای پیدا نشد</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : data ? (
        <section className="flex flex-col gap-2">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>صفحه</TableHead>
                  <TableHead>وضعیت مدیریتی</TableHead>
                  <TableHead className="hidden md:table-cell">فضای کاری</TableHead>
                  <TableHead className="hidden md:table-cell">گزارش باز</TableHead>
                  <TableHead className="hidden lg:table-cell">انتشار</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-0 min-w-48">
                      <Link href={routes.admin.linkPage(p.id)} className="flex min-w-0 flex-col gap-0.5 hover:underline">
                        <span className="truncate font-medium">{p.title}</span>
                        <span dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                          {p.slug}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-0.5">
                        <ModerationBadge status={p.moderation.effective} />
                        {p.moderation.reason && p.moderation.effective !== 'none' ? (
                          <span className="text-xs text-muted-foreground">{MODERATION_REASON_LABELS[p.moderation.reason]}</span>
                        ) : null}
                        {p.status === 'draft' ? <span className="text-xs text-muted-foreground">لغو انتشار شده</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Link href={routes.admin.tenant(p.tenant.id)} className="hover:underline">
                        {p.tenant.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.openReports ? <Badge variant="destructive">{fa(p.openReports)}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{p.publishedAt ? formatDateTime(p.publishedAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pager offset={offset} limit={LIMIT} total={data.total} shown={data.items.length} noun="صفحه" onChange={setOffset} />
        </section>
      ) : null}
    </>
  );
}

function ReportsTab() {
  const [status, setStatus] = useState<ReportFilter>('open');
  const [offset, setOffset] = useState(0);
  const { data, setData, error } = useAdminResource<{ items: PageReportItem[]; total: number }>(
    `/norolink/admin/reports${query({ status: status === 'all' ? undefined : status, limit: LIMIT, offset })}`,
  );

  return (
    <>
      <Segmented<ReportFilter>
        value={status}
        onChange={(v) => {
          setStatus(v);
          setOffset(0);
        }}
        items={REPORT_FILTERS}
        className="w-full sm:w-auto"
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!data && !error ? (
        <ItemTableSkeleton count={6} />
      ) : data ? (
        <section className="flex flex-col gap-2">
          <ReportsTable
            items={data.items}
            showPage
            pageHref={(r) => (r.page ? routes.admin.linkPage(r.pageId) : null)}
            onChanged={(next) => setData((cur) => (cur ? { ...cur, items: cur.items.map((r) => (r.id === next.id ? next : r)) } : cur))}
          />
          <Pager offset={offset} limit={LIMIT} total={data.total} shown={data.items.length} noun="گزارش" onChange={setOffset} />
        </section>
      ) : null}
    </>
  );
}
