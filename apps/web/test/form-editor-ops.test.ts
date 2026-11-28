import { describe, expect, it } from 'vitest';
import {
  filterGroups,
  foldFa,
  issueTarget,
  moveField,
  renamePage,
} from '../src/app/(panel)/form/[id]/editor/_components/editor-ops';
import type { EditorField, EditorPage } from '../src/app/(panel)/form/[id]/editor/_components/types';

// عملیات خالص ادیتور فرم: جابه‌جایی المان، نام صفحه و جست‌وجوی فهرست المان‌ها.

const field = (id: string, label = id): EditorField => ({
  id,
  fieldId: `f_${id}`,
  type: 'short_text',
  family: 'field',
  typeLabel: 'متن کوتاه',
  label,
  description: '',
  required: false,
  settings: {},
  source: {},
});

const page = (id: string, title: string): EditorPage => ({
  id,
  title,
  kind: 'main',
  fields: [],
  source: {},
});

describe('moveField', () => {
  const fields = [field('a'), field('b'), field('c')];

  it('moves a field one step up and down', () => {
    expect(moveField(fields, 'b', -1).map((f) => f.id)).toEqual(['b', 'a', 'c']);
    expect(moveField(fields, 'b', 1).map((f) => f.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps the list unchanged at the edges or for unknown ids', () => {
    expect(moveField(fields, 'a', -1).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(moveField(fields, 'c', 1).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(moveField(fields, 'zz', 1).map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const copy = [...fields];
    moveField(fields, 'a', 1);
    expect(fields).toEqual(copy);
  });
});

describe('renamePage', () => {
  const pages = [page('p1', 'صفحه ۱'), page('p2', 'صفحه ۲')];

  it('renames only the target page and trims the title', () => {
    const next = renamePage(pages, 'p2', '  اطلاعات تماس  ');
    expect(next.map((p) => p.title)).toEqual(['صفحه ۱', 'اطلاعات تماس']);
    expect(pages[1]!.title).toBe('صفحه ۲');
  });

  it('ignores empty and whitespace-only titles', () => {
    expect(renamePage(pages, 'p1', '   ').map((p) => p.title)).toEqual(['صفحه ۱', 'صفحه ۲']);
    expect(renamePage(pages, 'p1', '').map((p) => p.title)).toEqual(['صفحه ۱', 'صفحه ۲']);
  });
});

describe('issueTarget', () => {
  const pages: EditorPage[] = [
    { ...page('p1', 'صفحه ۱'), fields: [field('i1'), field('i2')] },
    page('p2', 'صفحه ۲'),
  ];

  it('maps an item path to its page and field', () => {
    expect(issueTarget(['pages', 0, 'body', 'items', 1, 'settings', 'min'], pages)).toEqual({
      pageId: 'p1',
      fieldId: 'i2',
    });
  });

  it('maps a page-level path to the page only', () => {
    expect(issueTarget(['pages', 1, 'kind'], pages)).toEqual({ pageId: 'p2', fieldId: null });
    expect(issueTarget(['pages', 1], pages)).toEqual({ pageId: 'p2', fieldId: null });
  });

  it('keeps the page when the item index is out of range', () => {
    expect(issueTarget(['pages', 0, 'body', 'items', 9, 'label'], pages)).toEqual({
      pageId: 'p1',
      fieldId: null,
    });
  });

  it('returns null for paths that are not inside pages', () => {
    expect(issueTarget([], pages)).toBeNull();
    expect(issueTarget(['defaults', 'header', 'brand_title'], pages)).toBeNull();
    expect(issueTarget(['theme', 'primary_color'], pages)).toBeNull();
    expect(issueTarget(['pages', 7, 'kind'], pages)).toBeNull();
  });
});

describe('foldFa', () => {
  it('folds Arabic yeh/kaf, ZWNJ and repeated spaces', () => {
    expect(foldFa('چند انتخابی')).toBe('چند انتخابی');
    expect(foldFa('چند\u200cانتخابی')).toBe('چندانتخابی');
    expect(foldFa('علي')).toBe('علی');
    expect(foldFa('كبر')).toBe('کبر');
    expect(foldFa('  متن   کوتاه ')).toBe('متن کوتاه');
  });
});

describe('filterGroups', () => {
  const groups = [
    { title: 'متنی', items: [{ key: 'short_text', label: 'متن کوتاه' }, { key: 'number', label: 'عدد' }] },
    { title: 'انتخابی', items: [{ key: 'multi_choice', label: 'چند\u200cانتخابی' }] },
    { title: 'محتوا', items: [{ key: 'image', label: 'تصویر' }] },
  ];

  it('returns every group for an empty query', () => {
    expect(filterGroups(groups, '   ')).toHaveLength(3);
  });

  it('matches partial labels regardless of ZWNJ and drops empty groups', () => {
    const result = filterGroups(groups, 'چندانتخابی');
    expect(result).toHaveLength(1);
    expect(result[0]!.items.map((i) => i.key)).toEqual(['multi_choice']);
    expect(filterGroups(groups, 'کوتاه').map((g) => g.items[0]!.key)).toEqual(['short_text']);
  });

  it('matches the element key as well as the label', () => {
    const result = filterGroups(groups, 'image');
    expect(result.map((g) => g.title)).toEqual(['محتوا']);
  });

  it('returns no group when nothing matches', () => {
    expect(filterGroups(groups, 'ویدیو')).toEqual([]);
  });
});
