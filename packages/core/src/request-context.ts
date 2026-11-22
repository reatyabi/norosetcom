import type { Db } from '@noroset/db';

// قرارداد بین apps/api و محصولات (Port؛ docs/architecture.md §3.5). core وابسته به Nest نیست:
// فقط کلیدهای metadata، توکن DI و interface اینجا هستند؛ پیاده‌سازی و گاردها در apps/api.

/** route عمومی (بدون نشست؛ AuthGuard رد نمی‌کند). */
export const PUBLIC_ROUTE_KEY = 'isPublic';

/** route نیازمند tenant (هدر X-Tenant-Id + عضویت فعال). */
export const TENANT_SCOPED_KEY = 'noroset:tenant-scoped';

/** نقش‌های مجاز route؛ وجودش یعنی route نیازمند tenant هم هست. */
export const ROLES_KEY = 'noroset:roles';

export type MembershipRole = 'owner' | 'admin' | 'member';

/** توکن DI برای TenantContext (Symbol.for تا در نسخه‌های مختلف ماژول یکی باشد). */
export const TENANT_CONTEXT = Symbol.for('noroset:TenantContext');

/** زمینه‌ی درخواست tenant-scoped جاری. */
export interface TenantContext {
  tenantId(): string;
  userId(): string;
  role(): MembershipRole;
  /** اجرای fn داخل withTenant با tenant همین درخواست. */
  run<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

/** نقش‌های پلتفرمی مجاز route (docs/architecture.md §9.11)؛ AuthGuard آن را از DB بررسی می‌کند. */
export const PLATFORM_ROLES_KEY = 'noroset:platform-roles';

export type PlatformRole = 'user' | 'superadmin';

/**
 * route ممنوع در نشست پشتیبانی (ادمین داخل حساب کاربر؛ §9.11): امنیت حساب مثل رمز، ابطال
 * دسترسی‌ها و خروج از همه‌ی دستگاه‌ها ← ۴۰۳ `impersonation_forbidden`. routeهای PLATFORM_ROLES_KEY
 * هم در این نشست همیشه ممنوع‌اند.
 */
export const SUPPORT_FORBIDDEN_KEY = 'noroset:support-forbidden';

/** کوکی نشست پشتیبانی (JWT با `act` = ادمین؛ کنار نشست خود ادمین). */
export const SUPPORT_COOKIE = 'support_token';

/** توکن DI برای PlatformAdminContext. */
export const PLATFORM_ADMIN_CONTEXT = Symbol.for('noroset:PlatformAdminContext');

/** زمینه‌ی درخواست مدیریت پلتفرم جاری (فقط routeهای دارای PLATFORM_ROLES_KEY). */
export interface PlatformAdminContext {
  /** کاربر ادمین همین درخواست. */
  adminId(): string;
  /** IP درخواست (برای لاگ ممیزی). */
  ip(): string | null;
  /** اجرای fn داخل withPlatformAdmin با ادمین همین درخواست. */
  run<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

/** توکن DI محدودکننده‌ی نرخ (پیاده‌سازی فعلی درون‌حافظه است؛ docs/tech-debt.md). */
export const RATE_LIMITER = Symbol.for('noroset:RateLimiter');

export interface RateLimiter {
  /** یک واحد مصرف می‌کند؛ false یعنی سقف `limit` در پنجره‌ی `windowMs` پر شده است. */
  consume(key: string, limit: number, windowMs: number): boolean;
}

/** توکن DI هش IP (HMAC با secret سرور؛ خود IP ذخیره نمی‌شود). */
export const IP_HASHER = Symbol.for('noroset:IpHasher');

export interface IpHasher {
  /** هش hex ثابت‌طول (۶۴ کاراکتر). */
  hash(ip: string): string;
}

// ماژول‌ها (docs/architecture.md §9.11): هر محصول controllerهایش را با کلید خودش علامت می‌زند و گارد
// سراسری apps/api وضعیت سراسری آن را اعمال می‌کند. admin و core/auth ماژول خاموش‌شدنی نیستند.

/** رجیستری ماژول‌های خاموش‌شدنی (محصولات). محصول جدید = یک کلید اینجا + علامت controllerها. */
export const PLATFORM_MODULE_KEYS = ['noroform', 'norolink', 'norofile'] as const;
export type PlatformModuleKey = (typeof PLATFORM_MODULE_KEYS)[number];

/** ماژول route (روی کلاس controller). */
export const MODULE_KEY = 'noroset:module';

/** active؛ maintenance: پنل/API مدیریت ۵۰۳ و مسیر عمومی باز؛ off: همه ۵۰۳. */
export type ModuleStatus = 'active' | 'maintenance' | 'off';

export interface ModuleState {
  key: PlatformModuleKey;
  status: ModuleStatus;
  message: string | null;
}

/** توکن DI وضعیت ماژول‌ها (پیاده‌سازی با کش کوتاه در apps/api). */
export const MODULE_STATE = Symbol.for('noroset:ModuleState');

export interface ModuleStateService {
  all(): Promise<ModuleState[]>;
  get(key: PlatformModuleKey): Promise<ModuleState>;
  /** پس از تغییر وضعیت در همین پروسه (نمونه‌های دیگر با انقضای کش). */
  invalidate(): void;
}
