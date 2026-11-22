import { describe, expect, it } from 'vitest';
import { FORM_TEMPLATES, templateDefinition } from '../src/app/(panel)/form/templates';
import { readEditorDocument, writeEditorDocument } from '../src/app/(panel)/form/[id]/editor/_components/editor-document';
import { copyField } from '../src/app/(panel)/form/[id]/editor/_components/types';

describe('form editor document mapping', () => {
  it('round-trips each existing form template without normalizing untouched data', () => {
    for (const template of FORM_TEMPLATES) {
      let next = 0;
      const raw = templateDefinition(template, (max) => next++ % max);
      const editor = readEditorDocument(raw);
      expect(writeEditorDocument(editor.source, editor.pages, editor.theme, false)).toEqual(raw);
    }
  });

  it('writes edited fields while preserving unrelated definition and page data', () => {
    const raw = {
      version_schema: 1,
      theme: { primary_color: '#005fb8', background_color: '#ffffff', font: 'vazirmatn' },
      settings: { closed_message: 'فرم بسته است' },
      pages: [
        {
          page_id: 'p_aaaaaaaa',
          kind: 'main',
          title: 'صفحه اول',
          custom_page_setting: 'preserved',
          body: {
            items: [
              {
                kind: 'field',
                item_id: 'i_aaaaaaaa',
                field_id: 'f_aaaaaaaa',
                type: 'short_text',
                label: 'نام',
                description: 'راهنما',
                required: false,
                settings: { placeholder: 'نام کامل' },
              },
            ],
          },
        },
      ],
    };
    const editor = readEditorDocument(raw);
    const [page] = editor.pages;
    const [field] = page!.fields;
    const pages = [{ ...page!, fields: [{ ...field!, label: 'نام کامل', dirtyKeys: ['label'] }] }];

    expect(writeEditorDocument(editor.source, pages, editor.theme, false)).toEqual({
      ...raw,
      pages: [
        {
          ...raw.pages[0],
          body: {
            items: [{ ...raw.pages[0]!.body.items[0], label: 'نام کامل' }],
          },
        },
      ],
    });
  });

  it('serializes a copied field with fresh stable IDs and its original condition', () => {
    const raw = {
      version_schema: 1,
      pages: [
        {
          page_id: 'p_aaaaaaaa',
          kind: 'main',
          body: {
            items: [
              {
                kind: 'field',
                item_id: 'i_aaaaaaaa',
                field_id: 'f_aaaaaaaa',
                type: 'single_choice',
                label: 'انتخاب',
                required: false,
                settings: { options: [{ value: 'yes', label: 'بله' }] },
              },
              {
                kind: 'field',
                item_id: 'i_bbbbbbbb',
                field_id: 'f_bbbbbbbb',
                type: 'short_text',
                label: 'توضیح',
                required: false,
                settings: {},
                condition: { effect: 'show', field_id: 'f_aaaaaaaa', op: 'eq', value: 'yes' },
              },
            ],
          },
        },
      ],
    };
    const editor = readEditorDocument(raw);
    const page = editor.pages[0]!;
    const duplicate = copyField(page.fields[1]!);
    const result = writeEditorDocument(editor.source, [{ ...page, fields: [...page.fields, duplicate] }], editor.theme, false);
    const items = (result.pages as Array<{ body: { items: Array<Record<string, unknown>> } }>)[0]!.body.items;

    expect(items[2]).toMatchObject({
      kind: 'field',
      type: 'short_text',
      label: 'توضیح',
      condition: { effect: 'show', field_id: 'f_aaaaaaaa', op: 'eq', value: 'yes' },
    });

    expect(items[2]!.item_id).not.toBe(items[1]!.item_id);
    expect(items[2]!.field_id).not.toBe(items[1]!.field_id);
  });

  it('accepts legacy themes and writes the expanded theme only after an edit', () => {
    const raw = {
      version_schema: 1,
      theme: { primary_color: '#005fb8', background_color: '#ffffff', font: 'vazirmatn' },
      pages: [{ page_id: 'p_aaaaaaaa', kind: 'main', title: '', body: { items: [] } }],
    };
    const editor = readEditorDocument(raw);
    expect(editor.theme).toMatchObject({
      preset: 'paper',
      primary_color: '#005fb8',
      background_color: '#ffffff',
      background_style: 'solid',
      button_style: 'filled',
    });
    expect(writeEditorDocument(editor.source, editor.pages, editor.theme, false)).toEqual(raw);

    const updated = { ...editor.theme, button_style: 'tonal' as const };
    expect(writeEditorDocument(editor.source, editor.pages, updated, true).theme).toMatchObject({
      ...raw.theme,
      button_style: 'tonal',
      background_style: 'solid',
    });
  });

  it('does not silently edit unsupported page or element structures', () => {
    expect(() =>
      readEditorDocument({
        version_schema: 1,
        pages: [
          {
            page_id: 'p_aaaaaaaa',
            kind: 'main',
            body: { items: [{ kind: 'field', item_id: 'i_aaaaaaaa', field_id: 'f_aaaaaaaa', type: 'future_type' }] },
          },
        ],
      }),
    ).toThrow('نوع یکی از المان‌های پیش‌نویس در این نسخه از ادیتور پشتیبانی نمی‌شود.');
  });

  it('reads and writes the header logo (logo_title chrome) without touching other chrome', () => {
    const raw = {
      version_schema: 1,
      pages: [{ page_id: 'p_aaaaaaaa', kind: 'main', title: '', body: { items: [] } }],
      defaults: {
        header: {
          elements: [
            { kind: 'chrome', item_id: 'i_aaaaaaaa', type: 'form_name', settings: {} },
            { kind: 'chrome', item_id: 'i_bbbbbbbb', type: 'logo_title', settings: { title: 'نام', logo_url: 'https://example.com/logo.png' } },
          ],
        },
      },
    };
    const editor = readEditorDocument(raw);
    expect(editor.headerLogo).toEqual({
      title: 'نام',
      subtitle: '',
      logo_url: 'https://example.com/logo.png',
      align: 'start',
      visible: true,
      show_logo: true,
      show_title: true,
      show_subtitle: true,
    });
    expect(editor.headerSticky).toBe(false);

    // round-trip بدون تغییر
    expect(writeEditorDocument(editor.source, editor.pages, editor.theme, false, editor.headerLogo)).toEqual(raw);

    type Defaults = { header: { elements: Array<Record<string, unknown>> }; layout?: { header_sticky?: boolean } };
    const updated = writeEditorDocument(editor.source, editor.pages, editor.theme, false, {
      ...editor.headerLogo,
      title: 'نام جدید',
      logo_url: 'https://example.com/new.png',
      subtitle: 'زیرعنوان',
      align: 'center',
      show_subtitle: false,
    });
    const elements = (updated.defaults as Defaults).header.elements;
    expect(elements).toHaveLength(2);
    expect(elements.find((e) => e.type === 'logo_title')).toMatchObject({
      settings: { title: 'نام جدید', subtitle: 'زیرعنوان', logo_url: 'https://example.com/new.png', align: 'center', show_subtitle: false },
    });
    expect(elements.find((e) => e.type === 'form_name')).toMatchObject({ type: 'form_name', item_id: 'i_aaaaaaaa' });

    const sticky = writeEditorDocument(editor.source, editor.pages, editor.theme, false, editor.headerLogo, true);
    expect((sticky.layout as Defaults['layout'])?.header_sticky).toBe(true);

    const removed = writeEditorDocument(editor.source, editor.pages, editor.theme, false, { ...editor.headerLogo, title: '', subtitle: '', logo_url: '' });
    expect((removed.defaults as Defaults).header.elements.map((e) => e.type)).toEqual(['form_name']);
  });
});
