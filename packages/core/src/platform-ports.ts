import type { Db } from '@noroset/db';
import { FREE_ENTITLEMENTS, type EntitlementKey, type Entitlements, type ProductScope } from './entitlements';

// قراردادهای زیرساختی بین apps/api، norofile و محصولات (Port؛ محصولات فقط این قرارداد را می‌شناسند).

/**
 * توکن DI سرویس فایل (docs/architecture.md §9.9). پیاده‌سازی فقط در norofile است و تنها ذخیره‌ساز
 * S3 پلتفرم پشت آن است؛ محصولات دیگر فقط شناسه‌ی فایل نگه می‌دارند و استفاده را ثبت می‌کنند.
 */
export const FILE_SERVICE = Symbol.for('noroset:FileService');

export type FileKind = 'image' | 'document' | 'archive';
export type FileVisibility = 'private' | 'public';

export interface UploadFileInput {
  body: Uint8Array;
  /** نام نمایشی/نام فایل کاربر (پسوند برای تشخیص سند Office لازم است). */
  name?: string;
  /** محصول بارگذار (`[a-z][a-z0-9_]*`)، مثل `norolink`. */
  source: string;
  /** پیش‌فرض: هر نوع مجاز norofile. */
  accept?: 'image' | 'any';
  /** سقف کوچک‌تر از سقف عمومی norofile. */
  maxBytes?: number;
  visibility?: FileVisibility;
}

export interface StoredFile {
  id: string;
  name: string;
  kind: FileKind;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  visibility: FileVisibility;
  /** آدرس عمومی (فقط public)؛ همیشه از مسیر API norofile، نه مستقیم از bucket. */
  url: string | null;
  createdAt: Date;
}

/** مالک منطقی استفاده: type مثل `norolink_page`، id شناسه‌ی همان رکورد. */
export interface FileOwner {
  type: string;
  id: string;
}

export interface FileRequirement {
  kind?: FileKind;
  visibility?: FileVisibility;
}

/** بارگذاری در فضای شخصی کاربر (بدون tenant؛ فعلاً فقط تصویر public، مثل آواتار). */
export interface PersonalUploadInput {
  body: Uint8Array;
  name?: string;
  source: string;
  /** سقف کوچک‌تر از سقف فضای شخصی norofile. */
  maxBytes?: number;
}

export interface FileService {
  /** بارگذاری در tenant همین درخواست؛ نوع از محتوا، سقف حجم و سهمیه‌ی tenant اعمال می‌شود. */
  upload(input: UploadFileInput): Promise<StoredFile>;
  /** بارگذاری تصویر public در فضای شخصی کاربر (docs/architecture.md §9.9). */
  uploadPersonal(userId: string, input: PersonalUploadInput): Promise<StoredFile>;
  /** حذف فایل فضای شخصی همان کاربر (ناموجود ← بی‌اثر)؛ شیء S3 best-effort. */
  removePersonal(userId: string, fileId: string): Promise<void>;
  /**
   * بارگذاری تصویر public در فضای پلتفرم (بدون tenant و سهمیه؛ فقط superadmin، با is_platform_admin() در DB).
   * آدرس عمومی `${publicBaseUrl()}/platform/${id}` است و فایل‌ها حذف نمی‌شوند (docs/architecture.md §9.9).
   */
  uploadPlatform(adminUserId: string, input: PersonalUploadInput): Promise<StoredFile>;
  /**
   * مجموعه‌ی فایل‌های مورد استفاده‌ی یک مالک را دقیقاً برابر `fileIds` می‌کند، داخل تراکنش خود
   * فراخواننده (tx همان tenant). فایل ناموجود/tenant دیگر/ناسازگار با `require` ← ۴۲۲ `invalid_asset`.
   */
  syncUsage(tx: Db, owner: FileOwner, fileIds: string[], require?: FileRequirement): Promise<void>;
  /** پیشوند آدرس عمومی؛ آدرس هر فایل public = `${publicBaseUrl()}/${id}`. */
  publicBaseUrl(): string;
}

/** وضعیت پلن مؤثر tenant (docs/architecture.md §9.11). grace: ۷ روز پس از پایان اشتراک پولی. */
export type PlanStatus = 'limited' | 'active' | 'trial' | 'grace';

/**
 * پلن مؤثر یک محصول (§9.11، مدل محصول‌محور): هر محصول اشتراک خودش را دارد و خرید محصول دیگر روی آن اثری ندارد.
 * `entitlements` این دامنه اجتماع اشتراک‌های پوشش‌دهنده‌ی همان محصول است (شامل امکانات مشترک مثل `branding.remove`).
 */
