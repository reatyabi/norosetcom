'use client';

import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import { UserIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  PasswordInput,
  Skeleton,
  Textarea,
} from '@noroset/ui';
import {
  MEMBERSHIP_ROLE_LABEL,
  PLATFORM_ROLE_LABEL,
  USER_STATUS_LABEL,
  type AdminUserDetail,
  type AuditItem,
  type Page,
  type PlatformRole,
  type UserStatus,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog, InfoCard, InfoRow, Notice } from '@/components/settings-ui';
import { useSession } from '../../../session';
import { AdminPage, fa, query, RoleBadge, TenantStatusBadge, useAdminResource, UserStatusBadge } from '../../_components/admin-ui';
import { AuditList } from '../../_components/audit-list';
import { SupportAccess } from '../../_components/support-access';

type DialogKind = 'name' | 'status' | 'role' | 'password' | 'sessions' | null;

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useSession();
  const user = useAdminResource<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
  const audit = useAdminResource<Page<AuditItem>>(`/admin/audit${query({ targetType: 'user', targetId: id, limit: 20 })}`);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [done, setDone] = useState<string | null>(null);

  const u = user.data;
  const self = u?.id === me.id;

  function applied(next: AdminUserDetail, message: string) {
    user.setData(next);
    setDialog(null);
    setDone(message);
    void audit.reload();
  }

  return (
    <AdminPage title={u ? u.fullName || 'بدون نام' : 'کاربر'} description={u ? (u.mobile ?? u.email ?? undefined) : undefined} back={{ href: routes.admin.users, label: 'کاربران' }}>
      {user.error ? (
        <Alert variant="destructive">
          <AlertDescription>{user.error}</AlertDescription>
        </Alert>
      ) : null}
      {!u ? (
        user.error ? null : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
              <Skeleton className="h-5 w-28 rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-44 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          <Notice error={null} done={done} />
          {self ? (
            <Alert>
              <AlertDescription>این حساب خودتان است؛ وضعیت، نقش و رمز خود را از اینجا نمی‌توانید تغییر دهید (رمز را از «حساب کاربری» عوض کنید).</AlertDescription>
            </Alert>
          ) : null}

          <InfoCard
            title="مشخصات"
            onEdit={() => setDialog('name')}
            aside={
              <Avatar className="size-20">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xl">{u.fullName.trim().charAt(0) || <UserIcon className="size-7" />}</AvatarFallback>
              </Avatar>
            }
          >
            <InfoRow label="نام و نام خانوادگی">{u.fullName || <span className="text-muted-foreground">تعیین نشده</span>}</InfoRow>
            <InfoRow label="شماره موبایل">
              <span dir="ltr" className="self-start">
                {u.mobile ?? '—'}
              </span>
            </InfoRow>
            {u.email ? (
              <InfoRow label="ایمیل">
                <span dir="ltr" className="self-start">
                  {u.email}
                </span>
              </InfoRow>
            ) : null}
            <InfoRow label="عضویت">{formatDateTime(u.createdAt)}</InfoRow>
          </InfoCard>

          <InfoCard title="وضعیت و دسترسی">
            <InfoRow label="وضعیت" hint={u.statusReason ? `دلیل: ${u.statusReason}` : undefined}>
              <div className="flex flex-wrap items-center gap-3">
                <UserStatusBadge status={u.status} />
                {u.statusChangedAt ? <span className="text-xs text-muted-foreground">{formatDateTime(u.statusChangedAt)}</span> : null}
                {self ? null : (
                  <Button variant="link" size="sm" className="px-0" onClick={() => setDialog('status')}>
                    تغییر وضعیت
                  </Button>
                )}
              </div>
            </InfoRow>
            <InfoRow label="نقش پلتفرم">
              <div className="flex flex-wrap items-center gap-3">
                {u.platformRole === 'superadmin' ? <RoleBadge role={u.platformRole} /> : <span>{PLATFORM_ROLE_LABEL[u.platformRole]}</span>}
                {self ? null : (
                  <Button variant="link" size="sm" className="px-0" onClick={() => setDialog('role')}>
                    تغییر نقش
                  </Button>
                )}
              </div>
            </InfoRow>
            <InfoRow label="رمز عبور" hint="ورود با کد پیامکی همیشه فعال است.">
              <div className="flex flex-wrap items-center gap-3">
                <span>{u.hasPassword ? 'تعیین شده' : <span className="text-muted-foreground">تعیین نشده</span>}</span>
                {self ? null : (
                  <Button variant="link" size="sm" className="px-0" onClick={() => setDialog('password')}>
                    تعیین رمز جدید
                  </Button>
                )}
              </div>
            </InfoRow>
            <InfoRow label="نشست‌های فعال">
              <div className="flex flex-wrap items-center gap-3">
                <span>{fa(u.activeSessions)}</span>
                {u.activeSessions > 0 && !self ? (
                  <Button variant="link" size="sm" className="px-0 text-destructive" onClick={() => setDialog('sessions')}>
                    خروج از همه‌ی دستگاه‌ها
                  </Button>
                ) : null}
              </div>
            </InfoRow>
          </InfoCard>

          <InfoCard title="فضاهای کاری">
            {u.memberships.length === 0 ? (
              <InfoRow label="—">
                <span className="text-muted-foreground">عضو هیچ فضای کاری نیست.</span>
              </InfoRow>
            ) : (
              u.memberships.map((m) => (
                <InfoRow key={m.tenantId} label={<Link href={routes.admin.tenant(m.tenantId)} className="text-primary hover:underline">{m.name}</Link>}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{MEMBERSHIP_ROLE_LABEL[m.role]}</span>
                    <span dir="ltr" className="text-xs text-muted-foreground">
                      {m.slug}
                    </span>
                    {m.tenantStatus !== 'active' ? <TenantStatusBadge status={m.tenantStatus} /> : null}
                  </div>
                </InfoRow>
              ))
            )}
          </InfoCard>

          <SupportAccess user={u} self={self} onChanged={() => void audit.reload()} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">سابقه‌ی کارهای مدیران روی این کاربر</h2>
            {audit.data ? <AuditList items={audit.data.items} showTarget={false} /> : null}
          </section>

          {/* هر دیالوگ فقط هنگام باز بودن mount می‌شود تا مقدارهای اولیه از وضعیت تازه‌ی کاربر باشند. */}
          {dialog === 'name' ? <NameDialog user={u} onClose={() => setDialog(null)} onDone={(next) => applied(next, 'مشخصات ذخیره شد.')} /> : null}
          {dialog === 'status' ? <StatusDialog user={u} onClose={() => setDialog(null)} onDone={(next) => applied(next, 'وضعیت کاربر تغییر کرد.')} /> : null}
          {dialog === 'role' ? <RoleDialog user={u} onClose={() => setDialog(null)} onDone={(next) => applied(next, 'نقش پلتفرم تغییر کرد.')} /> : null}
          {dialog === 'password' ? (
            <PasswordDialog user={u} onClose={() => setDialog(null)} onDone={(next) => applied(next, 'رمز جدید ذخیره شد و کاربر از همه‌ی دستگاه‌ها خارج شد.')} />
          ) : null}
          {dialog === 'sessions' ? <SessionsDialog user={u} onClose={() => setDialog(null)} onDone={(next) => applied(next, 'کاربر از همه‌ی دستگاه‌ها خارج شد.')} /> : null}
        </>
      )}
    </AdminPage>
  );
}

