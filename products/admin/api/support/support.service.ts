import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  and,
  desc,
  eq,
  generateRefreshToken,
  hashToken,
  isNull,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  supportAccessGrants,
  supportGrantStatus,
  type Db,
  type PlatformAdminContext,
  type SupportGrantStatus,
} from '@noroset/core';
import { recordAudit } from '../audit/audit';
import { requireReason } from '../users/users.service';

/** سقف مدت دسترسی پشتیبانی (docs/architecture.md §9.11). */
export const SUPPORT_MAX_MINUTES = 60;
export const SUPPORT_MIN_MINUTES = 5;

export class CreateSupportGrantDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @Type(() => Number)
  @IsInt()
  @Min(SUPPORT_MIN_MINUTES)
  @Max(SUPPORT_MAX_MINUTES)
  minutes!: number;
}

export interface AdminSupportGrant {
  id: string;
  userId: string;
  reason: string;
  status: SupportGrantStatus;
  minutes: number;
  createdAt: Date;
  expiresAt: Date;
  redeemedAt: Date | null;
  endedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  admin: { id: string; fullName: string; mobile: string | null };
}

/**
 * دسترسی پشتیبانی از سمت ادمین: ساخت لینک یک‌بارمصرف با دلیل و مدت، فهرست و ابطال. لینک فقط با
 * نشست همان ادمین صادرکننده مصرف می‌شود (apps/api، `/auth/support/redeem`) و توکن فقط یک‌بار
 * (در پاسخ همین ساخت) دیده می‌شود؛ DB فقط hash دارد.
 */
@Injectable()
export class AdminSupportService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  async create(userId: string, dto: CreateSupportGrantDto): Promise<{ grant: AdminSupportGrant; token: string }> {
    const reason = requireReason(dto.reason);
    const adminId = this.ctx.adminId();
    if (userId === adminId) throw new ConflictException('cannot_modify_self');
    const token = generateRefreshToken();

    return this.ctx.run(async (tx) => {
      const [user] = await tx.select().from(platformUsers).where(eq(platformUsers.id, userId)).limit(1);
      if (!user) throw new NotFoundException('not_found');
      // ورود به حساب ادمین دیگر یعنی گرفتن اختیارات او؛ مجاز نیست.
      if (user.platformRole !== 'user') throw new ConflictException('cannot_impersonate_admin');
      if (user.status !== 'active') throw new ConflictException('user_inactive');

      const now = new Date();
      const [row] = await tx
        .insert(supportAccessGrants)
        .values({
          userId,
          adminUserId: adminId,
          reason,
          tokenHash: hashToken(token),
          expiresAt: new Date(now.getTime() + dto.minutes * 60_000),
        })
        .returning({ id: supportAccessGrants.id });
      await recordAudit(tx, this.ctx, {
        action: 'support.grant',
        targetType: 'user',
        targetId: userId,
        reason,
        details: { grantId: row!.id, minutes: dto.minutes },
      });
      const [grant] = await this.query(tx, eq(supportAccessGrants.id, row!.id));
      return { grant: grant!, token };
    });
  }

  listForUser(userId: string): Promise<AdminSupportGrant[]> {
    return this.ctx.run((tx) => this.query(tx, eq(supportAccessGrants.userId, userId), 50));
  }

  /** ابطال دسترسی فعال یا مصرف‌نشده؛ نشست پشتیبانی جاری در درخواست بعدی رد می‌شود. */
  async revoke(grantId: string): Promise<AdminSupportGrant> {
    return this.ctx.run(async (tx) => {
      const [grant] = await this.query(tx, eq(supportAccessGrants.id, grantId));
      if (!grant) throw new NotFoundException('not_found');
      if (grant.status !== 'active' && grant.status !== 'pending') throw new ConflictException('support_grant_closed');
      await tx
        .update(supportAccessGrants)
        .set({ revokedAt: new Date(), revokedBy: 'admin' })
        .where(and(eq(supportAccessGrants.id, grantId), isNull(supportAccessGrants.revokedAt)));
      await recordAudit(tx, this.ctx, { action: 'support.revoke', targetType: 'user', targetId: grant.userId, details: { grantId } });
      const [next] = await this.query(tx, eq(supportAccessGrants.id, grantId));
      return next!;
    });
  }

  private async query(tx: Db, where: ReturnType<typeof eq>, limit = 1) {
    const rows = await tx
      .select({
        id: supportAccessGrants.id,
        userId: supportAccessGrants.userId,
        reason: supportAccessGrants.reason,
        createdAt: supportAccessGrants.createdAt,
        expiresAt: supportAccessGrants.expiresAt,
        redeemedAt: supportAccessGrants.redeemedAt,
        endedAt: supportAccessGrants.endedAt,
        revokedAt: supportAccessGrants.revokedAt,
        revokedBy: supportAccessGrants.revokedBy,
        adminId: platformUsers.id,
        adminName: platformUsers.fullName,
        adminMobile: platformUsers.mobile,
      })
      .from(supportAccessGrants)
      .innerJoin(platformUsers, eq(platformUsers.id, supportAccessGrants.adminUserId))
      .where(where)
      .orderBy(desc(supportAccessGrants.createdAt))
      .limit(limit);
    const now = new Date();
    return rows.map(({ adminId, adminName, adminMobile, ...g }): AdminSupportGrant => ({
      ...g,
      status: supportGrantStatus(g, now),
      minutes: Math.round((g.expiresAt.getTime() - g.createdAt.getTime()) / 60_000),
      admin: { id: adminId, fullName: adminName, mobile: adminMobile },
    }));
  }
}
