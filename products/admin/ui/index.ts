// @noroset/admin/ui — قراردادهای نمایشی پنل «مدیریت پلتفرم» (بدون React/Nest؛ وب سورس را مستقیم transpile می‌کند).
// شکل پاسخ‌ها همان API (products/admin/api)؛ تاریخ‌ها در JSON رشته‌ی ISO‌اند.

export type UserStatus = 'active' | 'disabled' | 'blocked';
export type PlatformRole = 'user' | 'superadmin';
export type TenantStatus = 'active' | 'suspended';
export type MembershipRole = 'owner' | 'admin' | 'member';
export type MembershipStatus = 'active' | 'invited' | 'suspended';

export const ADMIN_LABEL = 'مدیریت پلتفرم';

export const USER_STATUS_LABEL: Record<UserStatus, string> = { active: 'فعال', disabled: 'غیرفعال', blocked: 'مسدود' };
export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = { user: 'کاربر', superadmin: 'سوپرادمین' };
export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = { active: 'فعال', suspended: 'معلق' };
export const MEMBERSHIP_ROLE_LABEL: Record<MembershipRole, string> = { owner: 'مالک', admin: 'مدیر', member: 'عضو' };
export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = { active: 'فعال', invited: 'دعوت‌شده', suspended: 'معلق' };

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminOverview {
  users: Record<UserStatus, number>;
  superadmins: number;
  newUsersLast7Days: number;
  tenants: Record<TenantStatus, number>;
}

export interface AdminUserItem {
  id: string;
  mobile: string | null;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  status: UserStatus;
  statusReason: string | null;
  platformRole: PlatformRole;
  hasPassword: boolean;
  tenantCount: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserItem {
  statusChangedAt: string | null;
  updatedAt: string;
  activeSessions: number;
  memberships: {
    tenantId: string;
    name: string;
    slug: string;
    tenantStatus: TenantStatus;
    role: MembershipRole;
    status: MembershipStatus;
  }[];
}

export interface AdminTenantItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  memberCount: number;
  createdAt: string;
}

export interface AdminTenantDetail extends AdminTenantItem {
  updatedAt: string;
  members: {
    userId: string;
    fullName: string;
    mobile: string | null;
    email: string | null;
    userStatus: UserStatus;
    role: MembershipRole;
    status: MembershipStatus;
    joinedAt: string;
  }[];
}

export interface AuditItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; mobile: string | null };
}

const ACTION_LABEL: Record<string, string> = {
  'user.create': 'افزودن کاربر',
  'user.update': 'ویرایش مشخصات کاربر',
  'user.status': 'تغییر وضعیت کاربر',
  'user.role': 'تغییر نقش پلتفرم',
  'user.password': 'تعیین رمز عبور',
  'user.sessions_revoke': 'خروج از همه‌ی دستگاه‌ها',
  'tenant.status': 'تغییر وضعیت فضای کاری',
  'platform_role.cli': 'اعطای نقش از خط فرمان',
  'support.grant': 'ساخت لینک ورود پشتیبانی',
  'support.redeem': 'ورود پشتیبانی به حساب',
  'support.request': 'تغییر در حالت پشتیبانی',
  'support.end': 'پایان ورود پشتیبانی',
  'support.revoke': 'ابطال دسترسی پشتیبانی',
  'module.status': 'تغییر وضعیت ماژول',
  'billing.plan_create': 'ساخت پلن',
  'billing.plan_update': 'ویرایش پلن',
  'billing.settings': 'تغییر مالیات',
  'billing.grant': 'اشتراک دستی',
  'billing.cancel': 'لغو اشتراک',
  'billing.offline_payment': 'ثبت پرداخت آفلاین',
  'campaign.coupon_create': 'ساخت کد تخفیف',
  'campaign.coupon_update': 'ویرایش کد تخفیف',
  'campaign.announcement_create': 'ساخت اعلان',
  'campaign.announcement_update': 'ویرایش اعلان',
  'link_template.create': 'ساخت قالب صفحه‌ی لینک',
  'link_template.publish': 'انتشار قالب صفحه‌ی لینک',
  'link_template.unpublish': 'لغو انتشار قالب صفحه‌ی لینک',
  'link_template.delete': 'حذف قالب صفحه‌ی لینک',
  'link_template.claim_link': 'ساخت لینک واگذاری قالب',
  'link_template.claim_revoke': 'ابطال لینک واگذاری قالب',
  'link_template.builtin_remove': 'حذف قالب پیش‌فرض از گالری',
  'link_template.builtin_restore': 'بازگردانی قالب پیش‌فرض به گالری',
  'link_claim.export': 'دانلود لینک‌های واگذاری',
  'link_page.moderate': 'تغییر وضعیت مدیریتی صفحه‌ی لینک',
  'link_report.resolve': 'رسیدگی به گزارش تخلف صفحه‌ی لینک',
};

