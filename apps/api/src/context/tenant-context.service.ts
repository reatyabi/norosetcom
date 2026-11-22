import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { withTenant, type Db, type MembershipRole, type TenantContext } from '@noroset/core';

/**
 * پیاده‌سازی TenantContext (توکن TENANT_CONTEXT در @noroset/core) برای محصولات.
 * کد محصول به‌جای دستی‌دادن tenantId، از این سرویس برای اجرای کار داخل withTenant
 * با tenant همین درخواست استفاده می‌کند. مقدارها را TenantGuard در CLS گذاشته است.
 */
@Injectable()
export class TenantContextService implements TenantContext {
  constructor(private readonly cls: ClsService) {}

  tenantId(): string {
    return this.require<string>('tenantId');
  }

  userId(): string {
    return this.require<string>('userId');
  }

  role(): MembershipRole {
    return this.require<MembershipRole>('role');
  }

  run<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return withTenant(this.tenantId(), fn);
  }

  private require<T>(key: string): T {
    const value: unknown = this.cls.get(key);
    if (!value) throw new ForbiddenException('no tenant context');
    return value as T;
  }
}
