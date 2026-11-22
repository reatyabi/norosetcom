import { z } from 'zod';

// متن غنی محدود به‌صورت JSON ساختاریافته (هرگز HTML). ویرایشگر WYSIWYG مستقیم همین JSON را می‌سازد؛ نشانه‌گذاری سبک
// (# تیتر، - فهرست، 1. فهرست شماره‌دار، **پررنگ**، *کج*، [متن](https://…)) فقط برای قالب‌ها و متن چسبانده‌شده روی
// بوم است و ذخیره نمی‌شود.

export interface Inline {
  text: string;
  bold?: true;
  italic?: true;
  href?: string;
}

export type Block =
  | { type: 'p'; content: Inline[] }
  | { type: 'h'; level: 1 | 2 | 3; content: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] };

export interface RichDoc {
  blocks: Block[];
}

const LINK_HREF = /^https?:\/\/[^\s]+$/;

const inlineSchema = z
  .object({
    text: z.string().max(2000),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    href: z.string().max(2048).regex(LINK_HREF).optional(),
  })
  .strict();

const inlines = z.array(inlineSchema).max(100);

export const richDocSchema = z
  .object({
    blocks: z
      .array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('p'), content: inlines }).strict(),
          z.object({ type: z.literal('h'), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), content: inlines }).strict(),
          z.object({ type: z.enum(['ul', 'ol']), items: z.array(inlines).max(50) }).strict(),
        ]),
      )
      .max(50),
  })
  .strict();

const INLINE_TOKEN = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of source.matchAll(INLINE_TOKEN)) {
    if (m.index > last) out.push({ text: source.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], href: m[2]! });
    else if (m[3] !== undefined) out.push({ text: m[3], bold: true });
    else out.push({ text: m[4]!, italic: true });
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push({ text: source.slice(last) });
  return out;
}

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*•]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;

/** نشانه‌گذاری سبک ← RichDoc. خط خالی پاراگراف‌ها را جدا می‌کند. */
export function parseRichText(source: string): RichDoc {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', content: parseInline(para.join('\n')) });
    para = [];
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    if (!line) {
      flushPara();
    } else if (heading) {
      flushPara();
      blocks.push({ type: 'h', level: heading[1]!.length as 1 | 2 | 3, content: parseInline(heading[2]!) });
    } else if (bullet || ordered) {
      flushPara();
      const type = bullet ? 'ul' : 'ol';
      const item = parseInline((bullet ?? ordered)![1]!);
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === type) prev.items.push(item);
      else blocks.push({ type, items: [item] });
    } else {
      para.push(line);
    }
  }
  flushPara();
  return { blocks };
}

function serializeInline(content: Inline[]): string {
  return content
    .map((i) => (i.href ? `[${i.text}](${i.href})` : i.bold ? `**${i.text}**` : i.italic ? `*${i.text}*` : i.text))
    .join('');
}

/** RichDoc ← نشانه‌گذاری سبک (برای ویرایش دوباره). */
export function serializeRichText(doc: RichDoc): string {
  return doc.blocks
    .map((b) => {
      if (b.type === 'p') return serializeInline(b.content);
      if (b.type === 'h') return `${'#'.repeat(b.level)} ${serializeInline(b.content)}`;
      return b.items.map((it, i) => `${b.type === 'ul' ? '-' : `${i + 1}.`} ${serializeInline(it)}`).join('\n');
    })
    .join('\n\n');
}

export function isEmptyDoc(doc: RichDoc): boolean {
  const inlineEmpty = (c: Inline[]) => c.every((i) => i.text.trim() === '');
  return doc.blocks.every((b) => ('items' in b ? b.items.every(inlineEmpty) : inlineEmpty(b.content)));
}
