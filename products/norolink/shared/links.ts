import { mapProviderOf, parseVideoUrl } from './embeds';
import { SOCIAL_LABELS, type SocialPlatform } from './social';

// ورودی هوشمند لینک: کاربر هر شکلی بنویسد (بدون https، @شناسه، شماره‌ی موبایل)، به لینک استاندارد تبدیل
// می‌شود. همین توابع هم در ادیتور (هنگام چسباندن/خروج از فیلد) و هم در schema سرور اجرا می‌شوند.

const HTTP_URL = /^https?:\/\/[^\s/?#]+\.[^\s/?#]+[^\s]*$/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const DOMAIN_LIKE = /^[^\s/@:]+\.[a-z؀-ۿ]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i;
const HANDLE = /^[A-Za-z0-9._-]{1,64}$/;

/** لینک http(s) کامل با دامنه؟ (فقط این‌ها در صفحه‌ی عمومی href می‌شوند) */
export function isHttpUrl(value: string): boolean {
  return HTTP_URL.test(value);
}

const IP_HOST = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[/;
/** برندهای پرداخت ایرانی و دامنه‌ی رسمی‌شان: هر دامنه‌ی دیگری با این نام جعل حساب می‌شود. */
const PAYMENT_BRANDS: Record<string, string> = { shaparak: 'shaparak.ir', zarinpal: 'zarinpal.com' };

/** فهرست سیاه فیشینگ (§9.2): نشانی IP خام و جعل برند درگاه پرداخت. لینک نامعتبر اینجا بررسی نمی‌شود. */
export function isBlockedUrl(value: string): boolean {
  let host: string;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (IP_HOST.test(host)) return true;
  return Object.entries(PAYMENT_BRANDS).some(([brand, official]) => host.includes(brand) && host !== official && !host.endsWith(`.${official}`));
}

/** ارقام فارسی/عربی ← لاتین. */
function latinDigits(v: string): string {
  return v.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** `example.com/x` ← `https://example.com/x`؛ ورودی غیرقابل‌اصلاح دست‌نخورده برمی‌گردد. */
export function normalizeHttpUrl(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v.replace(/^https?/i, (m) => m.toLowerCase());
  if (v.startsWith('//')) return `https:${v}`;
  if (DOMAIN_LIKE.test(v)) return `https://${v}`;
  if (HAS_SCHEME.test(v)) return v;
  return v;
}

const IFRAME_SRC = /<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** کد iframe چسبانده‌شده ← فقط نشانی src آن (خود HTML هرگز نگه داشته نمی‌شود)؛ بقیه مثل لینک معمولی. */
export function normalizeEmbedSource(input: string): string {
  if (!/<iframe\b/i.test(input)) return normalizeHttpUrl(input);
  const m = IFRAME_SRC.exec(input);
  return normalizeHttpUrl((m?.[1] ?? m?.[2] ?? m?.[3] ?? '').replace(/&amp;/gi, '&'));
}

/** موبایل/تلفن ← E.164 (ایران: 09… ← +989…). */
function normalizePhone(input: string): string {
  let v = latinDigits(input.trim().replace(/^tel:/i, '')).replace(/[\s\-()]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  else if (/^09\d{9}$/.test(v)) v = `+98${v.slice(1)}`;
  else if (/^0[1-9]\d{9}$/.test(v)) v = `+98${v.slice(1)}`; // تلفن ثابت ایران (021…)
  else if (/^9\d{9}$/.test(v)) v = `+98${v}`;
  return v;
}

/** پیشوند پروفایل هر شبکه برای ورودی «شناسه» (@name). */
const HANDLE_BASE: Partial<Record<SocialPlatform, string>> = {
  instagram: 'https://instagram.com/',
  telegram: 'https://t.me/',
  x: 'https://x.com/',
  youtube: 'https://youtube.com/@',
  linkedin: 'https://linkedin.com/in/',
  aparat: 'https://aparat.com/',
  eitaa: 'https://eitaa.com/',
  rubika: 'https://rubika.ir/',
  bale: 'https://ble.ir/',
  soroush: 'https://splus.ir/',
  igap: 'https://igap.net/',
};

/** پیشوند نمایشی کنار فیلد (برای راهنمای کاربر). */
export function socialHandlePrefix(platform: SocialPlatform): string | null {
  const base = HANDLE_BASE[platform];
  return base ? base.replace(/^https:\/\//, '') : null;
}

/** مقدار هر شبکه: ایمیل خام، تلفن E.164، واتس‌اپ از شماره، بقیه از @شناسه یا لینک ناقص. */
export function normalizeSocialValue(platform: SocialPlatform, input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (platform === 'email') return v.replace(/^mailto:/i, '').toLowerCase();
  if (platform === 'phone') return normalizePhone(v);
  if (platform === 'whatsapp') {
    const phone = normalizePhone(v);
    if (/^\+?\d{8,15}$/.test(phone)) return `https://wa.me/${phone.replace(/^\+/, '')}`;
    return normalizeHttpUrl(v);
  }
  const base = HANDLE_BASE[platform];
  const handle = v.replace(/^@/, '');
  // «ali.reza» شناسه است نه دامنه؛ فقط با «/»، scheme یا دامنه‌ی شناخته‌شده‌ی شبکه لینک حساب می‌شود
  const looksLikeUrl = v.includes('/') || HAS_SCHEME.test(v) || platformFromHost(v) !== null;
  if (base && HANDLE.test(handle) && !looksLikeUrl) return base + handle;
  return normalizeHttpUrl(v);
}

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

function hostOf(value: string): string | null {
  try {
    return new URL(normalizeHttpUrl(value)).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const PLATFORM_HOSTS: [string, SocialPlatform][] = [
  ['instagram.com', 'instagram'],
  ['instagr.am', 'instagram'],
  ['t.me', 'telegram'],
  ['telegram.me', 'telegram'],
  ['wa.me', 'whatsapp'],
  ['whatsapp.com', 'whatsapp'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['linkedin.com', 'linkedin'],
  ['aparat.com', 'aparat'],
  ['eitaa.com', 'eitaa'],
  ['rubika.ir', 'rubika'],
  ['ble.ir', 'bale'],
  ['bale.ai', 'bale'],
  ['splus.ir', 'soroush'],
  ['sapp.ir', 'soroush'],
  ['igap.net', 'igap'],
];

/** شبکه‌ی اجتماعی از روی لینک/ایمیل/شماره (برای انتخاب خودکار شبکه و آیکون). */
export function detectSocialPlatform(input: string): SocialPlatform | null {
  const v = input.trim();
  if (!v) return null;
  if (/^mailto:/i.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  if (/^tel:/i.test(v) || /^\+?[\d۰-۹٠-٩\s\-()]{8,}$/.test(v)) return 'phone';
  return platformFromHost(v);
}

function platformFromHost(value: string): SocialPlatform | null {
  const host = hostOf(value);
  if (!host) return null;
  return PLATFORM_HOSTS.find(([domain]) => hostIs(host, domain))?.[1] ?? null;
}

/**
 * شبکه‌ی آیتم پس از ورود مقدار: شبکه‌ی تشخیص‌داده‌شده از لینک، جز شماره در واتس‌اپ (شماره‌ی واتس‌اپ تلفن نیست).
 */
export function socialPlatformFor(current: SocialPlatform, input: string): SocialPlatform | null {
  const detected = detectSocialPlatform(input);
  if (detected === 'phone' && current === 'whatsapp') return 'whatsapp';
  return detected;
}

/**
 * ورودی آیتم شبکه هنگام تایپ: شبکه از روی متن تشخیص داده و مقدار نرمال می‌شود. شبکه‌ی آیتم دیگر و شبکه‌ای که
 * کاربر دستی انتخاب کرده (`pinned`) عوض نمی‌شود.
 */
export function applySocialInput(
  current: SocialPlatform,
  input: string,
  { taken = [], pinned = false }: { taken?: readonly SocialPlatform[]; pinned?: boolean } = {},
): { platform: SocialPlatform; value: string } {
  const detected = pinned ? null : socialPlatformFor(current, input);
  const platform = detected && !taken.includes(detected) ? detected : current;
  return { platform, value: normalizeSocialValue(platform, input) };
}

/** عنوان پیشنهادی دکمه از روی لینک: نام شبکه یا دامنه بدون www. */
export function suggestLinkLabel(input: string): string | null {
  const platform = detectSocialPlatform(input);
  if (platform && platform !== 'email' && platform !== 'phone') return SOCIAL_LABELS[platform];
  const host = hostOf(input);
  return host ? host.replace(/^www\./, '') : null;
}

/** المان مناسب برای متن چسبانده‌شده روی بوم. */
export function classifyPastedLink(input: string): 'video_embed' | 'map_embed' | 'link_button' | null {
  const isIframe = /<iframe\b/i.test(input);
  const url = normalizeEmbedSource(input);
  if (!isHttpUrl(url)) return null;
  if (parseVideoUrl(url)) return 'video_embed';
  const host = hostOf(url) ?? '';
  const isGoogleMap = mapProviderOf(url) === 'google' && (host.startsWith('maps.') || /\/maps(\/|$|\?)/.test(url) || host === 'goo.gl');
  if (isGoogleMap || mapProviderOf(url) === 'neshan' || mapProviderOf(url) === 'balad') return 'map_embed';
  return isIframe ? null : 'link_button';
}
