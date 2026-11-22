// ویدیوی درون مقاله: فقط آپارات، یوتیوب و ویمیو؛ iframe همیشه از قالب ثابت (هرگز HTML کاربر).

export type VideoProvider = 'youtube' | 'vimeo' | 'aparat';
export const VIDEO_PROVIDERS: readonly VideoProvider[] = ['youtube', 'vimeo', 'aparat'];

export interface VideoRef {
  provider: VideoProvider;
  videoId: string;
}

export const VIDEO_ID: Record<VideoProvider, RegExp> = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  vimeo: /^\d{1,12}$/,
  aparat: /^[A-Za-z0-9]{3,24}$/,
};

/** دامنه‌های frame صفحه‌ی مقاله (CSP). */
export const VIDEO_FRAME_SOURCES = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://www.aparat.com'] as const;

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** لینک ویدیو ← ارائه‌دهنده و شناسه؛ ناشناخته ← null. */
export function parseVideoUrl(raw: string): VideoRef | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let ref: VideoRef | null = null;
  if (host === 'youtu.be') ref = { provider: 'youtube', videoId: parts[0] ?? '' };
  else if (hostIs(host, 'youtube.com') || hostIs(host, 'youtube-nocookie.com')) {
    const v = url.searchParams.get('v');
    if (v) ref = { provider: 'youtube', videoId: v };
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '')) ref = { provider: 'youtube', videoId: parts[1] ?? '' };
  } else if (hostIs(host, 'vimeo.com')) {
    ref = { provider: 'vimeo', videoId: [...parts].reverse().find((p) => /^\d+$/.test(p)) ?? '' };
  } else if (hostIs(host, 'aparat.com')) {
    // aparat.com/v/{hash} یا …/embed/videohash/{hash}/…
    const i = parts.indexOf('videohash');
    ref = { provider: 'aparat', videoId: (parts[0] === 'v' ? parts[1] : i >= 0 ? parts[i + 1] : undefined) ?? '' };
  }
  return ref && VIDEO_ID[ref.provider].test(ref.videoId) ? ref : null;
}

export function videoEmbedUrl(ref: VideoRef): string {
  const id = encodeURIComponent(ref.videoId);
  switch (ref.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${id}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}`;
    case 'aparat':
      return `https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`;
  }
}

export function videoWatchUrl(ref: VideoRef): string {
  const id = encodeURIComponent(ref.videoId);
  switch (ref.provider) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${id}`;
    case 'vimeo':
      return `https://vimeo.com/${id}`;
    case 'aparat':
      return `https://www.aparat.com/v/${id}`;
  }
}
