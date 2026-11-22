import { Body, Controller, Get, Header, HttpCode, Ip, Param, Post, Req, Res } from '@nestjs/common';
import { ProductModule, Public } from '../access';
import { UnlockResponseDto, RequestResponseOtpDto, VerifyResponseOtpDto } from './dto';
import { PublicResponsesService } from './public-responses.service';
import { RESPONSE_SESSION_COOKIE, RESPONSE_SESSION_TTL_SECONDS } from './response-session';

interface CookieRequest {
  cookies?: Record<string, string | undefined>;
}

interface CookieReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): unknown;
}

/** مشاهده‌ی بیرونی یک پاسخ با لینک توکن‌دار؛ نه لیست، نه جست‌وجو. */
@Controller('noroform/public/responses')
@ProductModule()
@Public()
export class PublicResponsesController {
  constructor(private readonly responses: PublicResponsesService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  read(@Param('token') token: string, @Ip() ip: string | undefined, @Req() req: CookieRequest) {
    return this.responses.read(token, ip, req.cookies?.[RESPONSE_SESSION_COOKIE]);
  }

  @Post(':token/unlock')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async unlock(
    @Param('token') token: string,
    @Body() dto: UnlockResponseDto,
    @Ip() ip: string | undefined,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const session = await this.responses.unlockKey(token, dto.key, ip);
    reply.setCookie(RESPONSE_SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: RESPONSE_SESSION_TTL_SECONDS,
    });
    return { ok: true };
  }

  @Post(':token/otp/request')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  requestOtp(
    @Param('token') token: string,
    @Body() dto: RequestResponseOtpDto,
    @Ip() ip: string | undefined,
  ) {
    return this.responses.requestOtp(token, dto.mobile, ip);
  }

  @Post(':token/otp/verify')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async verifyOtp(
    @Param('token') token: string,
    @Body() dto: VerifyResponseOtpDto,
    @Ip() ip: string | undefined,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const session = await this.responses.verifyOtp(token, dto.mobile, dto.code, ip);
    reply.setCookie(RESPONSE_SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: RESPONSE_SESSION_TTL_SECONDS,
    });
    return { ok: true };
  }
}
