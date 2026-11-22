import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, TENANT_SCOPED_KEY, type MembershipRole } from '@noroset/core';

export { ROLES_KEY, TENANT_SCOPED_KEY };

/** نقش‌های مجاز؛ به‌طور ضمنی route را tenant-scoped هم می‌کند (TenantGuard اجرا می‌شود). */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);

/** route نیازمند tenant (هر عضو فعال). */
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
