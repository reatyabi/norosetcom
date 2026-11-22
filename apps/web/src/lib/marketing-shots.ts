// تصاویر ثابت به‌جای رندر زنده‌ی موکاپ‌های مارکتینگ و بندانگشتی قالب‌های آماده‌ی صفحه‌ی لینک (سبک‌تر از
// باندل LinkPage و DOM کامل هر کارت). همه از روی همان کد ساخته می‌شوند: `pnpm --filter @noroset/web shots`
// (scripts/shots.mjs روی مسیر توسعه‌ی /shots). این فهرست منبع مشترک اسکریپت، نشانی‌ها و تست است.
// نام هر فایل نسخه‌ی اثر انگشت ورودی‌هایش را دارد (shots.generated.json)، پس کش immutable همیشه آخرین تصویر را
// می‌دهد؛ تغییر کد منبع بدون ساخت دوباره، تست تازگی را می‌شکند (test/marketing-shots.test.ts).
// تصاویر بخش امکانات صفحه‌ی اصلی دستی‌اند و اینجا نیستند (public/images/features، norolink-features.tsx).
import { LINK_TEMPLATES } from '@noroset/norolink/ui';
import versions from './shots.generated.json';

export type MockupProduct = 'noroform' | 'norolink' | 'norofile' | 'ecosystem';
export type DesktopVariant = 'default' | 'analytics' | 'pipeline';

export const MOCKUP_PRODUCTS: readonly MockupProduct[] = ['noroform', 'norolink', 'norofile', 'ecosystem'];

/** هر نمای دسکتاپ فقط همین حالت‌ها را از هم جدا می‌کند (desktop-mockup-screen.tsx). */
const DESKTOP_VARIANTS: Record<MockupProduct, readonly DesktopVariant[]> = {
  noroform: ['default', 'analytics'],
  norolink: ['default', 'analytics'],
  norofile: ['default', 'pipeline'],
  ecosystem: ['default'],
};

export function desktopVariant(product: MockupProduct, mode: string): DesktopVariant {
  return (DESKTOP_VARIANTS[product] as readonly string[]).includes(mode) ? (mode as DesktopVariant) : 'default';
}

/** ابعاد CSS هر نوع تصویر؛ فایل با ضریب SHOT_SCALE ساخته می‌شود. */
export const SHOT_SCALE = 2;
/** بندانگشتی قالب ۹:۱۶ با عرض رندر صفحه (FLUID_MIN_WIDTH)؛ با object-top همه‌ی کارت‌ها (۴:۳ تا ۲۵۰×۴۲۰) را می‌پوشاند. */
export const TEMPLATE_THUMB = { width: 360, height: 640 } as const;
export const MOBILE_SCREEN = { width: 245, height: 450 } as const;
export const DESKTOP_SCREEN = { width: 960, height: 440 } as const;

const VERSIONS: Record<string, string | undefined> = versions;
/** نشانی منطقی (کلید shots.generated.json) ← فایل نسخه‌دار. */
export const versioned = (key: string) => {
  const v = VERSIONS[key];
  return v ? key.replace(/\.webp$/, `.${v}.webp`) : key;
};

const templateThumbKey = (templateId: string) => `/images/template-thumbs/${templateId}.webp`;
const mobileMockupKey = (product: MockupProduct, dark: boolean) => `/images/mockups/${product}-mobile${dark ? '-dark' : ''}.webp`;
const desktopMockupKey = (product: MockupProduct, variant: DesktopVariant, dark: boolean) =>
  `/images/mockups/${product}-desktop-${variant}${dark ? '-dark' : ''}.webp`;

export const templateThumbSrc = (templateId: string) => versioned(templateThumbKey(templateId));
export const mobileMockupSrc = (product: MockupProduct, dark: boolean) => versioned(mobileMockupKey(product, dark));
export const desktopMockupSrc = (product: MockupProduct, variant: DesktopVariant, dark: boolean) =>
  versioned(desktopMockupKey(product, variant, dark));

const BUILTIN_TEMPLATES = new Set(LINK_TEMPLATES.map((t) => t.id));
/** فقط قالب‌های پیش‌فرض کد تصویر ثابت دارند (و فقط پس از ساخت)؛ قالب‌های مدیریت پلتفرم بندانگشتی انتشار خودشان را دارند. */
export const hasTemplateThumb = (templateId: string) => BUILTIN_TEMPLATES.has(templateId) && !!VERSIONS[templateThumbKey(templateId)];

export interface Shot {
  /** مسیر و query صفحه‌ی /shots */
  path: string;
  /** کلید shots.generated.json و نشانی منطقی (بی‌نسخه) نسبت به apps/web/public */
  file: string;
  width: number;
  height: number;
  /** ورودی‌های اثر انگشت (scripts/shot-hash.mjs): داده و مسیرهای منبع نسبت به ریشه‌ی ریپو */
  data: string;
  sources: string[];
}

const LINK_SOURCES = ['products/norolink/ui', 'products/norolink/shared', 'apps/web/public/images/templates', 'apps/web/src/app/shots/page.tsx', 'packages/ui/src/styles/globals.css'];
const MOCKUP_SOURCES = (screen: string) => [`apps/web/src/app/(marketing)/_components/${screen}`, 'apps/web/src/app/(marketing)/marketing.css', 'apps/web/src/app/shots/page.tsx', 'packages/ui/src/styles/globals.css'];

export function shotList(): Shot[] {
  const shots: Shot[] = [];
  for (const t of LINK_TEMPLATES) {
    shots.push({ path: `/shots?kind=template&id=${t.id}`, file: templateThumbKey(t.id), ...TEMPLATE_THUMB, data: JSON.stringify(t), sources: LINK_SOURCES });
  }
  for (const product of MOCKUP_PRODUCTS) {
    for (const dark of [false, true]) {
      const theme = dark ? '&dark=1' : '';
      const mobile = mobileMockupKey(product, dark);
      shots.push({ path: `/shots?kind=mobile&id=${product}${theme}`, file: mobile, ...MOBILE_SCREEN, data: mobile, sources: MOCKUP_SOURCES('mobile-mockup-screen.tsx') });
      for (const variant of DESKTOP_VARIANTS[product]) {
        const file = desktopMockupKey(product, variant, dark);
        shots.push({
          path: `/shots?kind=desktop&id=${product}&mode=${variant}${theme}`,
          file,
          ...DESKTOP_SCREEN,
          data: file,
          sources: MOCKUP_SOURCES('desktop-mockup-screen.tsx'),
        });
      }
    }
  }
  return shots;
}
