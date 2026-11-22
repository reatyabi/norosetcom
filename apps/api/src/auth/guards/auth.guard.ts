import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import {
  db,
  eq,
  PLATFORM_ROLES_KEY,
  platformUsers,
  SUPPORT_COOKIE,
  SUPPORT_FORBIDDEN_KEY,
  type PlatformRole,
} from '@noroset/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SUPPORT_ENDED, SupportSessionService } from '../support-session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
    private readonly support: SupportSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.['access_token'] as string | undefined;
    const supportToken = req.cookies?.[SUPPORT_COOKIE] as string | undefined;
    const platformRoles = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES_KEY, targets);

    // نشست پشتیبانی: درخواست به نام کاربر، با نشست زنده‌ی همان ادمین (docs/architecture.md §9.11).
    if (supportToken) {
      const session = await this.support.resolve(supportToken, token);
      const user = await this.loadUser(session.userId);
      if (!user || user.status !== 'active') throw new UnauthorizedException(SUPPORT_ENDED);
      // امنیت حساب و هر route نقش پلتفرمی در این نشست ممنوع است.
      if (this.reflector.getAllAndOverride<boolean>(SUPPORT_FORBIDDEN_KEY, targets) || platformRoles?.length) {
        throw new ForbiddenException('impersonation_forbidden');
      }
      this.cls.set('userId', session.userId);
      this.cls.set('platformRole', user.platformRole);
      this.cls.set('support', session);
      this.cls.set('ip', (req.ip as string | undefined) ?? null);
      return true;
    }

    if (!token) throw new UnauthorizedException();

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ?: string }>(token);
      // توکن نشست پشتیبانی جای access token پذیرفته نمی‌شود.
      if (payload.typ) throw new Error('not an access token');
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.loadUser(userId);
    // فقط active (disabled و blocked هر دو رد؛ docs/architecture.md §7).
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    // نقش پلتفرم در هر درخواست از DB خوانده می‌شود تا سلب نقش فوراً اثر کند (§9.11).
    if (platformRoles?.length && !platformRoles.includes(user.platformRole)) {
      throw new ForbiddenException('platform_role_required');
    }

    this.cls.set('userId', userId);
    this.cls.set('platformRole', user.platformRole);
    this.cls.set('ip', (req.ip as string | undefined) ?? null);
    return true;
  }

  private async loadUser(id: string) {
    const rows = await db.select().from(platformUsers).where(eq(platformUsers.id, id)).limit(1);
    return rows[0];
  }
}
