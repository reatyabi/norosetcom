'use client';

import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Field,
  FieldDescription,
  FieldLabel,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@noroset/ui';
import { MEMBERSHIP_ROLE_LABEL, MEMBERSHIP_STATUS_LABEL, type AdminTenantDetail, type AuditItem, type Page } from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog, InfoCard, InfoRow, Notice } from '@/components/settings-ui';
import { AdminPage, fa, query, TenantStatusBadge, useAdminResource, UserStatusBadge } from '../../_components/admin-ui';
import { AuditList } from '../../_components/audit-list';
import { TenantBilling } from '../../_components/tenant-billing';

export default function AdminTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tenant = useAdminResource<AdminTenantDetail>(`/admin/tenants/${encodeURIComponent(id)}`);
  const audit = useAdminResource<Page<AuditItem>>(`/admin/audit${query({ targetType: 'tenant', targetId: id, limit: 20 })}`);
  const [changing, setChanging] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const t = tenant.data;

  return (
    <AdminPage title={t?.name ?? 'فضای کاری'} description={t?.slug} back={{ href: routes.admin.tenants, label: 'فضاهای کاری' }}>
      {tenant.error ? (
        <Alert variant="destructive">
          <AlertDescription>{tenant.error}</AlertDescription>
        </Alert>
      ) : null}
      {!t ? (
        tenant.error ? null : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-28 rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-40 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          <Notice error={null} done={done} />
          <InfoCard
            title="مشخصات"
            action={
              <Button variant="link" size="sm" className={t.status === 'active' ? 'px-0 text-destructive' : 'px-0'} onClick={() => setChanging(true)}>
                {t.status === 'active' ? 'تعلیق' : 'فعال‌سازی'}
              </Button>
            }
          >
            <InfoRow label="نام">{t.name}</InfoRow>
            <InfoRow label="نشانی">
              <span dir="ltr" className="self-start">
                {t.slug}
              </span>
            </InfoRow>
            <InfoRow label="وضعیت" hint={t.status === 'suspended' ? 'پنل این فضا ۴۰۳ است و صفحه/فرم/فایل عمومی‌اش پیدا نمی‌شود.' : undefined}>
              <TenantStatusBadge status={t.status} />
            </InfoRow>
            <InfoRow label="ساخت">{formatDateTime(t.createdAt)}</InfoRow>
          </InfoCard>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">اعضا ({fa(t.memberCount)})</h2>
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کاربر</TableHead>
                    <TableHead>نقش</TableHead>
                    <TableHead className="hidden md:table-cell">وضعیت کاربر</TableHead>
                    <TableHead className="hidden lg:table-cell">عضویت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {t.members.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="max-w-0 min-w-48">
                        <Link href={routes.admin.user(m.userId)} className="flex min-w-0 flex-col gap-0.5 hover:underline">
                          <span className="truncate font-medium">{m.fullName || 'بدون نام'}</span>
                          <span dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                            {m.mobile ?? m.email ?? ''}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {MEMBERSHIP_ROLE_LABEL[m.role]}
                        {m.status !== 'active' ? <span className="text-xs text-muted-foreground"> · {MEMBERSHIP_STATUS_LABEL[m.status]}</span> : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <UserStatusBadge status={m.userStatus} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(m.joinedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <TenantBilling tenantId={t.id} onChanged={() => void audit.reload()} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">سابقه‌ی کارهای مدیران روی این فضا</h2>
            {audit.data ? <AuditList items={audit.data.items} showTarget={false} /> : null}
          </section>

          {changing ? (
            <StatusDialog
              tenant={t}
              onClose={() => setChanging(false)}
              onDone={(next) => {
                tenant.setData(next);
                setChanging(false);
                setDone(next.status === 'active' ? 'فضای کاری فعال شد.' : 'فضای کاری معلق شد.');
                void audit.reload();
              }}
            />
          ) : null}
        </>
      )}
    </AdminPage>
  );
}

function StatusDialog({ tenant, onClose, onDone }: { tenant: AdminTenantDetail; onClose: () => void; onDone: (next: AdminTenantDetail) => void }) {
  const next = tenant.status === 'active' ? 'suspended' : 'active';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onDone(
        await api<AdminTenantDetail>(`/admin/tenants/${encodeURIComponent(tenant.id)}/status`, {
          method: 'POST',
          body: { status: next, ...(reason.trim() ? { reason } : {}) },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title={next === 'suspended' ? 'تعلیق فضای کاری' : 'فعال‌سازی فضای کاری'}
      description={
        next === 'suspended'
          ? 'اعضا دیگر به این فضا دسترسی ندارند و صفحه، فرم و فایل‌های عمومی آن از دسترس خارج می‌شوند. داده‌ای پاک نمی‌شود.'
          : 'دسترسی اعضا و صفحه‌های عمومی برمی‌گردد.'
      }
      onSubmit={submit}
      submitLabel={next === 'suspended' ? 'تعلیق' : 'فعال‌سازی'}
      busy={busy}
      canSubmit={next === 'active' || Boolean(reason.trim())}
      error={error}
    >
      <Field>
        <FieldLabel>دلیل{next === 'suspended' ? '' : ' (اختیاری)'}</FieldLabel>
        <Textarea maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required={next === 'suspended'} autoFocus />
        <FieldDescription>در لاگ ممیزی ثبت می‌شود.</FieldDescription>
      </Field>
    </FormDialog>
  );
}
