import { routes } from './routes';

// کلاینت API مرورگر. همه‌ی درخواست‌ها از /api همین origin (Next rewrite) می‌روند تا cookieها
// first-party بمانند. با ۴۰۱ یک‌بار refresh می‌شود و درخواست تکرار می‌شود.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }

  /** پیام ادمین در خطای ماژول خاموش/در حال تعمیر (۵۰۳). */
  get notice(): string | undefined {
    const b = this.body as { notice?: unknown } | null;
    return typeof b?.notice === 'string' && b.notice ? b.notice : undefined;
  }

  /** کد ماشینی خطا (message در پاسخ Nest). */
  get code(): string | undefined {
    const b = this.body as { message?: unknown } | null;
    return typeof b?.message === 'string' ? b.message : undefined;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** هدر X-Tenant-Id برای routeهای tenant-scoped. */
  tenantId?: string;
  /** بدنه‌ی خام (مثلاً فایل تصویر) به‌جای JSON؛ Content-Type از نوع فایل. */
  rawBody?: Blob;
  /** هدرهای اضافه (مثلاً `x-file-name`). */
  headers?: Record<string, string>;
}

const SUPPORT_ENDED = 'support_session_ended';

let refreshing: Promise<boolean> | null = null;

/** درخواست‌های هم‌زمان ۴۰۱ فقط یک refresh می‌سازند. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function rawApi(path: string, options: ApiOptions = {}): Promise<Response> {
  const send = () =>
    fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        ...(options.rawBody
          ? { 'content-type': options.rawBody.type || 'application/octet-stream' }
          : options.body !== undefined
            ? { 'content-type': 'application/json' }
            : {}),
        ...(options.tenantId ? { 'x-tenant-id': options.tenantId } : {}),
        ...options.headers,
      },
      body: options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });

  let res = await send();
  if (res.status === 401 && (await res.clone().json().catch(() => null))?.message === SUPPORT_ENDED) {
    // نشست پشتیبانی تمام شده (ابطال/انقضا): کوکی‌اش پاک و ادمین به پنل مدیریت برمی‌گردد.
    await fetch('/api/auth/support/end', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    window.location.assign(routes.admin.home);
    throw new ApiError(res.status, { message: SUPPORT_ENDED });
  }
  // endpointهای عمومی auth (ورود/refresh) با ۴۰۱ دوباره امتحان نمی‌شوند؛ /auth/password نشست می‌خواهد.
  const retryable = !path.startsWith('/auth/') || path === '/auth/password' || path === '/auth/support/redeem';
  if (res.status === 401 && retryable && (await refreshSession())) res = await send();
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await rawApi(path, options);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const MESSAGES: Record<string, string> = {
  slug_taken: 'این نشانی قبلاً گرفته شده است.',
  slug_change_limit: 'سقف تغییر نشانی این صفحه پر شده است.',
  page_moderated: 'این صفحه توسط مدیریت نوروست محدود شده است؛ انتشار، تغییر نشانی و حذف تا رفع محدودیت ممکن نیست.',
  moderation_reason_required: 'دسته‌ی دلیل را انتخاب کنید.',
  report_resolved: 'به این گزارش قبلاً رسیدگی شده است.',
  slug_reserved: 'این نشانی رزرو شده است.',
  'slug already taken': 'این نشانی قبلاً گرفته شده است.',
  'slug is reserved': 'این نشانی رزرو شده است.',
  invalid_definition: 'فرم هنوز مشکل دارد و قابل انتشار نیست.',
  definition_too_large: 'فرم بیش از حد بزرگ است.',
  'invalid mobile': 'شماره موبایل معتبر نیست.',
  'insufficient role': 'برای این کار دسترسی ندارید.',
  'invalid code': 'کد واردشده درست نیست.',
  'invalid or expired code': 'کد واردشده درست نیست یا منقضی شده است.',
  'too many attempts': 'تلاش‌های ناموفق زیاد بود؛ کد جدید بگیرید.',
  'invalid credentials': 'شماره موبایل یا رمز عبور درست نیست.',
  'weak password': 'رمز عبور باید ۸ تا ۱۲۸ کاراکتر باشد.',
  'current password required': 'رمز فعلی را وارد کنید.',
  'invalid current password': 'رمز فعلی درست نیست.',
  plan_limit: 'به سقف پلن فعلی رسیده‌اید.',
  plan_expired: 'پلن شما تمام شده است؛ برای انتشار صفحه، پلن بخرید.',
  invalid_video_url: 'لینک ویدیو شناخته نشد؛ لینک آپارات، یوتیوب یا ویمیو وارد کنید.',
  invalid_map_url: 'مکان از این لینک پیدا نشد؛ لینک اشتراک مکان در گوگل‌مپ، نشان یا بلد را وارد کنید.',
  invalid_file: 'فایل معتبر نیست یا نوع آن پشتیبانی نمی‌شود (تصویر PNG/JPEG/WebP/GIF، PDF، Word/Excel/PowerPoint یا ZIP).',
  file_too_large: 'حجم فایل بیش از حد مجاز است.',
  storage_quota: 'فضای ذخیره‌سازی این فضای کاری پر شده است.',
  file_in_use: 'این فایل در حال استفاده است؛ اول آن را از محل استفاده بردارید.',
  public_not_allowed: 'فقط تصویر و PDF می‌توانند لینک عمومی داشته باشند.',
  invalid_origin: 'این درخواست از نشانی مجاز نیامده است؛ صفحه را از noroset.com باز کنید.',
  invalid_asset: 'تصویر انتخاب‌شده معتبر نیست.',
  invalid_settings: 'مقدارهای واردشده معتبر نیستند.',
  invalid_full_name: 'نام باید ۱ تا ۲۰۰ کاراکتر باشد.',
  invalid_content: 'تنظیمات صفحه معتبر نیست.',
  not_publishable: 'صفحه هنوز کامل نیست و قابل انتشار نیست.',
  account_blocked: 'این حساب مسدود شده است؛ با پشتیبانی تماس بگیرید.',
  account_disabled: 'این حساب غیرفعال شده است؛ با پشتیبانی تماس بگیرید.',
  // مدیریت پلتفرم
  platform_role_required: 'برای مدیریت پلتفرم دسترسی ندارید.',
  invalid_mobile: 'شماره موبایل معتبر نیست.',
  mobile_taken: 'کاربری با این شماره موبایل وجود دارد.',
  weak_password: 'رمز عبور باید ۸ تا ۱۲۸ کاراکتر باشد.',
  reason_required: 'دلیل را بنویسید (حداکثر ۵۰۰ کاراکتر).',
  cannot_modify_self: 'نقش، وضعیت و رمز خودتان را از اینجا نمی‌توانید تغییر دهید.',
  invalid_slug: 'نشانی فقط حروف کوچک انگلیسی، عدد و خط تیره (۲ تا ۶۴ کاراکتر).',
  invalid_tenant_name: 'نام فضای کاری باید ۱ تا ۲۰۰ کاراکتر باشد.',
  // بلاگ
  invalid_post_slug: 'نشانی فقط حروف فارسی یا انگلیسی کوچک، عدد و خط تیره است (حداکثر ۱۲۰ نویسه، نه category، tag، feed، page، search یا author).',
  invalid_term_slug: 'نشانی فقط حروف فارسی یا انگلیسی کوچک، عدد و خط تیره است.',
  invalid_blog_content: 'ساختار محتوای مقاله معتبر نیست.',
  content_too_large: 'مقاله بیش از حد بزرگ است؛ آن را به چند مقاله تقسیم کنید.',
  invalid_canonical: 'آدرس canonical باید کامل و با https:// باشد.',
  invalid_category: 'دسته‌ی انتخاب‌شده پیدا نشد.',
  invalid_tag: 'نام برچسب معتبر نیست.',
  too_many_tags: 'حداکثر ۱۵ برچسب.',
  invalid_published_at: 'تاریخ انتشار باید گذشته باشد و فقط برای مقاله‌ی منتشرشده.',
  name_required: 'نام را بنویسید.',
  body_required: 'متن را بنویسید.',
  comments_closed: 'نظرهای این مقاله بسته است.',
  invalid_parent: 'نظری که به آن پاسخ می‌دهید پیدا نشد.',
  // ورود پشتیبانی
  impersonation_forbidden: 'این کار در حالت پشتیبانی مجاز نیست.',
  cannot_impersonate_admin: 'ورود به حساب مدیران پلتفرم مجاز نیست.',
  user_inactive: 'این کاربر فعال نیست.',
  support_grant_closed: 'این دسترسی دیگر فعال نیست.',
  support_link_invalid: 'لینک ورود پشتیبانی معتبر نیست.',
  support_link_not_yours: 'این لینک برای مدیر دیگری ساخته شده است.',
  support_link_used: 'این لینک قبلاً استفاده شده است.',
  support_link_expired: 'مهلت این لینک تمام شده است.',
  support_session_ended: 'نشست پشتیبانی پایان یافته است.',
  module_maintenance: 'این بخش موقتاً در حال به‌روزرسانی است؛ کمی بعد دوباره تلاش کنید.',
  module_off: 'این بخش در حال حاضر در دسترس نیست.',
  unknown_module: 'ماژول ناشناخته است.',
  invalid_message: 'پیام حداکثر ۵۰۰ کاراکتر است.',
  // اشتراک و پرداخت
  plan_not_found: 'پلن پیدا نشد.',
  plan_inactive: 'این پلن فعلاً قابل خرید نیست.',
  period_not_available: 'این دوره برای این پلن تعریف نشده است.',
  pending_subscription: 'یک خرید زمان‌بندی‌شده دارید؛ تا شروع آن خرید دیگری ممکن نیست.',
  gateway_unavailable: 'درگاه پرداخت در دسترس نیست؛ کمی بعد دوباره تلاش کنید.',
  invalid_entitlements: 'مقدار سقف‌ها معتبر نیست.',
  invalid_prices: 'دوره‌ها باید ۱ تا ۳۶ ماه، یکتا و قیمت‌ها عدد صحیح باشند.',
  invalid_plan: 'نام یا توضیح پلن معتبر نیست.',
  plan_code_taken: 'این شناسه قبلاً استفاده شده است.',
  plan_code_immutable: 'شناسه‌ی پلن قابل تغییر نیست.',
  // دوره‌ی رایگان و اشتراک‌های هم‌زمان (مدل محصول‌محور)
  trial_used: 'دوره‌ی رایگان فقط یک‌بار برای هر کاربر فعال می‌شود.',
  trial_disabled: 'دوره‌ی رایگان فعلاً فعال نیست.',
  subscription_exists: 'برای این محصول اشتراک فعال یا زمان‌بندی‌شده دارید.',
  subscription_not_found: 'اشتراک پیدا نشد.',
  cannot_cancel_active_subscription: 'اشتراکی که شروع شده قابل لغو نیست.',
  // کمپین‌ها
  coupon_invalid: 'کد تخفیف معتبر نیست یا مهلتش تمام شده است.',
  coupon_not_for_plan: 'این کد تخفیف برای این پلن نیست.',
  coupon_exhausted: 'ظرفیت این کد تخفیف تمام شده است.',
  coupon_used: 'این کد تخفیف قبلاً برای این فضای کاری استفاده شده است.',
  invalid_coupon: 'کد (۳ تا ۳۲ حرف انگلیسی، عدد، - یا _) یا مقدار تخفیف معتبر نیست.',
  coupon_code_taken: 'این کد قبلاً ساخته شده است.',
  coupon_immutable: 'کد و نوع تخفیف قابل تغییر نیستند.',
  invalid_announcement: 'عنوان (حداکثر ۱۲۰) یا متن (حداکثر ۱۰۰۰ کاراکتر) یا بازه‌ی نمایش معتبر نیست.',
  invalid_link: 'لینک باید https یا مسیری از پنل (مثل /billing) باشد.',
  invalid_targets: 'فهرست هدف معتبر نیست.',
  invalid_starts_at: 'زمان شروع معتبر نیست.',
  invalid_ends_at: 'زمان پایان معتبر نیست.',
  claim_link_invalid_or_expired: 'لینک واگذاری معتبر نیست یا قبلاً تحویل گرفته شده است.',
  paid_reservation: 'دوره‌ی پرداخت‌شده لغو نمی‌شود؛ برای تغییر با پشتیبانی تماس بگیرید.',
};

/** پیام فارسی برای نمایش به کاربر. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.notice && err.code?.startsWith('module_')) return err.notice;
    if (err.code && MESSAGES[err.code]) return MESSAGES[err.code]!;
    if (err.status === 429) return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.';
    if (err.status === 401) return 'نشست شما منقضی شده است؛ دوباره وارد شوید.';
    if (err.status === 403) return 'برای این کار دسترسی ندارید.';
    if (err.status === 404) return 'پیدا نشد.';
    if (err.status >= 500) return 'خطای سرور؛ کمی بعد دوباره تلاش کنید.';
    return 'درخواست نامعتبر است.';
  }
  return 'ارتباط با سرور برقرار نشد.';
}
