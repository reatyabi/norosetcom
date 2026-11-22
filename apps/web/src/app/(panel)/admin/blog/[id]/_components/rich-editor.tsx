'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { TableKit } from '@tiptap/extension-table';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import {
  BoldIcon,
  CodeIcon,
  CodeXmlIcon,
  HelpCircleIcon,
  ImageIcon,
  InfoIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  UnderlineIcon,
  Undo2Icon,
  VideoIcon,
} from 'lucide-react';
import { Button, cn, FilePicker, Field, FieldDescription, FieldLabel, Input, NativeSelect, NativeSelectOption, Tooltip, TooltipContent, TooltipTrigger } from '@noroset/ui';
import { parseVideoUrl, safeHref, type BlogDoc } from '@noroset/blog/ui';
import { errorMessage } from '@/lib/api';
import { blogImageSource } from '@/lib/file-sources';
import { FormDialog } from '@/components/settings-ui';
import { BlogImage, Callout, Video } from './extensions';

// ویرایشگر WYSIWYG مقاله (TipTap). خروجی همیشه JSON است و سرور آن را با `sanitizeDoc` دوباره می‌سازد؛ ظاهر همان
// `.blog-prose` صفحه‌ی عمومی است.

const IMAGE_OPTIONS = { accept: ['image' as const], maxBytes: 5 * 1024 * 1024, requirePublic: true, image: { shape: 'rect' as const, maxSize: 2000, quality: 0.85 } };

type BlockType = 'p' | 'h2' | 'h3' | 'h4';

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(active && 'bg-muted text-primary')}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const Sep = () => <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;

/** «example.com» ← «https://example.com»؛ مسیر داخلی و لنگر همان. */
function normalizeHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(v)) return safeHref(v);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return safeHref(`mailto:${v}`);
  return safeHref(`https://${v}`);
}

function altFromName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 120);
}