/** عنوان فارسی کد کار لاگ ممیزی؛ کد ناشناخته همان کد. */
export function auditActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

// دسترسی پشتیبانی (ورود ادمین به حساب کاربر؛ docs/architecture.md §9.11)

export type SupportGrantStatus = 'pending' | 'active' | 'ended' | 'revoked' | 'expired';

export const SUPPORT_GRANT_STATUS_LABEL: Record<SupportGrantStatus, string> = {
  pending: 'لینک استفاده نشده',
  active: 'فعال',
  ended: 'پایان‌یافته',
  revoked: 'باطل‌شده',
  expired: 'منقضی',
};

/** مدت‌های پیشنهادی (سقف سرور ۶۰ دقیقه). */
export const SUPPORT_MINUTES = [15, 30, 60] as const;

export interface AdminSupportGrant {
  id: string;
  userId: string;
  reason: string;
  status: SupportGrantStatus;
  minutes: number;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  endedAt: string | null;
  revokedAt: string | null;
  revokedBy: 'admin' | 'user' | null;
  admin: { id: string; fullName: string; mobile: string | null };
}

// ماژول‌ها (docs/architecture.md §9.11). منوی پنل هم از همین برچسب‌ها و پیام‌های پیش‌فرض استفاده می‌کند.

export type ModuleKey = 'noroform' | 'norolink' | 'norofile';
export type ModuleStatus = 'active' | 'maintenance' | 'off';

export const MODULE_LABEL: Record<ModuleKey, string> = { noroform: 'نوروفرم', norolink: 'نورولینک', norofile: 'نوروفایل' };
export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = { active: 'فعال', maintenance: 'در حال تعمیر', off: 'خاموش' };
export const MODULE_DEFAULT_MESSAGE: Record<Exclude<ModuleStatus, 'active'>, string> = {
  maintenance: 'این بخش موقتاً در حال به‌روزرسانی است؛ کمی بعد دوباره سر بزنید. صفحه‌ها و فرم‌های منتشرشده در دسترس‌اند.',
  off: 'این بخش در حال حاضر در دسترس نیست.',
};

/** وضعیت عمومی (`GET /modules`). */
export interface ModuleState {
  key: ModuleKey;
  status: ModuleStatus;
  message: string | null;
}

export interface AdminModuleState extends ModuleState {
  updatedAt: string | null;
  updatedBy: { id: string; fullName: string } | null;
}

// پلن، اشتراک و پرداخت (docs/architecture.md §9.11، ۱۱.۶). کلیدهای سقف همان ENTITLEMENTS در core‌اند؛ اینجا فقط
// برچسب و واحد نمایش (وب به core وابسته نیست).

export type EntitlementKey =
  | 'noroform.forms'
  | 'noroform.submissions_monthly'
  | 'norolink.pages'
  | 'norolink.elements_per_page'
  | 'norolink.detailed_stats'
  | 'norolink.seo'
  | 'norofile.storage_mb'
  | 'branding.remove';

export type PlanModuleKey = 'norolink' | 'norofile' | 'noroform';

export interface PlanModuleMeta {
  key: PlanModuleKey;
  label: string;
  description: string;
}

export const PLAN_MODULE_META: PlanModuleMeta[] = [
  { key: 'norolink', label: 'نورولینک (صفحه‌ساز و بیولینک)', description: 'ساخت صفحات معرفی، دکمه‌های تماس و شبکه‌های اجتماعی' },
  { key: 'norofile', label: 'نوروفایل (میزبانی و مدیریت فایل)', description: 'فضای ذخیره‌سازی ابری فایل و تصاویر' },
  { key: 'noroform', label: 'نوروفرم (فرم‌ساز هوشمند)', description: 'ساخت انواع فرم، نظرسنجی و دریافت پاسخ‌ها' },
];

export interface EntitlementMetaItem {
  key: EntitlementKey;
  label: string;
  kind: 'number' | 'boolean';
  module: PlanModuleKey | null;
  unit?: string;
  usage?: boolean;
  /**
   * فقط با اشتراک خریداری‌شده (یا دستی) فعال است، نه در دوره‌ی رایگان، حتی اگر پلن آن را داشته باشد
   * (docs/architecture.md §9.1 و §9.11؛ اعمال در محصول، مثلاً norolink `seoAllowed`). متن یک‌خطی برای UI.
   */
  paidOnly?: string;
}

