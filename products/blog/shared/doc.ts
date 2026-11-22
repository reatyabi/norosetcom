import { slugify } from './slug';
import { words } from './text';
import { VIDEO_ID, VIDEO_PROVIDERS, type VideoProvider } from './video';

// محتوای مقاله (docs/architecture.md §9.12): سند JSON ویرایشگر TipTap، فقط با گره‌ها و نشانه‌های فهرست سفید.
// سرور هر سند را با `sanitizeDoc` بازسازی می‌کند (ویژگی ناشناس حذف، گره ناشناس ← خطا، لینک ناامن حذف)؛ هرگز HTML.

export type SimpleMarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code';
export type Mark = { type: SimpleMarkType } | { type: 'link'; attrs: { href: string } };

export interface TextNode {
  type: 'text';
  text: string;
  marks?: Mark[];
}
export interface HardBreakNode {
  type: 'hardBreak';
}
export type InlineNode = TextNode | HardBreakNode;

export type CalloutTone = 'info' | 'tip' | 'warning' | 'danger';
export const CALLOUT_TONES: readonly CalloutTone[] = ['info', 'tip', 'warning', 'danger'];
export type HeadingLevel = 2 | 3 | 4;

export interface ParagraphNode {
  type: 'paragraph';
  content?: InlineNode[];
}
export interface HeadingNode {
  type: 'heading';
  attrs: { level: HeadingLevel };
  content?: InlineNode[];
}
export interface ListItemNode {
  type: 'listItem';
  content: BlockNode[];
}
export interface BulletListNode {
  type: 'bulletList';
  content: ListItemNode[];
}
export interface OrderedListNode {
  type: 'orderedList';
  attrs: { start: number };
  content: ListItemNode[];
}
export interface BlockquoteNode {
  type: 'blockquote';
  content: BlockNode[];
}
export interface CodeBlockNode {
  type: 'codeBlock';
  attrs: { language: string | null };
  content?: TextNode[];
}
export interface HorizontalRuleNode {
  type: 'horizontalRule';
}
export interface ImageNode {
  type: 'image';
  /** fileId = شناسه‌ی فایل پلتفرم norofile (uuid)؛ آدرس در رندر ساخته می‌شود. */
  attrs: { fileId: string; alt: string; caption: string; width: number | null; height: number | null };
}
export interface VideoNode {
  type: 'video';
  attrs: { provider: VideoProvider; videoId: string };
}
export interface CalloutNode {
  type: 'callout';
  attrs: { tone: CalloutTone };
  content: BlockNode[];
}
export interface TableCellNode {
  type: 'tableCell' | 'tableHeader';
  attrs: { colspan: number; rowspan: number };
  content: BlockNode[];
}
export interface TableRowNode {
  type: 'tableRow';
  content: TableCellNode[];
}
export interface TableNode {
  type: 'table';
  content: TableRowNode[];
}
/** پرسش و پاسخ (افزونه‌ی Details)؛ منبع JSON-LD از نوع FAQPage. */
export interface DetailsNode {
  type: 'details';
  content: [DetailsSummaryNode, DetailsContentNode];
}
export interface DetailsSummaryNode {
  type: 'detailsSummary';
  content?: InlineNode[];
}
export interface DetailsContentNode {
  type: 'detailsContent';
  content: BlockNode[];
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | BlockquoteNode
  | CodeBlockNode
  | HorizontalRuleNode
  | ImageNode
  | VideoNode
  | CalloutNode
  | TableNode
  | DetailsNode;

export interface BlogDoc {
  type: 'doc';
  content: BlockNode[];
}

export const EMPTY_DOC: BlogDoc = { type: 'doc', content: [] };

/** سقف‌ها: سند حداکثر ۲۰ هزار گره، عمق ۱۲ و هر متن ۲۰ هزار نویسه. */
export const DOC_LIMITS = { nodes: 20_000, depth: 12, text: 20_000, alt: 300, caption: 500, href: 2048 } as const;

export class DocError extends Error {
  constructor(readonly code: 'invalid_content' | 'content_too_large') {
    super(code);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIMPLE_MARKS: readonly string[] = ['bold', 'italic', 'underline', 'strike', 'code'];
// نویسه‌های کنترلی جز \n و \t
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

/** لینک امن: http(s)، mailto، tel، مسیر داخلی (`/…` نه `//`) یا لنگر (`#…`). */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v || v.length > DOC_LIMITS.href || /\s/.test(v)) return null;
  if (/^https?:\/\/[^/]/i.test(v) || /^mailto:[^@]+@[^@]+$/i.test(v) || /^tel:\+?[0-9-]{3,20}$/i.test(v)) return v;
  if (/^\/(?!\/)/.test(v) || /^#[^#]+$/.test(v)) return v;
  return null;
}

/**
 * گره‌های مجاز هر والد. تیتر فقط در سطح اول تا فهرست مطالب یکی باشد؛ تیتر درون ظرف‌ها (که schema ویرایشگر اجازه
 * می‌دهد) به پاراگراف پررنگ تبدیل می‌شود. بقیه‌ی بلوک‌ها هر جا که ویرایشگر بگذارد (عمق محدود است).
 */
const NESTED = ['paragraph', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'horizontalRule', 'image', 'video', 'callout', 'table', 'details'];
const TOP = [...NESTED, 'heading'];
const CHILDREN: Record<string, readonly string[]> = {
  listItem: NESTED,
  blockquote: NESTED,
  callout: NESTED,
  tableCell: NESTED,
  tableHeader: NESTED,
  detailsContent: NESTED,
};

type Raw = Record<string, unknown>;

class Sanitizer {
  private nodes = 0;

