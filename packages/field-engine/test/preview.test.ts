import { describe, expect, it } from 'vitest';
import { formPreview, PREVIEW_MAX_ITEMS } from '../src';
import { content, definition, field, page } from './fixtures';

describe('formPreview', () => {
  it('reads theme colors and the first items of main pages only', () => {
    const preview = formPreview(
      definition(
        [
          page(0, 'welcome', [content(100, 'text', { settings: { doc: { blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'خوش آمدید' }] }] } } })]),
          page(1, 'main', [
            field(1, 'short_text', { label: 'نام' }),
            field(2, 'single_choice', {
              label: 'رشته',
              settings: { options: ['الف', 'ب', 'ج', 'د'].map((l, i) => ({ value: `v${i}`, label: l })) },
            }),
          ]),
          page(2, 'main', [field(3, 'rating', { label: 'امتیاز', settings: { max: 7 } }), field(4, 'email', { label: 'ایمیل' }), field(5, 'phone', { label: 'تلفن' })]),
        ],
        { theme: { primary_color: '#0f7b0f', background_color: '#f3f3f3' } },
      ),
    );
    expect(preview.primaryColor).toBe('#0f7b0f');
    expect(preview.backgroundColor).toBe('#f3f3f3');
    expect(preview.backgroundStyle).toBe('solid');
    expect(preview.buttonStyle).toBe('filled');
    expect(preview.radius).toBe('md');
    expect(preview.textSize).toBe('md');
    expect(preview.font).toBe('vazirmatn');
    expect(preview.items).toHaveLength(PREVIEW_MAX_ITEMS);
    expect(preview.items[0]).toEqual({ type: 'short_text', label: 'نام' });
    expect(preview.items[1]).toEqual({ type: 'single_choice', label: 'رشته', options: ['الف', 'ب', 'ج'] });
    expect(preview.items[2]).toEqual({ type: 'rating', label: 'امتیاز', max: 7 });
  });

  it('includes plain text of content blocks', () => {
    const doc = { blocks: [{ type: 'heading', level: 2, children: [{ type: 'link', href: 'https://a.ir', children: [{ type: 'text', text: 'راهنما' }] }] }] };
    expect(formPreview(definition([page(1, 'main', [content(1, 'text', { settings: { doc } })])])).items).toEqual([{ type: 'text', label: 'راهنما' }]);
  });

  it('never throws on incomplete or malformed drafts', () => {
    for (const raw of [null, 'x', [], {}, { pages: 'x' }, { pages: [{ kind: 'main', body: { items: [null, { kind: 'field' }, 5] } }] }, { theme: { primary_color: 'red' } }]) {
      const p = formPreview(raw);
      expect(p.items).toEqual([]);
      expect(p.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('includes supported theme styling in the preview summary', () => {
    const preview = formPreview(
      definition([], {
        theme: {
          primary_color: '#0f7b0f',
          background_color: '#f3f3f3',
          background_style: 'gradient',
          background_secondary_color: '#d9ead3',
          background_angle: 210,
          button_style: 'tonal',
          radius: 'full',
          text_size: 'lg',
          font: 'system',
        },
      }),
    );
    expect(preview).toMatchObject({
      backgroundStyle: 'gradient',
      backgroundSecondaryColor: '#d9ead3',
      backgroundAngle: 210,
      buttonStyle: 'tonal',
      radius: 'full',
      textSize: 'lg',
      font: 'system',
    });
  });
});
