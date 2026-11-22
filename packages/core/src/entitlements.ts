// سقف‌های پلن (entitlement؛ docs/architecture.md §9.11 «تصمیم‌های ۱۱.۶»). کلیدها و مقدار پیش‌فرض (`free`) در کد
// و گروه‌بندی‌شده به‌ازای ماژول؛ هر پلن در DB فقط مقدار همین کلیدها را دارد و کلید بی‌مقدار ← مقدار پیش‌فرض.
// محصول جدید = چند کلید اینجا + خواندن آن‌ها از PLAN_RESOLVER.

export const ENTITLEMENTS = {
  'noroform.forms': { kind: 'number', module: 'noroform', free: 3 },
  /** سقف نرم: پاسخ‌های بیشتر ذخیره ولی در نمایش قفل می‌شوند (ماه شمسی، وقت تهران). */
  'noroform.submissions_monthly': { kind: 'number', module: 'noroform', free: 100 },
  'norolink.pages': { kind: 'number', module: 'norolink', free: 1 },
  'norolink.elements_per_page': { kind: 'number', module: 'norolink', free: 30 },
  'norolink.detailed_stats': { kind: 'boolean', module: 'norolink', free: false },
  /** امکان نمایش در نتایج جست‌وجوی گوگل (ایندکس شدن صفحه). */
  'norolink.seo': { kind: 'boolean', module: 'norolink', free: false },
  'norofile.storage_mb': { kind: 'number', module: 'norofile', free: 100 },
  /** حذف نشان «ساخته‌شده با نوروست» از فرم عمومی (صفحه‌ی لینک در همه‌ی پلن‌ها نشان دارد). */
  'branding.remove': { kind: 'boolean', module: null, free: false },
} as const;

export type EntitlementKey = keyof typeof ENTITLEMENTS;
export const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENTS) as EntitlementKey[];

export type Entitlements = {
  [K in EntitlementKey]: (typeof ENTITLEMENTS)[K]['kind'] extends 'number' ? number : boolean;
};

// دامنه‌ی محصولی پلن (docs/architecture.md §9.11): هر پلن مال یک محصول است؛ خرید/تمدید/ارتقا فقط داخل همان
// دامنه معنا دارد و اشتراک‌های محصولات مختلف کنار هم می‌مانند. `bundle` هر سه محصول را پوشش می‌دهد.
export const PLAN_SCOPES = ['norolink', 'noroform', 'norofile', 'bundle'] as const;
export type PlanScope = (typeof PLAN_SCOPES)[number];
/** محصول (دامنه)؛ `bundle` محصول نیست، پوشش همه‌ی محصولات است. */
export type ProductScope = Exclude<PlanScope, 'bundle'>;
export const PRODUCT_SCOPES: ProductScope[] = ['norolink', 'noroform', 'norofile'];

/** آیا پلنی با این دامنه، این محصول را پوشش می‌دهد؟ */
export function planCovers(scope: PlanScope, product: ProductScope): boolean {
  return scope === 'bundle' || scope === product;
}

/** دو پلن/اشتراک هم‌پوشانی دارند؟ (مبنای ارتقا، رزرو زنجیره‌ای، مهلت و دوره‌ی رایگان هر محصول) */
export function planScopesOverlap(a: PlanScope, b: PlanScope): boolean {
  return a === 'bundle' || b === 'bundle' || a === b;
}

/**
 * اجتماع افزایشی (additive union) دو مجموعه سقف: عددی ← بیشترین، بولی ← OR. کلیدها محصول‌محورند
 * (`norolink.pages`، `noroform.forms`، ...) و فقط `branding.remove` مشترک است، پس هیچ پلنی سقف پلن دیگر را
 * صفر نمی‌کند (docs/architecture.md §9.11).
 */
export function mergeEntitlements(a: Entitlements, b: Entitlements): Entitlements {
  const out: Record<string, number | boolean> = { ...a };
  for (const key of ENTITLEMENT_KEYS) {
    out[key] = ENTITLEMENTS[key].kind === 'number' ? Math.max(a[key] as number, b[key] as number) : Boolean(a[key]) || Boolean(b[key]);
  }
  return out as Entitlements;
}

