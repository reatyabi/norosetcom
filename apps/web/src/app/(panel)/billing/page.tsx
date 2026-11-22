'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  FileTextIcon,
  HardDriveIcon,
  InboxIcon,
  LayersIcon,
  LinkIcon,
  MinusIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  Input,
  Segmented,
  Skeleton,
} from '@noroset/ui';
import { BillingSkeleton } from '../_components/page-skeletons';
import {
  ENTITLEMENT_META,
  formatToman,
  isModuleActiveInPlan,
  PAYMENT_KIND_LABEL,
  PLAN_SCOPE_LABEL,
  type BillingOverview,
  type BillingPlan,
  type Payment,
  type QueuedSubscriptionView,
  type Quote,
  type ScopedPlan,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { PageHeader } from '@/components/settings-ui';
import { fa, formatDate, monthsLabel } from './_components/billing-format';
import { Payments, PlanStatusBadge, Row } from './_components/billing-parts';
import { useTenant } from '../session';


const PRODUCT_MODULES: {
  key: 'norolink' | 'norofile' | 'noroform';
  name: string;
  icon: typeof LinkIcon;
  badgeClass: string;
}[] = [
  { key: 'norolink', name: 'نورولینک', icon: LinkIcon, badgeClass: 'text-primary bg-primary/10 border-primary/20' },
  { key: 'norofile', name: 'نوروفایل', icon: HardDriveIcon, badgeClass: 'text-tone-sky dark:text-tone-sky bg-tone-sky/10 border-tone-sky/20' },
  { key: 'noroform', name: 'نوروفرم', icon: FileTextIcon, badgeClass: 'text-tone-violet dark:text-tone-violet bg-tone-violet/10 border-tone-violet/20' },
];

export default function BillingPage() {
  const tenant = useTenant();
  const [data, setData] = useState<BillingOverview | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<{ plan: BillingPlan; months: number } | null>(null);
  const [cancelingQueued, setCancelingQueued] = useState<QueuedSubscriptionView | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const handleCancelQueued = async () => {
    if (!cancelingQueued) return;
    setCancelBusy(true);
    try {
      await api(`/billing/queued/${cancelingQueued.id}`, {
        method: 'DELETE',
        tenantId: tenant.tenantId,
      });
      setCancelingQueued(null);
      void load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCancelBusy(false);
    }
  };

  const load = useCallback(
    (isCurrent: () => boolean = () => true) =>
      api<BillingOverview>('/billing', { tenantId: tenant.tenantId })
        .then(async (overview) => {
          if (!isCurrent()) return;
          setData(overview);
          setError(null);
          if (overview.canManage) {
            const list = await api<Payment[]>('/billing/payments', { tenantId: tenant.tenantId });
            if (isCurrent()) setPayments(list);
          }
        })
        .catch((err: unknown) => {
          if (isCurrent()) setError(errorMessage(err));
        }),
    [tenant.tenantId],
  );

  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  // چنده‌اشتراکی (§9.11): هر محصول پلن خودش را دارد؛ خرید محصول دیگر جایگزین نمی‌شود.
  const activePlans: ScopedPlan[] = data?.plan.activePlans ?? [];
  /** اشتراک‌هایی که یک کارت را پوشش می‌دهند: پلن همان دامنه یا باندل (باندل هر سه محصول را می‌دهد). */
  const coveringOf = (plan: BillingPlan) =>
    activePlans.filter((p) => p.scope === plan.scope || (plan.scope !== 'bundle' && p.scope === 'bundle'));

  // کارت پلنی که همان محصولش اشتراک هم‌سطح یا بالاتر دارد، پایین‌تر نشان داده نمی‌شود (تمدید/ارتقای همان دامنه می‌ماند).
  const visiblePlans = data
    ? data.plans.filter((plan) => {
        const covering = coveringOf(plan);
        if (!covering.length) return true;
        const topRank = Math.max(...covering.map((p) => p.rank ?? 0));
        return plan.rank >= topRank;
      })
    : [];

  const maxRankOf = (plan: BillingPlan) =>
    Math.max(...visiblePlans.filter((p) => p.scope === plan.scope).map((p) => p.rank));

  // محصولی که اشتراک فعال/مهلت ندارد ولی محصول دیگری دارد: راهنما برای خرید افزودنی.
  const missingScopes = (['norolink', 'noroform', 'norofile'] as const).filter((scope) => !activePlans.some((p) => p.scope === scope || p.scope === 'bundle'));

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader icon="subscription" title="اشتراک" description={`پلن، مصرف و پرداخت‌های «${tenant.name}»`} />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!data ? (
        error ? null : (
          <BillingSkeleton />
        )
      ) : (
        <>
          <CurrentPlan data={data} />

          <section className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">پلن‌های اشتراک</h2>
              <p className="text-xs text-muted-foreground">
                هر پلن فقط محصول خودش را فعال می‌کند؛ خرید پلن یک محصول، اشتراک محصول‌های دیگر را تغییر نمی‌دهد.
              </p>
              {missingScopes.length > 0 && activePlans.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  محصول بدون اشتراک فعال: {missingScopes.map((scope) => PLAN_SCOPE_LABEL[scope]).join('، ')} — پلن همان محصول را از
                  کارت‌های زیر بخرید.
                </p>
              ) : null}
              {!data.canManage ? (
                <p className="text-sm text-muted-foreground">خرید و ارتقا با مالک یا مدیر حساب است.</p>
              ) : null}
            </div>

            {data.queued.length > 0 ? (
              <div className="flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-tone-sky/25 bg-tone-sky/[0.04] p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-tone-sky dark:text-tone-sky" />
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">رزروهای زمان‌بندی‌شده (تمدید آتی)</h3>
                  </div>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">
                    با وجود رزرو می‌توانید دوره‌های بعدی را نیز رزرو کنید یا پلن خود را ارتقا دهید.
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {data.queued.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-foreground">{q.planName}</span>
                        <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] sm:text-xs text-muted-foreground">
                          {PLAN_SCOPE_LABEL[q.scope]}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] sm:text-xs text-muted-foreground font-mono">
                          شروع از {formatDate(q.startsAt)} تا {formatDate(q.endsAt)}
                        </span>
                      </div>
                      {q.paid ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-tone-emerald/20 bg-tone-emerald/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-success dark:text-success">
                          <CheckIcon className="size-3.5" />
                          پرداخت‌شده
                        </span>
                      ) : data.canManage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 h-8 px-2.5 text-xs font-semibold shrink-0"
                          onClick={() => setCancelingQueued(q)}
                        >
                          <Trash2Icon className="size-3.5" />
                          <span>حذف رزرو</span>
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                'grid gap-4 sm:gap-6',
                visiblePlans.length === 1 && 'max-w-md mx-auto w-full',
                visiblePlans.length === 2 && 'max-w-4xl mx-auto w-full md:grid-cols-2',
                visiblePlans.length >= 3 && 'w-full md:grid-cols-3',
              )}
            >
              {visiblePlans.map((plan) => {
                const covering = coveringOf(plan);
                const currentRank = covering.length ? Math.max(...covering.map((p) => p.rank ?? 0)) : null;
                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    current={covering.some((p) => p.planId === plan.id)}
                    currentRank={currentRank}
                    isHighestTier={plan.rank === maxRankOf(plan) && visiblePlans.filter((p) => p.scope === plan.scope).length > 1}
                    trial={covering.some((p) => p.status === 'trial')}
                    addon={activePlans.length > 0 && covering.length === 0}
                    vatPercent={data.vatPercent}
                    disabled={!data.canManage}
                    onBuy={(months) => setBuying({ plan, months })}
                  />
                );
              })}
            </div>
          </section>

          {data.canManage ? <Payments payments={payments} /> : null}

          {buying ? (
            <QuoteDialog
              tenantId={tenant.tenantId}
              plan={buying.plan}
              months={buying.months}
              onClose={() => setBuying(null)}
            />
          ) : null}

          {cancelingQueued ? (
            <Dialog open onOpenChange={(open) => !open && setCancelingQueued(null)}>
              <DialogPopup dir="rtl" className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>حذف رزرو اشتراک</DialogTitle>
                  <DialogDescription>
                    آیا از حذف رزرو اشتراک «{cancelingQueued.planName}» اطمینان دارید؟ پس از حذف، این دوره فعال نخواهد شد.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCancelingQueued(null)} disabled={cancelBusy}>
                    انصراف
                  </Button>
                  <Button variant="destructive" onClick={() => void handleCancelQueued()} loading={cancelBusy}>
                    تأیید و حذف رزرو
                  </Button>
                </DialogFooter>
              </DialogPopup>
            </Dialog>
          ) : null}
        </>
      )}
    </div>
  );
}