export interface ScopedPlan {
  scope: ProductScope;
  planId: string;
  code: string;
  name: string;
  rank?: number;
  status: PlanStatus;
  /** پایان دوره‌ی جاری همان دامنه (active/trial) یا پایان مهلت (grace)؛ محدود ← null. */
  endsAt: Date | null;
  entitlements: Entitlements;
  /** این دامنه پلن فعال/مهلت ندارد: محصولش محدود است (حتی اگر محصول دیگری پلن فعال داشته باشد). */
  expired: boolean;
}

export interface ResolvedPlan {
  planId: string;
  code: string;
  name: string;
  rank?: number;
  status: PlanStatus;
  /** پایان دوره‌ی جاری (active/trial) یا پایان مهلت (grace)؛ محدود ← null. */
  endsAt: Date | null;
  /** اجتماع سقف‌های همه‌ی دامنه‌های فعال/مهلت (هیچ اشتراکی سقف دیگری را صفر نمی‌کند). */
  entitlements: Entitlements;
  /** هیچ دامنه‌ای پلن فعال/مهلت ندارد: صفحه‌های لینک غیرفعال‌اند و انتشار بسته است (§9.11). */
  expired?: boolean;
  /** پلن مؤثر هر محصول؛ مرجع رفتار محصول‌محور (norolink ← `scopes.norolink`). */
  scopes?: Partial<Record<ProductScope, ScopedPlan>>;
  /** پلن‌های مؤثر (active/trial/grace) به‌ازای محصول؛ برای نمایش چند اشتراک هم‌زمان. */
  activePlans?: ScopedPlan[];
}

/**
 * پلن مؤثر یک محصول (§9.11): مرجع همه‌ی بررسی‌های محصول‌محور. resolverهای قدیمی/پلن ثابت تست‌ها که `scopes` ندارند ←
 * خودِ پلن کلّی (رفتار تک‌پلنی قبلی)، تا کد محصول در هر دو حالت یکی بماند.
 */
export function productPlan(
  plan: ResolvedPlan,
  product: ProductScope,
): { name: string; status: PlanStatus; expired: boolean; endsAt: Date | null; entitlements: Entitlements } {
  const scoped = plan.scopes?.[product];
  if (scoped) return scoped;
  return { name: plan.name, status: plan.status, expired: Boolean(plan.expired), endsAt: plan.endsAt, entitlements: plan.entitlements };
}

/** توکن DI پلن مؤثر tenant (پیاده‌سازی در ماژول admin، از اشتراک‌ها). */
export const PLAN_RESOLVER = Symbol.for('noroset:PlanResolver');

export interface PlanResolver {
  resolve(tenantId: string): Promise<ResolvedPlan>;
  startTrial?(tenantId: string, userId: string): Promise<boolean>;
  /** جمع پرداخت‌های موفق tenant به ریال (قیف لینک‌های واگذاری در مدیریت پلتفرم). */
  paidRial?(tenantId: string): Promise<number>;
}

/**
 * توکن DI ثبت مصرف سقف‌ها: هر محصول برای کلیدهای عددی خودش تابع اندازه‌گیری ثبت می‌کند (مثلاً تعداد
 * فرم‌ها) و صفحه‌ی اشتراک مصرف را بدون دسترسی به جدول محصولات نشان می‌دهد (§3.5).
 */
export const PLAN_USAGE = Symbol.for('noroset:PlanUsage');

export interface PlanUsageRegistry {
  register(key: EntitlementKey, measure: (tenantId: string) => Promise<number>): void;
  measure(tenantId: string): Promise<Partial<Record<EntitlementKey, number>>>;
}

/** توکن DI درگاه پرداخت (پیاده‌سازی در ماژول admin: زرین‌پال، و درگاه ساختگی برای توسعه/تست). */
export const PAYMENT_GATEWAY = Symbol.for('noroset:PaymentGateway');

export interface PaymentRequest {
  amountRial: number;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
}

export interface PaymentGateway {
  readonly name: 'zarinpal' | 'fake';
  /** شروع پرداخت: شناسه‌ی درگاه و آدرسی که مرورگر کاربر به آن می‌رود. */
  request(input: PaymentRequest): Promise<{ authority: string; redirectUrl: string }>;
  /** تأیید سمت سرور پس از بازگشت؛ مبلغ باید با همان درخواست یکی باشد. */
  verify(input: { authority: string; amountRial: number }): Promise<{ ok: true; refId: string; cardPan: string | null } | { ok: false; reason: string }>;
}

/** PlanResolver ثابت (تست‌ها و ابزارها): پلن فعال با override اختیاری سقف‌ها. */
export function fixedPlan(overrides: Partial<Entitlements> = {}, code = 'basic'): PlanResolver {
  return {
    resolve: async () => ({
      planId: '00000000-0000-0000-0000-000000000000',
      code,
      name: code,
      status: 'active',
      endsAt: null,
      entitlements: { ...FREE_ENTITLEMENTS, ...overrides },
    }),
    startTrial: async () => true,
  };
}
