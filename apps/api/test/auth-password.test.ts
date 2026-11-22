import { randomInt } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { db, eq, isNull, and, platformUsers, sessions, type SmsProvider } from '@noroset/core';
import { AuthService } from '../src/auth/auth.service';
import { SessionService } from '../src/auth/session.service';
import { getJwtSecret } from '../src/config/secrets';
import { RateLimitService } from '../src/rate-limit/rate-limit.service';

class CapturingSmsProvider implements SmsProvider {
  last = '';
  async sendOtp(_mobile: string, code: string): Promise<void> {
    this.last = code;
  }
}

let sms: CapturingSmsProvider;
let sessionService: SessionService;

function newAuth(): AuthService {
  return new AuthService(
    new JwtService({ secret: getJwtSecret(), signOptions: { expiresIn: '15m' } }),
    sessionService,
    new RateLimitService(),
    sms,
  );
}

/** موبایل یکتا در هر اجرا (کاربرها بین اجراها در DB می‌مانند). */
function freshMobile(): string {
  return `+98936${String(randomInt(0, 10_000_000)).padStart(7, '0')}`;
}

async function userByMobile(mobile: string) {
  return (await db.select().from(platformUsers).where(eq(platformUsers.mobile, mobile)).limit(1))[0]!;
}

async function activeSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/** کاربر واردشده با OTP. */
async function signUp(auth: AuthService, mobile: string) {
  await auth.requestOtp(mobile, '2.2.2.2');
  const tokens = await auth.verifyOtp(mobile, sms.last, '2.2.2.2', undefined);
  return { tokens, user: await userByMobile(mobile) };
}

beforeAll(() => {
  sms = new CapturingSmsProvider();
  sessionService = new SessionService();
});

describe('auth (password)', () => {
  it('user without password cannot log in with a password', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    await signUp(auth, mobile);
    await expect(auth.loginWithPassword(mobile, 'anything-123', '2.2.2.2', undefined)).rejects.toMatchObject({
      status: 401,
      message: 'invalid credentials',
    });
  });

  it('set password, then log in with it (Persian digits in mobile accepted); hash never plaintext', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user, tokens } = await signUp(auth, mobile);

    await auth.setPassword(user.id, 's3cret-pass', undefined, tokens.refreshToken);
    const stored = (await userByMobile(mobile)).passwordHash;
    expect(stored).toMatch(/^scrypt\$/);
    expect(stored).not.toContain('s3cret-pass');

    const local = '۰' + mobile.slice(3).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
    const login = await auth.loginWithPassword(local, 's3cret-pass', '2.2.2.2', 'agent');
    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();
  });

  it('wrong password and unknown mobile give the same error', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user } = await signUp(auth, mobile);
    await auth.setPassword(user.id, 's3cret-pass', undefined, undefined);

    const wrong = auth.loginWithPassword(mobile, 'wrong-pass', '2.2.2.2', undefined);
    const unknown = auth.loginWithPassword(freshMobile(), 'wrong-pass', '2.2.2.2', undefined);
    await expect(wrong).rejects.toMatchObject({ status: 401, message: 'invalid credentials' });
    await expect(unknown).rejects.toMatchObject({ status: 401, message: 'invalid credentials' });
  });

  it('disabled user cannot log in with a password', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user } = await signUp(auth, mobile);
    await auth.setPassword(user.id, 's3cret-pass', undefined, undefined);
    await db.update(platformUsers).set({ status: 'disabled' }).where(eq(platformUsers.id, user.id));

    await expect(auth.loginWithPassword(mobile, 's3cret-pass', '2.2.2.2', undefined)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const auth = newAuth();
    const { user } = await signUp(auth, freshMobile());
    await expect(auth.setPassword(user.id, 'short', undefined, undefined)).rejects.toMatchObject({
      status: 400,
      message: 'weak password',
    });
  });

  it('changing an existing password requires the current one', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user } = await signUp(auth, mobile);
    await auth.setPassword(user.id, 'first-pass', undefined, undefined);

    await expect(auth.setPassword(user.id, 'second-pass', undefined, undefined)).rejects.toMatchObject({
      message: 'current password required',
    });
    await expect(auth.setPassword(user.id, 'second-pass', 'nope-nope', undefined)).rejects.toMatchObject({
      message: 'invalid current password',
    });

    await auth.setPassword(user.id, 'second-pass', 'first-pass', undefined);
    await expect(auth.loginWithPassword(mobile, 'first-pass', '2.2.2.2', undefined)).rejects.toThrow();
    await expect(auth.loginWithPassword(mobile, 'second-pass', '2.2.2.2', undefined)).resolves.toBeTruthy();
  });

  it('setting a password revokes other sessions but keeps the current one', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user, tokens } = await signUp(auth, mobile);
    await auth.requestOtp(mobile, '2.2.2.2');
    await auth.verifyOtp(mobile, sms.last, '2.2.2.2', 'other-device');
    expect(await activeSessions(user.id)).toHaveLength(2);

    await auth.setPassword(user.id, 's3cret-pass', undefined, tokens.refreshToken);

    const active = await activeSessions(user.id);
    expect(active).toHaveLength(1);
    await expect(auth.refresh(tokens.refreshToken, undefined, '2.2.2.2')).resolves.toBeTruthy();
  });

  it('reset with OTP sets a new password and revokes all old sessions', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user, tokens } = await signUp(auth, mobile);
    await auth.setPassword(user.id, 'forgotten-pass', undefined, undefined);

    await auth.requestOtp(mobile, '2.2.2.2');
    const fresh = await auth.resetPassword(mobile, sms.last, 'brand-new-pass', '2.2.2.2', undefined);

    // فقط نشست تازه‌ی reset فعال است (بررسی پیش از refresh قدیمی، چون reuse کل زنجیره را باطل می‌کند).
    const active = await activeSessions(user.id);
    expect(active).toHaveLength(1);
    expect(fresh.refreshToken).toBeTruthy();
    await expect(auth.refresh(tokens.refreshToken, undefined, '2.2.2.2')).rejects.toThrow();
    await expect(auth.loginWithPassword(mobile, 'brand-new-pass', '2.2.2.2', undefined)).resolves.toBeTruthy();
  });

  it('reset with a wrong code changes nothing', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    const { user } = await signUp(auth, mobile);
    await auth.setPassword(user.id, 'kept-pass-1', undefined, undefined);

    await auth.requestOtp(mobile, '2.2.2.2');
    const wrong = sms.last === '000000' ? '000001' : '000000';
    await expect(auth.resetPassword(mobile, wrong, 'hijacked-pass', '2.2.2.2', undefined)).rejects.toMatchObject({
      status: 400,
    });
    await expect(auth.loginWithPassword(mobile, 'kept-pass-1', '2.2.2.2', undefined)).resolves.toBeTruthy();
  });

  it('rate limits: 6th password attempt for the same mobile is 429', async () => {
    const auth = newAuth();
    const mobile = freshMobile();
    for (let i = 0; i < 5; i++) {
      await expect(auth.loginWithPassword(mobile, 'wrong-pass', `3.3.3.${i}`, undefined)).rejects.toMatchObject({
        status: 401,
      });
    }
    await expect(auth.loginWithPassword(mobile, 'wrong-pass', '3.3.3.9', undefined)).rejects.toMatchObject({
      status: 429,
    });
  });
});
