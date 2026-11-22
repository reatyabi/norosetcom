import { SetMetadata } from '@nestjs/common';
import { type MembershipRole, MODULE_KEY, type PlatformModuleKey, PUBLIC_ROUTE_KEY, ROLES_KEY, TENANT_SCOPED_KEY } from '@noroset/core';

// metadata با کلیدهای قرارداد core؛ گاردهای سراسری apps/api آن‌ها را اعمال می‌کنند.

/** بدون نشست (مخاطب ناشناس فرم عمومی). */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** ماژول این محصول برای گارد سراسری خاموش/تعمیر (docs/architecture.md §9.11)؛ روی همه‌ی controllerها. */
export const ProductModule = () => SetMetadata(MODULE_KEY, 'noroform' satisfies PlatformModuleKey);

/** هر عضو فعال tenant (هدر X-Tenant-Id). */
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);

/** فقط این نقش‌ها (به‌طور ضمنی tenant-scoped). */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);

/** انتشار، بستن/بازکردن و حذف فرم. ساخت و ویرایش پیش‌نویس برای همه‌ی اعضا آزاد است. */
export const MANAGE_ROLES: MembershipRole[] = ['owner', 'admin'];
