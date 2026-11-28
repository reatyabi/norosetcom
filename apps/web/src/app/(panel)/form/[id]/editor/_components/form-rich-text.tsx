'use client';

/**
 * ویرایشگر متن غنی درون‌خطی (المان «متن»)، به سبک گوگل فرم: خط زیرین که با فوکوس به رنگ اصلی می‌رود
 * و نوار قالب‌بندی زیر آن. فقط آنچه schema متن غنی فرم نگه می‌دارد (§8.3): پررنگ، کج، لینک https،
 * فهرست شماره‌دار و نقطه‌ای، تیتر. زیرخط در schema نیست، پس دکمه‌ای هم ندارد.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import {
  BoldIcon,
  CheckIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  RemoveFormattingIcon,
  Unlink2Icon,
} from 'lucide-react';
import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@noroset/ui';
import { fromTiptap, toTiptap, type TNode } from './rich-text';
import './form-editor.css';

/** «example.com» ← «https://example.com»؛ فقط https (همان قاعده‌ی schema فرم). */
function normalizeHttps(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  return /^https:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(withScheme) ? withScheme : null;
}

export function FormRichText({
  value,
  onChange,
  label,
  placeholder,
  headings = true,
  subtle = false,
  className,
}: {
  value: unknown;
  onChange: (doc: ReturnType<typeof fromTiptap>) => void;
  label: string;
  placeholder: string;
  /** راهنمای پرسش تیتر ندارد. */
  headings?: boolean;
  /** استایل ظریف بدون خط زیرین دائمی برای متن راهنما */
  subtle?: boolean;
  /** کلاس متن (مثلاً رنگ کم‌رنگ راهنما). */
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: headings ? { levels: [1, 2, 3] } : false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: null, target: null } },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toTiptap(value),
    editorProps: {
      attributes: { class: cn('form-rich-content outline-none', className), dir: 'rtl', 'aria-label': label, 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor: e }) => onChange(fromTiptap(e.getJSON() as TNode)),
  });

  const openLink = () => {
    if (!editor) return;
    setLinkError(false);
    setLinking((editor.getAttributes('link').href as string | undefined) ?? '');
  };

  const submitLink = (e: FormEvent) => {
    e.preventDefault();
    if (!editor || linking === null) return;
    if (!linking.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinking(null);
      return;
    }
    const href = normalizeHttps(linking);
    if (!href) return setLinkError(true);
    if (editor.state.selection.empty && !editor.isActive('link')) {
      editor.chain().focus().insertContent({ type: 'text', text: linking.trim(), marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinking(null);
  };

  return (
    <div
      // نوار ابزار تا وقتی فوکوس داخل همین بخش است (ویرایشگر، دکمه‌ها یا ورودی لینک) می‌ماند.
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
          setLinking(null);
        }
      }}
      className="flex flex-col"
    >
      <div
        className={cn(
          'form-rich pt-1 pb-1.5 transition-colors duration-150 ease-fluent',
          subtle
            ? 'rounded-md border border-transparent px-1.5 hover:border-nf-border/40 focus-within:border-nf-primary/60 focus-within:bg-nf-card/50'
            : 'border-b border-b-foreground/20 hover:border-b-foreground/40 focus-within:border-b-2 focus-within:border-b-primary focus-within:pb-[5px]',
        )}
      >
        <EditorContent editor={editor} />
      </div>
      {focused && editor && (
        <Toolbar editor={editor} onLink={openLink} />
      )}
      {focused && linking !== null && (
        <form onSubmit={submitLink} className="mt-1 flex items-center gap-2">
          <input
            autoFocus
            dir="ltr"
            value={linking}
            onChange={(e) => {
              setLinking(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setLinking(null);
                editor?.commands.focus();
              }
            }}
            placeholder="https://example.com"
            aria-label="نشانی لینک"
            aria-invalid={linkError || undefined}
            className="h-8 min-w-0 flex-1 border-0 border-b border-b-foreground/20 bg-transparent text-left text-sm outline-none focus:border-b-2 focus:border-b-primary aria-invalid:border-b-destructive"
          />
          <ToolButton label="اعمال لینک" onClick={() => undefined} submit>
            <CheckIcon />
          </ToolButton>
          {linkError && <span className="text-xs text-destructive">فقط نشانی https</span>}
        </form>
      )}
    </div>
  );
}

function Toolbar({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      link: e.isActive('link'),
      ordered: e.isActive('orderedList'),
      bullet: e.isActive('bulletList'),
    }),
  });

  return (
    <div role="toolbar" aria-label="قالب‌بندی متن" className="mt-1 flex items-center gap-0.5 text-muted-foreground">
      <ToolButton label="پررنگ (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldIcon />
      </ToolButton>
      <ToolButton label="کج (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <ItalicIcon />
      </ToolButton>
      <ToolButton label={state.link ? 'ویرایش لینک' : 'افزودن لینک'} active={state.link} onClick={onLink}>
        <LinkIcon />
      </ToolButton>
      {state.link && (
        <ToolButton label="حذف لینک" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
          <Unlink2Icon />
        </ToolButton>
      )}
      <ToolButton label="فهرست شماره‌دار" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrderedIcon />
      </ToolButton>
      <ToolButton label="فهرست نقطه‌ای" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <ListIcon />
      </ToolButton>
      <ToolButton label="حذف قالب‌بندی" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <RemoveFormattingIcon />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  submit,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  submit?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type={submit ? 'submit' : 'button'}
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            aria-pressed={submit ? undefined : !!active}
            // فوکوس در ویرایشگر می‌ماند تا انتخاب متن از دست نرود.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn('[&_svg]:size-4', active && 'bg-muted text-primary')}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** نمای فقط‌خواندنی همان سند روی کارت جمع‌شده (با قالب‌بندی). */
export function RichPreview({ doc, empty, className }: { doc: unknown; empty: string; className?: string }) {
  const blocks = fromTiptap(toTiptap(doc)).blocks;
  if (!blocks.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  type Inl = Extract<(typeof blocks)[number], { type: 'paragraph' }>['children'];
  const inl = (list: Inl) =>
    list.map((i, k) =>
      i.type === 'link' ? (
        <span key={k} className="text-primary underline">
          {i.children.map((c, j) => (
            <Run key={j} run={c} />
          ))}
        </span>
      ) : (
        <Run key={k} run={i} />
      ),
    );
  return (
    <div className={cn('form-rich-content text-sm', className)}>
      {blocks.map((b, k) => {
        if (b.type === 'heading') {
          const H = (`h${b.level}` as 'h1' | 'h2' | 'h3');
          return <H key={k}>{inl(b.children)}</H>;
        }
        if (b.type === 'list') {
          const L = b.ordered ? 'ol' : 'ul';
          return (
            <L key={k}>
              {b.items.map((item, j) => (
                <li key={j}>{inl(item)}</li>
              ))}
            </L>
          );
        }
        return <p key={k}>{inl(b.children)}</p>;
      })}
    </div>
  );
}

function Run({ run }: { run: { text: string; bold?: boolean; italic?: boolean } }) {
  return <span className={cn(run.bold && 'font-bold', run.italic && 'italic')}>{run.text}</span>;
}
