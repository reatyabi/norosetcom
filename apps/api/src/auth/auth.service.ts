import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  and,
  count,
  db,
  desc,
  eq,
  generateOtpCode,
  gte,
  hashOtp,
  hashPassword,
  hashToken,
  isAcceptablePassword,
  isNull,
  normalizeIranianMobile,
  otpCodes,
  platformUsers,
  verifyOtpTimingSafe,
  verifyPassword,
  SMS_PROVIDER,
  type SignupUtm,
  type SmsProvider,
} from '@noroset/core';
import { getOtpPepper } from '../config/secrets';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { SessionService } from './session.service';

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MOBILE_LIMIT = 3;
const OTP_MOBILE_WINDOW_MS = 10 * 60 * 1000;
const PASSWORD_WINDOW_MS = 15 * 60 * 1000;

type Tokens = { accessToken: string; refreshToken: string };

/**
 * ورود فقط برای حساب active. پس از تأیید OTP مالکیت موبایل ثابت شده، پس دلیل رد را می‌گوییم
 * (`account_disabled` / `account_blocked`؛ docs/architecture.md §7).
 */
function assertActive(status: 'active' | 'disabled' | 'blocked'): void {
  if (status !== 'active') throw new ForbiddenException(`account_${status}`);
}

@Injectable()
export class AuthService {
  private readonly otpSecret: string;
  private dummyHashPromise: Promise<string> | undefined;

  constructor(
    private readonly jwt: JwtService,
    private readonly sessionService: SessionService,
    private readonly rateLimit: RateLimitService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    this.otpSecret = getOtpPepper();
  }

  async requestOtp(mobile: string, ip: string | undefined): Promise<void> {
    const normalized = normalizeIranianMobile(mobile);
    if (!normalized) throw new BadRequestException('invalid mobile');

    this.rateLimit.check(`otp_request:ip:${ip ?? 'unknown'}`, 10, 60 * 60 * 1000);
    // هر کد یک پیامک هزینه دارد: سقف موبایل از DB خوانده می‌شود تا با ری‌استارت و deploy صفر نشود.
    const [recent] = await db
      .select({ n: count() })
      .from(otpCodes)
      .where(and(eq(otpCodes.mobile, normalized), gte(otpCodes.createdAt, new Date(Date.now() - OTP_MOBILE_WINDOW_MS))));
    if ((recent?.n ?? 0) >= OTP_MOBILE_LIMIT) throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);

