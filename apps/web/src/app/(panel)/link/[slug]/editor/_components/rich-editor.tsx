'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  BoldIcon,
  CheckIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@noroset/ui';
import { isHttpUrl, normalizeHttpUrl, type Block, type Inline, type RichDoc } from '@noroset/norolink/ui';

// ویرایشگر متن غنی WYSIWYG: متن همان‌طور که منتشر می‌شود دیده و ویرایش می‌شود. DOM فقط محل ویرایش است؛ خروجی
// همیشه RichDoc ساختاریافته است و HTML هرگز ذخیره نمی‌شود (هر برچسب ناشناس فقط متنش را می‌دهد).

type RichMark = 'h1' | 'h2' | 'h3' | 'bold' | 'italic' | 'link' | 'ul' | 'ol';
const RICH_MAX = 5000;
type RichTool = { mark: RichMark; label: string; icon: ReactNode };
const RICH_GROUPS: RichTool[][] = [
  [
    { mark: 'bold', label: 'پررنگ (Ctrl+B)', icon: <BoldIcon /> },
    { mark: 'italic', label: 'کج (Ctrl+I)', icon: <ItalicIcon /> },
    { mark: 'link', label: 'لینک', icon: <LinkIcon /> },
  ],
  [
    { mark: 'ul', label: 'فهرست', icon: <ListIcon /> },
    { mark: 'ol', label: 'فهرست شماره‌دار', icon: <ListOrderedIcon /> },
  ],
];
const BLOCK_OPTIONS = [
  { value: 'p', label: 'متن معمولی' },
  { value: 'h1', label: 'تیتر ۱' },
  { value: 'h2', label: 'تیتر ۲' },
  { value: 'h3', label: 'تیتر ۳' },
] as const;
const LIST_COMMAND = { ul: 'insertUnorderedList', ol: 'insertOrderedList' } as const;
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'PRE']);

const stop = (e: MouseEvent) => e.stopPropagation();

function inlineNodes(content: Inline[]): Node[] {
  return content.map((i) => {
    const text = document.createDocumentFragment();
    i.text.split('\n').forEach((line, k) => {
      if (k > 0) text.append(document.createElement('br'));
      text.append(line);
    });
    let node: Node = text;
    const wrap = (tag: string) => {
      const el = document.createElement(tag);
      el.append(node);
      node = el;
      return el;
    };
    if (i.bold) wrap('strong');
    if (i.italic) wrap('em');
    if (i.href) wrap('a').setAttribute('href', i.href);
    return node;
  });
}

function docNodes(doc: RichDoc): Node[] {
  return doc.blocks.map((b) => {
    if (b.type === 'p' || b.type === 'h') {
      const el = document.createElement(b.type === 'p' ? 'p' : `h${b.level}`);
      el.append(...inlineNodes(b.content));
      return el;
    }
    const list = document.createElement(b.type);
    for (const item of b.items) {
      const li = document.createElement('li');
      li.append(...inlineNodes(item));
      list.append(li);
    }
    return list;
  });
}

function readInlines(nodes: Iterable<Node>, marks: Omit<Inline, 'text'> = {}, out: Inline[] = []): Inline[] {
  const push = (text: string) => {
    const last = out[out.length - 1];
    if (last && last.bold === marks.bold && last.italic === marks.italic && last.href === marks.href) last.text += text;
    else out.push({ text, ...marks });
  };
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replaceAll(String.fromCharCode(160), ' ');
      if (text) push(text);
    } else if (node instanceof HTMLElement) {
      if (node.tagName === 'BR') {
        push('\n');
        continue;
      }
      const next = { ...marks };
      const st = node.style;
      const isBold =
        node.tagName === 'B' ||
        node.tagName === 'STRONG' ||
        st.fontWeight === 'bold' ||
        Number(st.fontWeight) >= 600;
      if (isBold) next.bold = true;

      const isItalic =
        node.tagName === 'I' ||
        node.tagName === 'EM' ||
        st.fontStyle === 'italic';
      if (isItalic) next.italic = true;

      const href = node.tagName === 'A' ? node.getAttribute('href') : null;
      if (href && isHttpUrl(href)) next.href = href;
      readInlines(node.childNodes, next, out);
    }
  }
  return out;
}

