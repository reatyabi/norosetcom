import type { ImageRef } from './assets';
import type { PageContent } from './content';
import type { AnyElement } from './elements';
import { socialHref, type SocialPlatform } from './social';

// نمایش نورولینک پیج در موتورهای جستجو (docs/architecture.md §9.1). یک قاعده برای همه‌جا: ذخیره، صفحه‌ی عمومی،
// sitemap و دایرکتوری.

/** کمترین طول «توضیح موتور جستجو» (seo.description، پس از trim) برای ایندکس شدن؛ شرط کیفیت هر نتیجه در گوگل. */
export const SEO_DESCRIPTION_MIN = 50;

/** صاحب صفحه برای داده‌ی ساختاریافته (ProfilePage → mainEntity)؛ تا انتخاب نشود JSON-LD ساخته نمی‌شود. */
export const SEO_ENTITIES = ['person', 'organization'] as const;
export type SeoEntity = (typeof SEO_ENTITIES)[number];

/** طول توضیح به نویسه (code point، نه واحد UTF-16)، همان شمارنده‌ی ادیتور. */
export function seoDescriptionLength(description: string): number {
  return [...description.trim()].length;
}

export function seoDescriptionReady(content: Pick<PageContent, 'seo'>): boolean {
  return seoDescriptionLength(content.seo.description ?? '') >= SEO_DESCRIPTION_MIN;
}

/**
 * صفحه واقعاً ایندکس می‌شود؟ کاربر روشن کرده، توضیح به حداقل رسیده و پلن اجازه می‌دهد (`seoAllowed`: سقف norolink.seo،
 * نه در دوره‌ی رایگان، پلن تمام‌نشده؛ api/access.ts). مقدار ذخیره‌شده‌ی `indexable` فقط خواست کاربر است.
 */
export function isSearchIndexable(content: Pick<PageContent, 'seo'>, seoAllowed: boolean): boolean {
  return seoAllowed && Boolean(content.seo.indexable) && seoDescriptionReady(content);
}

/** شبکه‌هایی که «همان موجودیت» در جای دیگرند (sameAs)؛ واتس‌اپ، ایمیل و تلفن راه تماس‌اند نه پروفایل. */
const NOT_PROFILES: ReadonlySet<SocialPlatform> = new Set(['whatsapp', 'email', 'phone']);

type JsonLd = Record<string, unknown>;

/**
 * داده‌ی ساختاریافته‌ی schema.org: `ProfilePage` با mainEntity شخص یا سازمان (نام، بیو، آواتار، شبکه‌ها در sameAs،
 * تلفن، و برای سازمان مکان از المان نقشه). فقط برای صفحه‌ی ایندکس‌شونده با entity انتخاب‌شده؛ وگرنه null.
 * خروجی را با `jsonLdScript` در HTML بگذارید (escape `<`).
 */
export function profileJsonLd(
  content: PageContent,
  elements: AnyElement[],
  pageUrl: string,
  assetUrl: (ref: ImageRef) => string,
  seoAllowed: boolean,
): JsonLd | null {
  const entity = content.seo.entity;
  if (!entity || !isSearchIndexable(content, seoAllowed)) return null;
  const { profile, seo } = content;
  const sameAs = new Set<string>();
  let telephone: string | undefined;
  let location: JsonLd | undefined;
  for (const el of elements) {
    if (el.kind === 'social_icons') {
      for (const item of el.settings.items) {
        if (item.platform === 'phone' && !telephone && /^\+?[0-9]{4,15}$/.test(item.value)) telephone = item.value;
        if (NOT_PROFILES.has(item.platform)) continue;
        const href = socialHref(item.platform, item.value);
        if (/^https?:\/\//i.test(href)) sameAs.add(href);
      }
    }
    if (el.kind === 'map_embed' && el.settings.location && !location) {
      const { lat, lng } = el.settings.location;
      location = { '@type': 'Place', geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } };
    }
  }
  const name = profile.name || seo.title;
  const image = profile.avatar ? assetUrl(profile.avatar) : seo.og_image ? assetUrl(seo.og_image) : undefined;
  const main: JsonLd = {
    '@type': entity === 'person' ? 'Person' : 'Organization',
    name,
    url: pageUrl,
    ...(profile.bio ? { description: profile.bio } : {}),
    ...(image ? { image } : {}),
    ...(sameAs.size ? { sameAs: [...sameAs] } : {}),
    ...(telephone ? { telephone } : {}),
    ...(entity === 'organization' && location ? { location } : {}),
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: pageUrl,
    name: seo.title || name,
    description: seo.description,
    inLanguage: 'fa',
    mainEntity: main,
  };
}

/** U+2028 و U+2029: در JSON مجازند ولی در اسکریپت قدیمی پایان خط حساب می‌شوند. */
const LS = String.fromCharCode(0x2028);
const LINE_SEPARATORS = new RegExp(`[${LS}${String.fromCharCode(0x2029)}]`, 'g');

/** متن امن برای `<script type="application/ld+json">`: هیچ `<` (و جداکننده‌ی خط یونیکد) در خروجی نمی‌ماند. */
export function jsonLdScript(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATORS, (c) => (c === LS ? '\\u2028' : '\\u2029'));
}
