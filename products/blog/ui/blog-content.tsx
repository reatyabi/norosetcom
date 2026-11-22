import { Fragment, type ReactNode } from 'react';
import {
  tableOfContents,
  videoEmbedUrl,
  type BlockNode,
  type BlogDoc,
  type CalloutTone,
  type InlineNode,
  type ListItemNode,
  type Mark,
  type TableCellNode,
} from '../shared';

// رندر مقاله از سند پاک‌سازی‌شده (docs/architecture.md §9.12): بدون hook تا در Server Component صفحه‌ی عمومی و
// پیش‌نمایش ادیتور یکی باشد. فقط عنصرهای ثابت React؛ هرگز dangerouslySetInnerHTML. ظاهر از کلاس‌های `blog-*`
// (apps/web/src/components/blog-prose.css) که ویرایشگر هم همان را می‌گیرد.

export const CALLOUT_LABEL: Record<CalloutTone, string> = { info: 'نکته', tip: 'پیشنهاد', warning: 'هشدار', danger: 'مهم' };

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function withMark(node: ReactNode, mark: Mark, key: number): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong key={key}>{node}</strong>;
    case 'italic':
      return <em key={key}>{node}</em>;
    case 'underline':
      return <u key={key}>{node}</u>;
    case 'strike':
      return <s key={key}>{node}</s>;
    case 'code':
      return <code key={key}>{node}</code>;
    case 'link':
      return isExternal(mark.attrs.href) ? (
        <a key={key} href={mark.attrs.href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      ) : (
        <a key={key} href={mark.attrs.href}>
          {node}
        </a>
      );
  }
}

function Inline({ content }: { content?: InlineNode[] }) {
  return (
    <>
      {(content ?? []).map((n, i) =>
        n.type === 'hardBreak' ? <br key={i} /> : <Fragment key={i}>{(n.marks ?? []).reduceRight<ReactNode>((acc, m, j) => withMark(acc, m, j), n.text)}</Fragment>,
      )}
    </>
  );
}

interface Ctx {
  assetBaseUrl: string;
  /** شناسه‌ی لنگر تیترهای سطح اول به ترتیب. */
  anchors: string[];
  heading: number;
}

function Blocks({ nodes, ctx }: { nodes: BlockNode[]; ctx: Ctx }) {
  return <>{nodes.map((n, i) => block(n, i, ctx))}</>;
}

function listItems(items: ListItemNode[], ctx: Ctx) {
  return items.map((item, i) => (
    <li key={i}>
      <Blocks nodes={item.content} ctx={ctx} />
    </li>
  ));
}

function cell(c: TableCellNode, i: number, ctx: Ctx) {
  const props = { colSpan: c.attrs.colspan > 1 ? c.attrs.colspan : undefined, rowSpan: c.attrs.rowspan > 1 ? c.attrs.rowspan : undefined };
  const body = <Blocks nodes={c.content} ctx={ctx} />;
  return c.type === 'tableHeader' ? (
    <th key={i} scope="col" {...props}>
      {body}
    </th>
  ) : (
    <td key={i} {...props}>
      {body}
    </td>
  );
}

function block(n: BlockNode, key: number, ctx: Ctx): ReactNode {
  switch (n.type) {
    case 'paragraph':
      return n.content?.length ? (
        <p key={key}>
          <Inline content={n.content} />
        </p>
      ) : null;
    case 'heading': {
      const id = ctx.anchors[ctx.heading++];
      const Tag = `h${n.attrs.level}` as 'h2' | 'h3' | 'h4';
      return (
        <Tag key={key} id={id} className="blog-heading">
          <Inline content={n.content} />
          {id ? (
            <a href={`#${id}`} className="blog-anchor" aria-label="پیوند این بخش">
              #
            </a>
          ) : null}
        </Tag>
      );
    }
    case 'bulletList':
      return <ul key={key}>{listItems(n.content, ctx)}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={n.attrs.start > 1 ? n.attrs.start : undefined}>
          {listItems(n.content, ctx)}
        </ol>
      );
    case 'blockquote':
      return (
        <blockquote key={key}>
          <Blocks nodes={n.content} ctx={ctx} />
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre key={key} dir="ltr" className="blog-code" data-language={n.attrs.language ?? undefined}>
          <code>{(n.content ?? []).map((t) => t.text).join('')}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    case 'image': {
      const a = n.attrs;
      return (
        <figure key={key} className="blog-figure">
          <img
            src={`${ctx.assetBaseUrl}/${a.fileId}`}
            alt={a.alt}
            width={a.width ?? undefined}
            height={a.height ?? undefined}
            loading="lazy"
            decoding="async"
          />
          {a.caption ? <figcaption>{a.caption}</figcaption> : null}
        </figure>
      );
    }
    case 'video':
      return (
        <div key={key} className="blog-video">
          <iframe
            src={videoEmbedUrl(n.attrs)}
            title="ویدیو"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    case 'callout':
      return (
        <aside key={key} className="blog-callout" data-tone={n.attrs.tone} role="note" aria-label={CALLOUT_LABEL[n.attrs.tone]}>
          <Blocks nodes={n.content} ctx={ctx} />
        </aside>
      );
    case 'table':
      return (
        <div key={key} className="blog-table" role="region" aria-label="جدول" tabIndex={0}>
          <table>
            <tbody>
              {n.content.map((row, r) => (
                <tr key={r}>{row.content.map((c, i) => cell(c, i, ctx))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'details': {
      const [summary, body] = n.content;
      return (
        <details key={key} className="blog-faq">
          <summary>
            <Inline content={summary.content} />
          </summary>
          <div className="blog-faq-body">
            <Blocks nodes={body.content} ctx={ctx} />
          </div>
        </details>
      );
    }
  }
}

export interface BlogContentProps {
  doc: BlogDoc;
  /** پیشوند آدرس فایل‌های پلتفرم (`${assetBaseUrl}/${fileId}`). */
  assetBaseUrl: string;
  className?: string;
}

/** متن مقاله؛ شناسه‌ی تیترها همان `tableOfContents` است. */
export function BlogContent({ doc, assetBaseUrl, className }: BlogContentProps) {
  const ctx: Ctx = { assetBaseUrl, anchors: tableOfContents(doc).map((t) => t.id), heading: 0 };
  return (
    <div className={className ? `blog-prose ${className}` : 'blog-prose'}>
      <Blocks nodes={doc.content} ctx={ctx} />
    </div>
  );
}
