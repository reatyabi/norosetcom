import { z } from 'zod';
import { LIMITS } from './limits';
import { isHttpsUrl } from './text';

// متن غنی محدود به‌صورت JSON ساختاریافته (پاراگراف، تیتر، پررنگ، کج، لینک https، فهرست).
// هرگز HTML خام: متن‌ها رشته‌ی ساده‌اند و رندرکننده آن‌ها را به‌صورت text درج می‌کند.
// جدا از schema.ts و content/text.ts تا هر دو بدون import چرخه‌ای از آن استفاده کنند
// (المان «متن» و راهنمای فیلدها، §8.3).

const href = z
  .string()
  .max(LIMITS.maxUrlLength)
  .refine(isHttpsUrl, { message: 'https_only' });

const textRun = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1).max(5000),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

const linkRun = z.strictObject({
  type: z.literal('link'),
  href,
  children: z.array(textRun).min(1).max(50),
});

const inline = z.discriminatedUnion('type', [textRun, linkRun]);
const inlines = z.array(inline).max(200);

const block = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), children: inlines }),
  z.strictObject({
    type: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    children: inlines,
  }),
  z.strictObject({
    type: z.literal('list'),
    ordered: z.boolean().default(false),
    items: z.array(inlines).min(1).max(100),
  }),
]);

export const richTextSchema = z.strictObject({ blocks: z.array(block).max(200).default([]) }).prefault({});

export type RichText = z.output<typeof richTextSchema>;

/**
 * متن ساده‌ی متن غنی یا رشته (هر بلوک و هر آیتم فهرست یک خط)؛ برای جای‌هایی که قالب‌بندی
 * معنا ندارد (مثلاً CSV، عنوان ستون، خلاصه).
 */
export function richTextPlain(value: string | RichText | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  type Inl = z.output<typeof inline>;
  const line = (list: readonly Inl[]) =>
    list.map((i) => (i.type === 'link' ? i.children.map((c) => c.text).join('') : i.text)).join('');
  return value.blocks
    .map((b) => (b.type === 'list' ? b.items.map(line).join('\n') : line(b.children)))
    .join('\n');
}
