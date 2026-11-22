// نقشه‌ی آدرس صفحه‌های وب (docs/routes.md). لینک‌ها و ریدایرکت‌ها فقط از اینجا ساخته می‌شوند.

const seg = (value: string) => encodeURIComponent(value);

export const routes = {
  home: '/',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  landing: {
    form: '/landing/form',
    formSoon: '/landing/form/soon',
    link: '/landing/link',
    file: '/landing/file',
    privacy: '/privacy',
    terms: '/terms',
  },
  /** ورود، ثبت‌نام و فراموشی رمز (یک صفحه با چند حالت). `next` فقط مسیر داخلی. */
  auth: (next?: string) => (next ? `/auth?next=${encodeURIComponent(next)}` : '/auth'),
  /** مصرف لینک ورود پشتیبانی (فقط ادمین صادرکننده). توکن در fragment تا به سرور، لاگ یا Referer نرسد. */
  support: '/support',
  supportLink: (token: string) => `/support#${seg(token)}`,
  workspace: '/ws',
  /** `/ws` با دیالوگ «فضای کاری جدید» باز. */
  workspaceNew: '/ws?new=1',
  account: '/account',
  /** اشتراک و پرداخت فضای کاری جاری. */
  billing: {
    home: '/billing',
    /** بازگشت از درگاه (API ریدایرکت می‌کند): `?status=ok|failed&payment=…`. */
    result: '/billing/result',
    receipt: (id: string) => `/billing/receipts/${seg(id)}`,
  },
  form: {
    home: '/form',
    /** گالری قالب‌های فرم. */
    templates: '/form/templates',
    editor: (id: string) => `/form/${seg(id)}/editor`,
    results: (id: string) => `/form/${seg(id)}/results`,
    /** ریشه‌ی اجرای فرم داخلی؛ برای نگاشت ماژول در پوسته‌ی پنل. */
    internalRoot: '/f',
    /** اجرای فرم در فضای کاری داخلی (noroset.com). */
    internal: (id: string) => `/f/${seg(id)}`,
  },
  link: {
    home: '/link',
    /** گالری قالب‌های صفحه‌ی لینک. */
    templates: '/link/templates',
    editor: (slug: string) => `/link/${seg(slug)}/editor`,
    analytics: (slug: string) => `/link/${seg(slug)}/analytics`,
  },
  file: {
    home: '/file',
  },
  /** مدیریت پلتفرم (فقط superadmin؛ بدون فضای کاری جاری). */
  admin: {
    home: '/admin',
    users: '/admin/users',
    user: (id: string) => `/admin/users/${seg(id)}`,
    tenants: '/admin/tenants',
    tenant: (id: string) => `/admin/tenants/${seg(id)}`,
    audit: '/admin/audit',
    modules: '/admin/modules',
    billing: '/admin/billing',
    campaigns: '/admin/campaigns',
    /** قالب‌های آماده‌ی صفحه‌ی لینک. */
    templates: '/admin/templates',
    templateEditor: (id: string) => `/admin/templates/${seg(id)}/editor`,
    /** کنترل صفحه‌های لینک منتشرشده و گزارش‌های تخلف (§9.13). `?tab=reports` صف گزارش‌ها. */
    linkPages: '/admin/link-pages',
    linkPage: (id: string) => `/admin/link-pages/${seg(id)}`,
    /** بلاگ: مقاله‌ها، ادیتور، دسته و برچسب، نظرها. */
    blog: '/admin/blog',
    blogPost: (id: string) => `/admin/blog/${seg(id)}`,
    blogTerms: '/admin/blog/categories',
    blogComments: '/admin/blog/comments',
  },
  /** بلاگ عمومی (مارکتینگ). نشانی‌ها می‌توانند فارسی باشند و اینجا encode می‌شوند. */
  blog: {
    home: '/blog',
    post: (slug: string) => `/blog/${seg(slug)}`,
    category: (slug: string) => `/blog/category/${seg(slug)}`,
    tag: (slug: string) => `/blog/tag/${seg(slug)}`,
    /** خوراک RSS. */
    feed: '/blog/feed',
  },
} as const;

/** آدرس عمومی فرم روی دامنه‌ی نوروفرم (n8f.ir/{slug}). */
export function publicFormUrl(publicHost: string, id: string, devPort?: string): string {
  const origin = publicHost.endsWith('localhost')
    ? `http://${publicHost}${devPort ? `:${devPort}` : ''}`
    : `https://${publicHost}`;
  return `${origin}/${seg(id)}`;
}

/** آدرس مشاهده‌ی بیرونی یک پاسخ (n8f.ir/r/{token}). */
export function publicResponseUrl(publicHost: string, token: string, devPort?: string): string {
  const origin = publicHost.endsWith('localhost')
    ? `http://${publicHost}${devPort ? `:${devPort}` : ''}`
    : `https://${publicHost}`;
  return `${origin}/r/${seg(token)}`;
}

/** آدرس عمومی صفحه‌ی لینک روی زیردامنه ({slug}.n8l.ir)؛ development روی http و پورت جاری. */
export function publicLinkUrl(publicHost: string, slug: string, devPort?: string): string {
  const host = `${seg(slug)}.${publicHost}`;
  return publicHost.endsWith('localhost') ? `http://${host}${devPort ? `:${devPort}` : ''}` : `https://${host}`;
}

/** فرم گزارش تخلف یک صفحه‌ی لینک روی دامنه‌ی کوتاه (n8l.ir/report/{slug}؛ §9.13). */
export function publicReportUrl(publicHost: string, slug: string, devPort?: string): string {
  return `${publicDirectoryUrl(publicHost, devPort)}/report/${seg(slug)}`;
}

/** آدرس عمومی دایرکتوری صفحات لینک روی دامنه‌ی کوتاه (n8l.ir). */
export function publicDirectoryUrl(publicHost: string, devPort?: string): string {
  return publicHost.endsWith('localhost') ? `http://${publicHost}${devPort ? `:${devPort}` : ''}` : `https://${publicHost}`;
}

/** فقط مسیرهای داخلی همین origin (جلوگیری از open redirect)؛ وگرنه صفحه‌ی اصلی نورولینک. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : routes.link.home;
}
