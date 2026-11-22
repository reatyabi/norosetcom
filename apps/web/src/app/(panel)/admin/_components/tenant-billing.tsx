'use client';

import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
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
  ENTITLEMENT_META,
  formatToman,
  GATEWAY_LABEL,
  isModuleActiveInPlan,
  PAYMENT_STATUS_LABEL,
  PLAN_STATUS_LABEL,
  SUBSCRIPTION_SOURCE_LABEL,
  type AdminTenantBilling,
  type BillingPlan,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, toAsciiDigits } from '@/lib/format';
import { FormDialog, InfoCard, InfoRow, Notice } from '@/components/settings-ui';
import { fa, useAdminResource } from './admin-ui';

type DialogKind = 'grant' | 'offline' | { cancel: string } | null;

/** اشتراک یک فضای کاری از دید ادمین (docs/architecture.md §9.11): پلن مؤثر، مصرف، سابقه، کارهای دستی. */
export function TenantBilling({ tenantId, onChanged }: { tenantId: string; onChanged: () => void }) {
  const billing = useAdminResource<AdminTenantBilling>(`/admin/billing/tenants/${encodeURIComponent(tenantId)}`);
  const plans = useAdminResource<{ plans: BillingPlan[] }>('/admin/billing');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [done, setDone] = useState<string | null>(null);
  const b = billing.data;
  const paidPlans = plans.data?.plans ?? [];

  function changed(message: string) {
    setDialog(null);
    setDone(message);
    void billing.reload();
    onChanged();
  }

  if (!b) return null;
  return (
    <section className="flex flex-col gap-3">
      <InfoCard
        title="اشتراک"
        notice={<Notice error={billing.error} done={done} />}
        action={
          <div className="flex gap-3">
            <Button variant="link" size="sm" className="px-0" onClick={() => setDialog('grant')}>
              اشتراک دستی
            </Button>
            <Button variant="link" size="sm" className="px-0" onClick={() => setDialog('offline')}>
              ثبت پرداخت آفلاین
            </Button>
          </div>
        }
      >
        <InfoRow label="پلن مؤثر">
          <div className="flex flex-wrap items-center gap-2">
            <span>{b.plan.name}</span>
            <Badge variant={b.plan.status === 'grace' || b.plan.status === 'limited' ? 'destructive' : 'info'}>{PLAN_STATUS_LABEL[b.plan.status]}</Badge>
            {b.plan.endsAt ? <span className="text-xs text-muted-foreground">تا {formatDateTime(b.plan.endsAt)}</span> : null}
          </div>
        </InfoRow>
        {ENTITLEMENT_META.filter(
          (m) => m.usage && (!m.module || isModuleActiveInPlan(b.plan.entitlements, m.module)) && Number(b.plan.entitlements[m.key] ?? 0) > 0,
        ).map((m) => (
          <InfoRow key={m.key} label={m.label}>
            <span className="tabular-nums">
              {fa(b.usage[m.key] ?? 0)} از {fa(b.plan.entitlements[m.key] as number)} {m.unit}
            </span>
          </InfoRow>
        ))}
      </InfoCard>

      {b.subscriptions.length ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اشتراک</TableHead>
                <TableHead>بازه</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.planName}
                    <span className="block text-xs text-muted-foreground">
                      {SUBSCRIPTION_SOURCE_LABEL[s.source]}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(s.startsAt)} ← {formatDateTime(s.endsAt)}
                    {s.canceledAt ? <Badge variant="destructive" className="ms-2">لغوشده</Badge> : null}
                  </TableCell>
                  <TableCell className="text-end">
                    {!s.canceledAt && new Date(s.endsAt) > new Date() ? (
                      <Button variant="link" size="sm" className="px-0 text-destructive" onClick={() => setDialog({ cancel: s.id })}>
                        لغو
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {b.payments.length ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>پرداخت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    #{fa(p.number)} · {p.planName} · {fa(p.months)} ماه
                    <span className="block text-xs text-muted-foreground">
                      {GATEWAY_LABEL[p.gateway] ?? p.gateway} · {formatDateTime(p.createdAt)}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatToman(p.totalRial)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'paid' ? 'secondary' : p.status === 'failed' ? 'destructive' : 'outline'}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {dialog === 'grant' ? <GrantDialog tenantId={tenantId} plans={paidPlans} onClose={() => setDialog(null)} onDone={() => changed('اشتراک دستی ثبت شد.')} /> : null}
      {dialog === 'offline' ? <OfflineDialog tenantId={tenantId} plans={paidPlans} onClose={() => setDialog(null)} onDone={() => changed('پرداخت آفلاین ثبت و اشتراک فعال شد.')} /> : null}
      {dialog && typeof dialog === 'object' ? <CancelDialog subscriptionId={dialog.cancel} onClose={() => setDialog(null)} onDone={() => changed('اشتراک لغو شد.')} /> : null}
    </section>
  );
}

function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: 'POST', body });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, send };
}

