import { Injectable } from '@nestjs/common';
import { and, db, eq, generateRefreshToken, hashToken, ne, sessions } from '@noroset/core';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreatedSession {
  refreshToken: string;
  sessionId: string;
}

@Injectable()
export class SessionService {
  async create(
    userId: string,
    userAgent: string | undefined,
    ip: string | undefined,
    rotatedFrom?: string,
  ): Promise<CreatedSession> {
    const refreshToken = generateRefreshToken();
    const inserted = await db
      .insert(sessions)
      .values({
        userId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userAgent: userAgent ?? null,
        ip: ip ?? null,
        rotatedFrom: rotatedFrom ?? null,
      })
      .returning();
    return { refreshToken, sessionId: inserted[0]?.id ?? '' };
  }

  async findByHash(hash: string) {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, hash))
      .limit(1);
    return rows[0];
  }

  async revoke(sessionId: string): Promise<void> {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  }

  /** همه‌ی نشست‌های کاربر را باطل می‌کند، جز `exceptSessionId` اگر داده شود. */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    const where = exceptSessionId
      ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
      : eq(sessions.userId, userId);
    await db.update(sessions).set({ revokedAt: new Date() }).where(where);
  }
}
