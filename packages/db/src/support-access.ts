import { eq } from 'drizzle-orm';
import { withSetting } from './connection';
import { supportAccessGrants } from './schema';

// بررسی نشست پشتیبانی در هر درخواست (docs/architecture.md §9.11): تراکنش فقط app.support_grant_id
// را ست می‌کند و policy «support_access_grants_session_select» فقط همان یک ردیف را نشان می‌دهد.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SupportGrantState {
  id: string;
  userId: string;
  adminUserId: string;
  expiresAt: Date;
  redeemedAt: Date | null;
  endedAt: Date | null;
  revokedAt: Date | null;
}

/** وضعیت یک دسترسی پشتیبانی (ناموجود ← null). فعال‌بودن را فراخواننده با زمان جاری می‌سنجد. */
export async function findSupportGrant(id: string): Promise<SupportGrantState | null> {
  if (!UUID.test(id)) return null;
  const grantId = id.toLowerCase();
  return withSetting('app.support_grant_id', grantId, async (tx) => {
    const [row] = await tx
      .select({
        id: supportAccessGrants.id,
        userId: supportAccessGrants.userId,
        adminUserId: supportAccessGrants.adminUserId,
        expiresAt: supportAccessGrants.expiresAt,
        redeemedAt: supportAccessGrants.redeemedAt,
        endedAt: supportAccessGrants.endedAt,
        revokedAt: supportAccessGrants.revokedAt,
      })
      .from(supportAccessGrants)
      .where(eq(supportAccessGrants.id, grantId))
      .limit(1);
    return row ?? null;
  });
}

export type SupportGrantStatus = 'pending' | 'active' | 'ended' | 'revoked' | 'expired';

/** وضعیت نمایشی: pending = لینک هنوز استفاده نشده، active = نشست پشتیبانی برقرار. */
export function supportGrantStatus(grant: Omit<SupportGrantState, 'id' | 'userId' | 'adminUserId'>, now: Date): SupportGrantStatus {
  if (grant.revokedAt) return 'revoked';
  if (grant.endedAt) return 'ended';
  if (grant.expiresAt <= now) return 'expired';
  return grant.redeemedAt ? 'active' : 'pending';
}

/** دسترسی در لحظه‌ی `now` قابل استفاده است (مصرف‌شده، پایان‌نیافته، باطل‌نشده، منقضی‌نشده). */
export function isSupportGrantLive(grant: SupportGrantState, now: Date): boolean {
  return grant.redeemedAt !== null && grant.endedAt === null && grant.revokedAt === null && grant.expiresAt > now;
}
