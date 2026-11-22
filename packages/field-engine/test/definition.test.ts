import { describe, expect, it } from 'vitest';
import { LIMITS, validateDefinition, type DefinitionIssue } from '../src';
import { chrome, content, definition, fid, field, page } from './fixtures';

function codes(input: unknown): string[] {
  const r = validateDefinition(input);
  return r.ok ? [] : r.issues.map((i: DefinitionIssue) => i.code);
}

const minimal = () => definition([page(1, 'main', [field(1, 'short_text')])]);

describe('validateDefinition — structure', () => {
  it('accepts a minimal definition and fills defaults', () => {
    const r = validateDefinition(minimal());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.definition.theme.font).toBe('vazirmatn');
    expect(r.definition.pages[0]?.header.mode).toBe('inherit');
    const item = r.definition.pages[0]?.body.items[0];
    expect(item?.kind === 'field' && item.required).toBe(false);
    expect(item?.settings).toMatchObject({ max_length: 255 });
  });

  it('accepts a local http background image only for development hosts', () => {
    const local = definition([page(1, 'main', [field(1, 'short_text')])], {
      theme: { background_style: 'image', background_image_url: 'http://localhost:3000/api/norofile/public/files/abc' },
    });
    expect(codes(local)).toEqual([]);
    const publicHttp = definition([page(1, 'main', [field(1, 'short_text')])], {
      theme: { background_style: 'image', background_image_url: 'http://example.com/bg.jpg' },
    });
    expect(codes(publicHttp)).toContain('https_only');
  });

  it('rejects unknown keys anywhere (strict)', () => {
    expect(codes({ ...minimal(), extra: 1 })).toContain('unrecognized_keys');
    expect(codes(definition([page(1, 'main', [field(1, 'short_text', { onclick: 'x' })])]))).toContain(
      'unrecognized_keys',
    );
  });

  it('rejects malformed ids', () => {
    expect(codes(definition([{ ...page(1, 'main'), page_id: 'page-1' }]))).toContain('invalid_format');
  });

  it('rejects definitions over the size limit', () => {
    const huge = definition([page(1, 'main', [field(1, 'short_text')])], {
      settings: { closed_message: 'x'.repeat(LIMITS.maxDefinitionBytes) },
    });
    expect(codes(huge)).toEqual(['too_large']);
  });

  it('rejects more than 20 pages', () => {
    const pages = Array.from({ length: 21 }, (_, i) => page(i + 1, 'main'));
    expect(codes(definition(pages))).toContain('too_big');
  });

  it('custom area needs elements; inherit/hidden must not have them', () => {
    expect(codes(definition([page(1, 'main', [], { header: { mode: 'custom' } })]))).toContain('custom_requires_elements');
    expect(codes(definition([page(1, 'main', [], { header: { mode: 'hidden', elements: [] } })]))).toContain(
      'elements_only_for_custom',
    );
  });

  it('caps chrome elements per area at 8', () => {
    const els = Array.from({ length: 9 }, (_, i) => chrome(100 + i, 'form_name'));
    expect(codes(definition([page(1, 'main')], { defaults: { header: { elements: els } } }))).toContain('too_big');
  });
});

describe('validateDefinition — rule 1: pages', () => {
  it('needs at least one main page', () => {
    expect(codes(definition([page(1, 'welcome')]))).toContain('no_main_page');
  });

  it('welcome must be first, ending last, each at most once', () => {
    expect(codes(definition([page(1, 'main'), page(2, 'welcome')]))).toContain('welcome_must_be_first');
    expect(codes(definition([page(1, 'ending'), page(2, 'main')]))).toContain('ending_must_be_last');
    expect(codes(definition([page(1, 'welcome'), page(2, 'welcome'), page(3, 'main')]))).toContain(
      'welcome_must_be_first',
    );
    expect(codes(definition([page(1, 'welcome'), page(2, 'main'), page(3, 'ending')]))).toEqual([]);
  });
});

