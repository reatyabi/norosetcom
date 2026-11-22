'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
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
import {
  ANNOUNCEMENT_AUDIENCE_LABEL,
  ANNOUNCEMENT_TARGET_LABEL,
  ANNOUNCEMENT_TONE_LABEL,
  formatToman,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementTarget,
  type AnnouncementTone,
  type BillingPlan,
  type Coupon,
  type CouponKind,
  type UtmRow,
} from '@noroset/admin/ui';
import { api, errorMessage, rawApi } from '@/lib/api';
import { formatDateTime, toAsciiDigits } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { AdminPage, fa, query, useAdminResource } from '../_components/admin-ui';

// کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷): کد تخفیف، اعلان درون پنل، گزارش UTM ثبت‌نام.

const num = (v: string) => Number(toAsciiDigits(v).replace(/[,٬\s]/g, ''));
/** datetime-local (وقت مرورگر) ← ISO؛ خالی ← null. */
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
/** ISO ← مقدار datetime-local به وقت محلی مرورگر. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function AdminCampaignsPage() {
  return (
    <AdminPage title="کمپین‌ها" description="کد تخفیف، اعلان درون پنل، گزارش ثبت‌نام بر اساس UTM و لینک‌های واگذاری صفحه">
      <CouponsSection />
      <AnnouncementsSection />
      <UtmSection />
      <ClaimLinksSection />
    </AdminPage>
  );
}

type ClaimLinkStatus = 'active' | 'claimed' | 'revoked' | 'orphaned';

interface ClaimFunnelItem {
  id: string;
  templateId: string | null;
  templateTitle: string | null;
  businessName: string;
  note: string;
  slug: string | null;
  status: ClaimLinkStatus;
  url: string | null;
  createdAt: string;
  createdByName: string | null;
  openCount: number;
  lastOpenedAt: string | null;
  claimedAt: string | null;
  claimedBy: { id: string; mobile: string | null; fullName: string } | null;
  claimedTenantId: string | null;
  plan: { name: string; status: string; endsAt: string | null; expired: boolean; paidRial: number } | null;
}

interface ClaimFunnel {
  count: number;
  totals: { created: number; opened: number; claimed: number; paid: number };
  items: ClaimFunnelItem[];
}

const CLAIM_STATUS: Record<ClaimLinkStatus, { label: string; variant: 'info' | 'default' | 'secondary' }> = {
  active: { label: 'در انتظار تحویل', variant: 'info' },
  claimed: { label: 'تحویل‌گرفته', variant: 'default' },
  revoked: { label: 'باطل‌شده', variant: 'secondary' },
  orphaned: { label: 'قالب حذف شده', variant: 'secondary' },
};

const PLAN_STATUS: Record<string, string> = { trial: 'رایگان', active: 'فعال', grace: 'مهلت تمدید', limited: 'محدود' };

/** وضعیت مشتری پس از تحویل: پرداخت (مهم‌ترین مرحله‌ی قیف)، یا پلن جاری و تاریخ پایانش. */
function claimPlan(item: ClaimFunnelItem): string {
  if (!item.plan) return '—';
  if (item.plan.paidRial > 0) return `پرداخت ${formatToman(item.plan.paidRial)}`;
  const status = PLAN_STATUS[item.plan.status] ?? item.plan.status;
  return item.plan.endsAt ? `${status} تا ${formatDateTime(item.plan.endsAt)}` : status;
}

/**
 * لینک‌های واگذاری صفحه (docs/architecture.md §9.8): قیف ساخته‌شده ← باز شده ← تحویل‌گرفته ← پرداخت‌کرده، و هر لینک با نام
 * کسب‌وکار، یادداشت و وضعیت مشتری. فایل متنی لینک‌های فعال برای ارسال گروهی می‌ماند.
 */
