import { describe, expect, it } from 'vitest';
import {
  applyBranding,
  buildEmbedUrl,
  buildRuntimeState,
  chromeTypes,
  computeVisiblePages,
  ensureNavigation,
  evaluateConditions,
  generateId,
  ID_PATTERNS,
  parseVideoUrl,
  resolveFooter,
  resolveHeader,
  resolvePageChrome,
  SYNTHETIC_IDS,
  validateDefinition,
  validateSubmission,
  type FormDefinition,
} from '../src';
import { chrome, content, definition, fid, field, iid, page, pid } from './fixtures';

function valid(input: unknown): FormDefinition {
  const r = validateDefinition(input);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.definition;
}

const cond = (effect: 'show' | 'hide', field_id: string, op: string, value?: unknown) => ({ effect, field_id, op, value });

// صفحه ۱: نوع (single_choice) + سن (number، فقط برای «person»). صفحه ۲ فقط اگر سن > ۱۸.
const branching = () =>
  valid(
    definition([
      page(0, 'welcome', [content(100, 'text')]),
      page(1, 'main', [
        field(1, 'single_choice', {
          required: true,
          settings: { options: [{ value: 'person', label: 'شخص' }, { value: 'company', label: 'شرکت' }] },
        }),
        field(2, 'number', { required: true, condition: cond('show', fid(1), 'eq', 'person') }),
      ]),
      page(2, 'main', [field(3, 'short_text', { required: true })], { condition: cond('show', fid(2), 'gt', 18) }),
      page(3, 'main', [field(4, 'email')]),
      page(9, 'ending'),
    ]),
  );

describe('conditions', () => {
  it('hides items and skips main pages; hidden fields count as unanswered downstream', () => {
    const def = branching();
    const company = evaluateConditions(def, { [fid(1)]: 'company', [fid(2)]: 40 });
    expect(company.hiddenItemIds).toEqual([iid(2), iid(3)]);
    expect(company.visiblePageIds).toEqual([pid(0), pid(1), pid(3), pid(9)]);
    expect(company.answers).toEqual({ [fid(1)]: 'company' });

    const adult = evaluateConditions(def, { [fid(1)]: 'person', [fid(2)]: 40 });
    expect(adult.visiblePageIds).toEqual([pid(0), pid(1), pid(2), pid(3), pid(9)]);
  });

  it('hide effect inverts', () => {
    const def = valid(
      definition([page(1, 'main', [field(1, 'short_text'), content(2, 'text', { condition: cond('hide', fid(1), 'is_empty') })])]),
    );
    expect(evaluateConditions(def, {}).hiddenItemIds).toEqual([iid(2)]);
    expect(evaluateConditions(def, { [fid(1)]: 'x' }).hiddenItemIds).toEqual([]);
  });

  it('contains works on text (case-insensitive) and multi_choice', () => {
    const def = valid(
      definition([
        page(1, 'main', [
          field(1, 'short_text'),
          field(2, 'multi_choice'),
          content(3, 'text', { condition: cond('show', fid(1), 'contains', 'TEH') }),
          content(4, 'text', { condition: cond('show', fid(2), 'contains', 'option_2') }),
        ]),
      ]),
    );
    expect(evaluateConditions(def, { [fid(1)]: 'tehran', [fid(2)]: ['option_2'] }).hiddenItemIds).toEqual([]);
    expect(evaluateConditions(def, { [fid(1)]: 'shiraz', [fid(2)]: ['option_1'] }).hiddenItemIds).toEqual([iid(3), iid(4)]);
  });

  it('progress counts only non-skipped main pages', () => {
    const def = branching();
    const page3 = def.pages[3]!;
    const state = buildRuntimeState(def, { [fid(1)]: 'company' }, page3, { formName: 'فرم' });
    expect(state.visibleMainPages.map((p) => p.page_id)).toEqual([pid(1), pid(3)]);
    expect(chromeTypes.get('page_number')?.view({}, state)).toEqual({ current: 2, total: 2 });
    expect(computeVisiblePages(def, { [fid(1)]: 'company' }).map((p) => p.kind)).toEqual(['welcome', 'main', 'main', 'ending']);
  });
});