describe('validateDefinition — rule 2: unique ids', () => {
  it('rejects duplicate page/item/field ids', () => {
    expect(codes(definition([page(1, 'main'), page(1, 'main')]))).toContain('duplicate_page_id');
    expect(
      codes(definition([page(1, 'main', [field(1, 'short_text'), { ...field(2, 'short_text'), item_id: 'i_item0001' }])])),
    ).toContain('duplicate_item_id');
    expect(
      codes(definition([page(1, 'main', [field(1, 'short_text'), { ...field(2, 'short_text'), field_id: fid(1) }])])),
    ).toContain('duplicate_field_id');
  });

  it('item ids are unique across chrome and body', () => {
    const def = definition([page(1, 'main', [field(1, 'short_text')])], {
      defaults: { header: { elements: [chrome(1, 'form_name')] } },
    });
    expect(codes(def)).toContain('duplicate_item_id');
  });
});

describe('validateDefinition — rule 3/4: placement', () => {
  it('welcome and ending accept only content', () => {
    expect(codes(definition([page(1, 'welcome', [field(1, 'short_text')]), page(2, 'main')]))).toContain(
      'field_not_allowed_on_page_kind',
    );
    expect(codes(definition([page(1, 'welcome', [content(1, 'text')]), page(2, 'main')]))).toEqual([]);
  });

  it('chrome cannot be placed in the body', () => {
    expect(codes(definition([page(1, 'main', [chrome(1, 'form_name')])]))).not.toEqual([]);
  });

  it('rejects unknown types', () => {
    expect(codes(definition([page(1, 'main', [field(1, 'signature')])]))).toContain('unknown_type');
  });

  it('chrome respects allowed areas and page kinds', () => {
    const badge = { mode: 'custom', elements: [chrome(10, 'license_badge')] };
    expect(codes(definition([page(1, 'main', [], { header: badge })]))).toContain('chrome_area_not_allowed');
    const timer = { mode: 'custom', elements: [chrome(10, 'elapsed_timer')] };
    expect(codes(definition([page(1, 'welcome', [], { header: timer }), page(2, 'main')]))).toContain(
      'chrome_page_kind_not_allowed',
    );
    expect(codes(definition([page(1, 'main', [], { header: timer })]))).toEqual([]);
  });

  it('form-level defaults are checked for area only', () => {
    const def = definition([page(1, 'welcome'), page(2, 'main')], {
      defaults: { header: { elements: [chrome(10, 'elapsed_timer')] } },
    });
    expect(codes(def)).toEqual([]);
  });

  it('validates and normalizes per-type settings', () => {
    expect(codes(definition([page(1, 'main', [field(1, 'rating', { settings: { max: 50 } })])]))).toContain('too_big');
    const r = validateDefinition(definition([page(1, 'main', [field(1, 'rating')])]));
    expect(r.ok && r.definition.pages[0]?.body.items[0]?.settings).toEqual({ max: 5 });
  });

  it('caps total body items', () => {
    const items = Array.from({ length: LIMITS.maxBodyItems + 1 }, (_, i) => content(i + 1, 'image'));
    expect(codes(definition([page(1, 'main', items)]))).toContain('too_many_items');
  });
});

describe('validateDefinition — rule 6: urls, video, no raw html', () => {
  it('only https urls', () => {
    for (const url of ['http://example.com/a.png', 'javascript:alert(1)', 'https://user@evil.com/', 'data:image/png;base64,AA']) {
      expect(codes(definition([page(1, 'main', [content(1, 'image', { settings: { url } })])])), url).toContain(
        'https_only',
      );
    }
    expect(
      codes(definition([page(1, 'main')], { ending: { redirect: { url: 'http://example.com' } } })),
    ).toContain('https_only');
  });

  it('video only from allowed providers with a valid id', () => {
    const video = (settings: unknown) => definition([page(1, 'main', [content(1, 'video', { settings })])]);
    expect(codes(video({ provider: 'youtube', video_id: 'dQw4w9WgXcQ' }))).toEqual([]);
    expect(codes(video({ provider: 'dailymotion', video_id: 'x' }))).not.toEqual([]);
    expect(codes(video({ provider: 'youtube', video_id: '<iframe>' }))).toContain('invalid_video_id');
    expect(codes(video({ html: '<iframe src="https://evil.com">' }))).toContain('unrecognized_keys');
  });

  it('rich text is structured: no html node type, links must be https', () => {
    const text = (doc: unknown) => definition([page(1, 'main', [content(1, 'text', { settings: { doc } })])]);
    const ok = {
      blocks: [
        { type: 'heading', level: 1, children: [{ type: 'text', text: 'سلام', bold: true }] },
        { type: 'paragraph', children: [{ type: 'link', href: 'https://noroset.com', children: [{ type: 'text', text: 'لینک' }] }] },
        { type: 'list', ordered: true, items: [[{ type: 'text', text: 'یک' }]] },
      ],
    };
    expect(codes(text(ok))).toEqual([]);
    expect(codes(text({ blocks: [{ type: 'html', html: '<b>x</b>' }] }))).not.toEqual([]);
    expect(
      codes(text({ blocks: [{ type: 'paragraph', children: [{ type: 'link', href: 'javascript:x', children: [{ type: 'text', text: 'a' }] }] }] })),
    ).toContain('https_only');
  });
});

