'use client';

import Link from 'next/link';
import { Alert, AlertDescription, Card, CardContent, Skeleton } from '@noroset/ui';
import type { AdminOverview, AuditItem, Page } from '@noroset/admin/ui';
import { routes } from '@/lib/routes';
import { AdminPage, fa, useAdminResource } from './_components/admin-ui';
import { AuditList } from './_components/audit-list';
import { ItemTableSkeleton } from '../_components/page-skeletons';

function Stat({ label, value, href, hint }: { label: string; value: number; href?: string; hint?: string }) {
  const body = (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{fa(value)}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminHomePage() {
  const overview = useAdminResource<AdminOverview>('/admin/overview');
  const audit = useAdminResource<Page<AuditItem>>('/admin/audit?limit=8');
  const o = overview.data;

  return (
    <AdminPage title="نمای کلی" description="وضعیت کاربران و فضاهای کاری پلتفرم">
      {overview.error ? (
        <Alert variant="destructive">
          <AlertDescription>{overview.error}</AlertDescription>
        </Alert>
      ) : null}
      {o ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="کاربران فعال" value={o.users.active} href={`${routes.admin.users}?status=active`} hint={`${fa(o.newUsersLast7Days)} کاربر جدید در ۷ روز اخیر`} />
          <Stat label="غیرفعال / مسدود" value={o.users.disabled + o.users.blocked} href={`${routes.admin.users}?status=blocked`} hint={`${fa(o.users.blocked)} مسدود`} />
          <Stat label="فضاهای کاری" value={o.tenants.active + o.tenants.suspended} href={routes.admin.tenants} hint={`${fa(o.tenants.suspended)} معلق`} />
          <Stat label="سوپرادمین‌ها" value={o.superadmins} href={`${routes.admin.users}?role=superadmin`} />
        </div>
      ) : overview.error ? null : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded mt-2" />
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">آخرین کارهای مدیران</h2>
          <Link href={routes.admin.audit} className="text-sm text-primary hover:underline">
            همه
          </Link>
        </div>
        {audit.data ? (
          <AuditList items={audit.data.items} />
        ) : audit.error ? null : (
          <ItemTableSkeleton count={4} />
        )}
      </section>
    </AdminPage>
  );
}
