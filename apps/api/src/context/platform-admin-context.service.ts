import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { withPlatformAdmin, type Db, type PlatformAdminContext } from '@noroset/core';

/**
 * پیاده‌سازی PlatformAdminContext (توکن PLATFORM_ADMIN_CONTEXT در @noroset/core) برای ماژول admin.
 * AuthGuard نقش را روی routeهای @PlatformRoles(...) بررسی و userId را در CLS گذاشته است؛ خود DB هم
 * با is_platform_admin() دوباره بررسی می‌کند (docs/architecture.md §9.11).
 */
@Injectable()
export class PlatformAdminContextService implements PlatformAdminContext {
  constructor(private readonly cls: ClsService) {}

  adminId(): string {
    const userId = this.cls.get<string>('userId');
    if (!userId || this.cls.get<string>('platformRole') !== 'superadmin') throw new ForbiddenException('platform_role_required');
    return userId;
  }

  ip(): string | null {
    return this.cls.get<string | null>('ip') ?? null;
  }

  run<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return withPlatformAdmin(this.adminId(), fn);
  }
}
