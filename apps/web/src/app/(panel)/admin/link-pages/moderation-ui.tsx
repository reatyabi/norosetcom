'use client';

import { useState } from 'react';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@noroset/ui';
import { MODERATION_REASON_LABELS, MODERATION_STATUS_LABELS, REPORT_STATUS_LABELS, type ModerationStatus } from '@noroset/norolink/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { PageReportItem } from './types';

export function ModerationBadge({ status }: { status: ModerationStatus }) {
  if (status === 'none') return <Badge variant="secondary">{MODERATION_STATUS_LABELS.none}</Badge>;
  return <Badge variant={status === 'delisted' ? 'outline' : 'destructive'}>{MODERATION_STATUS_LABELS[status]}</Badge>;
}

/** جدول گزارش‌ها با «رد گزارش» برای گزارش‌های باز. */
export function ReportsTable({
  items,
  showPage,
  pageHref,
  onChanged,
}: {
  items: PageReportItem[];
  showPage: boolean;
  pageHref?: (r: PageReportItem) => string | null;
  onChanged: (next: PageReportItem) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function dismiss(r: PageReportItem) {
    setBusy(r.id);
    setError(null);
    try {
      onChanged(await api<PageReportItem>(`/norolink/admin/reports/${encodeURIComponent(r.id)}/resolve`, { method: 'POST', body: { status: 'dismissed' } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return <p className="text-sm text-muted-foreground">گزارشی نیست.</p>;
  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>گزارش</TableHead>
              {showPage ? <TableHead className="hidden md:table-cell">صفحه</TableHead> : null}
              <TableHead>وضعیت</TableHead>
              <TableHead className="hidden lg:table-cell">زمان</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const href = pageHref?.(r) ?? null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="max-w-0 min-w-56">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">{MODERATION_REASON_LABELS[r.reason]}</span>
                      {r.details ? (
                        <span className="whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{r.details}</span>
                      ) : null}
                      {r.contact ? (
                        <span dir="ltr" className="text-end text-xs text-muted-foreground">
                          {r.contact}
                        </span>
                      ) : null}
                      {r.resolutionNote ? <span className="text-xs text-muted-foreground">رسیدگی: {r.resolutionNote}</span> : null}
                    </div>
                  </TableCell>
                  {showPage ? (
                    <TableCell className="hidden md:table-cell">
                      {href ? (
                        <a href={href} className="flex flex-col gap-0.5 hover:underline">
                          <span className="truncate">{r.page?.title}</span>
                          <span dir="ltr" className="text-end text-xs text-muted-foreground">
                            {r.slug}
                          </span>
                        </a>
                      ) : (
                        <span dir="ltr" className="text-muted-foreground">
                          {r.slug} (حذف‌شده)
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant={r.status === 'open' ? 'info' : 'secondary'}>{REPORT_STATUS_LABELS[r.status]}</Badge>
                    {r.resolvedByName ? <span className="block text-xs text-muted-foreground">{r.resolvedByName}</span> : null}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell>
                    {r.status === 'open' ? (
                      <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => void dismiss(r)}>
                        رد گزارش
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
