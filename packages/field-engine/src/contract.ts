import type { z } from 'zod';
import type { ChromeArea, ConditionOp, PageKind } from './schema';
import type { IssueParams, JsonValue, ValueResult, ValueType } from './values';

// قرارداد انواع المان (docs/architecture.md §8.6). بخش React (Edit/View) بعداً جدا اضافه می‌شود.

export type { IssueParams, JsonValue };

/** نتیجه‌ی اعتبارسنجی فیلد همان نتیجه‌ی نوع مقدار آن است. */
export type FieldResult<V> = ValueResult<V>;

export interface ElementTypeBase<S> {
  readonly type: string;
  readonly settingsSchema: z.ZodType<S>;
  readonly defaultSettings: S;
}

export interface FieldType<S = unknown, V = unknown> extends ElementTypeBase<S> {
  readonly kind: 'field';
  /** نوع مقدار این فیلد (لایه‌ی مستقل از فرم)؛ قیدهای داده و اعتبارسنجی از آن می‌آید. */
  readonly value: ValueType;
  /** کلیدهای settings که فقط نمایشی‌اند؛ بقیه‌ی کلیدها قید داده‌اند (`value.constraintsShape`). */
  readonly displayKeys: readonly string[];
  /** عملگرهای شرطی که روی این نوع معنا دارند. */
  readonly conditionOps: readonly ConditionOp[];
  /** ورودی غیرخالی را بررسی و نرمال می‌کند (خالی‌بودن/required بیرون بررسی می‌شود). */
  validate(value: unknown, settings: S): FieldResult<V>;
  serialize(value: V): JsonValue;
  deserialize(stored: JsonValue): V;
  /** نمایش انسانی (مثلاً تاریخ شمسی). */
  format(value: V, settings: S): string;
  /**
   * نرمال‌سازی مقدار شرط برای عملگرهای غیر is_empty. پیش‌فرض: contains ← رشته‌ی غیرخالی،
   * بقیه ← validate + serialize.
   */
  normalizeConditionValue?(op: ConditionOp, value: unknown, settings: S): FieldResult<JsonValue>;
}

export interface ContentType<S = unknown> extends ElementTypeBase<S> {
  readonly kind: 'content';
}

/** وضعیت اجرای فرم که chrome «زنده» از آن محاسبه می‌شود. زمان تزریق می‌شود. */
export interface ChromeRuntimeState {
  formName: string;
  page: { page_id: string; kind: PageKind; title: string };
  /** صفحات main قابل‌نمایش (پرش‌نشده) به ترتیب. */
  visibleMainPages: ReadonlyArray<{ page_id: string; title: string }>;
  startedAtMs?: number;
  nowMs?: number;
}

export interface ChromeType<S = unknown, VM = unknown> extends ElementTypeBase<S> {
  readonly kind: 'chrome';
  readonly allowedAreas: readonly ChromeArea[];
  readonly allowedPageKinds: readonly PageKind[];
  /** مدل نمایش خالص؛ کامپوننت React بعداً آن را رندر می‌کند. */
  view(settings: S, state: ChromeRuntimeState): VM;
}
