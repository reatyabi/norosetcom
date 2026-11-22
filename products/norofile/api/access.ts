import { HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { type MembershipRole, MODULE_KEY, type PlatformModuleKey, PUBLIC_ROUTE_KEY, type RateLimiter, ROLES_KEY, TENANT_SCOPED_KEY } from '@noroset/core';

// metadata با کلیدهای قرارداد core؛ گاردهای سراسری apps/api آن‌ها را اعمال می‌کنند.

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** ماژول این محصول برای گارد سراسری خاموش/تعمیر (docs/architecture.md §9.11)؛ روی همه‌ی controllerها. */
export const ProductModule = () => SetMetadata(MODULE_KEY, 'norofile' satisfies PlatformModuleKey);
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);

/** حذف فایل. بارگذاری، تغییر نام و دسترسی برای همه‌ی اعضا آزاد است. */
export const MANAGE_ROLES: MembershipRole[] = ['owner', 'admin'];

export function consumeOrThrow(limiter: RateLimiter, key: string, rule: { limit: number; windowMs: number }): void {
  if (!limiter.consume(key, rule.limit, rule.windowMs)) throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
}

export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}