  private fail(): never {
    throw new DocError('invalid_content');
  }

  private obj(v: unknown): Raw {
    if (!v || typeof v !== 'object' || Array.isArray(v)) this.fail();
    if (++this.nodes > DOC_LIMITS.nodes) throw new DocError('content_too_large');
    return v as Raw;
  }

  private list(v: unknown): unknown[] {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) this.fail();
    return v;
  }

  private attrs(node: Raw): Raw {
    const a = node.attrs;
    return a && typeof a === 'object' && !Array.isArray(a) ? (a as Raw) : {};
  }

  private str(v: unknown, max: number): string {
    return typeof v === 'string' ? v.replace(CONTROL, '').slice(0, max) : '';
  }

  private int(v: unknown, min: number, max: number, fallback: number): number {
    return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback;
  }

  doc(input: unknown): BlogDoc {
    const root = this.obj(input);
    if (root.type !== 'doc') this.fail();
    return { type: 'doc', content: this.blocks(root.content, TOP, 1) };
  }

  private blocks(raw: unknown, allowed: readonly string[], depth: number): BlockNode[] {
    if (depth > DOC_LIMITS.depth) this.fail();
    return this.list(raw).map((n) => this.block(this.obj(n), allowed, depth));
  }

  private block(n: Raw, allowed: readonly string[], depth: number): BlockNode {
    const type = n.type;
    if (type === 'heading' && !allowed.includes('heading') && allowed.includes('paragraph')) {
      const content = this.inline(n.content).map((i) =>
        i.type === 'text' && !i.marks?.some((m) => m.type === 'bold') ? { ...i, marks: [...(i.marks ?? []), { type: 'bold' as const }] } : i,
      );
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
    }
    if (typeof type !== 'string' || !allowed.includes(type)) this.fail();
    const a = this.attrs(n);
    switch (type) {
      case 'paragraph':
        return this.withInline({ type: 'paragraph' }, n.content);
      case 'heading': {
        const level = this.int(a.level, 1, 6, 2);
        return this.withInline({ type: 'heading', attrs: { level: Math.min(4, Math.max(2, level)) as HeadingLevel } }, n.content);
      }
      case 'bulletList':
        return { type: 'bulletList', content: this.items(n.content, depth) };
      case 'orderedList':
        return { type: 'orderedList', attrs: { start: this.int(a.start, 1, 10_000, 1) }, content: this.items(n.content, depth) };
      case 'blockquote':
        return { type: 'blockquote', content: this.nonEmpty(this.blocks(n.content, CHILDREN.blockquote!, depth + 1)) };
      case 'codeBlock': {
        const language = typeof a.language === 'string' && /^[a-z0-9+#-]{1,20}$/i.test(a.language) ? a.language.toLowerCase() : null;
        const text = this.list(n.content)
          .map((t) => {
            const o = this.obj(t);
            return o.type === 'text' ? this.str(o.text, DOC_LIMITS.text) : this.fail();
          })
          .join('');
        return { type: 'codeBlock', attrs: { language }, ...(text ? { content: [{ type: 'text', text }] } : {}) };
      }
      case 'horizontalRule':
        return { type: 'horizontalRule' };
      case 'image': {
        if (typeof a.fileId !== 'string' || !UUID.test(a.fileId)) this.fail();
        const dim = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 20_000 ? v : null);
        return {
          type: 'image',
          attrs: {
            fileId: a.fileId.toLowerCase(),
            alt: this.str(a.alt, DOC_LIMITS.alt).trim(),
            caption: this.str(a.caption, DOC_LIMITS.caption).trim(),
            width: dim(a.width),
            height: dim(a.height),
          },
        };
      }
      case 'video': {
        const provider = a.provider as VideoProvider;
        if (!VIDEO_PROVIDERS.includes(provider) || typeof a.videoId !== 'string' || !VIDEO_ID[provider].test(a.videoId)) this.fail();
        return { type: 'video', attrs: { provider, videoId: a.videoId } };
      }
      case 'callout': {
        const tone = CALLOUT_TONES.includes(a.tone as CalloutTone) ? (a.tone as CalloutTone) : 'info';
        return { type: 'callout', attrs: { tone }, content: this.nonEmpty(this.blocks(n.content, CHILDREN.callout!, depth + 1)) };
      }
      case 'table': {
        const rows = this.list(n.content).map((r) => {
          const row = this.obj(r);
          if (row.type !== 'tableRow') this.fail();
          const cells = this.list(row.content).map((c) => {
            const cell = this.obj(c);
            if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') this.fail();
            const ca = this.attrs(cell);
            return {
              type: cell.type,
              attrs: { colspan: this.int(ca.colspan, 1, 20, 1), rowspan: this.int(ca.rowspan, 1, 100, 1) },
              content: this.nonEmpty(this.blocks(cell.content, CHILDREN.tableCell!, depth + 2)),
            } satisfies TableCellNode;
          });
          if (!cells.length || cells.length > 20) this.fail();
          return { type: 'tableRow', content: cells } satisfies TableRowNode;
        });
        if (!rows.length || rows.length > 200) this.fail();
        return { type: 'table', content: rows };
      }
      case 'details': {
        const parts = this.list(n.content).map((p) => this.obj(p));
        const summary = parts.find((p) => p.type === 'detailsSummary');
        const body = parts.find((p) => p.type === 'detailsContent');
        if (!summary || !body || parts.length !== 2) this.fail();
        return {
          type: 'details',
          content: [
            this.withInline({ type: 'detailsSummary' }, summary.content),
            { type: 'detailsContent', content: this.nonEmpty(this.blocks(body.content, CHILDREN.detailsContent!, depth + 1)) },
          ],
        };
      }
    }
    return this.fail();
  }

