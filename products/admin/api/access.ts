import { ConflictException, SetMetadata } from '@nestjs/common';
import { PLATFORM_ROLES_KEY, PUBLIC_ROUTE_KEY, ROLES_KEY, TENANT_SCOPED_KEY, type MembershipRole, type PlatformRole } from '@noroset/core';

// metadata با کلید قرارداد core؛ AuthGuard سراسری apps/api نقش را از DB بررسی می‌کند (docs/architecture.md §9.11).

export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);

/** همه‌ی routeهای مدیریت پلتفرم؛ نقش‌های بعدی (پشتیبانی و …) اینجا به مجوزها نگاشت می‌شوند. */
export const SuperAdmin = () => PlatformRoles('superadmin');

/** مسیرهای کاربر فضای کاری (اشتراک و پرداخت)؛ گاردهای سراسری apps/api اعمال می‌کنند. */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
/** خرید و رسیدها. */
export const BILLING_ROLES: MembershipRole[] = ['owner', 'admin'];

export const LIST_LIMIT = { default: 50, max: 200 } as const;

export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

export function pgConstraint(err: unknown): string | undefined {
  const e = err as { constraint?: string; cause?: { constraint?: string } };
  return e.constraint ?? e.cause?.constraint;
}

/** خطای یکتایی/رزرو slug (همان کدهای tenants در apps/api). */
export function slugConflict(err: unknown): ConflictException | null {
  const code = pgCode(err);
  if (code === '23505') return new ConflictException('slug_taken');
  // trigger check_reserved_slug با RAISE EXCEPTION (P0001)
  if (code === 'P0001') return new ConflictException('slug_reserved');
  return null;
}
