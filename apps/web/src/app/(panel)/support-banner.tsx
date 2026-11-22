'use client';

import { useState } from 'react';
import { LifeBuoyIcon } from 'lucide-react';
import { Button } from '@noroset/ui';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useSession } from './session';

const time = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });

/**
 * نوار ثابت «حالت پشتیبانی» (docs/architecture.md §9.11): مدیر پلتفرم داخل حساب کاربر است. پایان، کوکی
 * نشست پشتیبانی را پاک می‌کند و با بارگذاری کامل به صفحه‌ی همان کاربر در مدیریت پلتفرم برمی‌گردد.
 */
export function SupportBanner() {
  const { me } = useSession();
  const [busy, setBusy] = useState(false);
  if (!me.support) return null;
  const who = me.fullName || me.mobile || me.email || 'کاربر';

  async function end() {
    setBusy(true);
    const ended = await api<{ userId: string | null }>('/auth/support/end', { method: 'POST' }).catch(() => null);
    window.location.assign(ended?.userId ? routes.admin.user(ended.userId) : routes.admin.home);
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-sm text-black">
      <LifeBuoyIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        حالت پشتیبانی: داخل حساب <strong>{who}</strong> هستید؛ تا ساعت {time.format(new Date(me.support.expiresAt))}. تغییر رمز و امنیت حساب
        مجاز نیست و هر تغییر به نام شما ثبت می‌شود.
      </span>
      <Button size="sm" variant="outline" onClick={() => void end()} loading={busy}>
        پایان پشتیبانی
      </Button>
    </div>
  );
}