  private items(raw: unknown, depth: number): ListItemNode[] {
    const items = this.list(raw).map((i) => {
      const item = this.obj(i);
      if (item.type !== 'listItem') this.fail();
      return { type: 'listItem', content: this.nonEmpty(this.blocks(item.content, CHILDREN.listItem!, depth + 1)) } satisfies ListItemNode;
    });
    if (!items.length) this.fail();
    return items;
  }

  /** گره‌های ظرف (فهرست، نقل‌قول، …) دست‌کم یک پاراگراف دارند (همان قاعده‌ی schema ویرایشگر). */
  private nonEmpty(blocks: BlockNode[]): BlockNode[] {
    return blocks.length ? blocks : [{ type: 'paragraph' }];
  }

  private withInline<T extends { type: string }>(node: T, raw: unknown): T & { content?: InlineNode[] } {
    const content = this.inline(raw);
    return content.length ? { ...node, content } : node;
  }

  private inline(raw: unknown): InlineNode[] {
    const out: InlineNode[] = [];
    for (const r of this.list(raw)) {
      const n = this.obj(r);
      if (n.type === 'hardBreak') {
        out.push({ type: 'hardBreak' });
        continue;
      }
      if (n.type !== 'text') this.fail();
      const text = this.str(n.text, DOC_LIMITS.text).replace(/\n/g, ' ');
      if (!text) continue;
      const marks = this.marks(n.marks);
      out.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text });
    }
    return out;
  }

  private marks(raw: unknown): Mark[] {
    const out: Mark[] = [];
    const seen = new Set<string>();
    for (const r of this.list(raw)) {
      const m = this.obj(r);
      const type = m.type;
      if (typeof type !== 'string' || seen.has(type)) continue;
      if (SIMPLE_MARKS.includes(type)) {
        out.push({ type: type as SimpleMarkType });
        seen.add(type);
      } else if (type === 'link') {
        // لینک ناامن (javascript: و …) فقط حذف می‌شود؛ متن می‌ماند
        const href = safeHref(this.attrs(m).href);
        if (href) {
          out.push({ type: 'link', attrs: { href } });
          seen.add(type);
        }
      }
      // نشانه‌ی ناشناس (رنگ، هایلایت چسبانده‌شده و …) کنار می‌رود
    }
    return out;
  }
}

