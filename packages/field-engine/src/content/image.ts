import { z } from 'zod';
import type { ContentType } from '../contract';
import { httpsUrlSchema } from '../schema';

// فقط URL بیرونی https (آپلود فایل در لانچ نیست). url خالی = هنوز تنظیم نشده و رندر نمی‌شود.
const settingsSchema = z.strictObject({
  url: z.union([httpsUrlSchema, z.literal('')]).default(''),
  alt: z.string().max(300).default(''),
});

export const imageContent: ContentType<z.output<typeof settingsSchema>> = {
  kind: 'content',
  type: 'image',
  settingsSchema,
  defaultSettings: settingsSchema.parse({}),
};
