// تحلیل لینک ویدیو و نقشه. iframe همیشه از قالب ثابت ساخته می‌شود، هرگز از HTML/آدرس کاربر؛
// از کد iframe چسبانده‌شده فقط شناسه/مختصات برداشته می‌شود.

export type VideoProvider = 'youtube' | 'vimeo' | 'aparat';
export interface VideoRef {
  provider: VideoProvider;
  video_id: string;
}

export type MapProvider = 'google' | 'neshan' | 'balad';
export interface MapLocation {
  provider: MapProvider;
  lat: number;
  lng: number;
  zoom: number;
  /** شناسه‌ی مکان بلد (`balad.ir/embed?p=…`). */
  place_token?: string;
  /** پارامتر pb کد iframe گوگل‌مپ. */
  pb?: string;
}

export const BALAD_TOKEN = /^[A-Za-z0-9]{6,40}$/;
export const GOOGLE_PB = /^[A-Za-z0-9!.,_~%:+-]{8,1500}$/;

/** دامنه‌هایی که CSP صفحه‌ی عمومی برای frame اجازه می‌دهد. */
export const FRAME_SOURCES = [
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://www.aparat.com',
  'https://maps.google.com',
  'https://www.google.com',
  'https://balad.ir',
] as const;

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const APARAT_ID = /^[A-Za-z0-9]{3,32}$/;

export function parseVideoUrl(raw: string): VideoRef | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let ref: VideoRef | null = null;

  if (host === 'youtu.be') {
    ref = { provider: 'youtube', video_id: parts[0] ?? '' };
  } else if (hostIs(host, 'youtube.com') || hostIs(host, 'youtube-nocookie.com')) {
    const v = url.searchParams.get('v');
    if (v) ref = { provider: 'youtube', video_id: v };
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '')) ref = { provider: 'youtube', video_id: parts[1] ?? '' };
  } else if (hostIs(host, 'vimeo.com')) {
    const id = parts[0] === 'video' ? parts[1] : parts.find((p) => VIMEO_ID.test(p));
    ref = { provider: 'vimeo', video_id: id ?? '' };
  } else if (hostIs(host, 'aparat.com')) {
    // aparat.com/v/{hash} یا aparat.com/video/video/embed/videohash/{hash}/…
    const i = parts.indexOf('videohash');
    const id = parts[0] === 'v' ? parts[1] : i >= 0 ? parts[i + 1] : undefined;
    ref = { provider: 'aparat', video_id: id ?? '' };
  }

  if (!ref) return null;
  const valid =
    ref.provider === 'youtube' ? YOUTUBE_ID : ref.provider === 'vimeo' ? VIMEO_ID : APARAT_ID;
  return valid.test(ref.video_id) ? ref : null;
}

export function videoEmbedUrl(ref: VideoRef): string {
  const id = encodeURIComponent(ref.video_id);
  switch (ref.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${id}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}`;
    case 'aparat':
      return `https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`;
  }
}

export function mapProviderOf(raw: string): MapProvider | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (hostIs(host, 'google.com') || hostIs(host, 'goo.gl')) return 'google';
  if (hostIs(host, 'neshan.org') || hostIs(host, 'nshn.ir')) return 'neshan';
  if (hostIs(host, 'balad.ir')) return 'balad';
  return null;
}

/** لینک کوتاهی که مختصات ندارد و باید با دنبال‌کردن redirect باز شود. */
export function isShortMapLink(raw: string): boolean {
  const url = parseUrl(raw);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'nshn.ir';
}

/**
 * لینک مکان بلد (`balad.ir/p/{token}`، همان لینک دکمه‌ی اشتراک‌گذاری) یا src کد iframe آن
 * (`balad.ir/embed?p={token}`): مختصات دقیق فقط در صفحه‌ی مکان است.
 */
export function baladPlaceUrl(raw: string): string | null {
  const url = parseUrl(raw);
  if (!url || url.port || !['balad.ir', 'www.balad.ir'].includes(url.hostname.toLowerCase())) return null;
  if (/^\/embed\/?$/.test(url.pathname)) {
    const token = url.searchParams.get('p') ?? '';
    return BALAD_TOKEN.test(token) ? `https://balad.ir/p/${token}` : null;
  }
  return /^\/p\/[^/]+\/?$/.test(url.pathname) ? `https://balad.ir${url.pathname}` : null;
}

