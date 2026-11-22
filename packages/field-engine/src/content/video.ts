import { z } from 'zod';
import type { ContentType } from '../contract';

// ویدیو فقط از آپارات/یوتیوب/ویمیو. ورودی کاربر لینک است و فقط {provider, video_id} ذخیره می‌شود؛
// آدرس embed همیشه از قالب ثابت ساخته می‌شود (هرگز iframe/HTML کاربر).

export const VIDEO_PROVIDERS = ['aparat', 'youtube', 'vimeo'] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

const VIDEO_ID: Record<VideoProvider, RegExp> = {
  aparat: /^[A-Za-z0-9]{1,32}$/,
  youtube: /^[A-Za-z0-9_-]{11}$/,
  vimeo: /^\d{1,15}$/,
};

/** originهایی که CSP صفحه‌ی عمومی باید برای frame-src مجاز کند. */
export const VIDEO_FRAME_ORIGINS = [
  'https://www.aparat.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
] as const;

const URL_PATTERNS: ReadonlyArray<[VideoProvider, RegExp]> = [
  ['youtube', /^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/],
  ['youtube', /^https:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})(?:[?#].*)?$/],
  ['youtube', /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#].*)?$/],
  ['vimeo', /^https:\/\/(?:www\.)?vimeo\.com\/(\d{1,15})(?:[/?#].*)?$/],
  ['vimeo', /^https:\/\/player\.vimeo\.com\/video\/(\d{1,15})(?:[?#].*)?$/],
  ['aparat', /^https:\/\/(?:www\.)?aparat\.com\/v\/([A-Za-z0-9]{1,32})(?:[/?#].*)?$/],
  ['aparat', /^https:\/\/(?:www\.)?aparat\.com\/video\/video\/embed\/videohash\/([A-Za-z0-9]{1,32})\/vt\/frame(?:[?#].*)?$/],
];

/** لینک ویدیو ← {provider, video_id}؛ لینک غیرمجاز ← null. */
export function parseVideoUrl(url: string): { provider: VideoProvider; video_id: string } | null {
  const s = url.trim();
  for (const [provider, re] of URL_PATTERNS) {
    const m = re.exec(s);
    if (m?.[1]) return { provider, video_id: m[1] };
  }
  return null;
}

export function buildEmbedUrl(provider: VideoProvider, videoId: string): string {
  if (!VIDEO_ID[provider].test(videoId)) throw new Error(`invalid ${provider} video id`);
  switch (provider) {
    case 'aparat':
      return `https://www.aparat.com/video/video/embed/videohash/${videoId}/vt/frame`;
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`;
  }
}

// هر دو خالی = هنوز تنظیم نشده و رندر نمی‌شود.
const settingsSchema = z
  .strictObject({
    provider: z.enum(VIDEO_PROVIDERS).optional(),
    video_id: z.string().optional(),
  })
  .superRefine((s, ctx) => {
    if ((s.provider === undefined) !== (s.video_id === undefined)) {
      ctx.addIssue({ code: 'custom', message: 'provider_and_video_id_together' });
    } else if (s.provider && s.video_id !== undefined && !VIDEO_ID[s.provider].test(s.video_id)) {
      ctx.addIssue({ code: 'custom', message: 'invalid_video_id', path: ['video_id'] });
    }
  });

export const videoContent: ContentType<z.output<typeof settingsSchema>> = {
  kind: 'content',
  type: 'video',
  settingsSchema,
  defaultSettings: settingsSchema.parse({}),
};
