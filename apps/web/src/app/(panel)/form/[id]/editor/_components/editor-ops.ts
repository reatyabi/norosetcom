import type { EditorField, EditorPage } from './types';

/**
 * عملیات خالص ادیتور که در نوار صفحه‌ها، کارت‌ها و فهرست المان‌ها استفاده می‌شوند.
 * جدا مانده‌اند تا با تست بررسی شوند (`apps/web/test/form-editor-ops.test.ts`).
 */

/** جابه‌جایی یک المان یک پله؛ در لبه‌ها آرایه بدون تغییر برمی‌گردد. */
export function moveField(fields: readonly EditorField[], id: string, dir: -1 | 1): EditorField[] {
  const from = fields.findIndex((field) => field.id === id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= fields.length) return [...fields];
  const next = [...fields];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** نام صفحه؛ نام خالی/فقط‌فاصله نادیده گرفته می‌شود. نام صفحه در فرم عمومی دیده می‌شود. */
export function renamePage(pages: readonly EditorPage[], id: string, title: string): EditorPage[] {
  const next = title.trim();
  if (!next) return [...pages];
  return pages.map((page) => (page.id === id ? { ...page, title: next } : page));
}

/** هم‌ارزسازی برای جستجوی فارسی: ی/ك عربی، نیم‌فاصله و فاصله‌های تکراری. */
export const foldFa = (value: string) =>
  value
    .toLowerCase()
    .replace(/[ىي]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** گروه‌های فهرست المان‌ها که با جستجو تطبیق دارند؛ گروه بی‌نتیجه حذف می‌شود. */
export function filterGroups<T extends { items: { key: string; label: string }[] }>(
  groups: readonly T[],
  query: string,
): T[] {
  const needle = foldFa(query);
  if (!needle) return [...groups];
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => foldFa(`${item.label} ${item.key}`).includes(needle)),
    }))
    .filter((group) => group.items.length > 0);
}

/** جایی در ادیتور که یک issue اعتبارسنجی به آن اشاره می‌کند. */
export interface IssueTarget {
  pageId: string;
  /** المان داخل صفحه؛ برای خطاهای سطح صفحه null است. */
  fieldId: string | null;
}

/**
 * مسیر issueهای `validateDefinition` برای المان‌ها `['pages', pi, 'body', 'items', ii, …]` است
 * (`packages/field-engine/src/validate-definition.ts`). این تابع مسیر را به صفحه/المان ادیتور
 * نگاشت می‌کند تا خطاهای «انتشار» قابل‌رفتن باشند، نه فقط خواندنی.
 */
export function issueTarget(
  path: readonly (string | number)[],
  pages: readonly EditorPage[],
): IssueTarget | null {
  if (path[0] !== 'pages' || typeof path[1] !== 'number') return null;
  const page = pages[path[1]];
  if (!page) return null;
  const isItem = path[2] === 'body' && path[3] === 'items';
  const itemIndex = isItem ? path[4] : undefined;
  const field = typeof itemIndex === 'number' ? page.fields[itemIndex] : undefined;
  return { pageId: page.id, fieldId: field?.id ?? null };
}