export const ENTITLEMENT_META: EntitlementMetaItem[] = [
  { key: 'norolink.pages', label: 'صفحه‌ی لینک', kind: 'number', module: 'norolink', unit: 'صفحه', usage: true },
  { key: 'norolink.elements_per_page', label: 'المان در هر صفحه', kind: 'number', module: 'norolink', unit: 'المان' },
  { key: 'norolink.detailed_stats', label: 'آمار کامل', kind: 'boolean', module: 'norolink' },
  {
    key: 'norolink.seo',
    label: 'امکان نمایش در نتایج گوگل (SEO)',
    kind: 'boolean',
    module: 'norolink',
    paidOnly: 'در دوره‌ی رایگان بسته است و با خرید اشتراک فعال می‌شود',
  },
  { key: 'norofile.storage_mb', label: 'فضای فایل', kind: 'number', module: 'norofile', unit: 'مگابایت', usage: true },
  { key: 'noroform.forms', label: 'تعداد فرم', kind: 'number', module: 'noroform', unit: 'فرم', usage: true },
  { key: 'noroform.submissions_monthly', label: 'پاسخ در ماه', kind: 'number', module: 'noroform', unit: 'پاسخ', usage: true },
  { key: 'branding.remove', label: 'حذف نشان نوروست از فرم‌ها', kind: 'boolean', module: null },
];

/** بررسی فعال بودن یک ماژول بر اساس سقف‌های موجود در پلن */
export function isModuleActiveInPlan(
  entitlements: Partial<Entitlements> | Record<string, unknown> | null | undefined,
  modKey: PlanModuleKey,
): boolean {
  if (!entitlements) return false;
  if (modKey === 'norolink') {
    return Number(entitlements['norolink.pages'] ?? 0) > 0 || Number(entitlements['norolink.elements_per_page'] ?? 0) > 0;
  }
  if (modKey === 'norofile') {
    return Number(entitlements['norofile.storage_mb'] ?? 0) > 0;
  }
  if (modKey === 'noroform') {
    return Number(entitlements['noroform.forms'] ?? 0) > 0 || Number(entitlements['noroform.submissions_monthly'] ?? 0) > 0;
  }
  return true;
}

export type Entitlements = Record<EntitlementKey, number | boolean>;
export type PlanStatus = 'limited' | 'active' | 'trial' | 'grace';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled';
export type PaymentKind = 'purchase' | 'upgrade' | 'queued' | 'addon';
export type SubscriptionSource = 'payment' | 'manual' | 'trial';

/**
 * دامنه‌ی پلن (docs/architecture.md §9.11): هر پلن یک محصول را پوشش می‌دهد و `bundle` همه را؛ خرید محصول دیگر
 * اشتراک فعلی را جایگزین نمی‌کند (افزودنی است).
 */
export type PlanScope = 'norolink' | 'noroform' | 'norofile' | 'bundle';
export const PLAN_SCOPE_LABEL: Record<PlanScope, string> = {
  norolink: 'نورولینک',
  noroform: 'نوروفرم',
  norofile: 'نوروفایل',
  bundle: 'هر سه محصول',
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { limited: 'محدود', active: 'فعال', trial: 'رایگان ۱۴ روزه', grace: 'مهلت تمدید' };
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { pending: 'در انتظار', paid: 'پرداخت‌شده', failed: 'ناموفق', canceled: 'لغوشده' };
export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  purchase: 'خرید',
  upgrade: 'ارتقا',
  queued: 'تمدید / تغییر از پایان دوره',
  addon: 'افزودنی (محصول دیگر)',
};
export const SUBSCRIPTION_SOURCE_LABEL: Record<SubscriptionSource, string> = { payment: 'پرداخت', manual: 'دستی (مدیر)', trial: 'رایگان ۱۴ روزه' };
export const GATEWAY_LABEL: Record<string, string> = { zarinpal: 'زرین‌پال', fake: 'درگاه آزمایشی', manual: 'ثبت دستی' };

/** مبلغ ریال ← «۱۲۳٬۰۰۰ تومان». */
export function formatToman(rial: number): string {
  return `${Math.round(rial / 10).toLocaleString('fa-IR')} تومان`;
}

export interface PlanPrice {
  months: number;
  priceRial: number;
  discountPercent?: number;
}

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  /** محصول پلن؛ ارتقا/تمدید فقط داخل همین دامنه معنا دارد (§9.11). */
  scope: PlanScope;
  rank: number;
  active: boolean;
  entitlements: Entitlements;
  prices: PlanPrice[];
  updatedAt: string;
}

/** پلن مؤثر یک محصول (§9.11)؛ `entitlements` اجتماع همه‌ی اشتراک‌های پوشش‌دهنده‌ی همان دامنه است. */
export interface ScopedPlan {
  scope: PlanScope;
  planId: string;
  code: string;
  name: string;
  rank?: number;
  status: PlanStatus;
  endsAt: string | null;
  entitlements: Entitlements;
  /** این محصول پلن فعال/مهلت ندارد، حتی اگر محصول دیگری اشتراک داشته باشد. */
  expired: boolean;
}