function CurrentPlan({ data }: { data: BillingOverview }) {
  const { plan } = data;
  const activeUsage = ENTITLEMENT_META.filter((m) => {
    if (!m.usage) return false;
    if (m.module && !isModuleActiveInPlan(plan.entitlements, m.module)) {
      return false;
    }
    const limit = Number(plan.entitlements[m.key] ?? 0);
    return limit > 0;
  });

  const getTierIcon = () => {
    if (plan.name.includes('سازمانی')) {
      return <CrownIcon className="size-5 text-tone-amber" />;
    }
    if (plan.name.includes('حرفه‌ای')) {
      return <SparklesIcon className="size-5 text-primary" />;
    }
    return <ZapIcon className="size-5 text-primary" />;
  };

  const getEntitlementVisual = (key: string) => {
    switch (key) {
      case 'norolink.pages':
        return {
          icon: LinkIcon,
          color: 'text-primary',
          bg: 'bg-primary/10 border-primary/20',
        };
      case 'norofile.storage_mb':
        return {
          icon: HardDriveIcon,
          color: 'text-tone-sky dark:text-tone-sky',
          bg: 'bg-tone-sky/10 border-tone-sky/20',
        };
      case 'noroform.forms':
        return {
          icon: FileTextIcon,
          color: 'text-tone-violet dark:text-tone-violet',
          bg: 'bg-tone-violet/10 border-tone-violet/20',
        };
      case 'noroform.submissions_monthly':
        return {
          icon: InboxIcon,
          color: 'text-tone-amber dark:text-tone-amber',
          bg: 'bg-tone-amber/10 border-tone-amber/20',
        };
      default:
        return {
          icon: LayersIcon,
          color: 'text-primary',
          bg: 'bg-primary/10 border-primary/20',
        };
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/50 bg-muted/20 p-4 sm:p-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-border/60 bg-background shadow-xs">
            {getTierIcon()}
          </div>
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            {/* پلن مؤثر هر محصول جدا نمایش داده می‌شود (§9.11): چند اشتراک هم‌زمان با دامنه‌های مختلف. */}
            <div className="flex flex-col gap-1.5">
              {PRODUCT_MODULES.map((mod) => {
                const scoped = plan.scopes?.[mod.key];
                return (
                  <div key={mod.key} className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'inline-flex size-5 shrink-0 items-center justify-center rounded-md border',
                          mod.badgeClass,
                        )}
                      >
                        <mod.icon className="size-3" />
                      </span>
                      <span className="text-xs text-muted-foreground">{mod.name}</span>
                      <span className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                        {scoped?.status === 'limited' || !scoped ? 'بدون اشتراک فعال' : scoped.name}
                      </span>
                    </span>
                    <PlanStatusBadge status={scoped?.status ?? 'limited'} endsAt={scoped?.endsAt ?? null} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {plan.expired
                ? 'هیچ محصولی اشتراک فعال ندارد و صفحه‌های لینک غیرفعال‌اند. با خرید پلن همان لحظه فعال می‌شوند و چیزی پاک نشده است.'
                : plan.status === 'trial' && data.queued.length > 0
                  ? `دسترسی رایگان تا ${formatDate(plan.endsAt!)}. پلن بعدی شما پرداخت شده و از همین تاریخ خودکار شروع می‌شود؛ کار دیگری لازم نیست.`
                  : 'سقف‌های محصول‌هایی که اشتراک فعال دارند با هم جمع می‌شوند؛ هر محصول فقط با پلن خودش (یا باندل) فعال می‌شود.'}
            </p>
          </div>
        </div>
      </CardHeader>

      {data.queued.length > 0 ? (
        <div className="border-b border-border/40 bg-primary/5 px-4 sm:px-6 py-2 sm:py-2.5">
          {data.queued.map((q) => (
            <div key={q.id} className="flex items-center gap-2 text-[11px] sm:text-xs text-foreground/80">
              <ClockIcon className="size-3.5 text-primary shrink-0" />
              <span>
                پلن بعدی رزرو شده: <strong className="font-semibold text-foreground">{q.planName}</strong> ({PLAN_SCOPE_LABEL[q.scope]}) از{' '}
                {formatDate(q.startsAt)} تا {formatDate(q.endsAt)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">میزان مصرف امکانات و سقف‌ها</h3>
            <span className="text-[11px] sm:text-xs text-muted-foreground">بر اساس مصرف دوره جاری</span>
          </div>

          {activeUsage.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {activeUsage.map((m) => {
                const limit = plan.entitlements[m.key] as number;
                const used = data.usage[m.key] ?? 0;
                const ratio = limit > 0 ? Math.min(1, used / limit) : 1;
                const pct = Math.round(ratio * 100);
                const visual = getEntitlementVisual(m.key);
                const Icon = visual.icon;

                const isWarning = ratio >= 0.8 && ratio < 1;
                const isFull = ratio >= 1;

                return (
                  <div
                    key={m.key}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-2.5 sm:p-4 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:border-border hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg border', visual.bg)}>
                          <Icon className={cn('size-3.5 sm:size-4', visual.color)} />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{m.label}</span>
                      </div>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold tabular-nums font-mono',
                          isFull
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : isWarning
                              ? 'bg-tone-amber/10 text-tone-amber dark:text-tone-amber border border-tone-amber/20'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {fa(pct)}٪
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <div className="flex items-baseline justify-between text-[11px] sm:text-xs gap-1">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">مصرف:</span>
                        <div className="flex items-baseline gap-1 tabular-nums font-mono">
                          <span className="text-xs sm:text-base font-bold text-foreground">{fa(used)}</span>
                          <span className="text-muted-foreground text-[10px] sm:text-xs font-sans">
                            از {fa(limit)} {m.unit}
                          </span>
                        </div>
                      </div>

                      <div
                        className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-muted/80 p-0.5"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={m.label}
                      >
                        <div
                          className={cn(
                            'h-full rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-500',
                            isFull
                              ? 'bg-destructive'
                              : isWarning
                                ? 'bg-tone-amber'
                                : 'bg-primary',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {m.key === 'noroform.submissions_monthly' && ratio >= 0.8 ? (
                        <div className="mt-1 flex items-start gap-1 text-[10px] sm:text-[11px] text-tone-amber dark:text-tone-amber leading-tight">
                          <AlertCircleIcon className="size-3 shrink-0 mt-0.5" />
                          <span>بیشتر از سقف ذخیره ولی قفل است.</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              امکانات مصرفی فعالی در این پلن تعریف نشده است.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


function PlanCard({
  plan,
  current,
  currentRank,
  isHighestTier,
  trial,
  addon,
  vatPercent,
  disabled,
  onBuy,
}: {
  plan: BillingPlan;
  current: boolean;
  currentRank: number | null;
  isHighestTier: boolean;
  /** پلن جاری دوره‌ی رایگان است: خرید همین پلن همان لحظه آن را به اشتراک پولی تبدیل می‌کند، پس «تمدید» نیست. */
  trial: boolean;
  /** tenant اشتراک محصول دیگری دارد ولی این دامنه را ندارد: این خرید افزودنی است، نه جایگزین (§9.11). */
  addon: boolean;
  vatPercent: number;
  disabled: boolean;
  onBuy: (months: number) => void;
}) {
  // کارت پلن‌ها پیش‌فرض روی ۶ ماه باشد
  const defaultMonths = plan.prices.some((p) => p.months === 6)
    ? 6
    : (plan.prices[0]?.months ?? 6);

  const [selectedBaseMonths, setSelectedBaseMonths] = useState<number>(defaultMonths);
  const [annualMultiplier, setAnnualMultiplier] = useState<number>(1);

  const isUpgrade = currentRank !== null && plan.rank > currentRank;
  const action = current
    ? trial
      ? 'خرید اشتراک'
      : 'تمدید اشتراک'
    : isUpgrade
      ? 'ارتقا به این پلن'
      : addon
        ? 'افزودن این محصول'
        : 'خرید اشتراک';

  // محاسبه مدت و قیمت مؤثر (با احتساب ضریب سالانه و درصد تخفیف)
  const isAnnual = selectedBaseMonths === 12;
  const totalMonths = isAnnual ? 12 * annualMultiplier : selectedBaseMonths;
  const base12 = plan.prices.find((p) => p.months === 12);
  const directPrice = plan.prices.find((p) => p.months === selectedBaseMonths);

  let rawPriceRial: number | undefined;
  let discountPercent: number | undefined;

  if (isAnnual && base12) {
    rawPriceRial = base12.priceRial * annualMultiplier;
    discountPercent = base12.discountPercent;
  } else if (directPrice) {
    rawPriceRial = directPrice.priceRial;
    discountPercent = directPrice.discountPercent;
  }

  const hasDiscount = Boolean(discountPercent && discountPercent > 0);
  const finalPriceRial =
    rawPriceRial !== undefined
      ? hasDiscount
        ? Math.round(rawPriceRial * (1 - (discountPercent ?? 0) / 100))
        : rawPriceRial
      : undefined;

  // طبقه‌بندی امکانات بر اساس محصولات فعال (اگر محصول کلاً در پلن وجود ندارد لیست آن نباشد)
  const activeProductModules = PRODUCT_MODULES.filter((mod) =>
    isModuleActiveInPlan(plan.entitlements, mod.key),
  );
  const generalEntitlements = ENTITLEMENT_META.filter(
    (m) => m.module === null && Boolean(plan.entitlements[m.key]),
  );

  const getTierVisual = () => {
    if (plan.rank >= 30 || plan.name.includes('سازمانی')) {
      return {
        icon: CrownIcon,
        color: 'text-tone-amber dark:text-tone-amber',
        bg: 'bg-tone-amber/10 border-tone-amber/20',
      };
    }
    if (plan.rank >= 20 || plan.name.includes('حرفه‌ای')) {
      return {
        icon: SparklesIcon,
        color: 'text-primary',
        bg: 'bg-primary/10 border-primary/20',
      };
    }
    return {
      icon: ZapIcon,
      color: 'text-foreground/80',
      bg: 'bg-muted border-border/60',
    };
  };

  const visual = getTierVisual();
  const Icon = visual.icon;

  return (
    <Card
      className={cn(
        'flex flex-col rounded-2xl border transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 hover:shadow-md',
        current
          ? 'border-tone-emerald/60 dark:border-tone-emerald/40 shadow-xs bg-gradient-to-b from-tone-emerald/100/[0.04] to-card ring-2 ring-success/30'
          : 'border-border/80 hover:border-primary/40 bg-card',
      )}
    >
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
          <div className={cn('flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border', visual.bg)}>
            <Icon className={cn('size-4.5 sm:size-5', visual.color)} />
          </div>
          {current ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-emerald dark:bg-tone-emerald px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-white shadow-xs">
              <CheckCircle2Icon className="size-3 sm:size-3.5" />
              <span>پلن فعال</span>
            </span>
          ) : isHighestTier ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-tone-amber/30 bg-tone-amber/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-tone-amber dark:text-tone-amber">
              <CrownIcon className="size-3 sm:size-3.5" />
              <span>کامل‌ترین امکانات</span>
            </span>
          ) : null}
        </div>
        <div>
          <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{plan.name}</CardTitle>
          <span className="mt-1 inline-flex w-fit items-center rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
            {PLAN_SCOPE_LABEL[plan.scope]}
          </span>
          {plan.description ? (
            <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1 sm:mt-1.5 line-clamp-2 sm:min-h-[32px]">
              {plan.description}
            </CardDescription>
          ) : (
            <div className="sm:min-h-[32px]" />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-4 pt-0 sm:p-6 sm:pt-0 gap-3.5 sm:gap-5">
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/25 p-3 sm:p-3.5">
          {plan.prices.length > 1 ? (
            <Segmented
              value={String(selectedBaseMonths)}
              onChange={(v) => {
                const num = Number(v);
                setSelectedBaseMonths(num);
                if (num !== 12) {
                  setAnnualMultiplier(1);
                }
              }}
              items={plan.prices.map((p) => ({ value: String(p.months), label: monthsLabel(p.months) }))}
              className="w-full mb-1"
            />
          ) : null}

          {/* ضریب قرارداد سالانه تا ۵ سال */}
          {isAnnual ? (
            <div className="flex flex-col gap-1.5 pt-1 pb-1 border-b border-border/40">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>مدت قرارداد سالانه:</span>
                <span className="font-semibold text-foreground font-mono">
                  {fa(annualMultiplier)} سال ({fa(totalMonths)} ماه)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setAnnualMultiplier(y)}
                    className={cn(
                      'flex h-7 sm:h-7.5 items-center justify-center rounded-md text-[11px] sm:text-xs transition-colors',
                      annualMultiplier === y
                        ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {fa(y)} سال
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {rawPriceRial !== undefined && finalPriceRial !== undefined ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {hasDiscount ? (
                    <span className="line-through text-muted-foreground text-xs sm:text-sm font-mono">
                      {formatToman(rawPriceRial)}
                    </span>
                  ) : null}
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground">
                    {formatToman(finalPriceRial)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {monthsLabel(totalMonths)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasDiscount ? (
                    <span className="rounded-md bg-tone-rose/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-destructive dark:text-tone-rose border border-tone-rose/20">
                      {fa(discountPercent!)}٪ تخفیف
                    </span>
                  ) : null}
                  {isAnnual && !hasDiscount ? (
                    <span className="rounded-md bg-tone-emerald/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-success dark:text-success">
                      تخفیف سالانه
                    </span>
                  ) : null}
                </div>
              </div>
              {vatPercent ? (
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">+ {fa(vatPercent)}٪ مالیات بر ارزش افزوده</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* طبقه‌بندی امکانات بر اساس محصولات (نورولینک، نوروفایل، نوروفرم) */}
        <div className="flex flex-1 flex-col gap-2.5 sm:gap-3">
          <span className="text-xs font-semibold text-foreground/80">امکانات به تفکیک محصول:</span>

          <div className="flex flex-col gap-2 sm:gap-2.5">
            {activeProductModules.map((mod) => {
              const modItems = ENTITLEMENT_META.filter((m) => m.module === mod.key);
              return (
                <div
                  key={mod.key}
                  className="flex flex-col gap-1.5 sm:gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 sm:p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border', mod.badgeClass)}>
                      <mod.icon className="size-3" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-foreground">{mod.name}</span>
                  </div>

                  <ul className="flex flex-col gap-1 sm:gap-1.5 ps-1 text-[11px] sm:text-xs">
                    {modItems.map((m) => {
                      const v = plan.entitlements[m.key];
                      const isIncluded = m.kind === 'number' ? Number(v ?? 0) > 0 : Boolean(v);
                      return (
                        <li key={m.key} className="flex items-start gap-1.5 sm:gap-2">
                          {isIncluded ? (
                            <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-tone-emerald/15 text-success dark:text-success mt-0.5">
                              <CheckIcon className="size-2.5 stroke-[2.5]" />
                            </div>
                          ) : (
                            <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/40 mt-0.5">
                              <MinusIcon className="size-2.5 stroke-[2.5]" />
                            </div>
                          )}
                          <span
                            className={cn('leading-tight', isIncluded ? 'text-foreground' : 'text-muted-foreground/50')}
                          >
                            {m.kind === 'number'
                              ? isIncluded
                                ? (
                                  <>
                                    <strong className="font-semibold text-foreground font-mono">{fa(v as number)}</strong>{' '}
                                    {m.unit} — {m.label}
                                  </>
                                )
                                : `بدون ${m.label}`
                              : m.label}
                            {/* در دوره‌ی رایگان این امکان با وجود پلن بسته است (مثلاً ایندکس گوگل)؛ کاربر بداند چرا */}
                            {trial && isIncluded && m.paidOnly ? (
                              <span className="block text-[10px] sm:text-[11px] text-muted-foreground">{m.paidOnly}</span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {generalEntitlements.length > 0 ? (
              <div className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted/20 p-2 sm:p-2.5">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">امکانات پلتفرم:</span>
                <ul className="flex flex-col gap-1 sm:gap-1.5 ps-1 text-[11px] sm:text-xs">
                  {generalEntitlements.map((m) => (
                    <li key={m.key} className="flex items-start gap-1.5 sm:gap-2 text-foreground">
                      <div className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-tone-emerald/15 text-success dark:text-success mt-0.5">
                        <CheckIcon className="size-2.5 stroke-[2.5]" />
                      </div>
                      <span className="leading-tight">{m.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-2">
          <Button
            variant={current ? 'outline' : 'default'}
            className={cn(
              'w-full font-semibold gap-2 h-10 sm:h-11 text-xs sm:text-sm',
              current &&
                'border-tone-emerald/60 dark:border-tone-emerald/60 text-success dark:text-success hover:bg-tone-emerald/10 hover:border-tone-emerald',
              isUpgrade && 'shadow-xs',
            )}
            onClick={() => onBuy(totalMonths)}
            disabled={disabled || rawPriceRial === undefined}
          >
            {current ? (
              <>
                <CalendarIcon className="size-4" />
                {action}
              </>
            ) : isUpgrade ? (
              <>
                <SparklesIcon className="size-4" />
                {action}
              </>
            ) : (
              action
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteDialog({ tenantId, plan, months, onClose }: { tenantId: string; plan: BillingPlan; months: number; onClose: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // کد تخفیف (۱۱.۷) فقط با پیش‌فاکتور تازه از سرور اعمال می‌شود؛ کد نامعتبر برداشته و خطایش کنار فیلد نشان داده می‌شود.
  useEffect(() => {
    let current = true;
    api<Quote>('/billing/quote', { method: 'POST', tenantId, body: { planId: plan.id, months, ...(coupon ? { couponCode: coupon } : {}) } }).then(
      (q) => {
        if (current) setQuote(q);
      },
      (err: unknown) => {
        if (!current) return;
        if (coupon) {
          setCouponError(errorMessage(err));
          setCoupon(null);
        } else setError(errorMessage(err));
      },
    );
    return () => {
      current = false;
    };
  }, [tenantId, plan.id, months, coupon]);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const { redirectUrl } = await api<{ redirectUrl: string }>('/billing/checkout', { method: 'POST', tenantId, body: { planId: plan.id, months, ...(coupon ? { couponCode: coupon } : {}) } });
      window.location.assign(redirectUrl);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogPopup dir="rtl" className="sm:max-w-md">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">
            {plan.name} — {monthsLabel(months)}
          </DialogTitle>
          <DialogDescription>
            {quote
              ? quote.trialCarryDays > 0
                ? `بلافاصله پس از پرداخت فعال می‌شود و ${fa(quote.trialCarryDays)} روز باقی‌مانده‌ی دوره‌ی رایگان به انتهای اشتراک اضافه می‌شود.`
                : quote.kind === 'upgrade'
                ? 'ارتقا همین الان فعال می‌شود و ارزش روزهای باقی‌مانده‌ی پلن فعلی از مبلغ کم می‌شود.'
                : quote.kind === 'addon'
                  ? 'همین حالا و هم‌زمان با اشتراک فعلی فعال می‌شود؛ اشتراک محصول‌های دیگر دست‌نخورده می‌ماند.'
                  : quote.kind === 'queued'
                  ? `از پایان دوره‌ی فعلی (${formatDate(quote.startsAt)}) شروع می‌شود.`
                  : 'بلافاصله پس از پرداخت فعال می‌شود.'
              : 'در حال محاسبه…'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 py-1 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {quote ? (
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="مبلغ پلن" value={formatToman(quote.subtotalRial)} />
              {quote.creditRial ? <Row label="اعتبار روزهای باقی‌مانده" value={`− ${formatToman(quote.creditRial)}`} /> : null}
              {quote.discountRial ? <Row label="تخفیف" value={`− ${formatToman(quote.discountRial)}`} /> : null}
              <Row label={`مالیات (${fa(quote.vatPercent)}٪)`} value={formatToman(quote.vatRial)} />
              <div className="border-t pt-2">
                <Row label="قابل پرداخت" value={formatToman(quote.totalRial)} strong />
              </div>
              <span className="text-xs text-muted-foreground">
                {PAYMENT_KIND_LABEL[quote.kind]} · {formatDate(quote.startsAt)} تا {formatDate(quote.endsAt)}
              </span>
            </dl>
          ) : null}
          {quote ? (
            coupon ? (
              <p className="text-sm">
                کد <span dir="ltr" className="font-medium">{coupon}</span> اعمال شد.{' '}
                <Button variant="link" size="sm" className="px-0" onClick={() => setCoupon(null)}>
                  حذف
                </Button>
              </p>
            ) : (
              <form
                className="flex flex-col gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCouponError(null);
                  if (couponInput.trim()) setCoupon(couponInput.trim().toUpperCase());
                }}
              >
                <div className="flex gap-2">
                  <Input dir="ltr" aria-label="کد تخفیف" placeholder="کد تخفیف" maxLength={40} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                  <Button type="submit" variant="outline" disabled={!couponInput.trim()}>
                    اعمال
                  </Button>
                </div>
                {couponError ? <span className="text-xs text-destructive">{couponError}</span> : null}
              </form>
            )
          ) : !error ? (
            <div className="space-y-2 py-3">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={() => void pay()} loading={busy} disabled={!quote}>
            {quote?.totalRial === 0 ? 'فعال‌سازی' : 'پرداخت'}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}


