// تبدیل بین سند متن غنی field-engine (§8.3: پاراگراف، تیتر ۱ تا ۳، پررنگ، کج، لینک https، فهرست)
// و JSON ویرایشگر TipTap. هر چیزی که در schema فرم نیست (زیرخط، تودرتویی فهرست، …) کنار می‌رود؛
// خروجی همیشه با richTextSchema معتبر است (تست form-rich-text).

import type { RichText } from '@noroset/field-engine';

type Block = RichText['blocks'][number];
type Inline = Extract<Block, { type: 'paragraph' }>['children'][number];
type TextRun = Extract<Inline, { type: 'text' }>;

interface TMark {
  type: string;
  attrs?: Record<string, unknown>;
}
export interface TNode {
  type: string;
  text?: string;
  marks?: TMark[];
  attrs?: Record<string, unknown>;
  content?: TNode[];
}

const MAX_RUN = 5000;
const isHttps = (href: unknown): href is string => typeof href === 'string' && /^https:\/\/[^\s]+$/i.test(href);

/* ─── field-engine ← TipTap ─── */

function runNodes(run: TextRun, link?: string): TNode {
  const marks: TMark[] = [];
  if (run.bold) marks.push({ type: 'bold' });
  if (run.italic) marks.push({ type: 'italic' });
  if (link) marks.push({ type: 'link', attrs: { href: link } });
  return marks.length ? { type: 'text', text: run.text, marks } : { type: 'text', text: run.text };
}

function inlineNodes(inlines: readonly Inline[]): TNode[] {
  return inlines.flatMap((i) => (i.type === 'link' ? i.children.map((c) => runNodes(c, i.href)) : [runNodes(i)]));
}

export function toTiptap(doc: unknown): TNode {
  // راهنمای قدیمی پرسش متن ساده است: هر خط یک پاراگراف.
  if (typeof doc === 'string') {
    const lines = doc.split('\n').filter((l) => l.trim() !== '');
    return {
      type: 'doc',
      content: lines.length
        ? lines.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text: text.slice(0, MAX_RUN) }] }))
        : [{ type: 'paragraph' }],
    };
  }
  const blocks = ((doc as RichText | undefined)?.blocks ?? []) as Block[];
  const content: TNode[] = blocks.map((b) => {
    if (b.type === 'heading') return { type: 'heading', attrs: { level: b.level }, content: inlineNodes(b.children) };
    if (b.type === 'list') {
      return {
        type: b.ordered ? 'orderedList' : 'bulletList',
        content: b.items.map((item) => ({ type: 'listItem', content: [{ type: 'paragraph', content: inlineNodes(item) }] })),
      };
    }
    return { type: 'paragraph', content: inlineNodes(b.children) };
  });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/* ─── TipTap ← field-engine ─── */

/** متن‌های پشت‌سرهم با یک لینک در یک اجرای link جمع می‌شوند. */
function readInlines(nodes: readonly TNode[] = []): Inline[] {
  const out: Inline[] = [];
  const texts: Array<{ run: TextRun; href?: string }> = [];
  const walk = (list: readonly TNode[]) => {
    for (const n of list) {
      if (n.type === 'text' && n.text) {
        const marks = n.marks ?? [];
        const run: TextRun = { type: 'text', text: n.text.slice(0, MAX_RUN) };
        if (marks.some((m) => m.type === 'bold')) run.bold = true;
        if (marks.some((m) => m.type === 'italic')) run.italic = true;
        const href = marks.find((m) => m.type === 'link')?.attrs?.href;
        texts.push(isHttps(href) ? { run, href } : { run });
      } else if (n.type === 'hardBreak') {
        texts.push({ run: { type: 'text', text: ' ' } });
      } else if (n.content) {
        walk(n.content);
      }
    }
  };
  walk(nodes);
  for (const { run, href } of texts) {
    const last = out[out.length - 1];
    if (href) {
      if (last?.type === 'link' && last.href === href) last.children.push(run);
      else out.push({ type: 'link', href, children: [run] });
    } else {
      out.push(run);
    }
  }
  return out;
}

export function fromTiptap(doc: TNode): RichText {
  const blocks: Block[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level);
      blocks.push({ type: 'heading', level: level === 1 || level === 2 ? level : 3, children: readInlines(node.content) });
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      const items = (node.content ?? []).map((li) => readInlines(li.content)).filter((i) => i.length > 0);
      if (items.length) blocks.push({ type: 'list', ordered: node.type === 'orderedList', items });
    } else {
      const children = readInlines(node.content);
      // پاراگراف خالی ذخیره نمی‌شود (فاصله‌ی پاراگراف‌ها از رندر می‌آید).
      if (children.length) blocks.push({ type: 'paragraph', children });
    }
  }
  return { blocks: blocks.slice(0, 200) };
}

/** متن ساده‌ی سند (برای پیش‌نمایش). */
export function richPlain(doc: unknown): string {
  if (typeof doc === 'string') return doc;
  const blocks = ((doc as RichText | undefined)?.blocks ?? []) as Block[];
  const line = (inl: readonly Inline[]) => inl.map((i) => (i.type === 'link' ? i.children.map((c) => c.text).join('') : i.text)).join('');
  return blocks.map((b) => (b.type === 'list' ? b.items.map(line).join('\n') : line(b.children))).join('\n');
}
