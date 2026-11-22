import { BadGatewayException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import {
  billingPayments,
  db,
  desc,
  eq,
  findPaymentByAuthority,
  PAYMENT_GATEWAY,
  PLAN_USAGE,
  platformUsers,
  TENANT_CONTEXT,
  withTenant,
  type PaymentGateway,
  type PlanUsageRegistry,
  type TenantContext,
} from '@noroset/core';
import { planView } from './admin-billing.service';
import { activatePayment, cancelQueuedSubscription, loadPlans, paymentsQuery, quote, resolvePlan, tenantState, vatPercent } from './billing.core';
import { billingUrls } from './gateways';

export class QuoteDto {
  @IsUUID()
  planId!: string;

  @IsInt()
  @Min(1)
  @Max(60)
  months!: number;

  /** کد تخفیف اختیاری (۱۱.۷). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

/**
 * اشتراک از سمت کاربر (docs/architecture.md §9.11): وضعیت و مصرف، قیمت، خرید آنلاین و رسید.
 * خرید و رسید فقط owner و admin فضای کاری (گارد controller).
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly urls = billingUrls();

  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PLAN_USAGE) private readonly usage: PlanUsageRegistry,
  ) {}

  /** صفحه‌ی اشتراک: پلن مؤثر، مصرف، پلن‌های قابل خرید (فعال) و خرید زمان‌بندی‌شده. */
  async overview() {
    const tenantId = this.ctx.tenantId();
    const now = new Date();
    const data = await this.ctx.run(async (tx) => {
      const state = await tenantState(tx, tenantId, now);
      return {
        plan: await resolvePlan(tx, tenantId, now),
        // پلن‌های قابل خرید + پلن‌هایی که همین حالا اشتراک دارند (هر محصول جدا).
        plans: (await loadPlans(tx)).filter((p) => p.active || state.currents.some((entry) => entry.plan.id === p.id)).map(planView),
        vatPercent: await vatPercent(tx),
        queued: state.queued.map((q) => ({
          id: q.sub.id,
          planId: q.plan.id,
          planName: q.plan.name,
          scope: q.plan.scope,
          startsAt: q.sub.startsAt,
          endsAt: q.sub.endsAt,
          paid: q.sub.source === 'payment',
        })),
      };
    });
    return { ...data, usage: await this.usage.measure(tenantId), canManage: this.canManage() };
  }

  /** لغو رزرو اشتراک آتی (فقط owner یا admin). */
  /** فقط پلن‌های فعال و همان چیزی که صفحه‌ی عمومی لازم دارد (بدون سقف‌ها). خواندن پلن‌ها برای همه آزاد است (RLS). */
  async publicPlans(): Promise<{
    vatPercent: number;
    plans: { code: string; name: string; scope: string; rank: number; prices: { months: number; priceRial: number }[] }[];
  }> {
    return db.transaction(async (tx) => {
      const plans = (await loadPlans(tx)).filter((p) => p.active);
      return {
        vatPercent: await vatPercent(tx),
        plans: plans.map((p) => ({
          code: p.code,
          name: p.name,
          scope: p.scope,
          rank: p.rank,
          prices: (p.prices as { months: number; priceRial: number }[]).map(({ months, priceRial }) => ({ months, priceRial })),
        })),
      };
    });
  }

  cancelQueued(subId: string) {
    const tenantId = this.ctx.tenantId();
    return this.ctx.run((tx) => cancelQueuedSubscription(tx, tenantId, subId, new Date()));
  }

  /** وضعیت سبک برای نوار هشدار پنل (مهلت پس از پایان اشتراک). */
  status() {
    const tenantId = this.ctx.tenantId();
    return this.ctx.run((tx) => resolvePlan(tx, tenantId, new Date()));
  }

  quote(dto: QuoteDto) {
    const tenantId = this.ctx.tenantId();
    return this.ctx.run((tx) => quote(tx, tenantId, dto.planId, dto.months, new Date(), { couponCode: dto.couponCode }));
  }

  /**
   * ثبت پرداخت pending و گرفتن آدرس درگاه. مبلغ صفر (اعتبار کامل) همان لحظه فعال می‌شود. درگاه بیرون از
   * تراکنش صدا زده می‌شود؛ شکست آن پرداخت را failed می‌کند (۵۰۲ `gateway_unavailable`).
   */
  async checkout(dto: QuoteDto): Promise<{ paymentId: string; redirectUrl: string }> {
    const tenantId = this.ctx.tenantId();
    const userId = this.ctx.userId();
    const payment = await this.ctx.run(async (tx) => {
      const now = new Date();
      const q = await quote(tx, tenantId, dto.planId, dto.months, now, { couponCode: dto.couponCode });
      const free = q.totalRial === 0;
      const [row] = await tx
        .insert(billingPayments)
        .values({
          tenantId,
          planId: q.planId,
          months: q.months,
          kind: q.kind,
          subtotalRial: q.subtotalRial,
          creditRial: q.creditRial,
          discountRial: q.discountRial,
          couponId: q.couponId,
          vatPercent: q.vatPercent,
          vatRial: q.vatRial,
          totalRial: q.totalRial,
          gateway: this.gateway.name,
          createdBy: userId,
          ...(free ? { status: 'paid' as const, paidAt: now, refId: 'CREDIT' } : {}),
        })
        .returning();
      if (free) await activatePayment(tx, row!, now, userId);
      return row!;
    });
    if (payment.status === 'paid') return { paymentId: payment.id, redirectUrl: this.urls.result(payment.id, 'ok') };

    try {
      const [user] = await db.select({ mobile: platformUsers.mobile }).from(platformUsers).where(eq(platformUsers.id, userId)).limit(1);
      const started = await this.gateway.request({
        amountRial: payment.totalRial,
        description: `اشتراک نوروست — رسید ${payment.number}`,
        callbackUrl: this.urls.callback,
        mobile: user?.mobile ?? null,
      });
      await this.ctx.run((tx) => tx.update(billingPayments).set({ authority: started.authority }).where(eq(billingPayments.id, payment.id)));
      return { paymentId: payment.id, redirectUrl: started.redirectUrl };
    } catch (err) {
      this.logger.warn(`payment gateway request failed: ${(err as Error).message}`);
      await this.ctx.run((tx) => tx.update(billingPayments).set({ status: 'failed', closedAt: new Date() }).where(eq(billingPayments.id, payment.id)));
      throw new BadGatewayException('gateway_unavailable');
    }
  }

  payments() {
    return this.ctx.run((tx) => paymentsQuery(tx).orderBy(desc(billingPayments.createdAt)).limit(100));
  }

  /** رسید یک پرداخت همین tenant (RLS). */
  async receipt(id: string) {
    const [row] = await this.ctx.run((tx) => paymentsQuery(tx).where(eq(billingPayments.id, id)).limit(1));
    if (!row) throw new NotFoundException('not_found');
    return row;
  }

  /**
   * بازگشت مرورگر از درگاه (بدون نشست). تأیید فقط سمت سرور و با مبلغ ثبت‌شده؛ تکرار بازگشت بی‌اثر است.
   * درگاه بیرون از قفل ردیف صدا زده می‌شود و وضعیت دوباره زیر قفل بررسی می‌شود. خروجی: آدرس صفحه‌ی نتیجه.
   */
  async callback(authority: string | undefined, status: string | undefined): Promise<string> {
    const found = authority ? await findPaymentByAuthority(authority) : null;
    if (!found) return this.urls.result(null, 'failed');
    const { id, tenantId } = found;
    const [payment] = await withTenant(tenantId, (tx) => tx.select().from(billingPayments).where(eq(billingPayments.id, id)).limit(1));
    if (!payment) return this.urls.result(null, 'failed');
    if (payment.status === 'paid') return this.urls.result(id, 'ok');
    if (payment.status !== 'pending') return this.urls.result(id, 'failed');

    const verified =
      status === 'OK' ? await this.gateway.verify({ authority: authority!, amountRial: payment.totalRial }).catch(() => null) : null;
    const ok = await withTenant(tenantId, async (tx) => {
      const [locked] = await tx.select().from(billingPayments).where(eq(billingPayments.id, id)).limit(1).for('update');
      if (!locked || locked.status !== 'pending') return locked?.status === 'paid';
      const now = new Date();
      if (!verified?.ok) {
        await tx.update(billingPayments).set({ status: 'failed', closedAt: now }).where(eq(billingPayments.id, id));
        return false;
      }
      await tx.update(billingPayments).set({ status: 'paid', paidAt: now, refId: verified.refId, cardPan: verified.cardPan }).where(eq(billingPayments.id, id));
      await activatePayment(tx, { ...locked, status: 'paid', paidAt: now }, now, locked.createdBy);
      return true;
    });
    return this.urls.result(id, ok ? 'ok' : 'failed');
  }

  private canManage(): boolean {
    const role = this.ctx.role();
    return role === 'owner' || role === 'admin';
  }
}