/** فاصله‌ی انتهایی (مثل br آخر که مرورگر برای مکان‌نما می‌گذارد) ذخیره نمی‌شود. */
function cleanInlines(content: Inline[]): Inline[] {
  const out = content.map((i) => ({ ...i }));
  while (out.length) {
    const last = out[out.length - 1]!;
    last.text = last.text.replace(/\n+$/, '');
    if (last.text) break;
    out.pop();
  }
  return out;
}

const isEmpty = (content: Inline[]) => content.every((i) => !i.text.trim());

/** DOM ویرایشگر ← RichDoc. متن شل و بلوک‌های تو در تو (div مرورگر) به پاراگراف/تیتر/فهرست تخت تبدیل می‌شوند. */
export function readRichDoc(root: Node): RichDoc {
  const blocks: Block[] = [];
  let loose: Node[] = [];
  const flush = () => {
    const content = cleanInlines(readInlines(loose));
    if (!isEmpty(content)) blocks.push({ type: 'p', content });
    loose = [];
  };
  const walk = (parent: Node) => {
    for (const node of parent.childNodes) {
      if (!(node instanceof HTMLElement) || !BLOCK_TAGS.has(node.tagName)) {
        loose.push(node);
        continue;
      }
      flush();
      const heading = /^H([1-6])$/.exec(node.tagName);
      if (heading) {
        const content = cleanInlines(readInlines(node.childNodes));
        const level = Math.min(Number(heading[1]), 3) as 1 | 2 | 3;
        if (!isEmpty(content)) blocks.push({ type: 'h', level, content });
      } else if (node.tagName === 'UL' || node.tagName === 'OL') {
        const items = [...node.children].map((li) => cleanInlines(readInlines(li.childNodes))).filter((c) => !isEmpty(c));
        if (items.length) blocks.push({ type: node.tagName === 'UL' ? 'ul' : 'ol', items });
      } else {
        walk(node);
        flush();
      }
    }
  };
  walk(root);
  flush();
  return { blocks };
}