/** سند ورودی ← سند پاک‌سازی‌شده؛ ساختار نامعتبر ← DocError. */
export function sanitizeDoc(input: unknown): BlogDoc {
  return new Sanitizer().doc(input);
}

// ---------- پیمایش ----------

export function inlineText(content: InlineNode[] | undefined): string {
  return (content ?? []).map((n) => (n.type === 'text' ? n.text : ' ')).join('');
}

/** متن ساده‌ی یک گره (بلوک‌ها با خط جدید جدا می‌شوند). */
export function nodeText(node: BlockNode | ListItemNode | TableRowNode | TableCellNode | DetailsSummaryNode | DetailsContentNode): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
    case 'detailsSummary':
      return inlineText(node.content);
    case 'codeBlock':
      return (node.content ?? []).map((t) => t.text).join('');
    case 'image':
      return node.attrs.caption;
    case 'horizontalRule':
    case 'video':
      return '';
    default:
      return (node.content as Array<BlockNode | ListItemNode | TableRowNode | TableCellNode | DetailsSummaryNode | DetailsContentNode>)
        .map(nodeText)
        .filter(Boolean)
        .join('\n');
  }
}

export function docText(doc: BlogDoc): string {
  return doc.content.map(nodeText).filter(Boolean).join('\n');
}

export function isEmptyDoc(doc: BlogDoc): boolean {
  return !doc.content.some((b) => b.type === 'image' || b.type === 'video' || b.type === 'table' || nodeText(b).trim());
}

export interface TocItem {
  id: string;
  level: HeadingLevel;
  text: string;
}

/** تیترهای سطح اول با شناسه‌ی لنگر پایدار و یکتا (همان شناسه‌ای که رندر روی تیتر می‌گذارد). */
export function tableOfContents(doc: BlogDoc): TocItem[] {
  const used = new Map<string, number>();
  const out: TocItem[] = [];
  for (const b of doc.content) {
    if (b.type !== 'heading') continue;
    const text = inlineText(b.content).trim();
    const base = slugify(text) || 'section';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    out.push({ id: n === 1 ? base : `${base}-${n}`, level: b.attrs.level, text });
  }
  return out;
}

/** تعداد کلمه و زمان مطالعه (فارسی حدود ۲۰۰ کلمه در دقیقه؛ هر تصویر ۱۰ ثانیه). */
export function readingStats(doc: BlogDoc): { wordCount: number; readingMinutes: number } {
  const wordCount = words(docText(doc)).length;
  const images = docImages(doc).length;
  return { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / 200 + images / 6)) };
}

function walk(nodes: ReadonlyArray<{ type: string; content?: unknown }>, visit: (n: { type: string; content?: unknown }) => void): void {
  for (const n of nodes) {
    visit(n);
    if (Array.isArray(n.content)) walk(n.content as Array<{ type: string; content?: unknown }>, visit);
  }
}

export function docImages(doc: BlogDoc): ImageNode['attrs'][] {
  const out: ImageNode['attrs'][] = [];
  walk(doc.content, (n) => {
    if (n.type === 'image') out.push((n as ImageNode).attrs);
  });
  return out;
}

export function docLinks(doc: BlogDoc): string[] {
  const out: string[] = [];
  walk(doc.content, (n) => {
    if (n.type !== 'text') return;
    for (const m of (n as TextNode).marks ?? []) if (m.type === 'link') out.push(m.attrs.href);
  });
  return out;
}

/** پرسش‌وپاسخ‌های سند برای JSON-LD از نوع FAQPage. */
export function faqItems(doc: BlogDoc): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  walk(doc.content, (n) => {
    if (n.type !== 'details') return;
    const [summary, body] = (n as DetailsNode).content;
    const question = nodeText(summary).trim();
    const answer = nodeText(body).trim();
    if (question && answer) out.push({ question, answer });
  });
  return out;
}

/** متن اولین پاراگراف غیرخالی (مقدمه). */
export function introText(doc: BlogDoc): string {
  for (const b of doc.content) {
    if (b.type === 'paragraph') {
      const t = inlineText(b.content).trim();
      if (t) return t;
    }
  }
  return '';
}
