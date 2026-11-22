// کنترل صفحه‌ها از سوی مدیریت پلتفرم (docs/architecture.md §9.13): وضعیتی جدا از وضعیت انتشار مالک که فقط superadmin
// عوضش می‌کند، و گزارش تخلف بازدیدکننده‌ها. موتور خالص؛ مشترک API، صفحه‌ی عمومی، پنل مالک و پنل ادمین.

/**
 * - `none`: بدون محدودیت.
 * - `delisted`: صفحه بالا می‌ماند ولی از دایرکتوری و sitemap بیرون و noindex است.
 * - `warning`: پیش از محتوا صفحه‌ی هشدار می‌آید (مثل هشدار فیشینگ مرورگرها)؛ noindex و بیرون از دایرکتوری.
 * - `suspended`: محتوا برنمی‌گردد؛ دستور مرجع قانونی ← ۴۵۱، بقیه ← ۴۰۳.
 * در `warning` و `suspended` مالک نمی‌تواند منتشر کند، نشانی را عوض کند یا صفحه را حذف کند (نگه‌داری مدرک)؛
 * ویرایش پیش‌نویس و لغو انتشار آزاد است.
 */
export const MODERATION_STATUSES = ['none', 'delisted', 'warning', 'suspended'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_REASONS = [
  'legal_order',
  'phishing',
  'malware',
  'scam',
  'impersonation',
  'intellectual_property',
  'illegal_content',
  'hate_violence',
  'adult',
  'privacy',
  'spam',
  'other',
] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  none: 'بدون محدودیت',
  delisted: 'حذف از فهرست‌ها',
  warning: 'نمایش با هشدار',
  suspended: 'تعلیق',
};

export const MODERATION_STATUS_HINTS: Record<ModerationStatus, string> = {
  none: 'صفحه طبق تنظیمات مالک نمایش داده می‌شود.',
  delisted: 'صفحه باز می‌ماند ولی از دایرکتوری، sitemap و موتورهای جستجو بیرون می‌رود.',
  warning: 'بازدیدکننده پیش از دیدن صفحه هشدار می‌بیند. انتشار، تغییر نشانی و حذف برای مالک قفل است.',
  suspended: 'محتوا نمایش داده نمی‌شود. انتشار، تغییر نشانی و حذف برای مالک قفل است.',
};

export const MODERATION_REASON_LABELS: Record<ModerationReason, string> = {
  legal_order: 'دستور مرجع قانونی',
  phishing: 'فیشینگ',
  malware: 'بدافزار',
  scam: 'کلاهبرداری',
  impersonation: 'جعل هویت',
  intellectual_property: 'نقض حق مالکیت معنوی',
  illegal_content: 'محتوای غیرقانونی',
  hate_violence: 'نفرت‌پراکنی یا خشونت',
  adult: 'محتوای نامناسب',
  privacy: 'نقض حریم خصوصی',
  spam: 'اسپم',
  other: 'سایر',
};

/** دلیل‌هایی که بازدیدکننده در فرم گزارش تخلف انتخاب می‌کند (دستور مرجع قانونی فقط از سوی ادمین). */
export const REPORT_REASONS = [
  'phishing',
  'scam',
  'impersonation',
  'intellectual_property',
  'illegal_content',
  'hate_violence',
  'adult',
  'privacy',
  'spam',
  'other',
] as const satisfies readonly ModerationReason[];
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'در انتظار بررسی',
  actioned: 'اقدام شد',
  dismissed: 'رد شد',
};

/** سقف‌ها (همان CHECKهای migration ‏0026). */
export const MODERATION_NOTICE_MAX = 500;
/** همان سقف `admin_audit_log.reason` (یادداشت داخلی آن‌جا ذخیره می‌شود). */
export const MODERATION_NOTE_MAX = 500;
export const MODERATION_REFERENCE_MAX = 200;
export const REPORT_DETAILS_MAX = 2000;
export const REPORT_CONTACT_MAX = 200;
/** محدودیت موقت: حداکثر یک سال. */
export const MODERATION_MAX_DAYS = 365;

/** وضعیت ذخیره‌شده‌ی صفحه (ستون‌های `moderation_*`). */
export interface StoredModeration {
  status: ModerationStatus;
  reason: ModerationReason | null;
  notice: string | null;
  until: Date | string | null;
}

/** وضعیت مؤثر: محدودیت موقتی که مهلتش گذشته خودکار برداشته می‌شود (بدون job؛ ستون‌ها برای سابقه می‌مانند). */
export function effectiveModeration(m: StoredModeration, now: Date = new Date()): ModerationStatus {
  if (m.status === 'none') return 'none';
  if (m.until !== null && new Date(m.until).getTime() <= now.getTime()) return 'none';
  return m.status;
}

/** مالک نمی‌تواند منتشر کند، نشانی را عوض کند یا حذف کند. */
export function moderationLocks(status: ModerationStatus): boolean {
  return status === 'warning' || status === 'suspended';
}

/** صفحه در دایرکتوری، sitemap و ایندکس موتور جستجو می‌آید؟ */
export function moderationAllowsListing(status: ModerationStatus): boolean {
  return status === 'none';
}

/** وضعیت HTTP صفحه‌ی تعلیق‌شده: ۴۵۱ (RFC 7725) فقط برای دستور مرجع قانونی. */
export function suspendedHttpStatus(reason: ModerationReason | null): 451 | 403 {
  return reason === 'legal_order' ? 451 : 403;
}

/** متن پیش‌فرض بازدیدکننده وقتی ادمین پیام عمومی ننوشته است. */
export function defaultModerationNotice(status: ModerationStatus, reason: ModerationReason | null): string {
  if (status === 'suspended') {
    return reason === 'legal_order'
      ? 'دسترسی به این صفحه به دستور مرجع قانونی محدود شده است.'
      : 'این صفحه به دلیل نقض قوانین استفاده از نورولینک در دسترس نیست.';
  }
  if (status === 'warning') {
    return reason === 'phishing' || reason === 'malware' || reason === 'scam'
      ? 'این صفحه ممکن است برای فریب شما و گرفتن اطلاعات حساب یا پول ساخته شده باشد. اطلاعات بانکی، رمز یا کد تأیید وارد نکنید.'
      : 'این صفحه به دلیل گزارش‌های دریافتی در حال بررسی است. با احتیاط ادامه دهید.';
  }
  return '';
}
