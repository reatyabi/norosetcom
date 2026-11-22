import { z } from 'zod';

// تصویر آپلودی یا دارایی ایستا: فایل public در norofile (§9.4) با UUID، یا تصویر ثابت قالب با مسیر /images/...؛
// norolink شناسه‌ی آن را نگه می‌دارد و فقط فایل‌های دارای شناسه UUID در norofile همگام می‌شوند. ابعاد برای رندر بدون جهش است.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** فقط تصاویر ثابت قالب‌ها؛ هرگز آدرس بیرونی (ردیابی، دورزدن norofile) یا کاراکتری که از `url("…")` CSS بیرون بزند. */
const STATIC_ASSET_PATTERN = /^\/images\/templates\/[a-z0-9-]+\.(jpg|png|webp)$/;
/** تصویر قالب‌های ساخته‌شده در مدیریت پلتفرم: فایل پلتفرم norofile (بدون tenant)، از همه‌ی فضاهای کاری قابل استفاده. */
export const PLATFORM_ASSET_PATTERN = /^platform\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** شناسه‌ی تصویر برای فایل پلتفرم؛ آدرسش `{assetBaseUrl}/platform/{id}` است و در norofile همگام نمی‌شود. */
export const platformAssetId = (fileId: string) => `platform/${fileId}`;

export const imageRefSchema = z
  .object({
    file_id: z.string().refine((id) => UUID_PATTERN.test(id) || STATIC_ASSET_PATTERN.test(id) || PLATFORM_ASSET_PATTERN.test(id)),
    width: z.number().int().min(1).max(20000),
    height: z.number().int().min(1).max(20000),
  })
  .strict();
export type ImageRef = z.infer<typeof imageRefSchema>;

/** آدرس تصویر از مسیر عمومی norofile (`assetBaseUrl` را API می‌دهد) یا مسیر مستقیم وب برای دارایی‌های ایستا. */
export function assetUrlFor(baseUrl: string): (image: ImageRef) => string {
  const base = baseUrl.replace(/\/+$/, '');
  return (image) => {
    if (STATIC_ASSET_PATTERN.test(image.file_id)) return image.file_id;
    return base ? `${base}/${image.file_id}` : `/${image.file_id}`;
  };
}

/** شناسه‌های یکتای فایل‌ها برای ثبت استفاده در norofile (فقط UUIDهای آپلودی؛ فایل‌های ایستا نادیده گرفته می‌شوند). */
export function imageFileIds(images: ImageRef[]): string[] {
  return [...new Set(images.map((i) => i.file_id).filter((id): id is string => typeof id === 'string' && UUID_PATTERN.test(id)))];
}
