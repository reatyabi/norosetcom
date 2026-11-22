import { describe, expect, it } from 'vitest';
import { richTextPlain, validateDefinition } from '../src';
import { definition, field, page } from './fixtures';

// راهنمای پرسش (§8.3): متن ساده یا متن غنی محدود؛ هر دو همان‌طور که هستند ذخیره می‌شوند.

const withDescription = (description: unknown) =>
  validateDefinition(definition([page(1, 'main', [field(1, 'short_text', { description })])]));

const doc = {
  blocks: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'شماره‌ی ', bold: true },
        { type: 'link', href: 'https://noroset.com/help', children: [{ type: 'text', text: 'راهنما' }] },
      ],
    },
    { type: 'list', ordered: false, items: [[{ type: 'text', text: 'بدون صفر اول' }]] },
  ],
};

describe('field description', () => {
  it('keeps plain-text descriptions (forms and templates made before rich text)', () => {
    const r = withDescription('یک خط راهنما');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.definition.pages[0]?.body.items[0]).toMatchObject({ description: 'یک خط راهنما' });
  });

  it('accepts a rich-text description and stores it unchanged', () => {
    const r = withDescription(doc);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.definition.pages[0]?.body.items[0]).toMatchObject({ description: doc });
  });

  it('rejects raw HTML, unsafe links and unknown nodes', () => {
    expect(withDescription({ html: '<b>x</b>' }).ok).toBe(false);
    expect(withDescription({ blocks: [{ type: 'html', value: '<script>' }] }).ok).toBe(false);
    expect(
      withDescription({
        blocks: [{ type: 'paragraph', children: [{ type: 'link', href: 'javascript:alert(1)', children: [{ type: 'text', text: 'x' }] }] }],
      }).ok,
    ).toBe(false);
    expect(withDescription('x'.repeat(2001)).ok).toBe(false);
  });

  it('reads both forms as plain text', () => {
    expect(richTextPlain('ساده')).toBe('ساده');
    expect(richTextPlain(undefined)).toBe('');
    expect(richTextPlain(doc as never)).toBe('شماره‌ی راهنما\nبدون صفر اول');
  });
});
