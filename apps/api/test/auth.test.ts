import { beforeAll, describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import {
  and,
  db,
  desc,
  eq,
  hashOtp,
  isNull,
  otpCodes,
  platformUsers,
  sessions,
  type SmsProvider,
} from '@noroset/core';
import { AuthService } from '../src/auth/auth.service';
import { getJwtSecret, getOtpPepper } from '../src/config/secrets';
import { SessionService } from '../src/auth/session.service';
import { RateLimitService } from '../src/rate-limit/rate-limit.service';

class CapturingSmsProvider implements SmsProvider {
  codes: string[] = [];
  async sendOtp(_mobile: string, code: string): Promise<void> {
    this.codes.push(code);
  }
  last(): string {
    const c = this.codes[this.codes.length - 1];
    if (!c) throw new Error('no code captured');
    return c;
  }
}

let auth: AuthService;
let sms: CapturingSmsProvider;
let sessionService: SessionService;
let seq = 0;

// تصادفی: سقف OTP از DB خوانده می‌شود و اجرای دوباره نباید به کدهای اجرای قبلی بخورد.
function nextMobile(): string {
  seq += 1;
  return `+98935${String(Math.floor(Math.random() * 1e4)).padStart(4, '0')}${String(seq).padStart(3, '0')}`;
}

async function latestOtp(mobile: string) {
  const rows = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.mobile, mobile))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  return rows[0];
}

beforeAll(() => {
  const jwt = new JwtService({
    secret: getJwtSecret(),
    signOptions: { expiresIn: '15m' },
  });
  sms = new CapturingSmsProvider();
  sessionService = new SessionService();
  auth = new AuthService(jwt, sessionService, new RateLimitService(), sms);
});

describe('auth (OTP)', () => {
  it('request + verify success creates user and returns tokens', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const code = sms.last();

    const tokens = await auth.verifyOtp(mobile, code, '1.1.1.1', 'test-agent');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    const users = await db.select().from(platformUsers).where(eq(platformUsers.mobile, mobile)).limit(1);
    expect(users).toHaveLength(1);
  });

  it('hashes OTP with OTP_PEPPER, not JWT_SECRET', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const code = sms.last();

    const row = await latestOtp(mobile);
    expect(row!.codeHash).toBe(hashOtp(code, getOtpPepper()));
    expect(row!.codeHash).not.toBe(hashOtp(code, getJwtSecret()));
  });

  it('rejects wrong code', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    await expect(auth.verifyOtp(mobile, '000000', '1.1.1.1', undefined)).rejects.toThrow();
  });

  it('rejects expired code', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const code = sms.last();
    const otp = await latestOtp(mobile);
    await db
      .update(otpCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(otpCodes.id, otp!.id));
    await expect(auth.verifyOtp(mobile, code, '1.1.1.1', undefined)).rejects.toThrow();
  });

  it('rejects after too many attempts', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const code = sms.last();
    const otp = await latestOtp(mobile);
    await db.update(otpCodes).set({ attempts: 5 }).where(eq(otpCodes.id, otp!.id));
    await expect(auth.verifyOtp(mobile, code, '1.1.1.1', undefined)).rejects.toThrow();
  });

  it('code is single-use', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const code = sms.last();
    await auth.verifyOtp(mobile, code, '1.1.1.1', undefined);
    await expect(auth.verifyOtp(mobile, code, '1.1.1.1', undefined)).rejects.toThrow();
  });

  it('new request invalidates previous active code', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    await auth.requestOtp(mobile, '1.1.1.1');
    const active = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.mobile, mobile), isNull(otpCodes.consumedAt)))
      .limit(10);
    expect(active).toHaveLength(1);
  });
});

