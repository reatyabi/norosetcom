import { describe, expect, it } from 'vitest';
import {
  buildEmbedUrl,
  buildRuntimeState,
  chromeTypes,
  computeVisiblePages,
  evaluateConditions,
  generateId,
  ID_PATTERNS,
  parseVideoUrl,
  resolveZones,
  validateDefinition,
  validateSubmission,
  type FormDefinition,
} from '../src';
import { content, definition, fid, field, iid, page, pid } from './fixtures';

function valid(input: unknown): FormDefinition {
  const r = validateDefinition(input);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.definition;
}

const branching = () =>
  valid(
    definition([
      page(0, 'welcome', [content(0, 'text')]),
      page(1, 'main', [
        field(1, 'single_choice', {
          required: true,
          settings: {
            options: [
              { value: 'individual', label: 'حقیقی' },
              { value: 'company', label: 'حقوقی' },
            ],
          },
        }),
      ]),
      page(2, 'main', [field(2, 'number')], {
        condition: { effect: 'show', field_id: fid(1), op: 'eq', value: 'individual' },
      }),
      page(3, 'main', [field(3, 'short_text')], {
        condition: { effect: 'show', field_id: fid(1), op: 'eq', value: 'company' },
      }),
      page(9, 'ending', [content(9, 'text')]),
    ]),
  );

