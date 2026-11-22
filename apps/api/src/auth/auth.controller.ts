import { Body, Controller, ForbiddenException, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { parseUtmCookie, SUPPORT_COOKIE, UTM_COOKIE } from '@noroset/core';
import { refreshCookiePath } from '../config/http';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { NotInSupport, SuperAdminOnly } from './decorators/support.decorator';
import { PasswordLoginDto, RedeemSupportDto, ResetPasswordDto, SetPasswordDto } from './dto/password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SupportSessionService } from './support-session.service';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const IS_PROD = process.env.NODE_ENV === 'production';
/** مسیر refresh از دید مرورگر (با پیشوند API_BASE_PATH، مثلاً /api/auth پشت proxy وب). */
const REFRESH_PATH = refreshCookiePath();

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cls: ClsService,
    private readonly support: SupportSessionService,
  ) {}

  @Public()
  @Post('otp/request')
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: FastifyRequest) {
    await this.auth.requestOtp(dto.mobile, req.ip);
    return { ok: true };
  }

  @Public()
  @Post('otp/verify')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const utm = parseUtmCookie(req.cookies?.[UTM_COOKIE]);
    const tokens = await this.auth.verifyOtp(dto.mobile, dto.code, req.ip, req.headers['user-agent'], utm);
    this.setCookies(res, tokens);
    // first-touch فقط برای ثبت‌نام لازم بود.
    if (utm) res.clearCookie(UTM_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Public()
  @Post('password/login')
  async passwordLogin(
    @Body() dto: PasswordLoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tokens = await this.auth.loginWithPassword(dto.mobile, dto.password, req.ip, req.headers['user-agent']);
    this.setCookies(res, tokens);
    return { ok: true };
  }

  /** تنظیم/تغییر رمز کاربر واردشده (نیازمند نشست؛ در نشست پشتیبانی ممنوع). */
  @Post('password')
  @NotInSupport()
  async setPassword(@Body() dto: SetPasswordDto, @Req() req: FastifyRequest) {
    const userId = this.cls.get<string>('userId');
    if (!userId) throw new UnauthorizedException();
    await this.auth.setPassword(userId, dto.newPassword, dto.currentPassword, req.cookies?.[REFRESH_COOKIE]);
    return { ok: true };
  }

  @Public()
  @Post('password/reset')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tokens = await this.auth.resetPassword(
      dto.mobile,
      dto.code,
      dto.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
    this.setCookies(res, tokens);
    return { ok: true };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const tokens = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req.headers['user-agent'], req.ip);
    this.setCookies(res, tokens);
    return { ok: true };
  }

  /** در نشست پشتیبانی فقط همان نشست پایان می‌یابد و ادمین خارج نمی‌شود. */
  @Public()
  @Post('logout')
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    if (req.cookies?.[SUPPORT_COOKIE]) return this.endSupport(req, res);
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
    return { ok: true };
  }

  @Public()
  @Post('logout-all')
  async logoutAll(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    // route عمومی است (گارد اجرا نمی‌شود)، پس نشست پشتیبانی همین‌جا رد می‌شود.
    if (req.cookies?.[SUPPORT_COOKIE]) throw new ForbiddenException('impersonation_forbidden');
    await this.auth.logoutAll(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
    return { ok: true };
  }

  /**
   * مصرف لینک دسترسی پشتیبانی (docs/architecture.md §9.11): فقط superadmin صادرکننده، با نشست خودش.
   * توکن از بدنه می‌آید (وب آن را از fragment آدرس می‌خواند و پاک می‌کند) و به کوکی جدا تبدیل می‌شود.
   */
  @Post('support/redeem')
  @HttpCode(200)
  @SuperAdminOnly()
  @NotInSupport()
  async redeemSupport(@Body() dto: RedeemSupportDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const adminId = this.cls.get<string>('userId');
    if (!adminId) throw new UnauthorizedException();
    const session = await this.support.redeem(adminId, dto.token, req.ip ?? null);
    res.setCookie(SUPPORT_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      path: '/',
      maxAge: Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
    });
    return { ok: true, userId: session.userId, expiresAt: session.expiresAt };
  }

  /** پایان نشست پشتیبانی (عمومی تا با دسترسی منقضی/باطل هم کوکی پاک شود). */
  @Public()
  @Post('support/end')
  @HttpCode(200)
  endSupport(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    return this.support.end(req.cookies?.[SUPPORT_COOKIE], req.ip ?? null).then((ended) => {
      res.clearCookie(SUPPORT_COOKIE, { path: '/' });
      return { ok: true, userId: ended?.userId ?? null };
    });
  }

  private setCookies(
    res: FastifyReply,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.setCookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      path: '/',
      maxAge: 15 * 60,
    });
    res.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      path: REFRESH_PATH,
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  private clearCookies(res: FastifyReply): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  }
}
