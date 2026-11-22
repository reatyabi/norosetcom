// سازنده‌های کوچک برای تعریف‌های تست (ورودی خام، قبل از validateDefinition).

export const pid = (n: number) => `p_page${String(n).padStart(4, '0')}`;
export const iid = (n: number) => `i_item${String(n).padStart(4, '0')}`;
export const fid = (n: number) => `f_fild${String(n).padStart(4, '0')}`;

type Raw = Record<string, unknown>;

export function field(n: number, type: string, extra: Raw = {}): Raw {
  return { kind: 'field', item_id: iid(n), field_id: fid(n), type, label: `فیلد ${n}`, ...extra };
}

export function content(n: number, type: string, extra: Raw = {}): Raw {
  return { kind: 'content', item_id: iid(n), type, ...extra };
}

export function chrome(n: number, type: string, extra: Raw = {}): Raw {
  return { kind: 'chrome', item_id: iid(n), type, ...extra };
}

export function page(n: number, kind: 'welcome' | 'main' | 'ending', items: Raw[] = [], extra: Raw = {}): Raw {
  return { page_id: pid(n), kind, title: `صفحه ${n}`, body: { items }, ...extra };
}

export function definition(pages: Raw[], extra: Raw = {}): Raw {
  return { version_schema: 1, pages, ...extra };
}
