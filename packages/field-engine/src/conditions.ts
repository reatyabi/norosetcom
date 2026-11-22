import type { ChromeRuntimeState, JsonValue } from './contract';
import type { Condition, FieldElement, FormDefinition, FormPage } from './schema';

// منطق شرطی ساده (docs/architecture.md §8.4). شرط‌ها فقط به عقب اشاره می‌کنند، پس یک پیمایش
// به ترتیب سند کافی است: فیلد پنهان، در شرط‌های بعدی «بی‌پاسخ» حساب می‌شود.

export type Answers = Record<string, JsonValue>;

/** خالی: undefined، null، رشته‌ی فقط فاصله، آرایه‌ی خالی. */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function compare(a: JsonValue, b: JsonValue): number | null {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // تاریخ‌ها ISO هستند و مقایسه‌ی رشته‌ای درست است.
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  return null;
}

/** آیا خودِ شرط برقرار است؟ (مستقل از effect) */
export function evaluateCondition(condition: Condition, answers: Answers): boolean {
  const raw = Object.prototype.hasOwnProperty.call(answers, condition.field_id)
    ? answers[condition.field_id]
    : undefined;
  const answer = raw === undefined || isEmptyValue(raw) ? undefined : raw;
  const { op, value } = condition;

  switch (op) {
    case 'is_empty':
      return answer === undefined;
    case 'eq':
      return answer !== undefined && value !== undefined && compare(answer, value) === 0;
    case 'neq':
      return !(answer !== undefined && value !== undefined && compare(answer, value) === 0);
    case 'gt':
    case 'lt': {
      if (answer === undefined || value === undefined) return false;
      const c = compare(answer, value);
      return c !== null && (op === 'gt' ? c > 0 : c < 0);
    }
    case 'contains':
      if (answer === undefined || value === undefined) return false;
      if (Array.isArray(answer)) return answer.includes(value);
      return typeof answer === 'string' && answer.toLowerCase().includes(String(value).toLowerCase());
  }
}

/** با توجه به effect: آیا آیتم/صفحه نمایش داده می‌شود؟ */
export function isShown(condition: Condition | undefined, answers: Answers): boolean {
  if (!condition) return true;
  const matched = evaluateCondition(condition, answers);
  return condition.effect === 'show' ? matched : !matched;
}

export interface WalkResult {
  visiblePages: FormPage[];
  hiddenItemIds: string[];
  answers: Answers;
}

/**
 * پیمایش تعریف به ترتیب سند. `resolveValue` مقدار هر فیلد قابل‌نمایش را می‌دهد (یا undefined)؛
 * فقط مقدار فیلدهای قابل‌نمایش وارد answers می‌شود.
 */
export function walkDefinition(
  definition: FormDefinition,
  resolveValue: (field: FieldElement) => JsonValue | undefined,
): WalkResult {
  const answers: Answers = {};
  const visiblePages: FormPage[] = [];
  const hiddenItemIds: string[] = [];

  for (const page of definition.pages) {
    if (page.kind === 'main' && !isShown(page.condition, answers)) {
      for (const item of page.body.items) hiddenItemIds.push(item.item_id);
      continue;
    }
    visiblePages.push(page);
    for (const item of page.body.items) {
      if (!isShown(item.condition, answers)) {
        hiddenItemIds.push(item.item_id);
        continue;
      }
      if (item.kind === 'field') {
        const value = resolveValue(item);
        if (value !== undefined) answers[item.field_id] = value;
      }
    }
  }
  return { visiblePages, hiddenItemIds, answers };
}

/** وضعیت نمایش با پاسخ‌های (serializeشده‌ی) فعلی. answers خروجی فقط فیلدهای قابل‌نمایش است. */
export function evaluateConditions(
  definition: FormDefinition,
  answers: Answers,
): { visiblePageIds: string[]; hiddenItemIds: string[]; answers: Answers } {
  const result = walkDefinition(definition, (field) => {
    const v = Object.prototype.hasOwnProperty.call(answers, field.field_id) ? answers[field.field_id] : undefined;
    return v === undefined || isEmptyValue(v) ? undefined : v;
  });
  return {
    visiblePageIds: result.visiblePages.map((p) => p.page_id),
    hiddenItemIds: result.hiddenItemIds,
    answers: result.answers,
  };
}

/** صفحات قابل‌نمایش (welcome/ending همیشه؛ main بر اساس شرط). */
export function computeVisiblePages(definition: FormDefinition, answers: Answers): FormPage[] {
  const visible = new Set(evaluateConditions(definition, answers).visiblePageIds);
  return definition.pages.filter((p) => visible.has(p.page_id));
}

/** وضعیت اجرا برای chrome؛ نوار پیشرفت فقط صفحات main پرش‌نشده را می‌شمارد. */
export function buildRuntimeState(
  definition: FormDefinition,
  answers: Answers,
  page: FormPage,
  options: { formName: string; startedAtMs?: number; nowMs?: number },
): ChromeRuntimeState {
  return {
    formName: options.formName,
    page: { page_id: page.page_id, kind: page.kind, title: page.title },
    visibleMainPages: computeVisiblePages(definition, answers)
      .filter((p) => p.kind === 'main')
      .map((p) => ({ page_id: p.page_id, title: p.title })),
    startedAtMs: options.startedAtMs,
    nowMs: options.nowMs,
  };
}