/** شناسه‌ی مکان از آدرس صفحه‌ی مکان بلد (`/p/{token}` یا `/p/{نام}_{دسته}-{token}`). */
export function baladPlaceToken(placeUrl: string): string | null {
  const token = /\/p\/(?:[^/]*-)?([^/-]+)\/?$/.exec(parseUrl(placeUrl)?.pathname ?? '')?.[1] ?? '';
  return BALAD_TOKEN.test(token) ? token : null;
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
const COORD_PATTERNS: Array<{ re: RegExp; lat: number; lng: number; zoom?: number }> = [
  // گوگل: داده‌ی مکان (سنجاق) دقیق‌تر از مرکز نقشه است.
  { re: new RegExp(`!3d${NUM}!4d${NUM}`), lat: 1, lng: 2 },
  // گوگل و نشان: /@lat,lng,15z
  { re: new RegExp(`@${NUM},${NUM}(?:,(\\d+(?:\\.\\d+)?)z)?`), lat: 1, lng: 2, zoom: 3 },
  // بلد و نقشه‌های مشابه: #zoom/lat/lng
  { re: new RegExp(`#(\\d+(?:\\.\\d+)?)/${NUM}/${NUM}`), lat: 2, lng: 3, zoom: 1 },
  // src کد iframe نشان: …/iframe/…/{lat}/{lng} (سنجاق؛ دقیق‌تر از مرکز نقشه در هش)
  { re: new RegExp(`/iframe/(?:[^\\s]*/)?${NUM}/${NUM}$`), lat: 1, lng: 2 },
  // نوار آدرس نشان: #c{lat}-{lng}-{zoom}z-{bearing}p (مرکز نقشه)
  { re: new RegExp(`#c${NUM}-${NUM}-(\\d+(?:\\.\\d+)?)z`), lat: 1, lng: 2, zoom: 3 },
  // لینک مختصات نشان: nshn.ir/?lat&lng به /maps/share/{lat},{lng} می‌رود
  { re: new RegExp(`/share/${NUM},${NUM}`), lat: 1, lng: 2 },
  // src کد iframe گوگل‌مپ: pb=…!2d{lng}!3d{lat}…
  { re: new RegExp(`!2d${NUM}!3d${NUM}`), lat: 2, lng: 1 },
];

const PAIR_PARAMS = ['q', 'query', 'll', 'center', 'destination', 'daddr', 'sll', 'c'];
const LAT_PARAMS = ['latitude', 'lat'];
const LNG_PARAMS = ['longitude', 'lng', 'lon'];

function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

function clampZoom(z: number | undefined): number {
  return z !== undefined && Number.isFinite(z) ? Math.min(20, Math.max(3, Math.round(z))) : 15;
}

/** pb خام (با همان کدگذاری) از src کد iframe گوگل‌مپ. */
function googleEmbedPb(url: URL): string | null {
  if (!['www.google.com', 'maps.google.com'].includes(url.hostname.toLowerCase()) || !/^\/maps\/embed\/?$/.test(url.pathname)) return null;
  const pb = /[?&]pb=([^&#]+)/.exec(url.search)?.[1] ?? '';
  return GOOGLE_PB.test(pb) ? pb : null;
}

/** مختصات را از لینک گوگل‌مپ، نشان یا بلد (بدون شبکه) استخراج می‌کند. */
export function parseMapUrl(raw: string): MapLocation | null {
  const provider = mapProviderOf(raw);
  const url = parseUrl(raw);
  if (!provider || !url) return null;
  let text: string;
  try {
    text = decodeURIComponent(url.href);
  } catch {
    text = url.href;
  }

  for (const p of COORD_PATTERNS) {
    const m = p.re.exec(text);
    if (!m) continue;
    const lat = Number(m[p.lat]);
    const lng = Number(m[p.lng]);
    if (validCoord(lat, lng)) {
      const pb = provider === 'google' ? googleEmbedPb(url) : null;
      return { provider, lat, lng, zoom: clampZoom(p.zoom ? Number(m[p.zoom]) : undefined), ...(pb ? { pb } : {}) };
    }
  }

  const zoomParam = Number(url.searchParams.get('z') ?? url.searchParams.get('zoom') ?? NaN);
  for (const name of PAIR_PARAMS) {
    const m = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}`).exec(url.searchParams.get(name) ?? '');
    if (m && validCoord(Number(m[1]), Number(m[2]))) {
      return { provider, lat: Number(m[1]), lng: Number(m[2]), zoom: clampZoom(zoomParam) };
    }
  }
  const latRaw = LAT_PARAMS.map((n) => url.searchParams.get(n)).find((v) => v !== null);
  const lngRaw = LNG_PARAMS.map((n) => url.searchParams.get(n)).find((v) => v !== null);
  if (latRaw && lngRaw && validCoord(Number(latRaw), Number(lngRaw))) {
    return { provider, lat: Number(latRaw), lng: Number(lngRaw), zoom: clampZoom(zoomParam) };
  }
  return null;
}

/** نقشه‌ی همان سرویس اگر iframe رسمی‌اش را داریم (بلد، گوگل)؛ وگرنه گوگل‌مپ از مختصات. iframe نشان با مختصات کار نمی‌کند. */
export function mapEmbedUrl(loc: Pick<MapLocation, 'lat' | 'lng' | 'zoom'> & Partial<MapLocation>): string {
  if (loc.provider === 'balad' && loc.place_token) return `https://balad.ir/embed?p=${loc.place_token}`;
  if (loc.provider === 'google' && loc.pb) return `https://www.google.com/maps/embed?pb=${loc.pb}`;
  const q = `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${loc.zoom}&output=embed`;
}

/** مقصد دکمه‌ی «مسیریابی»: لینک خود کاربر؛ مگر src کد iframe که صفحه‌ی قابل‌مرور نیست. */
export function mapLinkUrl(sourceUrl: string, loc: MapLocation): string {
  const path = parseUrl(sourceUrl)?.pathname ?? '';
  const coords = `${loc.lat},${loc.lng}`;
  if (loc.provider === 'balad' && loc.place_token && /^\/embed\/?$/.test(path)) return `https://balad.ir/p/${loc.place_token}`;
  if (loc.provider === 'neshan' && path.includes('/iframe/')) return `https://neshan.org/maps/@${coords},16z`;
  if (loc.provider === 'google' && /^\/maps\/embed/.test(path)) return `https://www.google.com/maps/search/?api=1&query=${coords}`;
  return sourceUrl;
}
