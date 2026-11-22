'use client';

import Link from 'next/link';
import { Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@noroset/ui';
import {
  auditActionLabel,
  MODULE_LABEL,
  MODULE_STATUS_LABEL,
  PLATFORM_ROLE_LABEL,
  TENANT_STATUS_LABEL,
  USER_STATUS_LABEL,
  type AuditItem,
  type ModuleKey,
} from '@noroset/admin/ui';
import { MODERATION_STATUS_LABELS, REPORT_STATUS_LABELS } from '@noroset/norolink/ui';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';

const STATUS_LABEL: Record<string, string> = {
  ...MODULE_STATUS_LABEL,
  ...USER_STATUS_LABEL,
  ...TENANT_STATUS_LABEL,
  ...PLATFORM_ROLE_LABEL,
  ...MODERATION_STATUS_LABELS,
  ...REPORT_STATUS_LABELS,
};

/** خلاصه‌ی فارسی جزئیات (تغییر from ← to)؛ رمز و داده‌ی حساس هرگز در details نیست. */
function summary(item: AuditItem): string | null {
  const d = item.details as { from?: unknown; to?: unknown; revokedSessions?: unknown; method?: unknown; route?: unknown; minutes?: unknown; status?: unknown };
  const parts: string[] = [];
  if (item.action === 'link_report.resolve' && typeof d.status === 'string') parts.push(STATUS_LABEL[d.status] ?? d.status);
  if (typeof d.method === 'string' && typeof d.route === 'string') parts.push(`${d.method} ${d.route}`);
  if (typeof d.minutes === 'number') parts.push(`${d.minutes.toLocaleString('fa-IR')} دقیقه`);
  if (typeof d.from === 'string' && typeof d.to === 'string') parts.push(`${STATUS_LABEL[d.from] ?? d.from} ← ${STATUS_LABEL[d.to] ?? d.to}`);
  if (typeof d.revokedSessions === 'number' && d.revokedSessions > 0) parts.push(`${d.revokedSessions.toLocaleString('fa-IR')} نشست باطل شد`);
  return parts.length ? parts.join(' · ') : null;
}

function targetHref(item: AuditItem): string | null {
  if (!item.targetId) return null;
  if (item.targetType === 'user') return routes.admin.user(item.targetId);
  if (item.targetType === 'tenant') return routes.admin.tenant(item.targetId);
  if (item.targetType === 'link_page') return routes.admin.linkPage(item.targetId);
  return null;
}

export function AuditList({ items, showTarget = true }: { items: AuditItem[]; showTarget?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">هنوز کاری ثبت نشده است.</p>;
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>کار</TableHead>
            {showTarget ? <TableHead className="hidden md:table-cell">هدف</TableHead> : null}
            <TableHead className="hidden sm:table-cell">انجام‌دهنده</TableHead>
            <TableHead className="hidden md:table-cell">زمان</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const href = targetHref(item);
            const extra = summary(item);
            return (
              <TableRow key={item.id}>
                <TableCell className="max-w-0 min-w-48">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{auditActionLabel(item.action)}</span>
                    {extra ? <span className="text-xs text-muted-foreground">{extra}</span> : null}
                    {item.reason ? (
                      <span className="truncate text-xs text-muted-foreground" title={item.reason}>
                        دلیل: {item.reason}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground md:hidden">{formatDateTime(item.createdAt)}</span>
                  </div>
                </TableCell>
                {showTarget ? (
                  <TableCell className="hidden md:table-cell">
                    {item.targetType === 'link_template' ? (
                      <span>{(item.details as { title?: string }).title ?? 'قالب'}</span>
                    ) : item.targetType === 'module' ? (
                      <span>{MODULE_LABEL[(item.details as { module?: ModuleKey }).module ?? 'noroform'] ?? 'ماژول'}</span>
                    ) : href ? (
                      <Link href={href} className="text-primary hover:underline">
                        {item.targetType === 'user'
                          ? 'کاربر'
                          : item.targetType === 'link_page'
                            ? <span dir="ltr">{(item.details as { slug?: string }).slug ?? 'صفحه‌ی لینک'}</span>
                            : 'فضای کاری'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell className="hidden sm:table-cell">
                  <Link href={routes.admin.user(item.actor.id)} className="hover:underline">
                    {item.actor.fullName || <span dir="ltr">{item.actor.mobile ?? '—'}</span>}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(item.createdAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