describe('validateSubmission', () => {
  it('returns flat serialized answers for visible fields', () => {
    const r = validateSubmission(branching(), { [fid(1)]: 'person', [fid(2)]: '۲۵', [fid(3)]: ' علی ', [fid(4)]: 'A@B.COM' });
    expect(r).toEqual({ ok: true, answers: { [fid(1)]: 'person', [fid(2)]: 25, [fid(3)]: 'علی', [fid(4)]: 'A@b.com' } });
  });

  it('drops values of hidden fields and does not require them', () => {
    const r = validateSubmission(branching(), { [fid(1)]: 'company', [fid(2)]: 99, [fid(3)]: 'ignored' });
    expect(r).toEqual({ ok: true, answers: { [fid(1)]: 'company' } });
  });

  it('re-evaluates conditions server-side from normalized values', () => {
    // سن ۱۵ ← صفحه ۲ رد می‌شود، پس فیلد ۳ (required) لازم نیست.
    expect(validateSubmission(branching(), { [fid(1)]: 'person', [fid(2)]: '15' })).toEqual({
      ok: true,
      answers: { [fid(1)]: 'person', [fid(2)]: 15 },
    });
  });

  it('reports required, invalid and unknown keys', () => {
    const r = validateSubmission(branching(), { [fid(1)]: 'person', [fid(2)]: 'abc', f_unknown1: 'x' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { field_id: 'f_unknown1', code: 'unknown_field' },
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

describe('layout', () => {
  const nav = (n: number) => chrome(n, 'nav_buttons', { settings: { next_label: 'ادامه' } });

  it('inherit uses form defaults, custom overrides, hidden is empty', () => {
    const def = valid(
      definition(
        [
          page(1, 'main'),
          page(2, 'main', [], { header: { mode: 'custom', elements: [chrome(20, 'page_number')] } }),
          page(3, 'main', [], { header: { mode: 'hidden' } }),
        ],
        { defaults: { header: { elements: [chrome(10, 'form_name')] } } },
      ),
    );
    expect(resolveHeader(def, def.pages[0]!).map((e) => e.type)).toEqual(['form_name']);
    expect(resolveHeader(def, def.pages[1]!).map((e) => e.type)).toEqual(['page_number']);
    expect(resolveHeader(def, def.pages[2]!)).toEqual([]);
  });

  it('drops inherited chrome not allowed on the page kind', () => {
    const def = valid(
      definition([page(0, 'welcome'), page(1, 'main')], {
        defaults: { footer: { elements: [chrome(10, 'elapsed_timer'), chrome(11, 'form_name')] } },
      }),
    );
    expect(resolveFooter(def, def.pages[0]!).map((e) => e.type)).toEqual(['form_name']);
    expect(resolveFooter(def, def.pages[1]!).map((e) => e.type)).toEqual(['elapsed_timer', 'form_name']);
  });

  it('ensureNavigation adds a default nav bar only when none exists (and never on ending)', () => {
    const def = valid(
      definition([
        page(1, 'main', [], { footer: { mode: 'hidden' } }),
        page(2, 'main', [], { header: { mode: 'custom', elements: [nav(20)] } }),
        page(9, 'ending'),
      ]),
    );
    const [p1, p2, p9] = def.pages;
    const r1 = ensureNavigation(p1!, { header: [], footer: [] });
    expect(r1.footer.map((e) => e.item_id)).toEqual([SYNTHETIC_IDS.nav]);
    const r2 = ensureNavigation(p2!, { header: resolveHeader(def, p2!), footer: [] });
    expect(r2.footer).toEqual([]);
    expect(ensureNavigation(p9!, { header: [], footer: [] }).footer).toEqual([]);
  });

  it('resolves the new page areas independently', () => {
    const def = valid(
      definition([
        page(1, 'main', [field(1, 'short_text')], {
          topBar: { mode: 'custom', elements: [chrome(10, 'form_name')] },
          sidebar: { mode: 'custom', elements: [chrome(11, 'page_number')] },
          bottomBar: { mode: 'custom', elements: [chrome(12, 'nav_buttons')] },
        }),
      ]),
    );
    const resolved = resolvePageChrome(def, def.pages[0]!, { forceLicense: false });
    expect(resolved.topBar.map((e) => e.item_id)).toEqual([iid(10)]);
    expect(resolved.sidebar.map((e) => e.item_id)).toEqual([iid(11)]);
    expect(resolved.bottomBar.map((e) => e.item_id)).toEqual([iid(12)]);
  });

  it('applyBranding forces the license badge on free plan even when footer is hidden', () => {
    const def = valid(definition([page(1, 'main', [], { footer: { mode: 'hidden' } })]));
    const free = resolvePageChrome(def, def.pages[0]!, { forceLicense: true });
    expect(free.footer.map((e) => e.type)).toEqual(['nav_buttons', 'license_badge']);
    const paid = resolvePageChrome(def, def.pages[0]!, { forceLicense: false });
    expect(paid.footer.map((e) => e.type)).toEqual(['nav_buttons']);
    const existing = [{ kind: 'chrome' as const, item_id: iid(5), type: 'license_badge', settings: {} }];
    expect(applyBranding(existing, { forceLicense: true })).toBe(existing);
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

  it('elapsed_timer uses injected time only', () => {
    const def = branching();
    const state = buildRuntimeState(def, {}, def.pages[1]!, { formName: 'f', startedAtMs: 1_000, nowMs: 66_500 });
    expect(chromeTypes.get('elapsed_timer')?.view({}, state)).toEqual({ elapsed_seconds: 65 });
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