describe('auth (session / refresh)', () => {
  it('refresh rotates and revokes old token', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const tokens = await auth.verifyOtp(mobile, sms.last(), '1.1.1.1', undefined);

    const next = await auth.refresh(tokens.refreshToken, 'agent', '1.1.1.1');
    expect(next.refreshToken).not.toBe(tokens.refreshToken);

    const rows = await db.select().from(sessions).limit(50);
    expect(rows.some((s) => s.revokedAt !== null)).toBe(true);
    expect(rows.some((s) => s.revokedAt === null)).toBe(true);
  });

  it('reuse of old refresh token revokes the whole chain', async () => {
    const mobile = nextMobile();
    await auth.requestOtp(mobile, '1.1.1.1');
    const tokens = await auth.verifyOtp(mobile, sms.last(), '1.1.1.1', undefined);

    await auth.refresh(tokens.refreshToken, 'agent', '1.1.1.1');
    // reuse old token → chain revoked
    await expect(auth.refresh(tokens.refreshToken, 'agent', '1.1.1.1')).rejects.toThrow();

    const user = (
      await db.select().from(platformUsers).where(eq(platformUsers.mobile, mobile)).limit(1)
    )[0];
    const rows = await db.select().from(sessions).where(eq(sessions.userId, user!.id)).limit(50);
    expect(rows.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it('rate limits: 4th OTP request for same mobile is rejected', async () => {
    const mobile = nextMobile();
    const rateLimit = new RateLimitService();
    const localAuth = new AuthService(
      new JwtService({ secret: getJwtSecret(), signOptions: { expiresIn: '15m' } }),
      sessionService,
      rateLimit,
      sms,
    );

    await localAuth.requestOtp(mobile, '9.9.9.9');
    await localAuth.requestOtp(mobile, '9.9.9.9');
    await localAuth.requestOtp(mobile, '9.9.9.9');
    await expect(localAuth.requestOtp(mobile, '9.9.9.9')).rejects.toThrow();
  });

  it('the OTP limit for a mobile survives a restart (fresh in-memory limiter)', async () => {
    const mobile = nextMobile();
    const fresh = () =>
      new AuthService(new JwtService({ secret: getJwtSecret(), signOptions: { expiresIn: '15m' } }), sessionService, new RateLimitService(), sms);
    await fresh().requestOtp(mobile, '9.9.9.1');
    await fresh().requestOtp(mobile, '9.9.9.1');
    await fresh().requestOtp(mobile, '9.9.9.1');
    const sent = sms.codes.length;
    await expect(fresh().requestOtp(mobile, '9.9.9.1')).rejects.toMatchObject({ status: 429 });
    expect(sms.codes).toHaveLength(sent);
  });
});

describe('auth (account status)', () => {
  const ip = '3.3.3.3';
  // تصادفی: این تست‌ها کاربر از پیش می‌سازند و بدون پاک‌سازی DB در اجرای دوباره نباید تکراری شوند.
  const randomMobile = () => `+98936${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

  it('a blocked or disabled account cannot sign in with OTP (403 with the reason)', async () => {
    for (const status of ['blocked', 'disabled'] as const) {
      const mobile = randomMobile();
      await db.insert(platformUsers).values({ mobile, status });
      await auth.requestOtp(mobile, ip);
      await expect(auth.verifyOtp(mobile, sms.last(), ip, undefined)).rejects.toMatchObject({ status: 403, message: `account_${status}` });
    }
  });

  it('refresh of a session whose user was blocked is rejected', async () => {
    const mobile = randomMobile();
    await auth.requestOtp(mobile, ip);
    const tokens = await auth.verifyOtp(mobile, sms.last(), ip, undefined);
    await db.update(platformUsers).set({ status: 'blocked' }).where(eq(platformUsers.mobile, mobile));
    await expect(auth.refresh(tokens.refreshToken, undefined, ip)).rejects.toMatchObject({ status: 401 });
  });
});

describe('auth (signup UTM)', () => {
  it('stores first-touch UTM only when OTP creates the user', async () => {
    const ip = '4.4.4.4';
    const mobile = `+98933${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
    await auth.requestOtp(mobile, ip);
    await auth.verifyOtp(mobile, sms.last(), ip, undefined, { source: 'instagram', campaign: 'yalda' });
    const [created] = await db.select().from(platformUsers).where(eq(platformUsers.mobile, mobile));
    expect(created!.signupUtm).toEqual({ source: 'instagram', campaign: 'yalda' });

    // ورود بعدی first-touch را عوض نمی‌کند
    await auth.requestOtp(mobile, ip);
    await auth.verifyOtp(mobile, sms.last(), ip, undefined, { source: 'google' });
    const [again] = await db.select().from(platformUsers).where(eq(platformUsers.mobile, mobile));
    expect(again!.signupUtm).toEqual({ source: 'instagram', campaign: 'yalda' });
  });
});
