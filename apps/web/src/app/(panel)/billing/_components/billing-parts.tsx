'use client';

import Link from 'next/link';
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@noroset/ui';
import { formatToman, PAYMENT_STATUS_LABEL, type Payment, type ScopedPlan } from '@noroset/admin/ui';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { fa, formatDate, monthsLabel } from './billing-format';

/** نشانگر وضعیت پلن یک محصول (فعال/مهلت/آزمایشی/محدود) با تاریخ پایان. */
export function PlanStatusBadge({ status, endsAt }: { status: ScopedPlan['status']; endsAt: string | null }) {
  if (status === 'active') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tone-emerald/20 bg-tone-emerald/10 px-2.5 py-1 text-xs font-medium text-success dark:text-success">
        <span className="size-1.5 rounded-full bg-tone-emerald animate-pulse" />
        <span>فعال{endsAt ? ` تا ${formatDate(endsAt)}` : ''}</span>
      </span>
    );
  }
  if (status === 'grace') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tone-amber/20 bg-tone-amber/10 px-2.5 py-1 text-xs font-medium text-tone-amber dark:text-tone-amber">
        <span className="size-1.5 rounded-full bg-tone-amber" />
        <span>مهلت تمدید{endsAt ? ` تا ${formatDate(endsAt)}` : ''}</span>
      </span>
    );
  }
  if (status === 'trial') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <span>آزمایشی{endsAt ? ` تا ${formatDate(endsAt)}` : ''}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      محدود
    </span>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function Payments({ payments }: { payments: Payment[] | null }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">پرداخت‌ها</h2>
      {payments && payments.length === 0 ? <p className="text-sm text-muted-foreground">هنوز پرداختی ثبت نشده است.</p> : null}
      {payments && payments.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رسید</TableHead>
                <TableHead>پلن</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="hidden md:table-cell">زمان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.status === 'paid' ? (
                      <Link href={routes.billing.receipt(p.id)} className="text-primary hover:underline">
                        #{fa(p.number)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">#{fa(p.number)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.planName} · {monthsLabel(p.months)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatToman(p.totalRial)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'paid' ? 'secondary' : p.status === 'failed' ? 'destructive' : 'outline'}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </section>
  );
}
