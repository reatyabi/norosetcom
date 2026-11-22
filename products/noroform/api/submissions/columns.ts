import { fieldTypes, type FormDefinition, type JsonValue } from '@noroset/field-engine';

// ستون‌های جدول پاسخ‌ها. پاسخ‌ها ممکن است از نسخه‌های مختلف باشند؛ چون field_id پایدار است،
// ستون‌ها اجتماع فیلدهای همه‌ی نسخه‌هاست: ترتیب و عنوان از جدیدترین نسخه، سپس فیلدهای حذف‌شده.

export interface FieldColumn {
  fieldId: string;
  label: string;
  type: string;
  /** settings همان نسخه‌ای که عنوان از آن آمده (برای format). */
  settings: Record<string, unknown>;
  /** در جدیدترین نسخه وجود ندارد. */
  removed: boolean;
}

export interface VersionDefinition {
  versionNumber: number;
  definition: FormDefinition;
}

export function fieldsOf(definition: FormDefinition): Omit<FieldColumn, 'removed'>[] {
  const out: Omit<FieldColumn, 'removed'>[] = [];
  for (const page of definition.pages ?? []) {
    for (const item of page.body?.items ?? []) {
      if (item.kind === 'field') {
        out.push({ fieldId: item.field_id, label: item.label, type: item.type, settings: item.settings });
      }
    }
  }
  return out;
}

export function buildColumns(versions: VersionDefinition[]): FieldColumn[] {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const columns: FieldColumn[] = [];
  const seen = new Set<string>();
  sorted.forEach((v, index) => {
    for (const f of fieldsOf(v.definition)) {
      if (seen.has(f.fieldId)) continue;
      seen.add(f.fieldId);
      columns.push({ ...f, removed: index > 0 });
    }
  });
  return columns;
}

/** نمایش انسانی مقدار با format نوع فیلد (تاریخ شمسی، عنوان گزینه‌ها، ...). */
export function formatValue(column: Pick<FieldColumn, 'type' | 'settings'>, value: JsonValue | undefined): string {
  if (value === undefined || value === null) return '';
  const type = fieldTypes.get(column.type);
  if (!type) return typeof value === 'string' ? value : JSON.stringify(value);
  try {
    const settings = type.settingsSchema.parse(column.settings);
    return type.format(type.deserialize(value), settings);
  } catch {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

/**
 * برچسب نمایشی یک مقدار «متنی» (مثل مقدارهای یکتای ستون در کارت فیلتر):
 * تاریخ → شمسی، تک‌انتخابی → عنوان گزینه. multi_choice هنگام یکتا‌سازی به
 * عنصرهای تکی باز می‌شود، پس مقدار خامش یک رشته است و در آرایه پیچیده می‌شود.
 */
export function formatRawValue(column: Pick<FieldColumn, 'type' | 'settings'>, raw: string): string {
  if (raw === '') return '';
  const type = fieldTypes.get(column.type);
  if (!type) return raw;
  try {
    const settings = type.settingsSchema.parse(column.settings);
    const stored: JsonValue = column.type === 'multi_choice' ? [raw] : raw;
    return type.format(type.deserialize(stored), settings);
  } catch {
    return raw;
  }
}
