// تشخیص ساده‌ی دستگاه/سیستم‌عامل/مرورگر از User-Agent (فقط برای آمار؛ خود UA ذخیره نمی‌شود).

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'other';

export interface ClientInfo {
  deviceType: DeviceType;
  os: string | null;
  browser: string | null;
}

/** ربات‌ها و پیش‌نمایش‌گرهای لینک (تلگرام، واتس‌اپ، …) شمرده نمی‌شوند. */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|telegram|whatsapp|discord|skype|curl|wget|python|headless/i;

export function isBot(ua: string): boolean {
  return ua === '' || BOT.test(ua);
}

export function parseUserAgent(ua: string): ClientInfo {
  const deviceType: DeviceType = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobi|Android|iPhone|iPod/i.test(ua)
      ? 'mobile'
      : /Windows|Macintosh|Linux|CrOS/i.test(ua)
        ? 'desktop'
        : 'other';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux|CrOS/i.test(ua)
            ? 'Linux'
            : null;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung'
        : /Firefox|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari/.test(ua)
              ? 'Safari'
              : null;
  return { deviceType, os, browser };
}

/** دامنه‌ی ارجاع‌دهنده (بدون مسیر و پارامتر). */
export function referrerDomain(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.toLowerCase().replace(/^www\./, '').slice(0, 253) || null;
  } catch {
    return null;
  }
}
