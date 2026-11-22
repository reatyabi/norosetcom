'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Label,
  Segmented,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@noroset/ui';
import { ItemTableSkeleton } from '../../_components/page-skeletons';
import {
  ENTITLEMENT_META,
  formatToman,
  GATEWAY_LABEL,
  PAYMENT_STATUS_LABEL,
  PLAN_MODULE_META,
  PLAN_SCOPE_LABEL,
  type BillingPlan,
  type Entitlements,
  type Page,
  type Payment,
  type PaymentStatus,
  type PlanModuleKey,
  type PlanScope,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, toAsciiDigits } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog, Notice } from '@/components/settings-ui';
import { AdminPage, fa, Pager, query, useAdminResource } from '../_components/admin-ui';

interface Overview {
  plans: BillingPlan[];
  vatPercent: number;
  /** دوره‌ی رایگان کاربر تازه: پلن (null در DB ← پلن پایه، اینجا همیشه پرشده) و روز (۰ ← خاموش). */
  trial: { planId: string; days: number };
}

const LIMIT = 50;
type StatusFilter = 'all' | PaymentStatus;
const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'paid', label: PAYMENT_STATUS_LABEL.paid },
  { value: 'pending', label: PAYMENT_STATUS_LABEL.pending },
  { value: 'failed', label: PAYMENT_STATUS_LABEL.failed },
];

export default function AdminBillingPage() {
  const overview = useAdminResource<Overview>('/admin/billing');
  const [editing, setEditing] = useState<BillingPlan | 'new' | null>(null);

  return (
    <AdminPage
      title="اشتراک‌ها"
      description="پلن‌ها، سقف‌ها و قیمت‌ها، مالیات و پرداخت‌های همه‌ی فضاهای کاری"
      action={
        <Button onClick={() => setEditing('new')}>
          <PlusIcon />
          پلن جدید
        </Button>
      }
    >
      {overview.error ? (
        <Alert variant="destructive">
          <AlertDescription>{overview.error}</AlertDescription>
        </Alert>
      ) : null}
      {!overview.data ? (
        overview.error ? null : (
          <ItemTableSkeleton count={6} />
        )
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">پلن‌ها</h2>
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>پلن</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="hidden md:table-cell">قیمت‌ها</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.data.plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{p.name}</span>
                          <span dir="ltr" className="text-end text-xs text-muted-foreground">
                            {p.code} · {PLAN_SCOPE_LABEL[p.scope]} · rank {p.rank}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? 'secondary' : 'outline'}>{p.active ? 'فعال' : 'غیرفعال'}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {p.prices.length
                          ? p.prices
                              .map(
                                (x) =>
                                  `${fa(x.months)} ماه: ${formatToman(x.priceRial)}${x.discountPercent ? ` (${fa(x.discountPercent)}٪ تخفیف)` : ''}`,
                              )
                              .join('، ')
                          : 'بدون قیمت'}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button variant="link" size="sm" className="px-0" onClick={() => setEditing(p)}>
                          ویرایش
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <TrialCard plans={overview.data.plans} value={overview.data.trial} onSaved={() => void overview.reload()} />
          <VatCard value={overview.data.vatPercent} onSaved={() => void overview.reload()} />
          <PaymentsSection />
        </>
      )}

      {editing ? (
        <PlanDialog
          plan={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void overview.reload();
          }}
        />
      ) : null}
    </AdminPage>
  );
}

/**
 * دوره‌ی رایگان (docs/architecture.md §9.11): هر کاربر تازه یک بار روی این پلن و به این تعداد روز می‌گیرد. در این
 * دوره سقف‌ها همان سقف‌های پلن‌اند ولی ایندکس گوگل نورولینک بسته است تا خرید اشتراک.
 */
