import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { definitionSchema } from '@noroset/field-engine';
import { FormBackground, backgroundNeedsGlass } from '@noroset/noroform/ui';
import { PublicFormClient, type PublicFormView } from '@noroset/noroform/ui';

// رندر SSR صفحه‌ی عمومی: بدون مرورگر و API، فقط markup اولیه (docs/architecture.md §۸.۳).
// createElement عمداً استفاده می‌شود؛ tsconfig وب برای Next، `jsx: preserve` دارد.

const definition = definitionSchema.parse({
  version_schema: 1,
  pages: [
    { page_id: 'p_page0001', kind: 'welcome', title: 'خوش آمدید', body: { items: [] } },
    {
      page_id: 'p_page0002',
      kind: 'main',
      title: '',
      body: {
        items: [{ kind: 'field', item_id: 'i_item0002', field_id: 'f_fild0002', type: 'short_text', label: 'نام' }],
      },
    },
    { page_id: 'p_page0003', kind: 'main', title: '', body: { items: [] } },
  ],
});

const publishedForm: PublicFormView = {
  status: 'published',
  slug: 'mock000001',
  title: 'فرم آزمایشی',
  versionId: 'v_page0001',
  definition,
  branding: { forceLicense: true },
};

function render(form: PublicFormView) {
  return renderToStaticMarkup(
    createElement(PublicFormClient, { form, onSubmit: async () => ({ ok: true } as const) }),
  );
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('public form render', () => {
  it('renders one navigation bar instead of duplicated body buttons', () => {
    const html = render(publishedForm);
    expect(count(html, '<button')).toBe(1);
    expect(count(html, '>شروع<')).toBe(1);
    expect(html).toContain('aria-label="پیمایش فرم"');
  });

  it('keeps the navigation bar attached to the bottom on mobile with room below the content', () => {
    const html = render(publishedForm);
    expect(html).toContain('fixed inset-x-0 bottom-0');
    expect(html).toContain('pb-[calc(5.5rem_+_env(safe-area-inset-bottom))]');
    expect(html).toContain('md:static');
  });

  it('shows the free-plan branding as a "Powered by Noroset" watermark, not a footer badge', () => {
    const html = render(publishedForm);
    expect(count(html, '>Powered by Noroset<')).toBe(1);
    expect(html).not.toContain('ساخته‌شده با نوروفرم');
    expect(html).not.toContain('license_badge');
  });

  it('has no watermark on a paid plan', () => {
    const html = render({ ...publishedForm, branding: { forceLicense: false } });
    expect(html).not.toContain('Powered by Noroset');
  });

  it('renders the header logo through the shared platform component', () => {
    const withLogo = definitionSchema.parse({
      version_schema: 1,
      defaults: {
        header: {
          brand_title: 'کسب‌وکار من',
          brand_subtitle: 'فضای کاری اصلی',
          logo_url: 'https://example.com/logo.png',
        },
      },
      pages: [{ page_id: 'p_page0002', kind: 'main', title: '', body: { items: [] } }],
    });
    const html = render({ ...publishedForm, definition: withLogo });
    expect(html).toContain('data-area="logo"');
    expect(html).toContain('کسب‌وکار من');
    expect(html).toContain('فضای کاری اصلی');
  });

  it('renders the background image and optional overlay as the bottom layer', () => {
    const value = {
      mode: 'image' as const,
      color: '#0f172a',
      secondary_color: '#1e293b',
      angle: 180,
      pattern_icon: '',
      pattern_size: 36,
      pattern_color: '#ffffff',
      image_url: 'https://example.com/bg.jpg',
      image_opacity: 0.8,
      focal_x: 50,
      focal_y: 50,
      overlay: 'dark' as const,
      overlay_color: '#000000',
      overlay_opacity: 0.2,
    };
    const html = renderToStaticMarkup(createElement(FormBackground, { value }));
    expect(html).toContain('data-mode="image"');
    expect(html).toContain('background-color:#000000');
    expect(backgroundNeedsGlass(value, 'plain')).toBe(false);
    expect(backgroundNeedsGlass({ ...value, overlay_opacity: 0.1 }, 'plain')).toBe(true);
    expect(backgroundNeedsGlass({ ...value, overlay_opacity: 0.1 }, 'card')).toBe(false);
  });

  it('applies an image background from the normalized theme', () => {
    const imageDefinition = definitionSchema.parse({
      ...publishedForm.definition,
      theme: {
        ...publishedForm.definition.theme,
        background_style: 'image',
        background_image_url: 'https://example.com/theme.jpg',
        background_image_opacity: 0.7,
        background_overlay: 'dark',
        background_overlay_opacity: 0.2,
        background_focal_x: 30,
        background_focal_y: 20,
      },
    });
    const html = render({ ...publishedForm, definition: imageDefinition });
    expect(html).toContain('data-mode="image"');
    expect(html).toContain('background-position:30% 20%');
  });


  it('renders the optional top bar, sidebar, and bottom bar in their official areas', () => {
    const withAreas = definitionSchema.parse({
      version_schema: 1,
      layout: {
        header_sticky: true,
        bottom_bar_fixed: false,
        sidebar_collapsible: false,
        zones: { header: true, top_bar: true, sidebar: true, bottom_bar: true, footer: true },
      },
      defaults: {
        top_bar: { mode: 'notice', notice_text: 'اعلان تست' },
        sidebar: { title: 'فهرست بخش‌ها' },
        bottom_bar: { prev_label: 'قبلی', next_label: 'بعدی', submit_label: 'ثبت' },
      },
      pages: [
        {
          page_id: 'p_page0002',
          kind: 'main',
          title: '',
          body: { items: [] },
        },
      ],
    });
    const html = render({ ...publishedForm, definition: withAreas });
    expect(html).toContain('data-area="topBar"');
    expect(html).toContain('data-area="sidebar"');
    expect(html).toContain('data-area="bottomBar"');
    expect(html).toContain('data-sticky="true"');
    expect(html).toContain('data-fixed="false"');
  });
});
