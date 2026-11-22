import { describe, expect, it } from 'vitest';
import { richTextSchema } from '@noroset/field-engine';
import { fromTiptap, richPlain, toTiptap } from '../src/app/(panel)/form/[id]/editor/_components/rich-text';

// ویرایشگر متن المان «متن» در ادیتور فرم (docs/architecture.md §8.8): سند همیشه در قالب field-engine می‌ماند.

const doc = {
  blocks: [
    { type: 'heading', level: 2, children: [{ type: 'text', text: 'سلام' }] },
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'پررنگ', bold: true },
        { type: 'text', text: ' و ' },
        { type: 'link', href: 'https://noroset.com', children: [{ type: 'text', text: 'لینک', italic: true }, { type: 'text', text: ' ساده' }] },
      ],
    },
    { type: 'list', ordered: true, items: [[{ type: 'text', text: 'یک' }], [{ type: 'text', text: 'دو' }]] },
    { type: 'list', ordered: false, items: [[{ type: 'text', text: 'الف' }]] },
  ],
};

describe('form rich text ↔ TipTap', () => {
  it('round-trips a field-engine document unchanged', () => {
    const parsed = richTextSchema.parse(doc);
    expect(fromTiptap(toTiptap(parsed))).toEqual(parsed);
  });

  it('drops what the form schema cannot store and stays valid', () => {
    const out = fromTiptap({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'زیرخط', marks: [{ type: 'underline' }, { type: 'bold' }] },
            { type: 'text', text: 'ناامن', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
          ],
        },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'نقل' }] }] },
      ],
    });
    expect(richTextSchema.safeParse(out).success).toBe(true);
    expect(out.blocks).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'زیرخط', bold: true },
          { type: 'text', text: 'ناامن' },
        ],
      },
      { type: 'paragraph', children: [{ type: 'text', text: 'نقل' }] },
    ]);
  });

  it('opens a plain-text help text (questions made before rich text) as paragraphs', () => {
    expect(fromTiptap(toTiptap('خط اول\n\nخط دوم'))).toEqual({
      blocks: [
        { type: 'paragraph', children: [{ type: 'text', text: 'خط اول' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'خط دوم' }] },
      ],
    });
    expect(fromTiptap(toTiptap(''))).toEqual({ blocks: [] });
    expect(richPlain('ساده')).toBe('ساده');
  });

  it('an empty editor is an empty document and plain text reads every block', () => {
    expect(fromTiptap(toTiptap({ blocks: [] }))).toEqual({ blocks: [] });
    expect(richPlain(doc)).toBe('سلام\nپررنگ و لینک ساده\nیک\nدو\nالف');
  });
});
