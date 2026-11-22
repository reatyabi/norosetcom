import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import {
  and,
  billingPayments,
  billingPlans,
  billingSettings,
  billingSubscriptions,
  count,
  desc,
  entitlementIssues,
  eq,
  inferPlanScope,
  isNull,
  PLAN_SCOPES,
  PLAN_USAGE,
  PLATFORM_ADMIN_CONTEXT,
  resolveEntitlements,
  sql,
  tenants,
  type Db,
  type PlanScope,
  type PlanUsageRegistry,
  type PlanPrice,
  type PlatformAdminContext,
} from '@noroset/core';
import { LIST_LIMIT, pgCode } from '../access';
import { recordAudit } from '../audit/audit';
import { PageQuery } from '../users/dto';
import { normalizeName } from '../users/users.service';
import { activatePayment, DAY_MS, loadPlans, paymentsQuery, quote, resolvePlan, tenantHistory, trialSettings, vatPercent, type PlanRow } from './billing.core';

export const MAX_PRICE_RIAL = 1_000_000_000_000;

export class PlanPriceDto {
  @IsInt()
  @Min(1)
  @Max(60)
  months!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_RIAL)
  priceRial!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;
}

export class UpsertPlanDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,31}$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  rank?: number;

  /** محصول پلن؛ ارتقا/تمدید فقط داخل همین دامنه معنا دارد (§9.11). */
  @IsOptional()
  @IsIn([...PLAN_SCOPES])
  scope?: PlanScope;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  entitlements?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  prices?: PlanPriceDto[];
}

/** تنظیمات اشتراک؛ هر فیلد اختیاری و فقط فیلدهای فرستاده‌شده عوض می‌شوند. */
export class BillingSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  /** پلن دوره‌ی رایگان کاربر تازه؛ null ← پلن پایه. */
  @IsOptional()
  @IsUUID()
  trialPlanId?: string | null;

  /** طول دوره‌ی رایگان (روز)؛ ۰ ← خاموش. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  trialDays?: number;
}

export class GrantSubscriptionDto {
  @IsUUID()
  planId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class OfflinePaymentDto {
  @IsUUID()
  planId!: string;

  @IsInt()
  @Min(1)
  @Max(36)
  months!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_RIAL)
  totalRial!: number;

  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class CancelSubscriptionDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ListPaymentsQuery extends PageQuery {
  @IsOptional()
  @IsIn(['pending', 'paid', 'failed', 'canceled'])
  status?: 'pending' | 'paid' | 'failed' | 'canceled';
}

/** دوره‌های قیمت: ماه ۱ تا ۳۶، یکتا، حداکثر ۶ دوره (به ترتیب ماه). */
function normalizePrices(prices: PlanPriceDto[] | undefined): PlanPrice[] | undefined {
  if (prices === undefined) return undefined;
  if (prices.length > 6) throw new UnprocessableEntityException('invalid_prices');
  const out: PlanPrice[] = [];
  for (const p of prices) {
    const months = Number(p?.months);
    const priceRial = Number(p?.priceRial);
    if (!Number.isInteger(months) || months < 1 || months > 60 || !Number.isInteger(priceRial) || priceRial < 0 || priceRial > MAX_PRICE_RIAL) {
      throw new UnprocessableEntityException('invalid_prices');
    }
    const discountPercent = p?.discountPercent !== undefined && p.discountPercent !== null ? Number(p.discountPercent) : undefined;
    if (discountPercent !== undefined && (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100)) {
      throw new UnprocessableEntityException('invalid_prices');
    }
    if (out.some((o) => o.months === months)) throw new UnprocessableEntityException('invalid_prices');
    out.push({
      months,
      priceRial,
      ...(discountPercent && discountPercent > 0 ? { discountPercent } : {}),
    });
  }
  return out.sort((a, b) => a.months - b.months);
}

export function planView(plan: PlanRow) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    rank: plan.rank,
    scope: plan.scope,
    active: plan.active,
    entitlements: resolveEntitlements(plan.entitlements),
    prices: plan.prices,
    updatedAt: plan.updatedAt,
  };
}

/**
 * billing از سمت ادمین (docs/architecture.md §9.11): پلن‌ها، مالیات، اشتراک دستی، پرداخت آفلاین و فهرست
 * پرداخت‌ها. همه با لاگ ممیزی در همان تراکنش.
 */
