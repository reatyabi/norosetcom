'use client';

import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { cn } from '@noroset/ui';
import { CALLOUT_LABEL, CALLOUT_TONES, videoEmbedUrl, type CalloutTone, type VideoProvider } from '@noroset/blog/ui';

// گره‌های خودی ویرایشگر مقاله؛ JSON آن‌ها همان است که `sanitizeDoc` سرور می‌پذیرد و `BlogContent` رندر می‌کند.

const numberAttr = (name: string) => ({
  default: null,
  parseHTML: (el: HTMLElement) => {
    const n = Number(el.getAttribute(name));
    return Number.isInteger(n) && n > 0 ? n : null;
  },
});

function ImageView({ node, updateAttributes, selected, extension }: ReactNodeViewProps) {
  const { fileId, alt, caption, width, height } = node.attrs as { fileId: string; alt: string; caption: string; width: number | null; height: number | null };
  const base = (extension.options as { assetBaseUrl: string }).assetBaseUrl;
  return (
    <NodeViewWrapper as="figure" className={cn('blog-figure rounded-xl p-1', selected && 'ring-2 ring-primary')} data-drag-handle>
      {/* eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile */}
      <img src={`${base}/${fileId}`} alt={alt} width={width ?? undefined} height={height ?? undefined} draggable={false} />
      <div contentEditable={false} className="mt-2 flex flex-col gap-1.5">
        <input
          value={caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="زیرنویس تصویر (اختیاری)"
          maxLength={500}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-sm text-muted-foreground outline-none hover:border-border focus:border-primary"
        />
        <input
          value={alt}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          placeholder="متن جایگزین (alt) برای سئو و خواننده‌ی صفحه"
          maxLength={300}
          aria-invalid={!alt}
          className={cn(
            'w-full rounded-md border bg-muted/40 px-2 py-1 text-xs outline-none focus:border-primary',
            alt ? 'border-transparent' : 'border-warning/60',
          )}
        />
      </div>
    </NodeViewWrapper>
  );
}

/** تصویر آپلودی (فایل پلتفرم)؛ fileId به‌جای src تا آدرس بیرونی هرگز وارد سند نشود. */
export const BlogImage = Node.create<{ assetBaseUrl: string }>({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions() {
    return { assetBaseUrl: '' };
  },
  addAttributes() {
    return {
      fileId: { default: null, parseHTML: (el) => el.getAttribute('data-file-id') },
      alt: { default: '', parseHTML: (el) => el.getAttribute('data-alt') ?? '' },
      caption: { default: '', parseHTML: (el) => el.getAttribute('data-caption') ?? '' },
      width: numberAttr('data-width'),
      height: numberAttr('data-height'),
    };
  },
  parseHTML() {
    return [{ tag: 'figure[data-file-id]' }];
  },
  renderHTML({ node }) {
    const a = node.attrs;
    return ['figure', { 'data-file-id': a.fileId, 'data-alt': a.alt, 'data-caption': a.caption, 'data-width': a.width, 'data-height': a.height }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

function CalloutView({ node, updateAttributes }: ReactNodeViewProps) {
  const tone = node.attrs.tone as CalloutTone;
  return (
    <NodeViewWrapper as="aside" className="blog-callout" data-tone={tone}>
      <div contentEditable={false} className="mb-1 flex gap-1 select-none">
        {CALLOUT_TONES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => updateAttributes({ tone: t })}
            aria-pressed={t === tone}
            className={cn('rounded px-1.5 text-xs', t === tone ? 'bg-background font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
          >
            {CALLOUT_LABEL[t]}
          </button>
        ))}
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

/** کادر نکته/هشدار. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: 'info',
        parseHTML: (el) => (CALLOUT_TONES.includes(el.getAttribute('data-tone') as CalloutTone) ? el.getAttribute('data-tone') : 'info'),
        renderHTML: (a) => ({ 'data-tone': a.tone }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'aside[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'blog-callout' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

const PROVIDER_LABEL: Record<VideoProvider, string> = { aparat: 'آپارات', youtube: 'یوتیوب', vimeo: 'ویمیو' };

function VideoView({ node, selected }: ReactNodeViewProps) {
  const ref = node.attrs as { provider: VideoProvider; videoId: string };
  return (
    <NodeViewWrapper className={cn('rounded-xl p-1', selected && 'ring-2 ring-primary')} data-drag-handle>
      <div className="blog-video">
        {/* در ادیتور پخش نمی‌شود تا کلیک گره را انتخاب کند */}
        <iframe src={videoEmbedUrl(ref)} title="ویدیو" className="pointer-events-none" tabIndex={-1} />
      </div>
      <p contentEditable={false} className="mt-1 text-center text-xs text-muted-foreground select-none">
        ویدیوی {PROVIDER_LABEL[ref.provider]}
      </p>
    </NodeViewWrapper>
  );
}

/** ویدیوی آپارات/یوتیوب/ویمیو از قالب ثابت (فقط ارائه‌دهنده و شناسه). */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      provider: { default: 'youtube', parseHTML: (el) => el.getAttribute('data-provider') },
      videoId: { default: '', parseHTML: (el) => el.getAttribute('data-video-id') },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-video-id]' }];
  },
  renderHTML({ node }) {
    return ['div', { 'data-provider': node.attrs.provider, 'data-video-id': node.attrs.videoId }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
