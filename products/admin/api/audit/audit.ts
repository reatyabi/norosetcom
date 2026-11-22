import { adminAuditLog, type Db, type PlatformAdminContext } from '@noroset/core';

export type AuditTargetType = 'user' | 'tenant' | 'module' | 'plan' | 'billing';

export interface AuditEntry {
  /** کد ماشینی کار، مثل `user.status`. */
  action: string;
  targetType: AuditTargetType;
  /** null برای هدف بدون uuid (مثلاً ماژول؛ کلید در details). */
  targetId: string | null;
  reason?: string | null;
  details?: Record<string, unknown>;
}

/**
 * ثبت لاگ ممیزی در همان تراکنش کار (docs/architecture.md §9.11)؛ اگر لاگ نوشته نشود کار هم rollback
 * می‌شود. policy جدول فقط actor = ادمین جاری را می‌پذیرد.
 */
export async function recordAudit(tx: Db, ctx: PlatformAdminContext, entry: AuditEntry): Promise<void> {
  await tx.insert(adminAuditLog).values({
    actorUserId: ctx.adminId(),
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    reason: entry.reason ?? null,
    details: entry.details ?? {},
    ip: ctx.ip(),
  });
}
