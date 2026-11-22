'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, cn, Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, MotionArt, SystemIcon, type SystemIconName } from '@noroset/ui';
import {
  ADMIN_LABEL,
  PLATFORM_ROLE_LABEL,
  TENANT_STATUS_LABEL,
  USER_STATUS_LABEL,
  type PlatformRole,
  type TenantStatus,
  type UserStatus,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { PageHead } from '@/components/page-head';
import { PageHeader } from '@/components/settings-ui';
import { useSession } from '../../session';

// اجزای مشترک صفحه‌های «مدیریت پلتفرم» (docs/architecture.md §9.11). گارد واقعی در بک‌اند است؛
// اینجا فقط برای کاربر غیرادمین به‌جای خطاهای ۴۰۳ پیام روشن نشان داده می‌شود.

const TABS: { href: string; label: string; icon: SystemIconName }[] = [
  { href: routes.admin.home, label: 'نمای کلی', icon: 'overview' },
  { href: routes.admin.users, label: 'کاربران', icon: 'users' },
  { href: routes.admin.tenants, label: 'فضاهای کاری', icon: 'workspace' },
  { href: routes.admin.billing, label: 'اشتراک‌ها', icon: 'subscription' },
  { href: routes.admin.campaigns, label: 'کمپین‌ها', icon: 'campaigns' },
  { href: routes.admin.templates, label: 'قالب‌ها', icon: 'norolink' },
  { href: routes.admin.linkPages, label: 'صفحه‌های لینک', icon: 'security' },
  { href: routes.admin.blog, label: 'بلاگ', icon: 'noroform' },
  { href: routes.admin.modules, label: 'ماژول‌ها', icon: 'modules' },
  { href: routes.admin.audit, label: 'لاگ ممیزی', icon: 'audit' },
];

export const fa = (n: number) => n.toLocaleString('fa-IR');

export function AdminPage({
  title,
  description,
  action,
  back,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** صفحه‌ی جزئیات: لینک بازگشت به‌جای زبانه‌ها. */
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  const { me } = useSession();
  const pathname = usePathname();
  const isActive = (href: string) => (href === routes.admin.home ? pathname === href : pathname.startsWith(href));
  // صفحه‌ی جزئیات (مثلاً /admin/users/{id}) آیکون زبانه‌ی والدش را می‌گیرد.
  const icon = TABS.find((t) => isActive(t.href))?.icon ?? 'admin';

  if (me.platformRole !== 'superadmin') {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <MotionArt name="access-denied" className="size-28" />
          </EmptyMedia>
          <EmptyTitle>دسترسی ندارید</EmptyTitle>
          <EmptyDescription>{ADMIN_LABEL} فقط برای مدیران پلتفرم است.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* بازگشت/برچسب، عنوان و زبانه‌ها در سرصفحه‌ی پنل، بالای کارت محتوا. */}
      <PageHead>
        <div className="flex flex-col gap-3">
          {back ? (
            <Link href={back.href} className="w-fit text-sm text-muted-foreground hover:text-foreground">
              → {back.label}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">{ADMIN_LABEL}</span>
          )}
          <PageHeader icon={icon} title={title} description={description} action={action} />
          {back ? null : (
            <nav aria-label={ADMIN_LABEL} className="mt-3 flex gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5 sm:w-fit">
              {TABS.map((t) => {
                const active = isActive(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs transition-colors duration-150 ease-fluent',
                      active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <SystemIcon name={t.icon} className="size-4" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </PageHead>
      {children}
    </div>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const variant = status === 'active' ? 'secondary' : status === 'blocked' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{USER_STATUS_LABEL[status]}</Badge>;
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge variant={status === 'active' ? 'secondary' : 'destructive'}>{TENANT_STATUS_LABEL[status]}</Badge>;
}

export function RoleBadge({ role }: { role: PlatformRole }) {
  return role === 'superadmin' ? <Badge variant="info">{PLATFORM_ROLE_LABEL[role]}</Badge> : null;
}

/** صفحه‌بندی ساده‌ی قبلی/بعدی روی offset. */
export function Pager({
  offset,
  limit,
  total,
  shown,
  noun,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  shown: number;
  noun: string;
  onChange: (offset: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        {fa(offset + 1)}–{fa(offset + shown)} از {fa(total)} {noun}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          قبلی
        </Button>
        <Button variant="secondary" size="sm" disabled={offset + shown >= total} onClick={() => onChange(offset + limit)}>
          بعدی
        </Button>
      </div>
    </div>
  );
}

/** مقدار با تأخیر (جست‌وجو هنگام تایپ). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** بارگذاری یک endpoint با بازخوانی؛ `path` null یعنی هنوز بار نکن. */
export function useAdminResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (isCurrent: () => boolean = () => true) =>
      path
        ? api<T>(path).then(
            (next) => {
              if (!isCurrent()) return;
              setData(next);
              setError(null);
            },
            (err: unknown) => {
              if (isCurrent()) setError(errorMessage(err));
            },
          )
        : Promise.resolve(),
    [path],
  );

  // پاسخ دیرِ مسیر قبلی (مثلاً جست‌وجوی قبلی) روی نتیجه‌ی تازه نمی‌نشیند.
  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  return { data, setData, error, reload };
}

export function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}