export function RichEditor({
  doc,
  onChange,
  className,
  editorClassName,
  autoFocus = true,
}: {
  doc: RichDoc;
  onChange: (doc: RichDoc) => void;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [length, setLength] = useState(0);
  const [active, setActive] = useState<ReadonlySet<RichMark>>(new Set());
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  // محتوا فقط یک بار از doc ساخته می‌شود؛ بعد از آن DOM منبع ویرایش است تا مکان‌نما زیر دست کاربر نپرد.
  const initial = useRef(doc);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.replaceChildren(...docNodes(initial.current));
    setLength(root.textContent?.length ?? 0);
  }, []);

  const inside = (node: Node | null) => !!node && !!ref.current?.contains(node);

  // فیلد اول فعال فیلد ورود متن باشد
  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const root = ref.current;
    root.focus();
    const sel = document.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      saved.current = range.cloneRange();
    }
  }, [autoFocus]);

  useEffect(() => {
    const onSelection = () => {
      const sel = document.getSelection();
      if (!sel?.rangeCount || !inside(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      const anchor = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      const next = new Set<RichMark>();
      if (block === 'h1' || block === 'h2' || block === 'h3') next.add(block);
      if (document.queryCommandState('bold')) next.add('bold');
      if (document.queryCommandState('italic')) next.add('italic');
      if (document.queryCommandState('insertUnorderedList')) next.add('ul');
      if (document.queryCommandState('insertOrderedList')) next.add('ol');
      if (anchor?.closest('a')) next.add('link');
      setActive((prev) => (prev.size === next.size && [...next].every((m) => prev.has(m)) ? prev : next));
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  const sync = () => {
    const root = ref.current;
    if (!root) return;
    setLength(root.textContent?.length ?? 0);
    onChange(readRichDoc(root));
  };

  const restore = () => {
    ref.current?.focus();
    if (!saved.current) return;
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(saved.current);
  };

  const apply = (mark: RichMark) => {
    restore();
    if (mark === 'link') {
      if (active.has('link')) {
        const sel = document.getSelection();
        const node = sel?.anchorNode;
        const a = (node instanceof Element ? node : node?.parentElement)?.closest('a');
        if (a) {
          sel?.selectAllChildren(a);
          document.execCommand('unlink');
          sel?.collapseToEnd();
        }
        sync();
      } else {
        setLinkUrl('');
      }
      return;
    }
    if (mark === 'bold' || mark === 'italic') document.execCommand(mark);
    else if (mark === 'ul' || mark === 'ol') document.execCommand(LIST_COMMAND[mark]);
    sync();
  };

  const setBlock = (value: string) => {
    restore();
    let ok = false;
    try {
      ok = document.execCommand('formatBlock', false, `<${value}>`);
    } catch {
      // fallback
    }
    if (!ok) {
      try {
        document.execCommand('formatBlock', false, value);
      } catch {
        // ignore
      }
    }
    sync();
  };
  const block = active.has('h1') ? 'h1' : active.has('h2') ? 'h2' : active.has('h3') ? 'h3' : 'p';

  const addLink = () => {
    const url = normalizeHttpUrl(linkUrl ?? '');
    if (!isHttpUrl(url)) return;
    setLinkUrl(null);
    restore();
    const sel = document.getSelection();
    if (sel?.isCollapsed && sel.rangeCount) {
      // بدون انتخاب: خود نشانی به‌عنوان متن لینک درج می‌شود
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.textContent = url.replace(/^https?:\/\//, '');
      const range = sel.getRangeAt(0);
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('createLink', false, url);
    }
    sync();
  };

  const onLinkKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setLinkUrl(null);
      restore();
    }
  };

  return (
    <div className={className}>
      <style>{`
        .nl-rt-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px;font-family:inherit}
        .nl-rt-group{display:flex;gap:2px;padding:2px;border-radius:8px;background:hsl(var(--muted,240 5% 94%))}
        .nl-rt-select{box-sizing:border-box;height:30px;padding:0 8px;border:1px solid hsl(var(--border,240 6% 90%));border-radius:8px;font:inherit;font-size:12px;font-weight:500;color:hsl(var(--foreground,240 10% 4%));cursor:pointer;background:hsl(var(--card,0 0% 100%));outline:none}
        .nl-ec-btn{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;height:26px;width:26px;border-radius:6px;color:hsl(var(--muted-foreground,240 4% 46%));cursor:pointer;font-size:12px;transition:all .15s}
        .nl-ec-btn svg{width:14px;height:14px}
        .nl-ec-btn:hover,.nl-ec-btn:focus-visible{background:hsl(var(--muted,240 5% 90%));color:hsl(var(--foreground,240 10% 4%))}
        .nl-ec-btn--active{background:hsl(var(--primary,240 6% 10%))!important;color:hsl(var(--primary-foreground,0 0% 98%))!important}
        .nl-rich{position:relative;font-size:13.5px;line-height:1.8;outline:none;cursor:text;color:hsl(var(--card-foreground,240 10% 4%))}
        .nl-rich[data-empty]::before{content:attr(data-placeholder);position:absolute;top:0;right:0;left:0;opacity:.45;pointer-events:none}
        .nl-rich h1{font-size:1.55rem!important;font-weight:700!important;line-height:1.35!important;margin-top:.75rem!important;margin-bottom:.4rem!important}
        .nl-rich h2{font-size:1.3rem!important;font-weight:700!important;line-height:1.4!important;margin-top:.65rem!important;margin-bottom:.35rem!important}
        .nl-rich h3{font-size:1.15rem!important;font-weight:600!important;line-height:1.45!important;margin-top:.55rem!important;margin-bottom:.3rem!important}
        .nl-rich p{margin-top:.25rem!important;margin-bottom:.45rem!important;line-height:1.8!important}
        .nl-rich b,.nl-rich strong{font-weight:700!important}
        .nl-rich i,.nl-rich em{font-style:italic!important}
        .nl-rich ul{list-style-type:disc!important;padding-inline-start:1.6rem!important;margin-top:.35rem!important;margin-bottom:.5rem!important}
        .nl-rich ol{list-style-type:decimal!important;padding-inline-start:1.6rem!important;margin-top:.35rem!important;margin-bottom:.5rem!important}
        .nl-rich li{display:list-item!important;margin-bottom:.25rem!important;line-height:1.7!important}
        .nl-rich a{color:var(--primary)!important;text-decoration:underline!important;text-underline-offset:3px!important}
      `}</style>
      <div className="nl-rt-bar" role="toolbar" aria-label="قالب متن">
        <select
          className="nl-rt-select"
          aria-label="اندازه‌ی متن"
          tabIndex={-1}
          value={block}
          onMouseDown={() => {
            const sel = document.getSelection();
            if (sel?.rangeCount && inside(sel.anchorNode)) {
              saved.current = sel.getRangeAt(0).cloneRange();
            }
          }}
          onPointerDown={() => {
            const sel = document.getSelection();
            if (sel?.rangeCount && inside(sel.anchorNode)) {
              saved.current = sel.getRangeAt(0).cloneRange();
            }
          }}
          onClick={stop}
          onChange={(e) => setBlock(e.target.value)}
        >
          {BLOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {RICH_GROUPS.map((group, k) => (
          <div key={k} className="nl-rt-group" role="group">
            {group.map((t) => (
              <button
                key={t.mark}
                type="button"
                tabIndex={-1}
                className={cn('nl-ec-btn', active.has(t.mark) && 'nl-ec-btn--active')}
                title={t.label}
                aria-label={t.label}
                aria-pressed={active.has(t.mark)}
                // انتخاب متن و فوکوس ویرایشگر (و کیبورد موبایل) از دست نرود
                onPointerDown={(e) => {
                  e.preventDefault();
                  const sel = document.getSelection();
                  if (sel?.rangeCount && inside(sel.anchorNode)) {
                    saved.current = sel.getRangeAt(0).cloneRange();
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const sel = document.getSelection();
                  if (sel?.rangeCount && inside(sel.anchorNode)) {
                    saved.current = sel.getRangeAt(0).cloneRange();
                  }
                }}
                onClick={(e) => {
                  stop(e);
                  apply(t.mark);
                }}
              >
                {t.icon}
              </button>
            ))}
          </div>
        ))}
        {length > RICH_MAX - 500 ? (
          <span className={cn('nl-rt-count', length >= RICH_MAX && 'nl-rt-count--max')}>
            {length.toLocaleString('fa-IR')} / {RICH_MAX.toLocaleString('fa-IR')}
          </span>
        ) : null}
      </div>
      {linkUrl !== null ? (
        <div className="nl-rt-link" onClick={stop}>
          <input
            autoFocus
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            aria-label="نشانی لینک"
            placeholder="example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={onLinkKey}
          />
          <button type="button" className="nl-ec-btn" title="افزودن لینک" aria-label="افزودن لینک" onClick={addLink}>
            <CheckIcon />
          </button>
          <button
            type="button"
            className="nl-ec-btn"
            title="انصراف"
            aria-label="انصراف"
            onClick={() => {
              setLinkUrl(null);
              restore();
            }}
          >
            <XIcon />
          </button>
        </div>
      ) : null}
      <div
        ref={ref}
        className={cn('nl-text nl-rich min-h-[110px]', editorClassName)}
        role="textbox"
        aria-multiline="true"
        aria-label="متن"
        contentEditable
        suppressContentEditableWarning
        data-empty={length === 0 || undefined}
        data-placeholder="متن خود را بنویسید…"
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onClick={(e) => {
          stop(e);
          // لینک داخل ویرایشگر باز نمی‌شود
          if (e.target instanceof Element && e.target.closest('a')) e.preventDefault();
        }}
        onInput={sync}
        onBeforeInput={(e) => {
          const type = (e.nativeEvent as InputEvent).inputType;
          if (type?.startsWith('insert') && (ref.current?.textContent?.length ?? 0) >= RICH_MAX) e.preventDefault();
        }}
        onPaste={(e) => {
          // فقط متن ساده؛ قالب بیرونی وارد نمی‌شود
          e.preventDefault();
          e.stopPropagation();
          const room = RICH_MAX - (ref.current?.textContent?.length ?? 0);
          const text = e.clipboardData.getData('text/plain').slice(0, Math.max(0, room));
          if (text) document.execCommand('insertText', false, text);
        }}
      />
    </div>
  );
}