export interface ResolvedPlan {
  planId: string;
  code: string;
  name: string;
  rank?: number;
  status: PlanStatus;
  endsAt: string | null;
  /** اجتماع سقف‌های همه‌ی محصولات فعال (فقط برای نمایش کلّی/سازگاری). */
  entitlements: Entitlements;
  /** هیچ محصولی پلن فعال/مهلت ندارد. */
  expired?: boolean;
  /** پلن مؤثر هر محصول؛ مرجع رفتار محصول‌محور (مثلاً `scopes.norolink`). */
  scopes?: Partial<Record<PlanScope, ScopedPlan>>;
  /** پلن‌های مؤثر (فعال/آزمایشی/مهلت) به‌ازای محصول؛ برای نمایش چند اشتراک هم‌زمان. */
  activePlans?: ScopedPlan[];
}

export interface QueuedSubscriptionView {
  id: string;
  planId: string;
  planName: string;
  /** محصول رزرو؛ رزرو فقط زنجیره‌ی همان دامنه را ادامه می‌دهد. */
  scope: PlanScope;
  startsAt: string;
  endsAt: string;
  /** پرداخت‌شده؛ بازپرداخت نداریم، پس کاربر آن را لغو نمی‌کند. */
  paid: boolean;
}

export interface BillingOverview {
  plan: ResolvedPlan;
  plans: BillingPlan[];
  vatPercent: number;
  queued: QueuedSubscriptionView[];
  usage: Partial<Record<EntitlementKey, number>>;
  canManage: boolean;
}

export interface Quote {
  planId: string;
  months: number;
  kind: PaymentKind;
  startsAt: string;
  endsAt: string;
  /** روزهای باقی‌مانده‌ی دوره‌ی رایگان که به انتهای اشتراک اضافه می‌شود. */
  trialCarryDays: number;
  subtotalRial: number;
  creditRial: number;
  discountRial: number;
  vatPercent: number;
  vatRial: number;
  totalRial: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  number: number;
  planId: string;
  planName: string;
  months: number;
  kind: PaymentKind;
  subtotalRial: number;
  creditRial: number;
  discountRial: number;
  vatPercent: number;
  vatRial: number;
  totalRial: number;
  status: PaymentStatus;
  gateway: string;
  refId: string | null;
  cardPan: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface SubscriptionItem {
  id: string;
  planId: string;
  planName: string;
  source: SubscriptionSource;
  startsAt: string;
  endsAt: string;
  paymentId: string | null;
  note: string | null;
  canceledAt: string | null;
  createdAt: string;
}

export interface AdminTenantBilling {
  plan: ResolvedPlan;
  usage: Partial<Record<EntitlementKey, number>>;
  subscriptions: SubscriptionItem[];
  payments: Payment[];
}

// کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷)

export type CouponKind = 'percent' | 'fixed';
export type AnnouncementTone = 'info' | 'warning' | 'success';
export type AnnouncementAudience = 'all_members' | 'managers';
export type AnnouncementTarget = 'all' | 'plans' | 'tenants';

export const ANNOUNCEMENT_TONE_LABEL: Record<AnnouncementTone, string> = { info: 'اطلاع', warning: 'هشدار', success: 'موفقیت' };
export const ANNOUNCEMENT_AUDIENCE_LABEL: Record<AnnouncementAudience, string> = { all_members: 'همه‌ی اعضا', managers: 'فقط مالک و مدیر' };
export const ANNOUNCEMENT_TARGET_LABEL: Record<AnnouncementTarget, string> = { all: 'همه‌ی فضاهای کاری', plans: 'پلن‌های مشخص', tenants: 'فضاهای کاری مشخص' };

export interface Coupon {
  id: string;
  code: string;
  description: string;
  kind: CouponKind;
  /** percent: درصد؛ fixed: ریال. */
  amount: number;
  maxUses: number | null;
  maxUsesPerTenant: number | null;
  planIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  usedCount: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: AnnouncementTone;
  audience: AnnouncementAudience;
  targetType: AnnouncementTarget;
  targetIds: string[];
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  /** فعال و در بازه‌ی نمایش (ساعت سرور). */
  live: boolean;
  createdAt: string;
}

/** اعلانی که کاربر پنل می‌بیند (بدون هدف‌ها). */
export interface PanelAnnouncement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: AnnouncementTone;
}

export interface UtmRow {
  source: string;
  medium: string;
  campaign: string;
  signups: number;
  paying: number;
  revenueRial: number;
}
