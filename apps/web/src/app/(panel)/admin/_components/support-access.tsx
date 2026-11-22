'use client';

import { useState, type FormEvent } from 'react';
import { CheckIcon, CopyIcon, LifeBuoyIcon, LogInIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@noroset/ui';
import {
  SUPPORT_GRANT_STATUS_LABEL,
  SUPPORT_MINUTES,
  type AdminSupportGrant,
  type AdminUserDetail,
  type SupportGrantStatus,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog, Notice } from '@/components/settings-ui';
import { fa, useAdminResource } from './admin-ui';

const STATUS_VARIANT: Record<SupportGrantStatus, 'info' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'info',
  pending: 'outline',
  ended: 'secondary',
  expired: 'secondary',
  revoked: 'destructive',
};

/**
 * دسترسی پشتیبانی روی صفحه‌ی کاربر (docs/architecture.md §9.11): ساخت لینک یک‌بارمصرف با دلیل و مدت،
 * سابقه و ابطال. لینک فقط برای همین ادمین و با نشست خودش کار می‌کند.
 */
export function SupportAccess({ user, self, onChanged }: { user: AdminUserDetail; self: boolean; onChanged: () => void }) {
  const grants = useAdminResource<AdminSupportGrant[]>(`/admin/users/${encodeURIComponent(user.id)}/support-grants`);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const blockedReason = self
    ? 'برای حساب خودتان لازم نیست.'
    : user.platformRole !== 'user'
      ? 'ورود به حساب مدیران پلتفرم مجاز نیست.'
      : user.status !== 'active'
        ? 'فقط برای کاربر فعال.'
        : null;

  async function revoke(id: string) {
    setError(null);
    setRevoking(id);
    try {
      await api(`/admin/support-grants/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
      await grants.reload();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">ورود پشتیبانی</h2>
          <p className="text-sm text-muted-foreground">ورود موقت شما به حساب این کاربر؛ کاربر سابقه را در حساب خود می‌بیند و می‌تواند باطلش کند.</p>
        </div>
        <Button variant="outline" onClick={() => setCreating(true)} disabled={Boolean(blockedReason)} title={blockedReason ?? undefined}>
          <LifeBuoyIcon />
          ساخت لینک ورود
        </Button>
      </div>
      <Notice error={error ?? grants.error} done={null} />
      {grants.data && grants.data.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>دلیل</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="hidden md:table-cell">مدیر</TableHead>
                <TableHead className="hidden md:table-cell">زمان</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.data.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="max-w-0 min-w-40">
                    <span className="block truncate" title={g.reason}>
                      {g.reason}
                    </span>
                    <span className="text-xs text-muted-foreground">{fa(g.minutes)} دقیقه</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[g.status]}>{SUPPORT_GRANT_STATUS_LABEL[g.status]}</Badge>
                    {g.revokedBy === 'user' ? <span className="block text-xs text-muted-foreground">توسط کاربر</span> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{g.admin.fullName || <span dir="ltr">{g.admin.mobile}</span>}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(g.createdAt)}</TableCell>
                  <TableCell className="text-end">
                    {g.status === 'active' || g.status === 'pending' ? (
                      <Button variant="link" size="sm" className="px-0 text-destructive" loading={revoking === g.id} onClick={() => void revoke(g.id)}>
                        ابطال
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : grants.data ? (
        <p className="text-sm text-muted-foreground">تاکنون دسترسی پشتیبانی ساخته نشده است.</p>
      ) : null}

      {creating ? (
        <CreateDialog
          user={user}
          onClose={() => setCreating(false)}
          onCreated={(token) => {
            setCreating(false);
            setLink(`${window.location.origin}${routes.supportLink(token)}`);
            void grants.reload();
            onChanged();
          }}
        />
      ) : null}
      {link ? <LinkDialog link={link} onClose={() => setLink(null)} /> : null}
    </section>
  );
}

function CreateDialog({ user, onClose, onCreated }: { user: AdminUserDetail; onClose: () => void; onCreated: (token: string) => void }) {
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState<number>(SUPPORT_MINUTES[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string }>(`/admin/users/${encodeURIComponent(user.id)}/support-grants`, {
        method: 'POST',
        body: { reason, minutes },
      });
      onCreated(res.token);
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
      title="ساخت لینک ورود پشتیبانی"
      description="لینک یک‌بارمصرف است و فقط با نشست خود شما کار می‌کند. امنیت حساب (رمز، خروج از دستگاه‌ها) در این ورود قفل است."
      onSubmit={submit}
      submitLabel="ساخت لینک"
      busy={busy}
      canSubmit={Boolean(reason.trim())}
      error={error}
    >
      <Field>
        <FieldLabel>دلیل</FieldLabel>
        <Textarea maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
        <FieldDescription>مثلاً شماره‌ی تیکت؛ کاربر این دلیل را در حساب خود می‌بیند.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>مدت دسترسی</FieldLabel>
        <NativeSelect value={String(minutes)} onChange={(e) => setMinutes(Number(e.target.value))}>
          {SUPPORT_MINUTES.map((m) => (
            <NativeSelectOption key={m} value={String(m)}>
              {fa(m)} دقیقه
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>لینک تا پایان همین مدت قابل استفاده است و نشست هم با آن تمام می‌شود.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

function LinkDialog({ link, onClose }: { link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // کپی فقط راحتی است؛ لینک در کادر قابل انتخاب است.
    }
  }
  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogPopup dir="rtl" className="sm:max-w-md">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">لینک ورود پشتیبانی آماده است</DialogTitle>
          <DialogDescription>این لینک فقط یک‌بار نشان داده می‌شود. «ورود اکنون» این مرورگر را تا پایان پشتیبانی به حساب کاربر می‌برد.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 px-6 py-1 pb-4">
          <Input dir="ltr" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="لینک ورود پشتیبانی" />
          <Button variant="outline" size="icon" onClick={() => void copy()} aria-label="کپی لینک">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            بستن
          </Button>
          <Button onClick={() => window.location.assign(link)}>
            <LogInIcon />
            ورود اکنون
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
