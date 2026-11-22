'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { buttonVariants, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, MotionArt } from '@noroset/ui';
import type { Payment, ResolvedPlan } from '@noroset/admin/ui';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useTenant } from '../../session';

// بازگشت از درگاه (docs/architecture.md §9.11): API پرداخت را سمت سرور تأیید و به اینجا ریدایرکت کرده است.

const fa = (n: number) => n.toLocaleString('fa-IR');
const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });

/**
 * پیام موفقیت دقیق: پلن و مدت، و برای خرید رزروی تاریخ شروع (پایان دوره‌ی جاری) تا مشتری فکر نکند پرداخت اثری نداشته است.
 * خواندن رسید فقط برای مالک/مدیر است؛ اگر نشد همان پیام کلی می‌ماند.
 */
function successText(payment: Payment | null, plan: ResolvedPlan | null): string {
  if (!payment) return 'پرداخت شما ثبت شد. جزئیات اشتراک در صفحه‌ی اشتراک آمده است.';
  const what = `«${payment.planName}» برای ${fa(payment.months)} ماه`;
  if (payment.kind === 'queued' && plan?.endsAt) {
    const free = plan.status === 'trial' ? 'دوره‌ی رایگان' : 'دوره‌ی فعلی';
    return `${what} پرداخت شد و ${dateOnly.format(new Date(plan.endsAt))}، بعد از پایان ${free}، خودکار شروع می‌شود. روزهای باقی‌مانده‌ی شما حفظ شد.`;
  }
  // خرید در دوره‌ی رایگان: روزهای باقی‌مانده‌ی آن به انتها اضافه شده، پس تاریخ پایان را می‌گوییم.
  return plan?.status === 'active' && plan.endsAt
    ? `${what} همین حالا فعال شد و تا ${dateOnly.format(new Date(plan.endsAt))} اعتبار دارد.`
    : `${what} همین حالا فعال شد.`;
}

function Result() {
  const params = useSearchParams();
  const tenant = useTenant();
  const ok = params.get('status') === 'ok';
  const payment = params.get('payment');
  const [details, setDetails] = useState<{ payment: Payment | null; plan: ResolvedPlan | null } | null>(null);

  useEffect(() => {
    if (!ok || !payment) return;
    let current = true;
    void Promise.all([
      api<Payment>(`/billing/payments/${encodeURIComponent(payment)}`, { tenantId: tenant.tenantId }).catch(() => null),
      api<ResolvedPlan>('/billing/status', { tenantId: tenant.tenantId }).catch(() => null),
    ]).then(([p, plan]) => {
      if (current) setDetails({ payment: p, plan });
    });
    return () => {
      current = false;
    };
  }, [ok, payment, tenant.tenantId]);

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia>
          <MotionArt name={ok ? 'payment-success' : 'payment-failed'} className="size-28" />
        </EmptyMedia>
        <EmptyTitle>{ok ? 'پرداخت انجام شد' : 'پرداخت انجام نشد'}</EmptyTitle>
        <EmptyDescription>
          {ok
            ? details
              ? successText(details.payment, details.plan)
              : 'در حال بررسی اشتراک…'
            : 'مبلغی کسر نشده یا اگر کسر شده، طبق قوانین درگاه حداکثر تا ۷۲ ساعت به حساب شما برمی‌گردد.'}
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex flex-wrap justify-center gap-2">
        {ok && payment ? (
          <Link href={routes.billing.receipt(payment)} className={buttonVariants()}>
            مشاهده‌ی رسید
          </Link>
        ) : null}
        <Link href={routes.billing.home} className={buttonVariants({ variant: 'outline' })}>
          بازگشت به اشتراک
        </Link>
      </div>
    </Empty>
  );
}

export default function BillingResultPage() {
  return (
    <Suspense>
      <Result />
    </Suspense>
  );
}