@Injectable()
export class AdminBillingService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(PLAN_USAGE) private readonly usage: PlanUsageRegistry,
  ) {}

  async overview() {
    return this.ctx.run(async (tx) => {
      const trial = await trialSettings(tx);
      return {
        plans: (await loadPlans(tx)).map(planView),
        vatPercent: await vatPercent(tx),
        trial: { planId: trial.plan.id, days: trial.days },
      };
    });
  }

  async createPlan(dto: UpsertPlanDto) {
    if (!dto.code || !dto.name || dto.rank === undefined) throw new UnprocessableEntityException('invalid_plan');
    const values = this.planValues(dto);
    try {
      return await this.ctx.run(async (tx) => {
        const [plan] = await tx
          .insert(billingPlans)
          .values({
            code: dto.code!,
            name: values.name!,
            rank: dto.rank!,
            description: values.description ?? '',
            scope: values.scope ?? inferPlanScope(values.entitlements ?? {}),
            active: dto.active ?? false,
            entitlements: values.entitlements ?? {},
            prices: values.prices ?? [],
          })
          .returning();
        await recordAudit(tx, this.ctx, { action: 'billing.plan_create', targetType: 'plan', targetId: plan!.id, details: { code: plan!.code } });
        return planView(plan!);
      });
    } catch (err) {
      if (pgCode(err) === '23505') throw new ConflictException('plan_code_taken');
      throw err;
    }
  }

  async updatePlan(id: string, dto: UpsertPlanDto) {
    const values = this.planValues(dto);
    return this.ctx.run(async (tx) => {
      const [before] = await tx.select().from(billingPlans).where(eq(billingPlans.id, id)).limit(1).for('update');
      if (!before) throw new NotFoundException('not_found');
      if (dto.code && dto.code !== before.code) throw new ConflictException('plan_code_immutable');
      const [plan] = await tx
        .update(billingPlans)
        .set({ ...values, ...(dto.rank !== undefined ? { rank: dto.rank } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}), updatedAt: new Date() })
        .where(eq(billingPlans.id, id))
        .returning();
      await recordAudit(tx, this.ctx, {
        action: 'billing.plan_update',
        targetType: 'plan',
        targetId: id,
        details: { code: before.code, fields: Object.keys(dto).filter((k) => k !== 'code') },
      });
      return planView(plan!);
    });
  }

  /** مالیات و دوره‌ی رایگان (پلن و روز). دوره‌ی رایگان فقط برای کاربرهای تازه اثر دارد؛ دوره‌های در جریان دست نمی‌خورند. */
  async updateSettings(dto: BillingSettingsDto) {
    const adminId = this.ctx.adminId();
    return this.ctx.run(async (tx) => {
      const before = { vatPercent: await vatPercent(tx), ...(await trialSettings(tx).then((t) => ({ trialPlanId: t.plan.id, trialDays: t.days }))) };
      if (dto.trialPlanId) {
        const [plan] = await tx.select({ id: billingPlans.id }).from(billingPlans).where(eq(billingPlans.id, dto.trialPlanId)).limit(1);
        if (!plan) throw new NotFoundException('plan_not_found');
      }
      const set = {
        ...(dto.vatPercent !== undefined ? { vatPercent: dto.vatPercent } : {}),
        ...(dto.trialPlanId !== undefined ? { trialPlanId: dto.trialPlanId } : {}),
        ...(dto.trialDays !== undefined ? { trialDays: dto.trialDays } : {}),
      };
      await tx
        .insert(billingSettings)
        .values({ id: 1, ...set, updatedBy: adminId })
        .onConflictDoUpdate({ target: billingSettings.id, set: { ...set, updatedBy: adminId, updatedAt: sql`now()` } });
      const after = { vatPercent: await vatPercent(tx), ...(await trialSettings(tx).then((t) => ({ trialPlanId: t.plan.id, trialDays: t.days }))) };
      await recordAudit(tx, this.ctx, { action: 'billing.settings', targetType: 'billing', targetId: null, details: { from: before, to: after, fields: Object.keys(set) } });
      return after;
    });
  }

  /** وضعیت اشتراک یک tenant برای صفحه‌ی ادمین. */
  async tenantBilling(tenantId: string) {
    const data = await this.ctx.run(async (tx) => {
      const [tenant] = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) throw new NotFoundException('not_found');
      return { plan: await resolvePlan(tx, tenantId, new Date()), ...(await tenantHistory(tx, tenantId)) };
    });
    return { ...data, usage: await this.usage.measure(tenantId) };
  }

  /** اشتراک دستی (هدیه، پشتیبانی، قرارداد): از الان؛ در همان دامنه‌ی پلن کنار بقیه می‌نشیند و سقف‌ها جمع می‌شوند. */
  async grant(tenantId: string, dto: GrantSubscriptionDto) {
    const note = normalizeName(dto.note);
    if (!note) throw new UnprocessableEntityException('reason_required');
    const adminId = this.ctx.adminId();
    return this.ctx.run(async (tx) => {
      const [plan] = await tx.select().from(billingPlans).where(eq(billingPlans.id, dto.planId)).limit(1);
      if (!plan) throw new NotFoundException('plan_not_found');
      const now = new Date();
      const [sub] = await tx
        .insert(billingSubscriptions)
        .values({ tenantId, planId: plan.id, source: 'manual', startsAt: now, endsAt: new Date(now.getTime() + dto.days * DAY_MS), note, createdBy: adminId })
        .returning();
      await recordAudit(tx, this.ctx, { action: 'billing.grant', targetType: 'tenant', targetId: tenantId, reason: note, details: { plan: plan.code, days: dto.days, subscriptionId: sub!.id } });
      return sub!;
    });
  }

  async cancelSubscription(subscriptionId: string, rawReason: string | undefined) {
    const reason = normalizeName(rawReason ?? '');
    if (!reason) throw new UnprocessableEntityException('reason_required');
    return this.ctx.run(async (tx) => {
      const [sub] = await tx
        .update(billingSubscriptions)
        .set({ canceledAt: new Date() })
        .where(and(eq(billingSubscriptions.id, subscriptionId), isNull(billingSubscriptions.canceledAt)))
        .returning();
      if (!sub) throw new NotFoundException('not_found');
      await recordAudit(tx, this.ctx, { action: 'billing.cancel', targetType: 'tenant', targetId: sub.tenantId, reason, details: { subscriptionId } });
      return sub;
    });
  }

  /** پرداخت خارج از درگاه (کارت‌به‌کارت، فاکتور): پرداخت paid با درگاه manual و فعال‌سازی همان لحظه. */
  async recordOfflinePayment(tenantId: string, dto: OfflinePaymentDto) {
    const note = normalizeName(dto.note);
    if (!note) throw new UnprocessableEntityException('reason_required');
    const adminId = this.ctx.adminId();
    return this.ctx.run(async (tx) => {
      const now = new Date();
      const q = await quote(tx, tenantId, dto.planId, dto.months, now, { priceOverride: dto.totalRial, allowInactive: true });
      const [payment] = await tx
        .insert(billingPayments)
        .values({
          tenantId,
          planId: q.planId,
          months: q.months,
          kind: q.kind,
          // مبلغ آفلاین همان مبلغ دریافتی است؛ اعتبار ارتقا در آن لحاظ نمی‌شود.
          subtotalRial: dto.totalRial,
          creditRial: 0,
          discountRial: 0,
          vatPercent: 0,
          vatRial: 0,
          totalRial: dto.totalRial,
          status: 'paid',
          gateway: 'manual',
          note,
          createdBy: adminId,
          paidAt: now,
        })
        .returning();
      const sub = await activatePayment(tx, payment!, now, adminId);
      await recordAudit(tx, this.ctx, {
        action: 'billing.offline_payment',
        targetType: 'tenant',
        targetId: tenantId,
        reason: note,
        details: { paymentId: payment!.id, months: dto.months, totalRial: dto.totalRial },
      });
      return { payment: payment!, subscription: sub };
    });
  }

  async listPayments(query: ListPaymentsQuery) {
    const limit = query.limit ?? LIST_LIMIT.default;
    const offset = query.offset ?? 0;
    const where = query.status ? eq(billingPayments.status, query.status) : undefined;
    return this.ctx.run(async (tx: Db) => {
      const rows = await paymentsQuery(tx)
        .where(where)
        .orderBy(desc(billingPayments.createdAt))
        .limit(limit)
        .offset(offset);
      const [total] = await tx.select({ n: count() }).from(billingPayments).where(where);
      return { items: rows, total: Number(total?.n ?? 0), limit, offset };
    });
  }

  private planValues(dto: UpsertPlanDto) {
    if (dto.entitlements !== undefined && entitlementIssues(dto.entitlements).length) throw new UnprocessableEntityException('invalid_entitlements');
    const name = dto.name !== undefined ? normalizeName(dto.name) : undefined;
    if (name !== undefined && (name.length < 1 || name.length > 100)) throw new UnprocessableEntityException('invalid_plan');
    const description = dto.description !== undefined ? normalizeName(dto.description) : undefined;
    if (description !== undefined && description.length > 500) throw new UnprocessableEntityException('invalid_plan');
    return {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
      ...(dto.entitlements !== undefined ? { entitlements: dto.entitlements } : {}),
      ...(dto.prices !== undefined ? { prices: normalizePrices(dto.prices)! } : {}),
    };
  }
}
