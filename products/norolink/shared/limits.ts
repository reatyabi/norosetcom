import type { ElementKind } from './elements';

// شکل محدودیت‌های norolink (docs/architecture.md §9.6). مقدارها داده‌اند: از سقف‌های پلن (ENTITLEMENTS در core،
// PLAN_RESOLVER) ساخته می‌شوند (api/access.ts `limitsFor`).

export interface NorolinkLimits {
  maxPages: number;
  maxElementsPerPage: number;
  allowedKinds: readonly ElementKind[];
  /** آمار دستگاه، مرورگر، سیستم‌عامل و منبع ورود. */
  detailedStats: boolean;
  /** امکان ایندکس و نمایش صفحه در موتورهای جست‌وجو (گوگل). */
  seo: boolean;
  /**
   * چرا سئو بسته است، برای پیام و دکمه‌ی ترغیب (`api/access.ts` `limitsFor`): `trial` ← دوره‌ی رایگان روی پلنی که سئو دارد،
   * پس خرید همین پلن بازش می‌کند؛ `buy` ← اشتراکی نیست (تمام‌شده/محدود)؛ `upgrade` ← پلن فعلی (یا پلن دوره‌ی رایگان)
   * سئو ندارد؛ null ← باز است یا پیامی لازم نیست (ادیتور قالب).
   */
  seoUpsell: 'trial' | 'buy' | 'upgrade' | null;
  forceBranding: boolean;
}

export const ALL_ELEMENT_KINDS: readonly ElementKind[] = ['link_button', 'social_icons', 'rich_text', 'image', 'video_embed', 'map_embed'];
