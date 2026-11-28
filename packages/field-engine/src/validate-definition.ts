import type { z } from 'zod';
import type { ContentType, ElementTypeBase, FieldResult, FieldType, IssueParams, JsonValue } from './contract';
import { LIMITS } from './limits';
import { contentTypes, fieldTypes } from './registry';
import {
  definitionSchema,
  type Condition,
  type FieldElement,
  type FormDefinition,
} from './schema';
import { utf8ByteLength } from './text';

// قواعد validateDefinition (docs/architecture.md §8.5). سرور همیشه دوباره اجرا می‌کند.

export type IssuePath = Array<string | number>;

export interface DefinitionIssue {
  path: IssuePath;
  code: string;
  params?: IssueParams;
}

export type ValidateDefinitionResult =
  | { ok: true; definition: FormDefinition }
  | { ok: false; issues: DefinitionIssue[] };

function zodIssues(error: z.ZodError, prefix: IssuePath): DefinitionIssue[] {
  return error.issues.map((i) => ({
    path: [...prefix, ...i.path.map((p) => (typeof p === 'number' ? p : String(p)))],
    code: i.code === 'custom' ? i.message : i.code,
  }));
}

class Checker {
  readonly issues: DefinitionIssue[] = [];

  constructor(readonly def: FormDefinition) {}

  add(path: IssuePath, code: string, params?: IssueParams): void {
    this.issues.push(params ? { path, code, params } : { path, code });
  }

  /** settings را با schema نوع parse و نسخه‌ی نرمال (با پیش‌فرض‌ها) را جایگزین می‌کند. */
  settings(element: { settings: Record<string, unknown> }, type: ElementTypeBase<unknown>, path: IssuePath): void {
    const parsed = type.settingsSchema.safeParse(element.settings);
    if (parsed.success) element.settings = parsed.data as Record<string, unknown>;
    else this.issues.push(...zodIssues(parsed.error, [...path, 'settings']));
  }

  pageOrder(): void {
    const kinds = this.def.pages.map((p) => p.kind);
    if (!kinds.includes('main')) this.add(['pages'], 'no_main_page');
    const last = kinds.length - 1;
    kinds.forEach((kind, i) => {
      if (kind === 'welcome' && i !== 0) this.add(['pages', i, 'kind'], 'welcome_must_be_first');
      if (kind === 'ending' && i !== last) this.add(['pages', i, 'kind'], 'ending_must_be_last');
    });
  }

  uniqueIds(): void {
    const seen = { page: new Set<string>(), item: new Set<string>(), field: new Set<string>() };
    const check = (kind: keyof typeof seen, id: string, path: IssuePath) => {
      if (seen[kind].has(id)) this.add(path, `duplicate_${kind}_id`, { id });
      seen[kind].add(id);
    };

    this.def.pages.forEach((page, pi) => {
      check('page', page.page_id, ['pages', pi, 'page_id']);
      page.body.items.forEach((item, ii) => {
        const path: IssuePath = ['pages', pi, 'body', 'items', ii];
        check('item', item.item_id, [...path, 'item_id']);
        if (item.kind === 'field') check('field', item.field_id, [...path, 'field_id']);
      });
    });
  }

  elements(): void {
    let bodyItems = 0;
    this.def.pages.forEach((page, pi) => {
      if (page.condition && page.kind !== 'main') this.add(['pages', pi, 'condition'], 'condition_only_on_main_page');
      page.body.items.forEach((item, ii) => {
        bodyItems++;
        const path: IssuePath = ['pages', pi, 'body', 'items', ii];
        if (item.kind === 'field') {
          if (page.kind !== 'main') this.add(path, 'field_not_allowed_on_page_kind', { page_kind: page.kind });
          const type: FieldType | undefined = fieldTypes.get(item.type);
          if (!type) this.add([...path, 'type'], 'unknown_type', { type: item.type });
          else this.settings(item, type, path);
        } else {
          const type: ContentType | undefined = contentTypes.get(item.type);
          if (!type) this.add([...path, 'type'], 'unknown_type', { type: item.type });
          else this.settings(item, type, path);
        }
      });
    });
    if (bodyItems > LIMITS.maxBodyItems) this.add(['pages'], 'too_many_items', { max: LIMITS.maxBodyItems });
  }