/**
 * دامنه‌ی محتمل یک پلن از سقف‌هایش (برای ساخت پلن تازه در پنل ادمین): فقط یک ماژول روشن ← همان محصول،
 * چند ماژول/هیچ ← `bundle`. کلیدهای با مقدار پیش‌فرض نسخه‌ی آزاد «روشن» حساب نمی‌شوند.
 */
export function inferPlanScope(raw: Record<string, unknown>): PlanScope {
  const modules = new Set<ProductScope>();
  for (const key of ENTITLEMENT_KEYS) {
    const value = raw[key];
    const meta = ENTITLEMENTS[key];
    if (value === undefined || !meta.module) continue;
    const on = meta.kind === 'number' ? Number(value) > meta.free : Boolean(value);
    if (on) modules.add(meta.module);
  }
  return modules.size === 1 ? [...modules][0]! : 'bundle';
}

/** سقف عددی مجاز (عملاً «نامحدود» = ۱۰۰۰۰۰۰۰۰). */
export const ENTITLEMENT_MAX = 100_000_000;

export const FREE_ENTITLEMENTS = Object.fromEntries(ENTITLEMENT_KEYS.map((k) => [k, ENTITLEMENTS[k].free])) as Entitlements;

/** مقدارهای ذخیره‌شده‌ی یک پلن + مقدار پیش‌فرض؛ کلید ناشناخته یا نوع نادرست نادیده گرفته می‌شود. */
export function resolveEntitlements(stored: unknown): Entitlements {
  const values = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const out: Record<string, number | boolean> = { ...FREE_ENTITLEMENTS };
  for (const key of ENTITLEMENT_KEYS) {
    const v = values[key];
    if (ENTITLEMENTS[key].kind === 'number' && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= ENTITLEMENT_MAX) out[key] = v;
    if (ENTITLEMENTS[key].kind === 'boolean' && typeof v === 'boolean') out[key] = v;
  }
  return out as Entitlements;
}

/** اعتبارسنجی سخت مقدارهای ورودی ادمین (کلید ناشناخته یا نوع نادرست ← پیام خطا). */
export function entitlementIssues(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['not_object'];
  const issues: string[] = [];
  for (const [key, v] of Object.entries(input)) {
    const def = (ENTITLEMENTS as Record<string, { kind: string }>)[key];
    if (!def) issues.push(`unknown:${key}`);
    else if (def.kind === 'number' && !(typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= ENTITLEMENT_MAX)) issues.push(`invalid:${key}`);
    else if (def.kind === 'boolean' && typeof v !== 'boolean') issues.push(`invalid:${key}`);
  }
  return issues;
}

// ماه شمسی به وقت تهران (برای سقف ماهانه). تهران از ۱۴۰۱ ساعت تابستانی ندارد: اختلاف ثابت +۰۳:۳۰.
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const persianParts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric' });

function persianDate(at: Date): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(persianParts.formatToParts(at).map((p) => [p.type, p.value]));
  return { year: parseInt(parts.year!, 10), month: parseInt(parts.month!, 10), day: parseInt(parts.day!, 10) };
}

/** بازه‌ی [start, end) ماه شمسی‌ای که `at` در آن است (نیمه‌شب تهران) و کلید `۱۴۰۵-۸`. */
export function tehranMonthRange(at: Date): { start: Date; end: Date; key: string } {
  const { year, month, day } = persianDate(at);
  const tehranMidnight = Math.floor((at.getTime() + TEHRAN_OFFSET_MS) / DAY_MS) * DAY_MS - TEHRAN_OFFSET_MS;
  const start = tehranMidnight - (day - 1) * DAY_MS;
  // ماه شمسی ۲۹ تا ۳۱ روز است؛ ظهر هر روز بررسی می‌شود تا مرز روز اثری نداشته باشد.
  let length = 29;
  while (length < 31 && persianDate(new Date(start + length * DAY_MS + DAY_MS / 2)).month === month) length++;
  return { start: new Date(start), end: new Date(start + length * DAY_MS), key: `${year}-${month}` };
}