describe('conditions runtime', () => {
  it('evaluates conditions against current answers', () => {
    const def = branching();
    const ind = evaluateConditions(def, { [fid(1)]: 'individual' });
    expect(ind.visiblePageIds).toEqual([pid(0), pid(1), pid(2), pid(9)]);
    expect(ind.hiddenItemIds).toEqual([iid(3)]);

    const comp = evaluateConditions(def, { [fid(1)]: 'company' });
    expect(comp.visiblePageIds).toEqual([pid(0), pid(1), pid(3), pid(9)]);
    expect(comp.hiddenItemIds).toEqual([iid(2)]);
  });

  it('unanswered required fields on hidden pages do not block submission', () => {
    const def = branching();
    const r = validateSubmission(def, { [fid(1)]: 'company', [fid(3)]: 'noroset' });
    expect(r.ok).toBe(true);
  });

  it('hidden page answers are stripped from submission (leak protection)', () => {
    const def = branching();
    const r = validateSubmission(def, { [fid(1)]: 'company', [fid(2)]: 1234, [fid(3)]: 'noroset' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers).toEqual({ [fid(1)]: 'company', [fid(3)]: 'noroset' });
    expect(r.answers[fid(2)]).toBeUndefined();
  });

  it('computeVisiblePages returns only pages that should be displayed', () => {
    const def = branching();
    const visible = computeVisiblePages(def, { [fid(1)]: 'individual' });
    expect(visible.map((p) => p.page_id)).toEqual([pid(0), pid(1), pid(2), pid(9)]);
  });
});

describe('submission validation', () => {
  it('validates submission answers against field-engine schemas and returns clean serialized answers', () => {
    const def = valid(
      definition([
        page(1, 'main', [
          field(1, 'short_text', { required: true }),
          field(2, 'number', { settings: { min: 10 } }),
          field(3, 'phone'),
        ]),
      ]),
    );
    const ok = validateSubmission(def, {
      [fid(1)]: '  ali  ',
      [fid(2)]: '۱۲',
      [fid(3)]: '۰۹۱۲۳۴۵۶۷۸۹',
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.answers).toEqual({
      [fid(1)]: 'ali',
      [fid(2)]: 12,
      [fid(3)]: '+989123456789',
    });
  });

  it('collects errors per field and reports them with machine codes', () => {
    const def = valid(
      definition([
        page(1, 'main', [
          field(1, 'short_text', { required: true }),
          field(2, 'number', { settings: { min: 10 } }),
        ]),
      ]),
    );
    const r = validateSubmission(def, { [fid(2)]: '5' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { field_id: fid(1), code: 'required' },
        { field_id: fid(2), code: 'too_small', params: { min: 10 } },
      ]),
    );
  });

  it('rejects unknown fields in submission', () => {
    const def = valid(definition([page(1, 'main', [field(1, 'short_text')])]));
    const r = validateSubmission(def, { [fid(1)]: 'ok', f_ghost01: 'evil' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual([{ field_id: 'f_ghost01', code: 'unknown_field' }]);
  });

  it('field errors match field-engine contract', () => {
    const bad = validateSubmission(branching(), { [fid(1)]: 'company', [fid(3)]: 123 });
    expect(!bad.ok && bad.errors).toEqual([{ field_id: fid(3), code: 'invalid_type' }]);

    const badNum = validateSubmission(branching(), { [fid(1)]: 'individual', [fid(2)]: 'abc' });
    expect(!badNum.ok && badNum.errors).toEqual(
      expect.arrayContaining([
        { field_id: fid(2), code: 'invalid_number' },
      ]),
    );
    const missing = validateSubmission(branching(), {});
    expect(!missing.ok && missing.errors).toEqual([{ field_id: fid(1), code: 'required' }]);
  });

  it('rejects non-object payloads and prototype tricks', () => {
    expect(validateSubmission(branching(), [])).toMatchObject({ ok: false, errors: [{ code: 'invalid_payload' }] });
    expect(validateSubmission(branching(), null)).toMatchObject({ ok: false });
    const evil = JSON.parse(`{"__proto__": {"x": 1}, "${fid(1)}": "company"}`);
    expect(validateSubmission(branching(), evil)).toMatchObject({ ok: false, errors: [{ field_id: '__proto__', code: 'unknown_field' }] });
  });
});

describe('layout & resolveZones', () => {
  it('resolves zones based on layout.zones flags', () => {
    const def = valid(
      definition([page(1, 'main')], {
        layout: {
          zones: {
            header: true,
            top_bar: false,
            sidebar: true,
            bottom_bar: true,
            footer: false,
          },
        },
        defaults: {
          sidebar: { title: 'مراحل ثبت نام' },
          bottom_bar: { submit_label: 'ارسال نهایی' },
        },
      }),
    );
    const zones = resolveZones(def);
    expect(zones.header).not.toBeNull();
    expect(zones.top_bar).toBeNull();
    expect(zones.sidebar).toEqual({ title: 'مراحل ثبت نام' });
    expect(zones.bottom_bar?.submit_label).toBe('ارسال نهایی');
    expect(zones.footer).toBeNull();
  });

  it('nav_buttons view: start on welcome, prev/next, submit on the last visible main page', () => {
    const def = branching();
    const navType = chromeTypes.get('nav_buttons')!;
    const s = navType.defaultSettings;
    const at = (i: number) => buildRuntimeState(def, { [fid(1)]: 'company' }, def.pages[i]!, { formName: 'f' });
    expect(navType.view(s, at(0))).toEqual({ buttons: [{ action: 'start', label: 'شروع' }] });
    expect(navType.view(s, at(1))).toEqual({ buttons: [{ action: 'next', label: 'بعدی' }] });
    expect(navType.view(s, at(3))).toEqual({
      buttons: [
        { action: 'prev', label: 'قبلی' },
        { action: 'submit', label: 'ارسال' },
      ],
    });
  });
});

describe('ids and video', () => {
  it('generateId is deterministic for an injected random source', () => {
    let i = 0;
    const seq = () => i++ % 36;
    const id = generateId('field', seq);
    expect(id).toBe('f_abcdefgh');
    expect(ID_PATTERNS.field.test(id)).toBe(true);
    expect(() => generateId('page', () => 99)).toThrow(RangeError);
  });

  it('parses only allowed providers and builds embed urls from fixed templates', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({ provider: 'youtube', video_id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', video_id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://vimeo.com/76979871')).toEqual({ provider: 'vimeo', video_id: '76979871' });
    expect(parseVideoUrl('https://www.aparat.com/v/abc123')).toEqual({ provider: 'aparat', video_id: 'abc123' });
    expect(parseVideoUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoUrl('http://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(buildEmbedUrl('youtube', 'dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(buildEmbedUrl('aparat', 'abc123')).toBe('https://www.aparat.com/video/video/embed/videohash/abc123/vt/frame');
    expect(() => buildEmbedUrl('vimeo', '"><script>')).toThrow();
  });
});
