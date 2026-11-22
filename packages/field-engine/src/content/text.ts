import { z } from 'zod';
import type { ContentType } from '../contract';
import { richTextSchema } from '../rich-text';

// المان محتوایی «متن»: یک سند متن غنی (rich-text.ts). هرگز HTML خام.

export { richTextSchema, type RichText } from '../rich-text';

const settingsSchema = z.strictObject({ doc: richTextSchema });

export const textContent: ContentType<z.output<typeof settingsSchema>> = {
  kind: 'content',
  type: 'text',
  settingsSchema,
  defaultSettings: settingsSchema.parse({}),
};
