import { Inject, Injectable } from '@nestjs/common';
import {
  adminAuditLog,
  and,
  count,
  desc,
  eq,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  type PlatformAdminContext,
} from '@noroset/core';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { LIST_LIMIT } from '../access';
import { PageQuery } from '../users/dto';
import type { AuditTargetType } from './audit';

const TARGET_TYPES: AuditTargetType[] = ['user', 'tenant', 'module', 'plan', 'billing'];

export class ListAuditQuery extends PageQuery {
  @IsOptional()
  @IsIn(TARGET_TYPES)
  targetType?: AuditTargetType;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

export interface AuditItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
  actor: { id: string; fullName: string; mobile: string | null };
}

/** خواندن لاگ ممیزی (فقط ادمین؛ policy جدول). */
@Injectable()
export class AdminAuditService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  async list(query: ListAuditQuery): Promise<{ items: AuditItem[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ?? LIST_LIMIT.default;
    const offset = query.offset ?? 0;
    const conditions = [];
    if (query.targetType) conditions.push(eq(adminAuditLog.targetType, query.targetType));
    if (query.targetId) conditions.push(eq(adminAuditLog.targetId, query.targetId));
    if (query.actorId) conditions.push(eq(adminAuditLog.actorUserId, query.actorId));
    const where = conditions.length ? and(...conditions) : undefined;
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select({
          id: adminAuditLog.id,
          action: adminAuditLog.action,
          targetType: adminAuditLog.targetType,
          targetId: adminAuditLog.targetId,
          reason: adminAuditLog.reason,
          details: adminAuditLog.details,
          ip: adminAuditLog.ip,
          createdAt: adminAuditLog.createdAt,
          actorId: platformUsers.id,
          actorName: platformUsers.fullName,
          actorMobile: platformUsers.mobile,
        })
        .from(adminAuditLog)
        .innerJoin(platformUsers, eq(platformUsers.id, adminAuditLog.actorUserId))
        .where(where)
        .orderBy(desc(adminAuditLog.createdAt), desc(adminAuditLog.id))
        .limit(limit)
        .offset(offset);
      const [total] = await tx.select({ n: count() }).from(adminAuditLog).where(where);
      return {
        items: rows.map(({ actorId, actorName, actorMobile, details, ...r }) => ({
          ...r,
          details: details as Record<string, unknown>,
          actor: { id: actorId, fullName: actorName, mobile: actorMobile },
        })),
        total: Number(total?.n ?? 0),
        limit,
        offset,
      };
    });
  }
}
