import { baladPlaceToken, baladPlaceUrl, isShortMapLink, mapProviderOf, parseMapUrl, type MapLocation } from '../../shared';

// لینک کوتاه نقشه (maps.app.goo.gl، nshn.ir …) مختصات ندارد؛ redirectها دنبال می‌شوند ولی فقط
// روی دامنه‌های همان سه سرویس (جلوگیری از SSRF) و حداکثر MAX_HOPS بار.

const MAX_HOPS = 5;
const TIMEOUT_MS = 5000;

export type Fetcher = (url: string, init: { redirect: 'manual'; signal: AbortSignal }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text?: () => Promise<string>;
}>;

const PLACE_ZOOM = 16;
const MAX_PLACE_HTML = 2_000_000;

/** مختصات مکان از داده‌ی ساختاریافته‌ی صفحه‌ی بلد (`"geo":{"@type":"GeoCoordinates",…}`)؛ مکان‌های مشابه صفحه geo ندارند. */
export function parseBaladPlaceHtml(html: string): Pick<MapLocation, 'lat' | 'lng'> | null {
  const geo = /"geo":\s*\{([^{}]*GeoCoordinates[^{}]*)\}/.exec(html)?.[1];
  const lat = Number(/"latitude":\s*(-?[\d.]+)/.exec(geo ?? '')?.[1]);
  const lng = Number(/"longitude":\s*(-?[\d.]+)/.exec(geo ?? '')?.[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** صفحه‌ی مکان بلد را می‌خواند؛ redirect فقط روی خود بلد (لینک کوتاه token ← آدرس کامل مکان). */
async function resolveBaladPlace(start: string, fetcher: Fetcher): Promise<MapLocation | null> {
  let current = start;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    try {
      const res = await fetcher(current, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status >= 300 && res.status < 400) {
        const next = baladPlaceUrl(new URL(res.headers.get('location') ?? '', current).href);
        if (!next) return null;
        current = next;
        continue;
      }
      if (res.status !== 200 || !res.text) return null;
      const html = await res.text();
      const place = html.length <= MAX_PLACE_HTML ? parseBaladPlaceHtml(html) : null;
      if (!place) return null;
      const placeToken = baladPlaceToken(current);
      return { provider: 'balad', ...place, zoom: PLACE_ZOOM, ...(placeToken ? { place_token: placeToken } : {}) };
    } catch {
      return null;
    }
  }
  return null;
}

export async function resolveMapUrl(raw: string, fetcher: Fetcher = fetch): Promise<MapLocation | null> {
  const direct = parseMapUrl(raw);
  // هش نوار آدرس بلد مرکز نقشه است، نه سنجاق (با پنل کناری جابه‌جا می‌شود)؛ صفحه‌ی مکان دقیق‌تر است.
  const place = baladPlaceUrl(raw);
  if (place) return (await resolveBaladPlace(place, fetcher)) ?? direct;
  if (direct) return direct;
  if (!isShortMapLink(raw)) return null;

  const provider = mapProviderOf(raw);
  let current = raw.trim();
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Awaited<ReturnType<Fetcher>>;
    try {
      res = await fetcher(current, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return null;
    }
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return null;
    let next: string;
    try {
      next = new URL(location, current).href;
    } catch {
      return null;
    }
    if (!mapProviderOf(next)) return null;
    const parsed = parseMapUrl(next);
    // سرویس اصلی همان لینکی است که کاربر داد (مثلاً nshn.ir ← neshan).
    if (parsed) return provider ? { ...parsed, provider } : parsed;
    current = next;
  }
  return null;
}