describe('validateDefinition — rule 5: conditions', () => {
  const cond = (field_id: string, op: string, value?: unknown) => ({ effect: 'show', field_id, op, value });

  it('accepts backward references (earlier page or earlier item on the same page)', () => {
    const def = definition([
      page(1, 'main', [field(1, 'short_text'), field(2, 'short_text', { condition: cond(fid(1), 'eq', 'x') })]),
      page(2, 'main', [field(3, 'short_text')], { condition: cond(fid(1), 'is_empty') }),
    ]);
    expect(codes(def)).toEqual([]);
  });

  it('rejects forward and self references', () => {
    expect(
      codes(definition([page(1, 'main', [field(1, 'short_text', { condition: cond(fid(2), 'eq', 'x') }), field(2, 'short_text')])])),
    ).toContain('forward_reference');
    expect(
      codes(definition([page(1, 'main', [field(1, 'short_text', { condition: cond(fid(1), 'is_empty') })])])),
    ).toContain('forward_reference');
    // شرط صفحه نمی‌تواند به فیلد همان صفحه اشاره کند.
    expect(codes(definition([page(1, 'main', [field(1, 'short_text')], { condition: cond(fid(1), 'is_empty') })]))).toContain(
      'forward_reference',
    );
  });

  it('rejects unknown field references and conditions on non-main pages', () => {
    expect(codes(definition([page(1, 'main', [content(1, 'text', { condition: cond(fid(9), 'is_empty') })])]))).toContain(
      'unknown_field_reference',
    );
    expect(
      codes(definition([page(1, 'main', [field(1, 'short_text')]), page(2, 'ending', [], { condition: cond(fid(1), 'is_empty') })])),
    ).toContain('condition_only_on_main_page');
  });

  it('checks op support and value presence', () => {
    const on = (type: string, c: unknown, settings?: unknown) =>
      definition([page(1, 'main', [field(1, type, settings ? { settings } : {}), content(2, 'text', { condition: c })])]);
    expect(codes(on('single_choice', cond(fid(1), 'gt', 'a')))).toContain('op_not_supported');
    expect(codes(on('short_text', cond(fid(1), 'eq')))).toContain('value_required');
    expect(codes(on('short_text', cond(fid(1), 'is_empty', 'x')))).toContain('value_not_allowed');
    expect(codes(on('single_choice', cond(fid(1), 'eq', 'nope')))).toContain('invalid_condition_value');
    expect(codes(on('multi_choice', cond(fid(1), 'contains', 'option_1')))).toEqual([]);
    expect(codes(on('multi_choice', cond(fid(1), 'contains', 'nope')))).toContain('invalid_condition_value');
  });

  it('stores normalized condition values (e.g. phone → E.164)', () => {
    const r = validateDefinition(
      definition([page(1, 'main', [field(1, 'phone'), content(2, 'text', { condition: cond(fid(1), 'eq', '09123456789') })])]),
    );
    expect(r.ok && r.definition.pages[0]?.body.items[1]?.condition?.value).toBe('+989123456789');
  });
});

describe('validateDefinition — determinism', () => {
  it('does not mutate its input and returns equal output for equal input', () => {
    const input = minimal();
    const snapshot = JSON.stringify(input);
    const a = validateDefinition(input);
    const b = validateDefinition(JSON.parse(snapshot));
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(a).toEqual(b);
  });
});