function ClaimLinksSection() {
  const links = useAdminResource<ClaimFunnel>('/norolink/admin/claim-links');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = error ?? links.error;
  const totals = links.data?.totals;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await rawApi('/norolink/admin/claim-links/export.txt');
      const url = URL.createObjectURL(await res.blob());
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'claim-links.txt';
      a.click();
      await links.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = totals
    ? [
        { label: 'ساخته‌شده', value: totals.created },
        { label: 'باز شده', value: totals.opened },
        { label: 'تحویل‌گرفته', value: totals.claimed },
        { label: 'پرداخت‌کرده', value: totals.paid },
      ]
    : [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">لینک‌های واگذاری صفحه</h2>
          <p className="text-sm text-muted-foreground">
            لینک از ادیتور قالب در «قالب‌ها»، تب «واگذاری به مشتری» ساخته می‌شود. ثبت‌نام‌های این کانال در جدول UTM با{' '}
            <span dir="ltr">norolink / claim-link</span> هم دیده می‌شوند.
          </p>
        </div>
        <Button variant="outline" size="sm" loading={busy} disabled={!links.data?.count} onClick={() => void download()}>
          <DownloadIcon />
          دانلود لینک‌های فعال
        </Button>
      </div>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {totals && totals.created > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((s, i) => (
            <Card key={s.label} className="gap-0.5 p-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-lg font-bold tabular-nums">{fa(s.value)}</span>
              {i > 0 && steps[i - 1]!.value ? (
                <span className="text-xs text-muted-foreground">
                  {fa(Math.round((s.value / steps[i - 1]!.value) * 100))}٪ از مرحله‌ی قبل
                </span>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
      {links.data && links.data.items.length === 0 ? <p className="text-sm text-muted-foreground">هنوز لینکی ساخته نشده است.</p> : null}
      {links.data && links.data.items.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کسب‌وکار</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="hidden md:table-cell">باز شده</TableHead>
                <TableHead>مشتری</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.businessName}</span>
                      {item.slug ? (
                        <span dir="ltr" className="text-end font-mono text-xs text-muted-foreground">
                          {item.slug}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                        {item.createdByName ? ` · ${item.createdByName}` : ''}
                      </span>
                      {item.note ? <span className="whitespace-pre-line text-xs text-muted-foreground">{item.note}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={CLAIM_STATUS[item.status].variant}>{CLAIM_STATUS[item.status].label}</Badge>
                    {item.claimedAt ? <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.claimedAt)}</div> : null}
                  </TableCell>
                  <TableCell className="hidden align-top tabular-nums md:table-cell">
                    {item.openCount ? fa(item.openCount) : '—'}
                    {item.lastOpenedAt ? <div className="text-xs text-muted-foreground">{formatDateTime(item.lastOpenedAt)}</div> : null}
                  </TableCell>
                  <TableCell className="align-top">
                    {item.claimedBy ? (
                      <div className="flex flex-col gap-0.5">
                        <Link href={routes.admin.user(item.claimedBy.id)} className="text-primary hover:underline">
                          {item.claimedBy.fullName || <span dir="ltr">{item.claimedBy.mobile ?? '—'}</span>}
                        </Link>
                        <span className="text-xs text-muted-foreground">{claimPlan(item)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </section>
  );
}

function couponValue(c: Coupon): string {
  return c.kind === 'percent' ? `${fa(c.amount)}٪` : formatToman(c.amount);
}

function CouponsSection() {
  const coupons = useAdminResource<Coupon[]>('/admin/campaigns/coupons');
  const plans = useAdminResource<{ plans: BillingPlan[] }>('/admin/billing');
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const planName = (id: string) => plans.data?.plans.find((p) => p.id === id)?.name ?? '—';
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">کدهای تخفیف</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
          <PlusIcon />
          کد جدید
        </Button>
      </div>
      {coupons.error ? (
        <Alert variant="destructive">
          <AlertDescription>{coupons.error}</AlertDescription>
        </Alert>
      ) : null}
      {coupons.data && coupons.data.length === 0 ? <p className="text-sm text-muted-foreground">هنوز کدی ساخته نشده است.</p> : null}
      {coupons.data && coupons.data.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>تخفیف</TableHead>
                <TableHead>مصرف</TableHead>
                <TableHead className="hidden md:table-cell">پلن / بازه</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span dir="ltr" className="font-medium">
                      {c.code}
                    </span>
                    {c.active ? null : (
                      <Badge variant="outline" className="ms-2">
                        غیرفعال
                      </Badge>
                    )}
                    {c.description ? <span className="block text-xs text-muted-foreground">{c.description}</span> : null}
                  </TableCell>
                  <TableCell>{couponValue(c)}</TableCell>
                  <TableCell className="tabular-nums">
                    {fa(c.usedCount)}
                    {c.maxUses ? ` از ${fa(c.maxUses)}` : ''}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {c.planIds.length ? c.planIds.map(planName).join('، ') : 'همه‌ی پلن‌ها'}
                    <span className="block">
                      {c.startsAt ? formatDateTime(c.startsAt) : 'از الان'} ← {c.endsAt ? formatDateTime(c.endsAt) : 'بی‌پایان'}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="link" size="sm" className="px-0" onClick={() => setEditing(c)}>
                      ویرایش
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
      {editing ? (
        <CouponDialog
          coupon={editing === 'new' ? null : editing}
          plans={plans.data?.plans ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void coupons.reload();
          }}
        />
      ) : null}
    </section>
  );
}

function CouponDialog({ coupon, plans, onClose, onSaved }: { coupon: Coupon | null; plans: BillingPlan[]; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [kind, setKind] = useState<CouponKind>(coupon?.kind ?? 'percent');
  // مبلغ ثابت در فرم به تومان، در API ریال.
  const [amount, setAmount] = useState(coupon ? String(coupon.kind === 'fixed' ? coupon.amount / 10 : coupon.amount) : '');
  const [maxUses, setMaxUses] = useState(coupon?.maxUses ? String(coupon.maxUses) : '');
  const [perTenant, setPerTenant] = useState(coupon ? (coupon.maxUsesPerTenant ? String(coupon.maxUsesPerTenant) : '') : '1');
  const [planIds, setPlanIds] = useState<string[]>(coupon?.planIds ?? []);
  const [startsAt, setStartsAt] = useState(toLocalInput(coupon?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(coupon?.endsAt ?? null));
  const [active, setActive] = useState(coupon?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = {
      ...(coupon ? {} : { code: code.trim().toUpperCase(), kind }),
      description,
      amount: kind === 'fixed' ? num(amount) * 10 : num(amount),
      maxUses: maxUses.trim() ? num(maxUses) : null,
      maxUsesPerTenant: perTenant.trim() ? num(perTenant) : null,
      planIds,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      active,
    };
    try {
      await api(coupon ? `/admin/campaigns/coupons/${coupon.id}` : '/admin/campaigns/coupons', { method: coupon ? 'PATCH' : 'POST', body });
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
      title={coupon ? `ویرایش کد ${coupon.code}` : 'کد تخفیف جدید'}
      description="تخفیف روی مبلغ پلن پس از اعتبار ارتقا و پیش از مالیات حساب می‌شود؛ فقط پرداخت موفق مصرف است."
      onSubmit={submit}
      busy={busy}
      canSubmit={Boolean(amount.trim()) && (Boolean(coupon) || /^[A-Za-z0-9_-]{3,32}$/.test(code.trim()))}
      error={error}
    >
      {coupon ? null : (
        <Field>
          <FieldLabel>کد</FieldLabel>
          <Input dir="ltr" maxLength={32} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="YALDA1405" required />
          <FieldDescription>حروف انگلیسی، عدد، - و _ (۳ تا ۳۲). کد و نوع بعداً قابل تغییر نیستند.</FieldDescription>
        </Field>
      )}
      <Field>
        <FieldLabel>توضیح (برای ادمین‌ها)</FieldLabel>
        <Input maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        {coupon ? null : (
          <Field className="w-40">
            <FieldLabel>نوع</FieldLabel>
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as CouponKind)}>
              <NativeSelectOption value="percent">درصدی</NativeSelectOption>
              <NativeSelectOption value="fixed">مبلغ ثابت</NativeSelectOption>
            </NativeSelect>
          </Field>
        )}
        <Field className="w-40">
          <FieldLabel>{kind === 'percent' ? 'درصد' : 'مبلغ (تومان)'}</FieldLabel>
          <Input dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field className="w-40">
          <FieldLabel>سقف کل</FieldLabel>
          <Input dir="ltr" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="نامحدود" />
        </Field>
        <Field className="w-40">
          <FieldLabel>سقف هر فضای کاری</FieldLabel>
          <Input dir="ltr" inputMode="numeric" value={perTenant} onChange={(e) => setPerTenant(e.target.value)} placeholder="نامحدود" />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">پلن‌های مجاز (هیچ‌کدام = همه)</legend>
        {plans.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Switch
              id={`coupon-plan-${p.id}`}
              checked={planIds.includes(p.id)}
              onCheckedChange={(on) => setPlanIds((ids) => (on ? [...ids, p.id] : ids.filter((x) => x !== p.id)))}
            />
            <Label htmlFor={`coupon-plan-${p.id}`}>{p.name}</Label>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Field className="w-56">
          <FieldLabel>شروع (اختیاری)</FieldLabel>
          <Input dir="ltr" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field className="w-56">
          <FieldLabel>پایان (اختیاری)</FieldLabel>
          <Input dir="ltr" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="coupon-active" checked={active} onCheckedChange={setActive} />
        <Label htmlFor="coupon-active">فعال</Label>
      </div>
    </FormDialog>
  );
}

function AnnouncementsSection() {
  const items = useAdminResource<Announcement[]>('/admin/campaigns/announcements');
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">اعلان‌های درون پنل</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
          <PlusIcon />
          اعلان جدید
        </Button>
      </div>
      {items.data && items.data.length === 0 ? <p className="text-sm text-muted-foreground">هنوز اعلانی نیست.</p> : null}
      {items.data && items.data.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اعلان</TableHead>
                <TableHead className="hidden md:table-cell">مخاطب</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-0 min-w-48">
                    <span className="block truncate font-medium">{a.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {ANNOUNCEMENT_TONE_LABEL[a.tone]} · {formatDateTime(a.startsAt)}
                      {a.endsAt ? ` ← ${formatDateTime(a.endsAt)}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {ANNOUNCEMENT_TARGET_LABEL[a.targetType]}
                    {a.targetIds.length ? ` (${fa(a.targetIds.length)})` : ''} · {ANNOUNCEMENT_AUDIENCE_LABEL[a.audience]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.live ? 'info' : 'outline'}>{a.live ? 'در حال نمایش' : a.active ? 'زمان‌بندی/پایان‌یافته' : 'غیرفعال'}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="link" size="sm" className="px-0" onClick={() => setEditing(a)}>
                      ویرایش
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
      {editing ? (
        <AnnouncementDialog
          announcement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void items.reload();
          }}
        />
      ) : null}
    </section>
  );
}

function AnnouncementDialog({ announcement, onClose, onSaved }: { announcement: Announcement | null; onClose: () => void; onSaved: () => void }) {
  const a = announcement;
  const [title, setTitle] = useState(a?.title ?? '');
  const [body, setBody] = useState(a?.body ?? '');
  const [linkUrl, setLinkUrl] = useState(a?.linkUrl ?? '');
  const [linkLabel, setLinkLabel] = useState(a?.linkLabel ?? '');
  const [tone, setTone] = useState<AnnouncementTone>(a?.tone ?? 'info');
  const [audience, setAudience] = useState<AnnouncementAudience>(a?.audience ?? 'all_members');
  const [targetType, setTargetType] = useState<AnnouncementTarget>(a?.targetType ?? 'all');
  const [targets, setTargets] = useState((a?.targetIds ?? []).join('\n'));
  const [startsAt, setStartsAt] = useState(toLocalInput(a?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(a?.endsAt ?? null));
  const [active, setActive] = useState(a?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body_ = {
      title,
      body,
      linkUrl: linkUrl.trim() || null,
      linkLabel: linkLabel.trim() || null,
      tone,
      audience,
      targetType,
      targetIds: targetType === 'all' ? [] : targets.split(/[\s,،]+/).map((t) => t.trim()).filter(Boolean),
      ...(startsAt ? { startsAt: toIso(startsAt) } : {}),
      endsAt: toIso(endsAt),
      active,
    };
    try {
      await api(a ? `/admin/campaigns/announcements/${a.id}` : '/admin/campaigns/announcements', { method: a ? 'PATCH' : 'POST', body: body_ });
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
      title={a ? 'ویرایش اعلان' : 'اعلان جدید'}
      description="بالای پنل فضای کاری نشان داده می‌شود؛ هر کاربر می‌تواند آن را ببندد."
      onSubmit={submit}
      busy={busy}
      canSubmit={Boolean(title.trim())}
      error={error}
    >
      <Field>
        <FieldLabel>عنوان</FieldLabel>
        <Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field>
        <FieldLabel>متن (اختیاری)</FieldLabel>
        <Textarea maxLength={1000} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field className="min-w-48 flex-1">
          <FieldLabel>لینک (اختیاری)</FieldLabel>
          <Input dir="ltr" maxLength={500} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/billing یا https://…" />
        </Field>
        <Field className="w-40">
          <FieldLabel>متن لینک</FieldLabel>
          <Input maxLength={40} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="بیشتر" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field className="w-40">
          <FieldLabel>نوع</FieldLabel>
          <NativeSelect value={tone} onChange={(e) => setTone(e.target.value as AnnouncementTone)}>
            {(['info', 'warning', 'success'] as const).map((t) => (
              <NativeSelectOption key={t} value={t}>
                {ANNOUNCEMENT_TONE_LABEL[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="w-48">
          <FieldLabel>مخاطب</FieldLabel>
          <NativeSelect value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
            {(['all_members', 'managers'] as const).map((t) => (
              <NativeSelectOption key={t} value={t}>
                {ANNOUNCEMENT_AUDIENCE_LABEL[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="w-52">
          <FieldLabel>هدف</FieldLabel>
          <NativeSelect value={targetType} onChange={(e) => setTargetType(e.target.value as AnnouncementTarget)}>
            {(['all', 'plans', 'tenants'] as const).map((t) => (
              <NativeSelectOption key={t} value={t}>
                {ANNOUNCEMENT_TARGET_LABEL[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {targetType === 'all' ? null : (
        <Field>
          <FieldLabel>{targetType === 'plans' ? 'شناسه‌ی پلن‌ها' : 'شناسه‌ی فضاهای کاری'}</FieldLabel>
          <Textarea dir="ltr" rows={2} value={targets} onChange={(e) => setTargets(e.target.value)} placeholder={targetType === 'plans' ? 'free basic' : 'uuid هر فضای کاری'} />
          <FieldDescription>{targetType === 'plans' ? 'شناسه‌ی انگلیسی پلن (free، basic، pro)' : 'شناسه از صفحه‌ی فضای کاری'}؛ با فاصله یا ویرگول جدا کنید.</FieldDescription>
        </Field>
      )}
      <div className="flex flex-wrap gap-3">
        <Field className="w-56">
          <FieldLabel>شروع نمایش</FieldLabel>
          <Input dir="ltr" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <FieldDescription>خالی = همین الان</FieldDescription>
        </Field>
        <Field className="w-56">
          <FieldLabel>پایان نمایش (اختیاری)</FieldLabel>
          <Input dir="ltr" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="announcement-active" checked={active} onCheckedChange={setActive} />
        <Label htmlFor="announcement-active">فعال</Label>
      </div>
    </FormDialog>
  );
}

type Range = '30' | '90' | '365' | 'all';
const RANGES: { value: Range; label: string }[] = [
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
  { value: '365', label: 'یک سال' },
  { value: 'all', label: 'همه' },
];

function UtmSection() {
  const [range, setRange] = useState<Range>('30');
  const { data, error } = useAdminResource<UtmRow[]>(`/admin/campaigns/utm${query({ days: range === 'all' ? undefined : range })}`);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">ثبت‌نام بر اساس UTM</h2>
          <p className="text-sm text-muted-foreground">
            first-touch: پارامترهای <span dir="ltr">utm_*</span> اولین ورود به سایت؛ «پرداخت‌کننده» = مالک فضای کاری با پرداخت موفق.
          </p>
        </div>
        <Segmented value={range} onChange={setRange} items={RANGES} />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {data && data.length === 0 ? <p className="text-sm text-muted-foreground">در این بازه ثبت‌نامی نیست.</p> : null}
      {data && data.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>منبع / رسانه / کمپین</TableHead>
                <TableHead>ثبت‌نام</TableHead>
                <TableHead>پرداخت‌کننده</TableHead>
                <TableHead className="hidden md:table-cell">درآمد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={`${r.source}|${r.medium}|${r.campaign}`}>
                  <TableCell>
                    {r.source ? (
                      <span dir="ltr">{[r.source, r.medium, r.campaign].filter(Boolean).join(' / ')}</span>
                    ) : (
                      <span className="text-muted-foreground">مستقیم (بدون UTM)</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{fa(r.signups)}</TableCell>
                  <TableCell className="tabular-nums">
                    {fa(r.paying)}
                    {r.signups ? <span className="text-xs text-muted-foreground"> ({fa(Math.round((r.paying / r.signups) * 100))}٪)</span> : null}
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{formatToman(r.revenueRial)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </section>
  );
}