function Toolbar({ editor, onLink, onVideo, onImage }: { editor: Editor; onLink: () => void; onVideo: () => void; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: (e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p') as BlockType,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      callout: e.isActive('callout'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  function setBlock(v: BlockType) {
    if (v === 'p') chain().setParagraph().run();
    else chain().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur-xs">
      <div role="toolbar" aria-label="قالب‌بندی متن" className="flex flex-wrap items-center gap-0.5">
        <ToolButton label="واگرد (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          <Undo2Icon />
        </ToolButton>
        <ToolButton label="ازنو (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          <Redo2Icon />
        </ToolButton>
        <Sep />
        <NativeSelect size="sm" aria-label="نوع بلوک" className="w-28" value={s.block} onChange={(e) => setBlock(e.target.value as BlockType)}>
          <NativeSelectOption value="p">متن</NativeSelectOption>
          <NativeSelectOption value="h2">تیتر ۲</NativeSelectOption>
          <NativeSelectOption value="h3">تیتر ۳</NativeSelectOption>
          <NativeSelectOption value="h4">تیتر ۴</NativeSelectOption>
        </NativeSelect>
        <Sep />
        <ToolButton label="پررنگ (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <BoldIcon />
        </ToolButton>
        <ToolButton label="کج (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <ItalicIcon />
        </ToolButton>
        <ToolButton label="زیرخط (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolButton>
        <ToolButton label="خط‌خورده" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <StrikethroughIcon />
        </ToolButton>
        <ToolButton label="کد درون‌خطی" active={s.code} onClick={() => chain().toggleCode().run()}>
          <CodeIcon />
        </ToolButton>
        <ToolButton label="لینک (Ctrl+K)" active={s.link} onClick={onLink}>
          <LinkIcon />
        </ToolButton>
        <Sep />
        <ToolButton label="فهرست نقطه‌ای" active={s.bulletList} onClick={() => chain().toggleBulletList().run()}>
          <ListIcon />
        </ToolButton>
        <ToolButton label="فهرست شماره‌دار" active={s.orderedList} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrderedIcon />
        </ToolButton>
        <ToolButton label="نقل‌قول" active={s.blockquote} onClick={() => chain().toggleBlockquote().run()}>
          <QuoteIcon />
        </ToolButton>
        <ToolButton
          label="کادر نکته"
          active={s.callout}
          onClick={() => (s.callout ? chain().lift('callout').run() : chain().wrapIn('callout').run())}
        >
          <InfoIcon />
        </ToolButton>
        <ToolButton label="بلوک کد" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
          <CodeXmlIcon />
        </ToolButton>
        <ToolButton label="خط جداکننده" onClick={() => chain().setHorizontalRule().run()}>
          <MinusIcon />
        </ToolButton>
        <Sep />
        <ToolButton label="تصویر" onClick={onImage}>
          <ImageIcon />
        </ToolButton>
        <ToolButton label="ویدیو (آپارات، یوتیوب، ویمیو)" onClick={onVideo}>
          <VideoIcon />
        </ToolButton>
        <ToolButton label="جدول" active={s.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon />
        </ToolButton>
        <ToolButton
          label="پرسش و پاسخ (FAQ)"
          onClick={() =>
            chain()
              .insertContent({
                type: 'details',
                content: [
                  { type: 'detailsSummary', content: [{ type: 'text', text: 'پرسش' }] },
                  { type: 'detailsContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'پاسخ' }] }] },
                ],
              })
              .run()
          }
        >
          <HelpCircleIcon />
        </ToolButton>
      </div>
      {s.table ? (
        <div role="toolbar" aria-label="جدول" className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted-foreground">جدول:</span>
          {[
            ['سطر بعد', () => chain().addRowAfter().run()],
            ['ستون بعد', () => chain().addColumnAfter().run()],
            ['حذف سطر', () => chain().deleteRow().run()],
            ['حذف ستون', () => chain().deleteColumn().run()],
            ['سطر عنوان', () => chain().toggleHeaderRow().run()],
            ['حذف جدول', () => chain().deleteTable().run()],
          ].map(([label, run]) => (
            <Button key={label as string} type="button" size="xs" variant="secondary" onMouseDown={(e) => e.preventDefault()} onClick={run as () => void}>
              {label as string}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RichEditor({ initial, assetBaseUrl, onChange }: { initial: BlogDoc; assetBaseUrl: string; onChange: (doc: BlogDoc) => void }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoValue, setVideoValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  // میان‌بر Ctrl+K در editorProps بسته‌ی رندر اول را دارد؛ setState پایدار است و باز کردن در effect با editor جاری
  const [linkRequested, setLinkRequested] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: null, target: null } },
      }),
      Placeholder.configure({ placeholder: 'از اینجا بنویسید… (## برای تیتر، - برای فهرست، > برای نقل‌قول)' }),
      TableKit.configure({ table: { resizable: false } }),
      Details.configure({ HTMLAttributes: { class: 'blog-faq' } }),
      DetailsSummary,
      DetailsContent,
      BlogImage.configure({ assetBaseUrl }),
      Callout,
      Video,
    ],
    content: initial as JSONContent,
    editorProps: {
      attributes: { class: 'blog-prose min-h-[24rem] px-4 py-5 outline-none sm:px-8', dir: 'rtl', 'aria-label': 'متن مقاله' },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setLinkRequested(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as BlogDoc),
  });

  function openLink() {
    if (!editor) return;
    setLinkValue((editor.getAttributes('link').href as string | undefined) ?? '');
    setDialogError(null);
    setLinkOpen(true);
  }

  if (linkRequested && editor) {
    setLinkRequested(false);
    openLink();
  }

  function submitLink(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    if (!linkValue.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = normalizeHref(linkValue);
    if (!href) {
      setDialogError('لینک معتبر نیست؛ نشانی کامل (https://…)، مسیر داخلی (/…) یا ایمیل وارد کنید.');
      return;
    }
    if (editor.state.selection.empty && !editor.isActive('link')) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: linkValue.trim(), marks: [{ type: 'link', attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  function submitVideo(e: FormEvent) {
    e.preventDefault();
    const ref = parseVideoUrl(videoValue);
    if (!ref) {
      setDialogError('لینک ویدیو شناخته نشد؛ لینک آپارات، یوتیوب یا ویمیو وارد کنید.');
      return;
    }
    editor?.chain().focus().insertContent({ type: 'video', attrs: ref }).run();
    setVideoOpen(false);
  }

  return (
    <div className="flex flex-col">
      {editor ? (
        <Toolbar
          editor={editor}
          onLink={openLink}
          onVideo={() => {
            setVideoValue('');
            setDialogError(null);
            setVideoOpen(true);
          }}
          onImage={() => setPickerOpen(true)}
        />
      ) : (
        <div className="h-11 border-b border-border" />
      )}
      <EditorContent editor={editor} className="blog-editor" />

      <FormDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="لینک"
        description="نشانی کامل، مسیر داخلی سایت (مثل /landing/link) یا ایمیل. خالی = برداشتن لینک."
        onSubmit={submitLink}
        submitLabel="ثبت"
        doneLabel="ثبت شد"
        busy={false}
        error={dialogError}
      >
        <Field>
          <FieldLabel>نشانی</FieldLabel>
          <Input dir="ltr" autoFocus value={linkValue} onChange={(e) => setLinkValue(e.target.value)} placeholder="https://" maxLength={2048} />
          <FieldDescription>لینک‌های داخلی برای سئو ارزشمندند.</FieldDescription>
        </Field>
      </FormDialog>

      <FormDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        title="ویدیو"
        description="لینک ویدیو در آپارات، یوتیوب یا ویمیو را بچسبانید."
        onSubmit={submitVideo}
        submitLabel="افزودن"
        doneLabel="افزوده شد"
        busy={false}
        error={dialogError}
      >
        <Field>
          <FieldLabel>لینک ویدیو</FieldLabel>
          <Input dir="ltr" autoFocus value={videoValue} onChange={(e) => setVideoValue(e.target.value)} placeholder="https://www.aparat.com/v/…" maxLength={500} />
        </Field>
      </FormDialog>

      <FilePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        source={blogImageSource()}
        options={IMAGE_OPTIONS}
        title="تصویر مقاله"
        errorMessage={errorMessage}
        onPick={(f) => {
          setPickerOpen(false);
          editor
            ?.chain()
            .focus()
            .insertContent({ type: 'image', attrs: { fileId: f.id, alt: altFromName(f.name), caption: '', width: f.width, height: f.height } })
            .run();
        }}
      />
    </div>
  );
}
