import { describe, expect, it } from 'vitest';
import {
  analyzeSeo,
  DocError,
  faqItems,
  isEmptyDoc,
  isValidSlug,
  normalizeFa,
  parseVideoUrl,
  readingStats,
  sanitizeDoc,
  slugify,
  tableOfContents,
  type BlogDoc,
} from '../shared';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const h = (level: number, text: string) => ({ type: 'heading', attrs: { level, textAlign: null }, content: [{ type: 'text', text }] });

describe('slug', () => {
  it('keeps Persian, normalizes Arabic letters, digits and half-spaces', () => {
    expect(slugify('ساخت صفحه‌ی لینک در ۵ دقیقه')).toBe('ساخت-صفحه-ی-لینک-در-5-دقیقه');
    expect(slugify('كتاب علمي')).toBe('کتاب-علمی');
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
    expect(slugify('!!!')).toBe('');
  });

  it('rejects reserved and malformed post slugs', () => {
    expect(isValidSlug('ساخت-صفحه')).toBe(true);
    expect(isValidSlug('category')).toBe(false);
    expect(isValidSlug('category', 'term')).toBe(true);
    expect(isValidSlug('a--b')).toBe(false);
    expect(isValidSlug('Upper')).toBe(false);
    expect(isValidSlug('x'.repeat(121))).toBe(false);
  });
});

describe('sanitizeDoc', () => {
  it('drops unknown attributes, unknown marks and unsafe links', () => {
    const doc = sanitizeDoc({
      type: 'doc',
      content: [
        h(1, 'تیتر'),
        {
          type: 'paragraph',
          attrs: { textAlign: 'right' },
          content: [
            { type: 'text', text: 'امن', marks: [{ type: 'link', attrs: { href: 'https://noroset.com', target: '_blank', rel: 'x' } }, { type: 'bold' }] },
            { type: 'text', text: 'خطرناک', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }, { type: 'textStyle', attrs: { color: 'red' } }] },
          ],
        },
      ],
    });
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'تیتر' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'امن', marks: [{ type: 'link', attrs: { href: 'https://noroset.com' } }, { type: 'bold' }] },
            { type: 'text', text: 'خطرناک' },
          ],
        },
      ],
    });
  });

  it('rejects unknown nodes and raw HTML nodes; nested headings become bold paragraphs', () => {
    expect(() => sanitizeDoc({ type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://evil' } }] })).toThrow(DocError);
    expect(sanitizeDoc({ type: 'doc', content: [{ type: 'blockquote', content: [h(2, 'x')] }] }).content[0]).toEqual({
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'bold' }] }] }],
    });
    // جدول بی‌ردیف
    expect(() =>
      sanitizeDoc({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'table', content: [] }] }] }] }),
    ).toThrow(DocError);
    // عمق بیش از حد
    let deep: Record<string, unknown> = { type: 'paragraph' };
    for (let i = 0; i < 20; i++) deep = { type: 'blockquote', content: [deep] };
    expect(() => sanitizeDoc({ type: 'doc', content: [deep] })).toThrow(DocError);
    expect(() => sanitizeDoc({ type: 'doc', content: [{ type: 'image', attrs: { src: 'https://evil/x.png' } }] })).toThrow(DocError);
    expect(() => sanitizeDoc({ type: 'doc', content: [{ type: 'video', attrs: { provider: 'youtube', videoId: '"><script>' } }] })).toThrow(DocError);
    expect(() => sanitizeDoc('<p>hi</p>')).toThrow(DocError);
  });

  it('keeps images, video, callouts, tables and FAQ', () => {
    const fileId = '0b6c8d1e-2f3a-4b5c-8d7e-9f0a1b2c3d4e';
    const doc = sanitizeDoc({
      type: 'doc',
      content: [
        { type: 'image', attrs: { fileId, alt: 'نمودار', caption: 'زیرنویس', width: 800, height: 400, src: 'x' } },
        { type: 'video', attrs: { provider: 'aparat', videoId: 'abc123' } },
        { type: 'callout', attrs: { tone: 'tip' }, content: [p('نکته')] },
        {
          type: 'table',
          content: [{ type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [p('ستون')] }] }],
        },
        {
          type: 'details',
          attrs: { open: false },
          content: [
            { type: 'detailsSummary', content: [{ type: 'text', text: 'نورولینک چیست؟' }] },
            { type: 'detailsContent', content: [p('صفحه‌ی لینک')] },
          ],
        },
      ],
    });
    expect(doc.content.map((b) => b.type)).toEqual(['image', 'video', 'callout', 'table', 'details']);
    expect(faqItems(doc)).toEqual([{ question: 'نورولینک چیست؟', answer: 'صفحه‌ی لینک' }]);
  });
});

