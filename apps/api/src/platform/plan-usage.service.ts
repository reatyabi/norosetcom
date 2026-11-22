import { Injectable } from '@nestjs/common';
import type { EntitlementKey, PlanUsageRegistry } from '@noroset/core';

/**
 * پیاده‌سازی Port PLAN_USAGE: محصولات هنگام بالا آمدن ماژول تابع اندازه‌گیری مصرف کلیدهای خودشان را ثبت
 * می‌کنند؛ صفحه‌ی اشتراک مصرف را بدون دسترسی به جدول‌های محصولات می‌خواند (docs/architecture.md §3.5، §9.11).
 */
@Injectable()
export class PlanUsageService implements PlanUsageRegistry {
  private readonly measures = new Map<EntitlementKey, (tenantId: string) => Promise<number>>();

  register(key: EntitlementKey, measure: (tenantId: string) => Promise<number>): void {
    this.measures.set(key, measure);
  }

  async measure(tenantId: string): Promise<Partial<Record<EntitlementKey, number>>> {
    const entries = await Promise.all([...this.measures].map(async ([key, fn]) => [key, await fn(tenantId)] as const));
    return Object.fromEntries(entries);
  }
}
