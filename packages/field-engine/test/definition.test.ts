import { describe, expect, it } from 'vitest';
import { LIMITS, validateDefinition, type DefinitionIssue } from '../src';
import { content, definition, fid, field, page } from './fixtures';

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
    expect(r.definition.version_schema).toBe(1);
    expect(r.definition.theme.preset).toBe('paper');
    expect(r.definition.layout.main_columns).toBe(1);
    expect(r.definition.layout.zones.header).toBe(true);
    expect(r.definition.layout.zones.top_bar).toBe(true);
    expect(r.definition.layout.zones.sidebar).toBe(true);
    expect(r.definition.layout.zones.bottom_bar).toBe(true);
    expect(r.definition.layout.zones.footer).toBe(true);
    expect(r.definition.defaults.sidebar.title).toBe('مراحل فرم');
    expect(r.definition.defaults.bottom_bar.submit_label).toBe('ثبت و ارسال');
  });

  it('rejects input that cannot be parsed as JSON or has invalid types', () => {
    expect(codes(undefined)).toEqual(['invalid_type']);
    expect(codes(null)).not.toEqual([]);
    expect(codes('string')).not.toEqual([]);
    expect(codes({})).not.toEqual([]);
  });

  it('enforces size limit (max 500 KB)', () => {
    const huge = minimal();
    (huge as { pad?: string }).pad = 'x'.repeat(LIMITS.maxDefinitionBytes + 10);
    expect(codes(huge)).toEqual(['too_large']);
  });

  it('rejects more than 20 pages', () => {
    const pages = Array.from({ length: 21 }, (_, i) => page(i + 1, 'main'));
    expect(codes(definition(pages))).toContain('too_big');
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
});

describe('validateDefinition — rule 3/4: placement', () => {
  it('welcome and ending accept only content', () => {
    expect(codes(definition([page(1, 'welcome', [field(1, 'short_text')]), page(2, 'main')]))).toContain(
      'field_not_allowed_on_page_kind',
    );
    expect(codes(definition([page(1, 'welcome', [content(1, 'text')]), page(2, 'main')]))).toEqual([]);
  });

  it('rejects unknown types', () => {
    expect(codes(definition([page(1, 'main', [field(1, 'signature')])]))).toContain('unknown_type');
  });

  it('validates and normalizes per-type settings with col_span and text_align defaults', () => {
    expect(codes(definition([page(1, 'main', [field(1, 'rating', { settings: { max: 50 } })])]))).toContain('too_big');
    const r = validateDefinition(definition([page(1, 'main', [field(1, 'rating')])]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const item = r.definition.pages[0]!.body.items[0]!;
    expect(item.settings).toMatchObject({
      col_span: 1,
      text_align: 'right',
      placeholder: '',
      max: 5,
    });
  });

  it('long_text defaults to col_span: 2', () => {
    const r = validateDefinition(definition([page(1, 'main', [field(1, 'long_text')])]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const item = r.definition.pages[0]!.body.items[0]!;
    expect(item.settings).toMatchObject({
      col_span: 2,
      text_align: 'right',
      placeholder: '',
    });
  });
});

describe('validateDefinition — rule 5: conditions', () => {
  it('condition must not reference later items or nonexistent fields', () => {
    const forward = definition([
      page(1, 'main', [
        field(1, 'short_text', { condition: { effect: 'show', field_id: fid(2), op: 'eq', value: 'x' } }),
        field(2, 'short_text'),
      ]),
    ]);
    expect(codes(forward)).toContain('forward_reference');

    const ghost = definition([
      page(1, 'main', [
        field(1, 'short_text', { condition: { effect: 'show', field_id: fid(99), op: 'eq', value: 'x' } }),
      ]),
    ]);
    expect(codes(ghost)).toContain('unknown_field_reference');
  });

  it('enforces op support per field type', () => {
    const bad = definition([
      page(1, 'main', [
        field(1, 'rating'),
        field(2, 'short_text', { condition: { effect: 'show', field_id: fid(1), op: 'contains', value: 'x' } }),
      ]),
    ]);
    expect(codes(bad)).toContain('op_not_supported');
  });

  it('is_empty does not take a value; others require one', () => {
    expect(
      codes(
        definition([
          page(1, 'main', [
            field(1, 'short_text'),
            field(2, 'short_text', { condition: { effect: 'show', field_id: fid(1), op: 'is_empty', value: 'nope' } }),
          ]),
        ]),
      ),
    ).toContain('value_not_allowed');

    expect(
      codes(
        definition([
          page(1, 'main', [
            field(1, 'short_text'),
            field(2, 'short_text', { condition: { effect: 'show', field_id: fid(1), op: 'eq' } }),
          ]),
        ]),
      ),
    ).toContain('value_required');
  });

  it('normalizes condition value to serialized form', () => {
    const def = definition([
      page(1, 'main', [
        field(1, 'phone'),
        field(2, 'short_text', { condition: { effect: 'show', field_id: fid(1), op: 'eq', value: '۰۹۱۲۳۴۵۶۷۸۹' } }),
      ]),
    ]);
    const r = validateDefinition(def);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cond = (r.definition.pages[0]!.body.items[1] as { condition: { value: string } }).condition;
    expect(cond.value).toBe('+989123456789');
  });

  it('allows page condition on main pages pointing to earlier pages', () => {
    const valid = definition([
      page(1, 'main', [field(1, 'short_text')]),
      page(2, 'main', [field(2, 'short_text')], {
        condition: { effect: 'show', field_id: fid(1), op: 'eq', value: 'yes' },
      }),
    ]);
    expect(codes(valid)).toEqual([]);
  });

  it('rejects page condition on welcome or ending', () => {
    const bad = definition([
      page(1, 'main', [field(1, 'short_text')]),
      page(2, 'ending', [], { condition: { effect: 'show', field_id: fid(1), op: 'eq', value: 'yes' } }),
    ]);
    expect(codes(bad)).toContain('condition_only_on_main_page');
  });
});
