import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { and, db, eq, ROLES_KEY, TENANT_SCOPED_KEY, tenantMemberships, tenants, withTenant } from '@noroset/core';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** گارد سراسری: فقط روی routeهای دارای @TenantScoped() یا @Roles(...) اجرا می‌شود. */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly cls: ClsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const scoped =
      this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, targets) ||
      (this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets)?.length ?? 0) > 0;
    if (!scoped) return true;

    const req = context.switchToHttp().getRequest();
    const userId = this.cls.get<string>('userId');
    if (!userId) throw new UnauthorizedException();

    const header = (req.headers['x-tenant-id'] as string | undefined) ?? undefined;
    if (!header) throw new BadRequestException('missing X-Tenant-Id header');

    const tenant = await this.resolveTenant(header);
    if (!tenant || tenant.status === 'suspended') throw new ForbiddenException();

    const membership = await withTenant(tenant.id, (tx) =>
      tx
        .select()
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenantId, tenant.id),
            eq(tenantMemberships.userId, userId),
            eq(tenantMemberships.status, 'active'),
          ),
        )
        .limit(1),
    );

    if (!membership[0]) throw new ForbiddenException();

    this.cls.set('tenantId', tenant.id);
    this.cls.set('role', membership[0].role);
    return true;
  }

  private async resolveTenant(header: string) {
    if (UUID_RE.test(header)) {
      return (await db.select().from(tenants).where(eq(tenants.id, header)).limit(1))[0];
    }
    return (await db.select().from(tenants).where(eq(tenants.slug, header)).limit(1))[0];
  }
}
