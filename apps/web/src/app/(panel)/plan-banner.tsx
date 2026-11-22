'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CircleAlertIcon, GiftIcon } from 'lucide-react';
import { routes } from '@/lib/routes';
import { useSession } from './session';
import { useTenantPlan } from './shell-menus';

const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
const fa = (n: number) => n.toLocaleString('fa-IR');
const HOUR_MS = 60 * 60 * 1000;
const WARN_MS = 3 * 24 * HOUR_MS;

/** مانده‌ی زمان به روز و ساعت؛ در روز آخر فقط ساعت و دقیقه. */
function remainingText(ms: number): string {
  const days = Math.floor(ms / (24 * HOUR_MS));
  const hours = Math.floor((ms % (24 * HOUR_MS)) / HOUR_MS);
  if (days > 0) return hours > 0 ? `${fa(days)} روز و ${fa(hours)} ساعت` : `${fa(days)} روز`;
  const minutes = Math.max(1, Math.floor((ms % HOUR_MS) / 60000));
  return hours > 0 ? `${fa(hours)} ساعت و ${fa(minutes)} دقیقه` : `${fa(minutes)} دقیقه`;
}

/** شمارش معکوس ۱۴ روز رایگان؛ هر دقیقه به‌روز می‌شود و در ۳ روز آخر رنگ هشدار می‌گیرد. */
function FreeDaysBanner({ endsAt, manage }: { endsAt: string; manage: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return null;
  return (
    <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm ${left <= WARN_MS ? 'bg-warning text-black' : 'bg-primary text-primary-foreground'}`}>
      <GiftIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold tabular-nums">{remainingText(left)}</span> از ۱۴ روز رایگان شما باقی مانده است.
      </span>
      {manage ? (
        <Link href={routes.billing.home} className="font-medium underline underline-offset-4">
          خرید پلن
        </Link>
      ) : null}
    </div>
  );
}

/** نوار وضعیت پلن: در صورت وجود پلن فعال پیامی نشان داده نمی‌شود؛ فقط در صورت مهلت تمدید یا محدود بودن. */
export function PlanBanner() {
  const { tenant } = useSession();
  const plan = useTenantPlan();

  if (!tenant || !plan) return null;
  const manage = tenant.role === 'owner' || tenant.role === 'admin';

  // دامنه‌ی نورولینک (§9.11): پلن نوروفورم/نوروفایل صفحه‌های لینک را فعال نمی‌کند؛ نبودِ `scopes` ← همان پلن کلّی.
  const scoped = plan.scopes?.norolink ?? {
    name: plan.name,
    status: plan.status,
    endsAt: plan.endsAt,
  };

  // زمانی که پلن فعال وجود دارد (active یا trial فعال) نباید پیام تایمر بالای صفحه نمایش داده شود
  if (scoped.status === 'active' || scoped.status === 'trial') return null;

  if (scoped.status !== 'limited' && (scoped.status !== 'grace' || !scoped.endsAt)) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-sm text-black">
      <CircleAlertIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        {scoped.status === 'limited'
          ? 'پلن نورولینک فعالی ندارید و صفحه‌های لینک غیرفعال‌اند. با خرید پلن همین محصول، همان لحظه فعال می‌شوند.'
          : `اشتراک «${scoped.name}» تمام شده است. تا ${dateOnly.format(new Date(scoped.endsAt!))} امکانات آن می‌ماند و بعد صفحه‌های لینک غیرفعال می‌شوند.`}
      </span>
      {manage ? (
        <Link href={routes.billing.home} className="font-medium underline underline-offset-4">
          خرید یا تمدید پلن
        </Link>
      ) : null}
    </div>
  );
}
