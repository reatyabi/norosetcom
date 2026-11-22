export * from './schema';

// query helpers (برای مصرف‌کنندگان، بدون وابستگی مستقیم به drizzle-orm)
export { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql, type SQL } from 'drizzle-orm';

// withSetting عمداً export نمی‌شود.
export { db, withPlatformAdmin, withTenant, withUser, type Db } from './connection';

// مسیر ویژه‌ی فرم عمومی noroform (ناشناس؛ فقط خواندن نسخه‌ی منتشرشده و INSERT پاسخ).
export {
  findPublicForm,
  insertPublicSubmission,
  type PublicForm,
  type PublicSubmissionInput,
  type PublicSubmissionResult,
} from './noroform-public';

// مسیر ویژه‌ی اجرای فرم داخلی (عضو فعال همان workspace؛ فقط نسخه‌ی منتشرشده).
export {
  findInternalForm,
  insertInternalSubmission,
  type InternalForm,
  type InternalSubmissionInput,
  type InternalSubmissionResult,
} from './noroform-internal';

// مسیر ویژه‌ی مشاهده‌ی بیرونی یک پاسخ (ناشناس؛ فقط همان پاسخِ لینک‌شده).
export {
  createResponseLink,
  findResponseForLink,
  findResponseLink,
  revokeResponseLinks,
  revokeResponseLinksForForm,
  type CreateResponseLinkInput,
  type LinkedResponse,
  type ResponseLink,
} from './noroform-response';

// مسیر ویژه‌ی صفحه‌ی لینک عمومی norolink (ناشناس؛ فقط خواندن snapshot منتشرشده و INSERT رویداد).
export {
  findPublicLinkPage,
  insertPublicLinkEvent,
  type PublicLinkEventInput,
  type PublicLinkEventResult,
  type PublicLinkPage,
  findPublicLinkRedirect,
  findClaimableTemplate,
  claimNorolinkTemplate,
  checkNorolinkSlug,
  type ClaimableTemplate,
  type SlugCheckResult,
  listPublicDirectoryPages,
  listPublicSitemapPages,
  type PublicSitemapPage,
  type PublicDirectoryPage,
  type ListDirectoryOptions,
  insertPublicPageReport,
  type PageModeration,
  type PageModerationReason,
  type PageModerationStatus,
  type PageReportReason,
  type PublicPageReportInput,
  type PublicPageReportResult,
} from './norolink-public';

// مسیر ویژه‌ی فایل عمومی norofile (ناشناس؛ فقط خواندن متادیتای یک فایل public).
export { findPlatformFile, findPublicFile, type PublicFile } from './norofile-public';

// بررسی نشست پشتیبانی (ورود ادمین به حساب کاربر؛ فقط خواندن یک ردیف).
export {
  findSupportGrant,
  isSupportGrantLive,
  supportGrantStatus,
  type SupportGrantState,
  type SupportGrantStatus,
} from './support-access';

// وضعیت سراسری ماژول‌ها (فقط خواندن؛ نوشتن با withPlatformAdmin).
export { readModuleStates, type ModuleStateRow } from './platform-modules';

// بازگشت از درگاه پرداخت (ناشناس؛ فقط پیدا کردن همان یک پرداخت با authority).
export { findPaymentByAuthority, type CallbackPayment } from './billing-callback';
