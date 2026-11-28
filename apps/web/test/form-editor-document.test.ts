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

  it('reads and writes header branding defaults and sticky layout cleanly', () => {
    const raw = {
      version_schema: 1,
      layout: {
        header_sticky: false,
        bottom_bar_fixed: true,
        sidebar_collapsible: true,
        sidebar_collapsed: false,
        main_columns: 1,
        zones: { header: true, top_bar: true, sidebar: true, bottom_bar: true, footer: true },
      },
      defaults: {
        header: {
          brand_title: 'نام',
          brand_subtitle: '',
          logo_url: 'https://example.com/logo.png',
          align: 'start' as const,
          show_logo: true,
          show_title: true,
          show_subtitle: true,
        },
        top_bar: { mode: 'progress' as const, description: '', notice_text: '' },
        sidebar: { title: '' },
        bottom_bar: { prev_label: 'قبلی', next_label: 'بعدی', submit_label: 'ارسال' },
        footer: { text: '', show_branding: true },
      },
      pages: [{ page_id: 'p_aaaaaaaa', kind: 'main', title: '', body: { items: [] } }],
    };
    const editor = readEditorDocument(raw);
    expect(editor.defaults?.header).toMatchObject({
      brand_title: 'نام',
      brand_subtitle: '',
      logo_url: 'https://example.com/logo.png',
      align: 'start',
      show_logo: true,
      show_title: true,
      show_subtitle: true,
    });
    expect(editor.layout?.header_sticky).toBeFalsy();

    // round-trip بدون تغییر
    expect(writeEditorDocument(editor.source, editor.pages, editor.theme, false, editor.layout, editor.defaults)).toEqual(raw);

    const updated = writeEditorDocument(editor.source, editor.pages, editor.theme, false, editor.layout, {
      ...editor.defaults,
      header: {
        ...editor.defaults?.header,
        brand_title: 'نام جدید',
        logo_url: 'https://example.com/new.png',
        brand_subtitle: 'زیرعنوان',
      },
    });
    expect((updated.defaults as { header: Record<string, unknown> }).header).toMatchObject({
      brand_title: 'نام جدید',
      brand_subtitle: 'زیرعنوان',
      logo_url: 'https://example.com/new.png',
    });

    const sticky = writeEditorDocument(
      editor.source,
      editor.pages,
      editor.theme,
      false,
      { ...editor.layout, header_sticky: true },
      editor.defaults,
    );
    expect((sticky.layout as { header_sticky?: boolean })?.header_sticky).toBe(true);

    const removed = writeEditorDocument(editor.source, editor.pages, editor.theme, false, editor.layout, {
      ...editor.defaults,
      header: {
        ...editor.defaults.header,
        brand_title: '',
        brand_subtitle: '',
        logo_url: '',
      },
    });
    expect((removed.defaults as { header: Record<string, unknown> }).header).toMatchObject({
      brand_title: '',
      brand_subtitle: '',
      logo_url: '',
    });
  });
});