function TrialCard({
  plans,
  value,
  onSaved,
}: {
  plans: BillingPlan[];
  value: { planId: string; days: number };
  onSaved: () => void;
}) {
  const [planId, setPlanId] = useState(value.planId);
  const [days, setDays] = useState(String(value.days));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const parsed = Number(toAsciiDigits(days));
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 90;
  const changed = planId !== value.planId || parsed !== value.days;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await api('/admin/billing/settings', { method: 'PUT', body: { trialPlanId: planId, trialDays: parsed } });
      setDone('ذخیره شد؛ فقط روی کاربرهای تازه اثر دارد و دوره‌های رایگان در جریان دست نمی‌خورند.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>دوره‌ی رایگان</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            هر کاربر تازه یک بار این پلن را رایگان می‌گیرد. سقف‌ها همان سقف‌های پلن است، ولی نمایش صفحه در گوگل تا خرید اشتراک
            بسته می‌ماند. خرید در دوره‌ی رایگان همان لحظه فعال می‌شود و روزهای باقی‌مانده به انتهای اشتراک اضافه می‌شود.
          </p>
          <Notice error={error} done={done} />
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-auto">
              <FieldLabel>پلن</FieldLabel>
              <Segmented value={planId} onChange={setPlanId} items={plans.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
            <Field className="w-32">
              <FieldLabel>روز (۰ = خاموش)</FieldLabel>
              <Input dir="ltr" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy} disabled={!valid || !changed}>
              ذخیره
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VatCard({ value, onSaved }: { value: number; onSaved: () => void }) {
  const [vat, setVat] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const parsed = Number(toAsciiDigits(vat));
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await api('/admin/billing/settings', { method: 'PUT', body: { vatPercent: parsed } });
      setDone('مالیات ذخیره شد؛ روی خریدهای بعدی اعمال می‌شود.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>مالیات بر ارزش افزوده</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-3">
          <Notice error={error} done={done} />
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-32">
              <FieldLabel>درصد</FieldLabel>
              <Input dir="ltr" inputMode="numeric" value={vat} onChange={(e) => setVat(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy} disabled={!valid || parsed === value}>
              ذخیره
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentsSection() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [offset, setOffset] = useState(0);
  const { data, error } = useAdminResource<Page<Payment>>(
    `/admin/billing/payments${query({ status: status === 'all' ? undefined : status, limit: LIMIT, offset })}`,
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">پرداخت‌ها</h2>
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          items={STATUS_ITEMS}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {data && data.items.length === 0 ? <p className="text-sm text-muted-foreground">پرداختی نیست.</p> : null}
      {data && data.items.length > 0 ? (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رسید</TableHead>
                  <TableHead>فضای کاری</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="hidden md:table-cell">روش / زمان</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      #{fa(p.number)}
                      <span className="block text-xs text-muted-foreground">
                        {p.planName} · {fa(p.months)} ماه
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={routes.admin.tenant(p.tenantId)} className="hover:underline">
                        {p.tenantName}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatToman(p.totalRial)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'paid' ? 'secondary' : p.status === 'failed' ? 'destructive' : 'outline'}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {GATEWAY_LABEL[p.gateway] ?? p.gateway}
                      <span className="block text-xs">{formatDateTime(p.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pager offset={data.offset} limit={data.limit} total={data.total} shown={data.items.length} noun="پرداخت" onChange={setOffset} />
        </>
      ) : null}
    </section>
  );
}

interface PriceRow {
  months: string;
  toman: string;
  discountPercent: string;
}

const SCOPE_ITEMS: { value: PlanScope; label: string }[] = [
  { value: 'norolink', label: PLAN_SCOPE_LABEL.norolink },
  { value: 'noroform', label: PLAN_SCOPE_LABEL.noroform },
  { value: 'norofile', label: PLAN_SCOPE_LABEL.norofile },
  { value: 'bundle', label: 'همه' },
];

/** پیش‌فرض سقف‌های یک محصول وقتی دامنه‌ی پلن آن را پوشش می‌دهد؛ فقط مقادیر خالی/صفر پر می‌شوند. */
function fillModuleDefaults(ent: Record<string, string | boolean>, modKey: PlanModuleKey): void {
  if (modKey === 'norolink') {
    if (!ent['norolink.pages'] || ent['norolink.pages'] === '0') ent['norolink.pages'] = '1';
    if (!ent['norolink.elements_per_page'] || ent['norolink.elements_per_page'] === '0') ent['norolink.elements_per_page'] = '30';
  } else if (modKey === 'norofile') {
    if (!ent['norofile.storage_mb'] || ent['norofile.storage_mb'] === '0') ent['norofile.storage_mb'] = '100';
  } else if (modKey === 'noroform') {
    if (!ent['noroform.forms'] || ent['noroform.forms'] === '0') ent['noroform.forms'] = '3';
    if (!ent['noroform.submissions_monthly'] || ent['noroform.submissions_monthly'] === '0') ent['noroform.submissions_monthly'] = '100';
  }
}

/** ویرایش/ساخت پلن: دامنه‌ی محصول پلن (scope) پوشش را تعیین می‌کند، قیمت‌ها به تومان (ذخیره ریال). */
function PlanDialog({ plan, onClose, onSaved }: { plan: BillingPlan | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(plan?.code ?? '');
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [rank, setRank] = useState(String(plan?.rank ?? 30));
  const [active, setActive] = useState(plan?.active ?? false);
  // دامنه‌ی پلن (docs/architecture.md §9.11): هر پلن یک محصول یا هر سه؛ خرید محصول دیگر اشتراک را جایگزین نمی‌کند.
  const [scope, setScope] = useState<PlanScope>(plan?.scope ?? 'norolink');
  const covers = (modKey: PlanModuleKey) => scope === 'bundle' || scope === modKey;

  const [ent, setEnt] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(ENTITLEMENT_META.map((m) => [m.key, m.kind === 'boolean' ? Boolean(plan?.entitlements[m.key]) : String(plan?.entitlements[m.key] ?? '')])),
  );
  const [prices, setPrices] = useState<PriceRow[]>(() =>
    (plan?.prices ?? []).map((p) => ({
      months: String(p.months),
      toman: String(p.priceRial / 10),
      discountPercent: p.discountPercent ? String(p.discountPercent) : '',
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => Number(toAsciiDigits(v).replace(/[,٬\s]/g, ''));

  function selectScope(next: PlanScope) {
    setScope(next);
    setEnt((prev) => {
      const nextEnt = { ...prev };
      for (const mod of PLAN_MODULE_META) {
        if (next === 'bundle' || next === mod.key) fillModuleDefaults(nextEnt, mod.key);
      }
      return nextEnt;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const entitlements: Partial<Entitlements> = {};
    for (const m of ENTITLEMENT_META) {
      // محصولات خارج از دامنه‌ی پلن صفر نمی‌شوند؛ همان مقدار قبلی دست‌نخورده می‌ماند.
      if (m.module && !covers(m.module)) {
        const previous = plan?.entitlements[m.key];
        if (previous !== undefined) entitlements[m.key] = previous;
        continue;
      }
      const v = ent[m.key];
      if (m.kind === 'boolean') entitlements[m.key] = Boolean(v);
      else if (String(v).trim() !== '') entitlements[m.key] = num(String(v));
      else entitlements[m.key] = 0;
    }
    const body = {
      ...(plan ? {} : { code: code.trim() }),
      name,
      description,
      scope,
      rank: num(rank),
      active,
      entitlements,
      prices: prices
        .filter((p) => p.months.trim())
        .map((p) => {
          const disc = num(p.discountPercent);
          return {
            months: num(p.months),
            priceRial: num(p.toman) * 10,
            ...(disc > 0 && disc <= 100 ? { discountPercent: disc } : {}),
          };
        }),
    };
    setBusy(true);
    try {
      await api(plan ? `/admin/billing/plans/${plan.id}` : '/admin/billing/plans', { method: plan ? 'PATCH' : 'POST', body });
      onSaved();
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
      title={plan ? `ویرایش پلن «${plan.name}»` : 'پلن جدید'}
      description="دامنه و سقف‌های این پلن را تعیین کنید. تغییرات برای اشتراک‌های جاری فوراً اعمال می‌شوند."
      onSubmit={submit}
      busy={busy}
      canSubmit={Boolean(name.trim()) && (Boolean(plan) || /^[a-z][a-z0-9_]{1,31}$/.test(code.trim()))}
      error={error}
    >
      {plan ? null : (
        <Field>
          <FieldLabel>شناسه (انگلیسی، ثابت)</FieldLabel>
          <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="business" required />
        </Field>
      )}
      <Field>
        <FieldLabel>نام</FieldLabel>
        <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field>
        <FieldLabel>توضیح</FieldLabel>
        <Textarea maxLength={500} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-end gap-4">
        <Field className="w-28">
          <FieldLabel>رتبه</FieldLabel>
          <Input dir="ltr" inputMode="numeric" value={rank} onChange={(e) => setRank(e.target.value)} />
        </Field>
        <div className="flex items-center gap-2 pb-1.5">
          <Switch id="plan-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="plan-active">قابل خرید</Label>
        </div>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">رتبه‌ی بالاتر یعنی ارتقا (فوری با اعتبار)؛ پایین‌تر از پایان دوره.</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">دامنه‌ی محصول و امکانات پلن</h3>
          <p className="text-xs text-muted-foreground">
            هر پلن یک محصول را پوشش می‌دهد و «همه» هر سه را. خرید پلن محصول دیگر، اشتراک فعلی را جایگزین نمی‌کند و کنار آن
            اضافه می‌شود؛ پس دامنه را همان محصولی انتخاب کنید که پلن برایش فروخته می‌شود.
          </p>
          <Segmented value={scope} onChange={selectScope} items={SCOPE_ITEMS} className="max-w-md" />
        </div>

        {PLAN_MODULE_META.map((mod) => {
          const isModActive = covers(mod.key);
          const moduleEntitlements = ENTITLEMENT_META.filter((m) => m.module === mod.key);
          return (
            <div
              key={mod.key}
              className={`flex flex-col gap-3 rounded-lg border p-3.5 transition-colors ${
                isModActive ? 'border-primary/30 bg-card' : 'border-border/60 bg-muted/30 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{mod.label}</span>
                  <span className="text-xs text-muted-foreground">{mod.description}</span>
                </div>
                <Badge variant={isModActive ? 'secondary' : 'outline'}>{isModActive ? 'در دامنه‌ی پلن' : 'خارج از دامنه'}</Badge>
              </div>

              {isModActive ? (
                <div className="mt-1 flex flex-col gap-2.5 border-t pt-3">
                  {moduleEntitlements.map((m) =>
                    m.kind === 'boolean' ? (
                      <div key={m.key} className="flex items-center gap-2 py-0.5">
                        <Switch
                          id={`ent-${m.key}`}
                          checked={Boolean(ent[m.key])}
                          onCheckedChange={(v) => setEnt((s) => ({ ...s, [m.key]: v }))}
                        />
                        <Label htmlFor={`ent-${m.key}`} className="flex flex-col items-start gap-0.5 text-sm font-normal">
                          {m.label}
                          {/* مثلاً ایندکس گوگل: پلن آن را دارد ولی در دوره‌ی رایگان (کارت «دوره‌ی رایگان») بسته است */}
                          {m.paidOnly ? <span className="text-xs text-muted-foreground">{m.paidOnly}</span> : null}
                        </Label>
                      </div>
                    ) : (
                      <Field key={m.key} orientation="horizontal" className="items-center">
                        <FieldLabel className="min-w-44 text-xs font-medium">{m.label}</FieldLabel>
                        <Input
                          dir="ltr"
                          inputMode="numeric"
                          className="w-32"
                          value={String(ent[m.key])}
                          onChange={(e) => setEnt((s) => ({ ...s, [m.key]: e.target.value }))}
                          aria-label={`${m.label} (${m.unit})`}
                        />
                        <span className="text-xs text-muted-foreground">{m.unit}</span>
                      </Field>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  این محصول در دامنه‌ی این پلن نیست؛ خرید پلن آن را فعال نمی‌کند و سقف‌های ذخیره‌شده‌اش دست‌نخورده می‌مانند.
                </p>
              )}
            </div>
          );
        })}

        {/* امکانات عمومی / پلتفرم */}
        {ENTITLEMENT_META.filter((m) => m.module === null).length > 0 ? (
          <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-card p-3.5">
            <h4 className="text-xs font-semibold text-muted-foreground">امکانات پلتفرم</h4>
            {ENTITLEMENT_META.filter((m) => m.module === null).map((m) =>
              m.kind === 'boolean' ? (
                <div key={m.key} className="flex items-center gap-2">
                  <Switch
                    id={`ent-${m.key}`}
                    checked={Boolean(ent[m.key])}
                    onCheckedChange={(v) => setEnt((s) => ({ ...s, [m.key]: v }))}
                  />
                  <Label htmlFor={`ent-${m.key}`} className="text-sm font-normal">
                    {m.label}
                  </Label>
                </div>
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2 border-t pt-3">
        <legend className="mb-2 text-sm font-medium">دوره‌ها و قیمت کل پلن (تومان، بدون مالیات)</legend>
        <p className="-mt-1 mb-2 text-xs text-muted-foreground">
          مدت زمان اشتراک برای تمامی ماژول‌های فعال پلن یکسان اعمال می‌شود (مثلاً ۶ ماه یا ۱۲ ماه). برای پلن با قیمت صفر، عدد ۰ وارد کنید.
        </p>
        {prices.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input dir="ltr" inputMode="numeric" className="w-16" value={p.months} aria-label="ماه" onChange={(e) => setPrices((rows) => rows.map((r, j) => (j === i ? { ...r, months: e.target.value } : r)))} />
            <span className="text-xs text-muted-foreground">ماه</span>
            <Input dir="ltr" inputMode="numeric" className="flex-1" value={p.toman} aria-label="قیمت به تومان" onChange={(e) => setPrices((rows) => rows.map((r, j) => (j === i ? { ...r, toman: e.target.value } : r)))} />
            <span className="text-xs text-muted-foreground">تومان</span>
            <Input
              dir="ltr"
              inputMode="numeric"
              className="w-20"
              value={p.discountPercent}
              placeholder="تخفیف"
              aria-label="درصد تخفیف"
              onChange={(e) => setPrices((rows) => rows.map((r, j) => (j === i ? { ...r, discountPercent: e.target.value } : r)))}
            />
            <span className="text-xs text-muted-foreground">٪</span>
            <Button type="button" variant="ghost" size="icon" aria-label="حذف دوره" onClick={() => setPrices((rows) => rows.filter((_, j) => j !== i))}>
              <Trash2Icon />
            </Button>
          </div>
        ))}
        {prices.length < 6 ? (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setPrices((rows) => [...rows, { months: '', toman: '', discountPercent: '' }])}>
            <PlusIcon />
            افزودن دوره
          </Button>
        ) : null}
      </fieldset>
    </FormDialog>
  );
}