  /** شرط فقط به فیلد صفحات قبلی یا همان صفحه (قبل از آیتم) اشاره می‌کند؛ پس چرخه ممکن نیست. */
  conditions(): void {
    const position = new Map<string, { pi: number; ii: number; field: FieldElement }>();
    this.def.pages.forEach((page, pi) =>
      page.body.items.forEach((item, ii) => {
        if (item.kind === 'field' && !position.has(item.field_id)) position.set(item.field_id, { pi, ii, field: item });
      }),
    );

    const check = (condition: Condition, pi: number, ii: number | null, path: IssuePath) => {
      const ref = position.get(condition.field_id);
      if (!ref) return this.add([...path, 'field_id'], 'unknown_field_reference', { field_id: condition.field_id });
      const before = ref.pi < pi || (ii !== null && ref.pi === pi && ref.ii < ii);
      if (!before) return this.add([...path, 'field_id'], 'forward_reference', { field_id: condition.field_id });
      const type = fieldTypes.get(ref.field.type);
      if (!type) return; // قبلاً گزارش شده
      if (!type.conditionOps.includes(condition.op)) {
        return this.add([...path, 'op'], 'op_not_supported', { op: condition.op, type: type.type });
      }
      if (condition.op === 'is_empty') {
        if (condition.value !== undefined) this.add([...path, 'value'], 'value_not_allowed');
        return;
      }
      if (condition.value === undefined) return this.add([...path, 'value'], 'value_required');
      const normalized = normalizeConditionValue(type, condition, ref.field.settings);
      if (!normalized.ok) return this.add([...path, 'value'], 'invalid_condition_value');
      const v = normalized.value;
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        return this.add([...path, 'value'], 'invalid_condition_value');
      }
      condition.value = v;
    };

    this.def.pages.forEach((page, pi) => {
      if (page.condition && page.kind === 'main') check(page.condition, pi, null, ['pages', pi, 'condition']);
      page.body.items.forEach((item, ii) => {
        if (item.condition) check(item.condition, pi, ii, ['pages', pi, 'body', 'items', ii, 'condition']);
      });
    });
  }
}

function normalizeConditionValue(
  type: FieldType,
  condition: Condition,
  settings: Record<string, unknown>,
): FieldResult<JsonValue> {
  if (type.normalizeConditionValue) return type.normalizeConditionValue(condition.op, condition.value, settings);
  if (condition.op === 'contains') {
    return typeof condition.value === 'string' && condition.value.trim() !== ''
      ? { ok: true, value: condition.value }
      : { ok: false, code: 'invalid_condition_value' };
  }
  const r = type.validate(condition.value, settings);
  return r.ok ? { ok: true, value: type.serialize(r.value) } : r;
}

/**
 * ساختار + قواعد معنایی تعریف فرم را بررسی می‌کند. در صورت موفقیت، تعریف نرمال‌شده
 * (پیش‌فرض‌ها اعمال‌شده، settings هر نوع parse‌شده، مقدار شرط‌ها نرمال) برمی‌گردد.
 */
export function validateDefinition(input: unknown): ValidateDefinitionResult {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, issues: [{ path: [], code: 'not_serializable' }] };
  }
  if (serialized === undefined) return { ok: false, issues: [{ path: [], code: 'invalid_type' }] };
  if (utf8ByteLength(serialized) > LIMITS.maxDefinitionBytes) {
    return { ok: false, issues: [{ path: [], code: 'too_large', params: { max_bytes: LIMITS.maxDefinitionBytes } }] };
  }

  const parsed = definitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: zodIssues(parsed.error, []) };

  const checker = new Checker(parsed.data);
  checker.pageOrder();
  checker.uniqueIds();
  checker.elements();
  checker.conditions();

  return checker.issues.length > 0
    ? { ok: false, issues: checker.issues }
    : { ok: true, definition: checker.def };
}