const num = (v: string) => Number(toAsciiDigits(v).replace(/[,٬\s]/g, ''));

function PlanSelect({ plans, value, onChange }: { plans: BillingPlan[]; value: string; onChange: (v: string) => void }) {
  return (
    <Field>
      <FieldLabel>پلن</FieldLabel>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
        {plans.map((p) => (
          <NativeSelectOption key={p.id} value={p.id}>
            {p.name}
            {p.active ? '' : ' (غیرفعال)'}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

function GrantDialog({ tenantId, plans, onClose, onDone }: { tenantId: string; plans: BillingPlan[]; onClose: () => void; onDone: () => void }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');
  const { busy, error, send } = useSubmit(onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="اشتراک دستی"
      description="بدون پرداخت، از همین الان. اگر اشتراک دیگری هم فعال باشد، پلن با رتبه‌ی بالاتر مؤثر است."
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send(`/admin/billing/tenants/${encodeURIComponent(tenantId)}/subscriptions`, { planId, days: num(days), note });
      }}
      busy={busy}
      canSubmit={Boolean(planId) && num(days) > 0 && Boolean(note.trim())}
      error={error}
    >
      <PlanSelect plans={plans} value={planId} onChange={setPlanId} />
      <Field>
        <FieldLabel>مدت (روز)</FieldLabel>
        <Input dir="ltr" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>دلیل</FieldLabel>
        <Textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} required />
        <FieldDescription>مثلاً قرارداد، جبران قطعی یا هدیه؛ در لاگ ممیزی ثبت می‌شود.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

function OfflineDialog({ tenantId, plans, onClose, onDone }: { tenantId: string; plans: BillingPlan[]; onClose: () => void; onDone: () => void }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [months, setMonths] = useState('12');
  const [toman, setToman] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, send } = useSubmit(onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="ثبت پرداخت آفلاین"
      description="برای کارت‌به‌کارت یا فاکتور. مثل خرید آنلاین فعال یا از پایان دوره‌ی فعلی زمان‌بندی می‌شود."
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send(`/admin/billing/tenants/${encodeURIComponent(tenantId)}/payments`, { planId, months: num(months), totalRial: num(toman) * 10, note });
      }}
      busy={busy}
      canSubmit={Boolean(planId) && num(months) > 0 && toman.trim() !== '' && Boolean(note.trim())}
      error={error}
    >
      <PlanSelect plans={plans} value={planId} onChange={setPlanId} />
      <Field>
        <FieldLabel>مدت (ماه)</FieldLabel>
        <Input dir="ltr" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>مبلغ دریافتی (تومان)</FieldLabel>
        <Input dir="ltr" inputMode="numeric" value={toman} onChange={(e) => setToman(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>توضیح</FieldLabel>
        <Textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} required />
        <FieldDescription>مثلاً شماره‌ی پیگیری کارت‌به‌کارت.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

function CancelDialog({ subscriptionId, onClose, onDone }: { subscriptionId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const { busy, error, send } = useSubmit(onDone);
  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="لغو اشتراک"
      description="همان لحظه بی‌اثر می‌شود (بدون بازپرداخت خودکار)."
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send(`/admin/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { reason });
      }}
      submitLabel="لغو اشتراک"
      busy={busy}
      canSubmit={Boolean(reason.trim())}
      error={error}
    >
      <Field>
        <FieldLabel>دلیل</FieldLabel>
        <Textarea maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
      </Field>
    </FormDialog>
  );
}
