import { ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  adminAuditLog,
  and,
  db,
  eq,
  findSupportGrant,
  hashToken,
  isNull,
  isSupportGrantLive,
  platformUsers,
  supportAccessGrants,
  supportGrantStatus,
  withPlatformAdmin,
  type Db,
} from '@noroset/core';

// نشست پشتیبانی (ورود ادمین به حساب کاربر؛ docs/architecture.md §9.11). کوکی جدای support_token یک JWT
// با `sub` = کاربر، `act` = ادمین و `sg` = دسترسی است و کنار نشست خود ادمین زندگی می‌کند: هر درخواست
// هم نشست معتبر همان ادمین را می‌خواهد و هم دسترسی زنده در DB (ابطال/پایان همان لحظه اثر دارد).

export interface SupportClaims {
  sub: string;
  act: string;
  sg: string;
  typ: 'support';
}

export interface SupportSession {
  userId: string;
  adminId: string;
  grantId: string;
  expiresAt: Date;
}

/** پایان نشست پشتیبانی؛ وب با این پیام کوکی را پاک و به پنل ادمین برمی‌گردد. */
export const SUPPORT_ENDED = 'support_session_ended';

async function audit(tx: Db, adminId: string, action: string, userId: string, details: Record<string, unknown>, ip: string | null) {
  await tx.insert(adminAuditLog).values({ actorUserId: adminId, action, targetType: 'user', targetId: userId, details, ip });
}

@Injectable()
export class SupportSessionService {
  constructor(private readonly jwt: JwtService) {}

  /**
   * مصرف لینک یک‌بارمصرف: فقط ادمین صادرکننده (با نشست خودش)، پیش از انقضا و فقط یک‌بار.
   * خروجی JWT نشست پشتیبانی تا پایان همان دسترسی.
   */
  async redeem(adminId: string, token: string, ip: string | null): Promise<SupportSession & { token: string }> {
    const now = new Date();
    return withPlatformAdmin(adminId, async (tx) => {
      const [grant] = await tx
        .select()
        .from(supportAccessGrants)
        .where(eq(supportAccessGrants.tokenHash, hashToken(token)))
        .limit(1)
        .for('update');
      if (!grant) throw new NotFoundException('support_link_invalid');
      if (grant.adminUserId !== adminId) throw new ForbiddenException('support_link_not_yours');
      const status = supportGrantStatus(grant, now);
      if (status === 'expired') throw new GoneException('support_link_expired');
      if (status !== 'pending') throw new GoneException('support_link_used');

      const [user] = await tx.select().from(platformUsers).where(eq(platformUsers.id, grant.userId)).limit(1);
      if (!user || user.status !== 'active' || user.platformRole !== 'user') throw new ConflictException('user_inactive');

      await tx.update(supportAccessGrants).set({ redeemedAt: now }).where(eq(supportAccessGrants.id, grant.id));
      await audit(tx, adminId, 'support.redeem', grant.userId, { grantId: grant.id }, ip);

      const claims: SupportClaims = { sub: grant.userId, act: adminId, sg: grant.id, typ: 'support' };
      const seconds = Math.max(1, Math.floor((grant.expiresAt.getTime() - now.getTime()) / 1000));
      const signed = await this.jwt.signAsync(claims, { expiresIn: seconds });
      return { token: signed, userId: grant.userId, adminId, grantId: grant.id, expiresAt: grant.expiresAt };
    });
  }

  /**
   * نشست پشتیبانی همین درخواست، یا خطا: نشست ادمین نامعتبر ← ۴۰۱ ساده (وب refresh می‌کند)؛
   * دسترسی پایان‌یافته/باطل/منقضی یا ادمین/کاربرِ دیگر غیرفعال ← ۴۰۱ `support_session_ended`.
   */
  async resolve(supportToken: string, accessToken: string | undefined): Promise<SupportSession> {
    let claims: SupportClaims;
    try {
      claims = await this.jwt.verifyAsync<SupportClaims>(supportToken);
    } catch {
      throw new UnauthorizedException(SUPPORT_ENDED);
    }
    if (claims.typ !== 'support') throw new UnauthorizedException(SUPPORT_ENDED);

    if (!accessToken) throw new UnauthorizedException();
    let adminSub: string;
    try {
      const access = await this.jwt.verifyAsync<{ sub: string; typ?: string }>(accessToken);
      if (access.typ) throw new Error('not an access token');
      adminSub = access.sub;
    } catch {
      throw new UnauthorizedException();
    }
    if (adminSub !== claims.act) throw new UnauthorizedException(SUPPORT_ENDED);

    const grant = await findSupportGrant(claims.sg);
    if (!grant || grant.userId !== claims.sub || grant.adminUserId !== claims.act || !isSupportGrantLive(grant, new Date())) {
      throw new UnauthorizedException(SUPPORT_ENDED);
    }
    const [admin] = await db
      .select({ status: platformUsers.status, platformRole: platformUsers.platformRole })
      .from(platformUsers)
      .where(eq(platformUsers.id, claims.act))
      .limit(1);
    if (admin?.status !== 'active' || admin.platformRole !== 'superadmin') throw new UnauthorizedException(SUPPORT_ENDED);
    return { userId: claims.sub, adminId: claims.act, grantId: claims.sg, expiresAt: grant.expiresAt };
  }

  /** پایان نشست (حتی با توکن منقضی؛ امضا بررسی می‌شود). خروجی: کاربری که ادمین داخلش بود. */
  async end(supportToken: string | undefined, ip: string | null): Promise<{ userId: string } | null> {
    if (!supportToken) return null;
    let claims: SupportClaims;
    try {
      claims = await this.jwt.verifyAsync<SupportClaims>(supportToken, { ignoreExpiration: true });
    } catch {
      return null;
    }
    if (claims.typ !== 'support') return null;
    try {
      await withPlatformAdmin(claims.act, async (tx) => {
        const ended = await tx
          .update(supportAccessGrants)
          .set({ endedAt: new Date() })
          .where(and(eq(supportAccessGrants.id, claims.sg), isNull(supportAccessGrants.endedAt), isNull(supportAccessGrants.revokedAt)))
          .returning({ id: supportAccessGrants.id });
        if (ended.length) await audit(tx, claims.act, 'support.end', claims.sub, { grantId: claims.sg }, ip);
      });
    } catch {
      // ادمین دیگر superadmin نیست (policy رد می‌کند): دسترسی به‌هرحال در گارد رد می‌شود؛ فقط کوکی پاک شود.
    }
    return { userId: claims.sub };
  }

  /** ثبت هر درخواست تغییردهنده‌ی نشست پشتیبانی با هویت ادمین، پیش از اجرای آن. */
  async auditRequest(session: SupportSession, details: { method: string; route: string; tenantId: string | null }, ip: string | null) {
    await withPlatformAdmin(session.adminId, (tx) => audit(tx, session.adminId, 'support.request', session.userId, { grantId: session.grantId, ...details }, ip));
  }
}
