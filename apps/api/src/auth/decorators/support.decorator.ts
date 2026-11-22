import { SetMetadata } from '@nestjs/common';
import { PLATFORM_ROLES_KEY, SUPPORT_FORBIDDEN_KEY } from '@noroset/core';

/** route امنیت حساب؛ در نشست پشتیبانی (ادمین داخل حساب کاربر) ۴۰۳ `impersonation_forbidden`. */
export const NotInSupport = () => SetMetadata(SUPPORT_FORBIDDEN_KEY, true);

/** فقط superadmin (همان قرارداد @SuperAdmin ماژول admin). */
export const SuperAdminOnly = () => SetMetadata(PLATFORM_ROLES_KEY, ['superadmin']);