describe('doc helpers', () => {
  const doc = sanitizeDoc({ type: 'doc', content: [p('مقدمه'), h(2, 'شروع'), p('متن'), h(3, 'شروع'), h(2, '')] }) as BlogDoc;

  it('builds unique anchors for the table of contents', () => {
    expect(tableOfContents(doc)).toEqual([
      { id: 'شروع', level: 2, text: 'شروع' },
      { id: 'شروع-2', level: 3, text: 'شروع' },
      { id: 'section', level: 2, text: '' },
    ]);
  });

  it('counts words and treats whitespace-only docs as empty', () => {
    expect(readingStats(doc)).toEqual({ wordCount: 4, readingMinutes: 1 });
    expect(isEmptyDoc(sanitizeDoc({ type: 'doc', content: [p('   ')] }))).toBe(true);
    expect(isEmptyDoc(doc)).toBe(false);
  });
});

describe('video', () => {
  it('parses supported providers only', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('aparat.com/v/abc123')).toEqual({ provider: 'aparat', videoId: 'abc123' });
    expect(parseVideoUrl('https://vimeo.com/channels/x/123456')).toEqual({ provider: 'vimeo', videoId: '123456' });
    expect(parseVideoUrl('https://example.com/v/1')).toBeNull();
  });
});

describe('analyzeSeo', () => {
  const body = Array.from({ length: 40 }, () => 'صفحه‌ی لینک ابزاری ساده برای معرفی کسب‌وکار در شبکه‌های اجتماعی است').join(' ');
  const doc = sanitizeDoc({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: `صفحه لینک چیست؟ ${body}` }] },
      h(2, 'ساخت صفحه لینک'),
      { type: 'paragraph', content: [{ type: 'text', text: 'نورولینک', marks: [{ type: 'link', attrs: { href: '/landing/link' } }] }] },
    ],
  });

  it('matches the keyword regardless of half-space and Arabic letters', () => {
    expect(normalizeFa('صفحه‌ی لينک')).toBe('صفحه ی لینک');
    const r = analyzeSeo({
      title: 'صفحه لینک چیست و چطور یکی بسازیم؟ راهنمای کامل',
      slug: 'صفحه-لینک-چیست',
      excerpt: 'در این راهنما یاد می‌گیرید صفحه لینک چیست، چه کاربردی دارد و چطور در چند دقیقه یک صفحه‌ی لینک حرفه‌ای برای کسب‌وکار خودتان بسازید.',
      seo: { focus_keyword: 'صفحه لینک' },
      doc,
      hasCover: true,
    });
    const status = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(status.keyword_title).toBe('good');
    expect(status.keyword_slug).toBe('good');
    expect(status.keyword_intro).toBe('good');
    expect(status.keyword_heading).toBe('good');
    expect(status.internal_links).toBe('good');
    expect(r.score).toBeGreaterThan(60);
  });

  it('flags a missing keyword and noindex', () => {
    const r = analyzeSeo({ title: '', slug: 'x', excerpt: '', seo: { noindex: true }, doc, hasCover: false });
    expect(r.checks.find((c) => c.id === 'keyword')?.status).toBe('bad');
    expect(r.checks.find((c) => c.id === 'noindex')?.status).toBe('bad');
    expect(r.score).toBeLessThan(50);
  });
});
