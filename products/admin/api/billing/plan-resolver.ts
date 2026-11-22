import { Injectable } from '@nestjs/common';
import { and, billingPayments, eq, sql, withTenant, type PlanResolver, type ResolvedPlan } from '@noroset/core';
import { resolvePlan, startTrial } from './billing.core';

/**
 * پیاده‌سازی Port PLAN_RESOLVER (docs/architecture.md §9.11): محصولات سقف‌های مؤثر tenant را از اینجا
 * می‌خوانند و ماژول admin را نمی‌شناسند. هر بار از DB (اشتراک‌ها کوچک‌اند؛ ارتقا باید فوراً اثر کند).
 */
@Injectable()
export class BillingPlanResolver implements PlanResolver {
  resolve(tenantId: string): Promise<ResolvedPlan> {
    return withTenant(tenantId, (tx) => resolvePlan(tx, tenantId, new Date()));
  }

  async startTrial(tenantId: string, userId: string): Promise<boolean> {
    try {
      await withTenant(tenantId, (tx) => startTrial(tx, tenantId, userId, new Date()));
      return true;
    } catch {
      return false;
    }
  }

  async paidRial(tenantId: string): Promise<number> {
    const [row] = await withTenant(tenantId, (tx) =>
      tx
        .select({ total: sql<string>`COALESCE(SUM(${billingPayments.totalRial}), 0)` })
        .from(billingPayments)
        .where(and(eq(billingPayments.tenantId, tenantId), eq(billingPayments.status, 'paid'))),
    );
    return Number(row?.total ?? 0);
  }
}
