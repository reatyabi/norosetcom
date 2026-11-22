import { ForbiddenException, SetMetadata } from '@nestjs/common';
import {
  type Entitlements,
  type FileRequirement,
  type MembershipRole,
  MODULE_KEY,
  type PlanResolver,
  type PlanStatus,
  productPlan,
  type ResolvedPlan,
  type PlatformModuleKey,
  PLATFORM_ROLES_KEY,
  type PlatformRole,
  PUBLIC_ROUTE_KEY,
  ROLES_KEY,
  TENANT_SCOPED_KEY,
} from '@noroset/core';
import { ALL_ELEMENT_KINDS, type NorolinkLimits } from '../shared';

// metadata با کلیدهای قرارداد core؛ گاردهای سراسری apps/api آن‌ها را اعمال می‌کنند.

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** ماژول این محصول برای گارد سراسری خاموش/تعمیر (docs/architecture.md §9.11)؛ روی همه‌ی controllerها. */
export const ProductModule = () => SetMetadata(MODULE_KEY, 'norolink' satisfies PlatformModuleKey);
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
/** مدیریت قالب‌های آماده؛ AuthGuard سراسری نقش را از DB بررسی می‌کند (docs/architecture.md §9.11). */
export const SuperAdmin = () => SetMetadata(PLATFORM_ROLES_KEY, ['superadmin'] satisfies PlatformRole[]);

/** انتشار، لغو انتشار و حذف صفحه. ساخت و ویرایش پیش‌نویس برای همه‌ی اعضا آزاد است. */
export const MANAGE_ROLES: MembershipRole[] = ['owner', 'admin'];

/** توکن DI تابع fetch برای دنبال‌کردن لینک کوتاه نقشه (در تست جایگزین می‌شود). */
export const MAP_FETCHER = Symbol.for('noroset:norolink:MapFetcher');

/**
 * پلن مؤثر دامنه‌ی norolink (مدل محصول‌محور §9.11): داشتن پلن نوروفورم/نوروفایل، صفحه‌های لینک را فعال نمی‌کند.
 * پلن ثابت تست‌ها (`fixedPlan`) که `scopes` ندارد ← خودِ پلن (`productPlan` در core).
 */
export function norolinkPlan(plan: ResolvedPlan): { name: string; status: PlanStatus; expired: boolean; endsAt: Date | null; entitlements: Entitlements } {
  return productPlan(plan, 'norolink');
}

/** دامنه‌ی norolink پلن فعال/مهلت ندارد (حتی اگر محصول دیگری اشتراک داشته باشد). */
export function norolinkExpired(plan: ResolvedPlan): boolean {
  return norolinkPlan(plan).expired;
}

/**
 * نمایش در موتورهای جستجو مجاز است؟ سقف `norolink.seo` پلن، ولی **نه در دوره‌ی رایگان ۱۴ روزه** حتی اگر پلن آن را
 * داشته باشد (تصمیم مالک محصول ۱۴۰۵/۸/۲۰: فقط پرداخت‌کننده ایندکس می‌شود؛ سد اصلی اسپم دامنه‌ی مشترک)، و نه با پلن تمام‌شده.
 */
export function seoAllowed(plan: ResolvedPlan): boolean {
  const scoped = norolinkPlan(plan);
  return !scoped.expired && scoped.status !== 'trial' && Boolean(scoped.entitlements['norolink.seo']);
}

/** دلیل بسته بودن سئو برای پیام دیالوگ انتشار (`NorolinkLimits.seoUpsell`)؛ همان قاعده‌ی `seoAllowed`. */
export function seoUpsellFor(plan: ResolvedPlan, seo?: boolean): NorolinkLimits['seoUpsell'] {
  const scoped = norolinkPlan(plan);
  if (seo ?? (!scoped.expired && scoped.status !== 'trial' && Boolean(scoped.entitlements['norolink.seo']))) return null;
  if (scoped.expired || scoped.status === 'limited') return 'buy';
  // دوره‌ی رایگان روی پلنی که سئو دارد: خرید همین پلن بازش می‌کند. پلن بدون سئو (چه رایگان چه پولی) ← ارتقا.
  if (scoped.status === 'trial' && scoped.entitlements['norolink.seo']) return 'trial';
  return 'upgrade';
}

/** سقف‌های norolink از پلن مؤثر همان دامنه (docs/architecture.md §9.11)؛ پلن محصول دیگر سقف اضافه نمی‌کند. */
export async function limitsFor(plans: PlanResolver, tenantId: string): Promise<NorolinkLimits> {
  const plan = norolinkPlan(await plans.resolve(tenantId));
  const e = plan.entitlements;
  const seo = !plan.expired && plan.status !== 'trial' && Boolean(e['norolink.seo']);
  return {
    maxPages: e['norolink.pages'],
    maxElementsPerPage: e['norolink.elements_per_page'],
    allowedKinds: ALL_ELEMENT_KINDS,
    detailedStats: e['norolink.detailed_stats'],
    seo,
    seoUpsell: seo ? null : plan.expired || plan.status === 'limited' ? 'buy' : plan.status === 'trial' && e['norolink.seo'] ? 'trial' : 'upgrade',
    // نشان «Powered by Noroset» روی صفحه‌ی لینک در همه‌ی پلن‌ها (تصمیم مالک محصول ۱۴۰۵/۸/۷)؛ branding.remove فقط برای فرم‌ها
    forceBranding: true,
  };
}

/** پلن فعالی نیست: صفحه منتشر نمی‌شود، چون نمایش عمومی هم بسته است (§9.11). */
export function planExpired(): ForbiddenException {
  return new ForbiddenException('plan_expired');
}

export function planLimit(limit: string): ForbiddenException {
  return new ForbiddenException({ message: 'plan_limit', limit });
}

/** مالک استفاده‌ی فایل در norofile: هر صفحه همه‌ی تصاویر پیش‌نویس، المان‌ها و snapshot خود را ثبت می‌کند. */
export const PAGE_FILE_OWNER = 'norolink_page';

/** تصویر صفحه‌ی عمومی باید فایل public از نوع تصویر همین tenant باشد (وگرنه ۴۲۲ `invalid_asset`). */
export const IMAGE_REQUIREMENT: FileRequirement = { kind: 'image', visibility: 'public' };

/** سقف حجم تصویر نورولینک (سقف عمومی norofile بزرگ‌تر است). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}