interface DialogProps {
  user: AdminUserDetail;
  onClose: () => void;
  onDone: (next: AdminUserDetail) => void;
}

/** ارسال یک درخواست ادمین با وضعیت busy/error مشترک دیالوگ‌ها. */
function useSubmit(user: AdminUserDetail, onDone: (next: AdminUserDetail) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(path: string, method: 'POST' | 'PATCH', body?: unknown) {
    setError(null);
    setBusy(true);
    try {
      onDone(await api<AdminUserDetail>(`/admin/users/${encodeURIComponent(user.id)}${path}`, { method, body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, send };
}

function NameDialog({ user, onClose, onDone }: DialogProps) {
  const [name, setName] = useState(user.fullName);
  const { busy, error, send } = useSubmit(user, onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="ویرایش مشخصات"
      description="نام نمایشی کاربر"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send('', 'PATCH', { fullName: name });
      }}
      busy={busy}
      canSubmit={Boolean(name.trim()) && name.trim() !== user.fullName}
      error={error}
    >
      <Field>
        <FieldLabel>نام و نام خانوادگی</FieldLabel>
        <Input maxLength={200} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
    </FormDialog>
  );
}

function StatusDialog({ user, onClose, onDone }: DialogProps) {
  const [status, setStatus] = useState<UserStatus>(user.status === 'active' ? 'disabled' : 'active');
  const [reason, setReason] = useState('');
  const { busy, error, send } = useSubmit(user, onDone);
  const needsReason = status !== 'active';
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="تغییر وضعیت کاربر"
      description="غیرفعال یا مسدود کردن کاربر را همان لحظه از همه‌ی دستگاه‌ها خارج می‌کند."
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send('/status', 'POST', { status, ...(reason.trim() ? { reason } : {}) });
      }}
      submitLabel="ثبت"
      busy={busy}
      canSubmit={status !== user.status && (!needsReason || Boolean(reason.trim()))}
      error={error}
    >
      <Field>
        <FieldLabel>وضعیت جدید</FieldLabel>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
          {(['active', 'disabled', 'blocked'] as const).map((s) => (
            <NativeSelectOption key={s} value={s} disabled={s === user.status}>
              {USER_STATUS_LABEL[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>غیرفعال: تعلیق موقت یا درخواست کاربر. مسدود: تخلف.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>دلیل{needsReason ? '' : ' (اختیاری)'}</FieldLabel>
        <Textarea maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required={needsReason} />
        <FieldDescription>در لاگ ممیزی ثبت و در صفحه‌ی کاربر نمایش داده می‌شود.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

function RoleDialog({ user, onClose, onDone }: DialogProps) {
  const next: PlatformRole = user.platformRole === 'superadmin' ? 'user' : 'superadmin';
  const { busy, error, send } = useSubmit(user, onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title={next === 'superadmin' ? 'اعطای نقش سوپرادمین' : 'سلب نقش سوپرادمین'}
      description={
        next === 'superadmin'
          ? 'سوپرادمین به همه‌ی بخش‌های مدیریت پلتفرم، از جمله کاربران و نقش‌ها، دسترسی کامل دارد.'
          : 'این کاربر دیگر به مدیریت پلتفرم دسترسی نخواهد داشت.'
      }
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send('/role', 'POST', { platformRole: next });
      }}
      submitLabel={next === 'superadmin' ? 'اعطا' : 'سلب'}
      busy={busy}
      error={error}
    >
      <p className="text-sm">
        نقش فعلی: <strong>{PLATFORM_ROLE_LABEL[user.platformRole]}</strong> ← نقش جدید: <strong>{PLATFORM_ROLE_LABEL[next]}</strong>
      </p>
    </FormDialog>
  );
}

function PasswordDialog({ user, onClose, onDone }: DialogProps) {
  const [password, setPassword] = useState('');
  const { busy, error, send } = useSubmit(user, onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="تعیین رمز جدید"
      description="کاربر از همه‌ی دستگاه‌ها خارج می‌شود. رمز را از راهی امن به او برسانید."
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send('/password', 'POST', { newPassword: password });
      }}
      busy={busy}
      canSubmit={password.length >= 8}
      error={error}
    >
      <Field>
        <FieldLabel>رمز جدید</FieldLabel>
        <PasswordInput autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        <FieldDescription>دست‌کم ۸ کاراکتر.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

function SessionsDialog({ user, onClose, onDone }: DialogProps) {
  const { busy, error, send } = useSubmit(user, onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="خروج از همه‌ی دستگاه‌ها"
      description={`${fa(user.activeSessions)} نشست فعال باطل می‌شود؛ کاربر باید دوباره وارد شود.`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send('/sessions/revoke', 'POST');
      }}
      submitLabel="خروج"
      busy={busy}
      error={error}
    >
      <span />
    </FormDialog>
  );
}