    // ابطال کدهای فعال قبلی همین موبایل
    await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.mobile, normalized), isNull(otpCodes.consumedAt)));

    const code = generateOtpCode();
    await db.insert(otpCodes).values({
      mobile: normalized,
      codeHash: hashOtp(code, this.otpSecret),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      ip: ip ?? null,
    });

    await this.sms.sendOtp(normalized, code);
  }

  async verifyOtp(
    mobile: string,
    code: string,
    ip: string | undefined,
    userAgent: string | undefined,
    signupUtm: SignupUtm | null = null,
  ): Promise<Tokens> {
    const normalized = normalizeIranianMobile(mobile);
    if (!normalized) throw new BadRequestException('invalid mobile');

    await this.consumeOtp(normalized, code, ip);

    const user = await this.findOrCreateUser(normalized, signupUtm);
    assertActive(user.status);
    return this.startSession(user.id, userAgent, ip);
  }

  /** ورود با موبایل + رمز. کاربر ناموجود، بدون رمز، غیرفعال یا رمز اشتباه همه یک خطا دارند. */
  async loginWithPassword(
    mobile: string,
    password: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<Tokens> {
    const normalized = normalizeIranianMobile(mobile);
    if (!normalized) throw new UnauthorizedException('invalid credentials');

    this.rateLimit.check(`password_login:ip:${ip ?? 'unknown'}`, 20, PASSWORD_WINDOW_MS);
    this.rateLimit.check(`password_login:mobile:${normalized}`, 5, PASSWORD_WINDOW_MS);

    const user = (
      await db.select().from(platformUsers).where(eq(platformUsers.mobile, normalized)).limit(1)
    )[0];
    // بدون رمز هم یک هش ساختگی بررسی می‌شود تا زمان پاسخ وجود حساب را لو ندهد.
    const ok = await verifyPassword(password, user?.passwordHash ?? (await this.dummyHash()));
    if (!user?.passwordHash || !ok || user.status !== 'active') {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.startSession(user.id, userAgent, ip);
  }

  /**
   * تنظیم/تغییر رمز برای کاربر واردشده؛ اگر رمز دارد، رمز فعلی لازم است.
   * بقیه‌ی نشست‌ها باطل می‌شوند و نشست همین درخواست (از روی refresh cookie) می‌ماند.
   */
  async setPassword(
    userId: string,
    newPassword: string,
    currentPassword: string | undefined,
    refreshToken: string | undefined,
  ): Promise<void> {
    if (!isAcceptablePassword(newPassword)) throw new BadRequestException('weak password');

    const user = (await db.select().from(platformUsers).where(eq(platformUsers.id, userId)).limit(1))[0];
    if (!user) throw new UnauthorizedException();

    if (user.passwordHash) {
      this.rateLimit.check(`password_change:user:${userId}`, 5, PASSWORD_WINDOW_MS);
      if (!currentPassword) throw new BadRequestException('current password required');
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new BadRequestException('invalid current password');
      }
    }

    await this.storePassword(userId, newPassword);

    const current = refreshToken ? await this.sessionService.findByHash(hashToken(refreshToken)) : undefined;
    await this.sessionService.revokeAllForUser(userId, current?.userId === userId ? current.id : undefined);
  }

  /** فراموشی رمز: مالکیت موبایل با OTP ثابت می‌شود؛ رمز جدید، ابطال همه‌ی نشست‌ها و نشست تازه. */
  async resetPassword(
    mobile: string,
    code: string,
    newPassword: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<Tokens> {
    const normalized = normalizeIranianMobile(mobile);
    if (!normalized) throw new BadRequestException('invalid mobile');
    if (!isAcceptablePassword(newPassword)) throw new BadRequestException('weak password');

    await this.consumeOtp(normalized, code, ip);

    const user = await this.findOrCreateUser(normalized);
    assertActive(user.status);
    await this.storePassword(user.id, newPassword);
    await this.sessionService.revokeAllForUser(user.id);
    return this.startSession(user.id, userAgent, ip);
  }

  async refresh(
    refreshToken: string | undefined,
    userAgent: string | undefined,
    ip: string | undefined,
  ): Promise<Tokens> {
    if (!refreshToken) throw new UnauthorizedException();

    const session = await this.sessionService.findByHash(hashToken(refreshToken));
    if (!session) throw new UnauthorizedException();
    if (session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException();
    if (session.revokedAt) {
      // reuse: ابطال کل زنجیرهٔ کاربر
      await this.sessionService.revokeAllForUser(session.userId);
      throw new UnauthorizedException();
    }

    // حساب غیرفعال/مسدود نشست تازه نمی‌گیرد (ادمین هنگام تغییر وضعیت نشست‌ها را هم باطل می‌کند).
    const user = (await db.select({ status: platformUsers.status }).from(platformUsers).where(eq(platformUsers.id, session.userId)).limit(1))[0];
    if (user?.status !== 'active') {
      await this.sessionService.revoke(session.id);
      throw new UnauthorizedException();
    }

    await this.sessionService.revoke(session.id);
    const next = await this.sessionService.create(session.userId, userAgent, ip, session.id);
    const accessToken = await this.signAccessToken(session.userId);
    return { accessToken, refreshToken: next.refreshToken };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) throw new UnauthorizedException();
    const session = await this.sessionService.findByHash(hashToken(refreshToken));
    if (session) await this.sessionService.revoke(session.id);
  }

  async logoutAll(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) throw new UnauthorizedException();
    const session = await this.sessionService.findByHash(hashToken(refreshToken));
    if (session) await this.sessionService.revokeAllForUser(session.userId);
  }

  /** بررسی و مصرف کد OTP (rate limit به‌ازای IP، سقف تلاش، یک‌بار مصرف). */
  private async consumeOtp(mobile: string, code: string, ip: string | undefined): Promise<void> {
    this.rateLimit.check(`otp_verify:ip:${ip ?? 'unknown'}`, 10, 60 * 60 * 1000);

    const otp = await this.findActiveOtp(mobile);
    if (!otp) throw new BadRequestException('invalid or expired code');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new BadRequestException('too many attempts');

    if (!verifyOtpTimingSafe(code, this.otpSecret, otp.codeHash)) {
      await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
      throw new BadRequestException('invalid code');
    }

    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
  }

  private async findActiveOtp(mobile: string) {
    const rows = await db
      .select()
      .from(otpCodes)
      .where(
        and(eq(otpCodes.mobile, mobile), isNull(otpCodes.consumedAt), gte(otpCodes.expiresAt, new Date())),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return rows[0];
  }

  /** کاربر تازه first-touch UTM همان مرورگر را نگه می‌دارد (docs/architecture.md §9.11، ۱۱.۷). */
  private async findOrCreateUser(mobile: string, signupUtm: SignupUtm | null = null) {
    const existing = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.mobile, mobile))
      .limit(1);
    if (existing[0]) return existing[0];
    const inserted = await db.insert(platformUsers).values({ mobile, signupUtm }).returning();
    return inserted[0]!;
  }

  private async storePassword(userId: string, password: string): Promise<void> {
    await db
      .update(platformUsers)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(platformUsers.id, userId));
  }

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= hashPassword('noroset-dummy-password');
    return this.dummyHashPromise;
  }

  private async startSession(userId: string, userAgent: string | undefined, ip: string | undefined): Promise<Tokens> {
    const session = await this.sessionService.create(userId, userAgent, ip);
    const accessToken = await this.signAccessToken(userId);
    return { accessToken, refreshToken: session.refreshToken };
  }

  private signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
