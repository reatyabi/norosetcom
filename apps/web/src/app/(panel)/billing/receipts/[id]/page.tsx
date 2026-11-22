'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { PrinterIcon } from 'lucide-react';
import { Alert, AlertDescription, Button, Card, CardContent, Skeleton } from '@noroset/ui';
import { formatToman, GATEWAY_LABEL, PAYMENT_KIND_LABEL, type Payment } from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useTenant } from '../../../session';

const fa = (n: number) => n.toLocaleString('fa-IR');

/** رسید قابل چاپ (فاکتور رسمی سامانه‌ی مؤدیان بعداً؛ docs/architecture.md §9.11). */
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tenant = useTenant();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api<Payment>(`/billing/payments/${encodeURIComponent(id)}`, { tenantId: tenant.tenantId }).then(
      (p) => {
        if (current) setPayment(p);
      },
      (err: unknown) => {
        if (current) setError(errorMessage(err));
      },
    );
    return () => {
      current = false;
    };
  }, [id, tenant.tenantId]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!payment) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-6 w-32 rounded" />
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-36 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [
    ['شماره‌ی رسید', fa(payment.number)],
    ['فضای کاری', payment.tenantName],
    ['پلن', `${payment.planName} — ${fa(payment.months)} ماه (${PAYMENT_KIND_LABEL[payment.kind]})`],
    ['زمان پرداخت', payment.paidAt ? formatDateTime(payment.paidAt) : '—'],
    ['روش پرداخت', GATEWAY_LABEL[payment.gateway] ?? payment.gateway],
    ...(payment.refId ? ([['کد پیگیری', payment.refId]] as [string, string][]) : []),
    ...(payment.cardPan ? ([['کارت', payment.cardPan]] as [string, string][]) : []),
    ['مبلغ پلن', formatToman(payment.subtotalRial)],
    ...(payment.creditRial ? ([['اعتبار روزهای باقی‌مانده', `− ${formatToman(payment.creditRial)}`]] as [string, string][]) : []),
    ...(payment.discountRial ? ([['تخفیف', `− ${formatToman(payment.discountRial)}`]] as [string, string][]) : []),
    [`مالیات بر ارزش افزوده (${fa(payment.vatPercent)}٪)`, formatToman(payment.vatRial)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={routes.billing.home} className="text-sm text-muted-foreground hover:text-foreground">
          → اشتراک
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          <PrinterIcon />
          چاپ
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold">رسید پرداخت نوروست</h1>
            <p className="text-sm text-muted-foreground">این رسید فاکتور رسمی نیست.</p>
          </div>
          <dl className="divide-y">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd dir="auto" className="tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-3 font-semibold">
              <dt>مبلغ پرداخت‌شده</dt>
              <dd className="tabular-nums">{formatToman(payment.totalRial)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
