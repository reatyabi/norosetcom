// سقف‌های فنی norofile (docs/architecture.md §9.9). سهمیه‌ی فضای هر tenant از پلن است (`norofile.storage_mb`، §9.11).

/** سقف حجم هر فایل؛ apps/api بدنه‌ی خام آپلود را با همین سقف می‌پذیرد. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const MIB = 1024 * 1024;

/** سقف هر فایل فضای شخصی کاربر (فعلاً فقط آواتار). */
export const PERSONAL_MAX_BYTES = 2 * 1024 * 1024;

export const RATE_LIMITS = {
  upload: { limit: 60, windowMs: 10 * 60 * 1000 },
  publicRead: { limit: 600, windowMs: 60 * 1000 },
} as const;

export const LIST_LIMIT = { default: 50, max: 200 } as const;

/** فقط تصویر و PDF لینک عمومی می‌گیرند؛ Office و ZIP خصوصی می‌مانند (ریسک میزبانی بدافزار روی noroset.com؛ §9.9). */
export function canBePublic(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}
