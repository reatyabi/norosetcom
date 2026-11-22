import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  and,
  asc,
  count,
  createResponseLink as insertResponseLinkDb,
  desc,
  eq,
  gte,
  hashPassword,
  lt,
  noroformFormVersions,
  noroformForms,
  noroformSubmissions,
  revokeResponseLinks as revokeResponseLinksDb,
  sql,
  PLAN_RESOLVER,
  productPlan,
  tehranMonthRange,
  TENANT_CONTEXT,
  type Db,
  type PlanResolver,
  type TenantContext,
} from '@noroset/core';
import { parseIsoDate, type FormDefinition, type JsonValue } from '@noroset/field-engine';
import { buildColumns, fieldsOf, formatRawValue, formatValue, type FieldColumn } from './columns';
import { csvRow, UTF8_BOM } from './csv';
import { buildXlsx } from './xlsx';
import type { CreateResponseLinkDto } from './dto';

const RESPONSE_KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const responseKey = () =>
  Array.from({ length: 8 }, () => RESPONSE_KEY_ALPHABET[randomInt(RESPONSE_KEY_ALPHABET.length)]).join('');

// پاسخ‌های یک فرم (docs/architecture.md §8.7): جدول صفحه‌بندی‌شده، پاسخ تکی، فیلتر بازه‌ی تاریخ،
// export CSV. فقط خواندن؛ دسترسی از مسیر tenant (RLS).

/** روزها در منطقه‌ی زمانی ایران بریده می‌شوند (UI تاریخ شمسی را به میلادی تبدیل می‌کند). */
export const REPORT_TIME_ZONE = 'Asia/Tehran';
export const PAGE_LIMIT = { default: 50, max: 200 } as const;
const EXPORT_BATCH = 1000;
/** سقف مقدارهای یکتای هر ستون در کارت فیلتر (بقیه با truncated اعلام می‌شود). */
export const VALUES_LIMIT = 200;

export interface DateRange {
  /** YYYY-MM-DD میلادی، شامل. */
  from?: string;
  /** YYYY-MM-DD میلادی، شامل. */
  to?: string;
}

/** فیلتر/مرتب‌سازی لیست پاسخ‌ها (docs/architecture.md §8.7). */
export interface ListFilter {
  /** فقط پاسخ‌های این شماره‌ی نسخه. */
  version?: number;
  /** کلید مرتب‌سازی: created_at یا field_id. */
  sort?: string;
  dir?: 'asc' | 'desc';
  /** فیلتر متن روی یک ستون (field_id + مقدار). */
  filterField?: string;
  filterValue?: string;
  /**
   * فیلتر چندمقداری هر ستون (کارت فیلتر اکسل‌مانند): field_id → مقدارهای خام انتخاب‌شده.
   * آرایه‌ی خالی یعنی هیچ ردیفی مطابقت ندارد؛ نبودن کلید یعنی بدون فیلتر.
   */
  filters?: Record<string, string[]>;
}

export interface SubmissionRow {
  id: string;
  createdAt: Date;
  versionId: string;
  versionNumber: number;
  answers: Record<string, JsonValue>;
  /**
   * بالای سقف ماهانه‌ی پلن (سقف نرم؛ docs/architecture.md §9.11): ذخیره شده ولی محتوا تا ارتقا نشان داده
   * نمی‌شود (answers خالی).
   */
  locked: boolean;
}

export interface MonthlyQuota {
  /** سقف پاسخ ماه شمسی جاری (کل فضای کاری). */
  limit: number;
  used: number;
}

export interface SubmissionPage {
  columns: Array<Omit<FieldColumn, 'settings'>>;
  items: SubmissionRow[];
  total: number;
  limit: number;
  offset: number;
  /** شماره‌ی نسخه‌های منتشرشده‌ی فرم (برای فیلتر نسخه)، صعودی. */
  versions: number[];
  quota: MonthlyQuota;
}

export interface SubmissionDetail extends SubmissionRow {
  /** فیلدهای همان نسخه به ترتیب، با مقدار خام و نمایشی. */
  fields: Array<{ fieldId: string; label: string; type: string; value: JsonValue | null; display: string }>;
}

/** یک مقدار یکتا از یک ستون برای کارت فیلتر. */
export interface ColumnValue {
  /** مقدار خام ذخیره‌شده (همان چیزی که در answers هست). */
  value: string;
  /** نمایش انسانی (تاریخ شمسی، عنوان گزینه، ...). */
  label: string;
  /** تعداد پاسخ‌هایی که این مقدار را دارند. */
  count: number;
}

export interface ColumnValues {
  values: ColumnValue[];
  /** تعداد مقدارهای یکتا از VALUES_LIMIT بیشتر است. */
  truncated: boolean;
}

const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: REPORT_TIME_ZONE,
});

export function formatSubmittedAt(date: Date): string {
  return jalaliDateTime.format(date);
}

const faNumber = new Intl.NumberFormat('fa-IR');

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: REPORT_TIME_ZONE,
});

/** `YYYY-MM-DD` میلادی → تاریخ شمسی کوتاه (زیرعنوان فایل خروجی). */
function formatRangeDay(iso: string): string {
  return jalaliDate.format(new Date(`${iso}T00:00:00Z`));
}

function rangeLabel(range: DateRange): string {
  if (range.from && range.to) return `از ${formatRangeDay(range.from)} تا ${formatRangeDay(range.to)}`;
  if (range.from) return `از ${formatRangeDay(range.from)}`;
  if (range.to) return `تا ${formatRangeDay(range.to)}`;
  return 'همهٔ زمان‌ها';
}

function checkRange(range: DateRange): void {
  for (const key of ['from', 'to'] as const) {
    const v = range[key];
    if (v !== undefined && parseIsoDate(v) !== v) throw new BadRequestException(`invalid_${key}`);
  }
  if (range.from && range.to && range.from > range.to) throw new BadRequestException('from_after_to');
}

/** شروع روز `date` در تهران به‌صورت timestamptz. */
function dayStart(date: string) {
  return sql`((${date}::date)::timestamp AT TIME ZONE ${REPORT_TIME_ZONE})`;
}

/** مطابقت مقدار خام ستون با مجموعه‌ی انتخاب‌شده؛ ستون چندگزینه‌ای «هر عنصر» را می‌سنجد. */
function selectedValuesFilter(fieldId: string, values: string[]) {
  if (values.length === 0) return sql`false`;
  const list = sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  );
  return sql`CASE
    WHEN jsonb_typeof(${noroformSubmissions.answers} -> ${fieldId}) = 'array'
      THEN ${noroformSubmissions.answers} -> ${fieldId} ?| ARRAY[${list}]::text[]
    ELSE (${noroformSubmissions.answers} ->> ${fieldId}) = ANY(ARRAY[${list}]::text[])
  END`;
}

function rangeFilter(formId: string, range: DateRange, filter: ListFilter = {}) {
  return and(
    eq(noroformSubmissions.formId, formId),
    range.from ? gte(noroformSubmissions.createdAt, dayStart(range.from)) : undefined,
    // to شامل است: کمتر از شروع روز بعد.
    range.to ? lt(noroformSubmissions.createdAt, sql`(${dayStart(range.to)} + interval '1 day')`) : undefined,
    filter.version ? eq(noroformFormVersions.versionNumber, filter.version) : undefined,
    filter.filterField && filter.filterValue
      ? sql`${noroformSubmissions.answers}->>${filter.filterField} ILIKE ${`%${filter.filterValue}%`}`
      : undefined,
    ...Object.entries(filter.filters ?? {}).map(([fieldId, values]) => selectedValuesFilter(fieldId, values)),
  );
}

const LOCKED_CELL = 'قفل — برای دیدن، پلن را ارتقا دهید';

/**
 * ستون‌های خروجی = فهرست سفارشی‌شدهٔ جدول (فقط نمایش‌داده‌شده‌ها و با ترتیب کاربر)؛
 * `undefined` یعنی همهٔ فیلدها و آرایهٔ خالی یعنی فقط ستون‌های پایه.
 */
function pickColumns(allColumns: FieldColumn[], columnIds?: string[]): FieldColumn[] {
  if (columnIds === undefined) return allColumns;
  return columnIds
    .map((fieldId) => allColumns.find((c) => c.fieldId === fieldId))
    .filter((c): c is FieldColumn => Boolean(c));
}


/** تعداد پاسخ‌های tenant در بازه (RLS: فقط همین tenant، همه‌ی فرم‌ها). */
async function countBetween(tx: Db, start: Date, end: Date): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(noroformSubmissions)
    .where(and(gte(noroformSubmissions.createdAt, start), lt(noroformSubmissions.createdAt, end)));
  return Number(row?.n ?? 0);
}

/** پاسخ‌های این ماه شمسی (تهران) در کل tenant؛ برای نمایش مصرف. */
export async function submissionsThisMonth(tx: Db, now = new Date()): Promise<number> {
  const { start, end } = tehranMonthRange(now);
  return countBetween(tx, start, end);
}

const rowColumns = {
  id: noroformSubmissions.id,
  createdAt: noroformSubmissions.createdAt,
  versionId: noroformSubmissions.versionId,
  versionNumber: noroformFormVersions.versionNumber,
  answers: noroformSubmissions.answers,
};

/** عبارت مرتب‌سازی مقدار یک فیلد در JSONB؛ عدد و تاریخ با cast درست. */
function sortExpr(fieldId: string, type: string | undefined) {
  if (type === 'number' || type === 'rating') return sql`(${noroformSubmissions.answers}->>${fieldId})::numeric`;
  if (type === 'date') return sql`(${noroformSubmissions.answers}->>${fieldId})::date`;
  return sql`${noroformSubmissions.answers}->>${fieldId}`;
}

function orderByFor(filter: ListFilter | undefined, columns: FieldColumn[] | undefined) {
  const ascDir = filter?.dir === 'asc';
  if (!filter?.sort || filter.sort === 'created_at' || !columns) {
    return [
      ascDir ? asc(noroformSubmissions.createdAt) : desc(noroformSubmissions.createdAt),
      ascDir ? asc(noroformSubmissions.id) : desc(noroformSubmissions.id),
    ];
  }
  const type = columns.find((c) => c.fieldId === filter.sort)?.type;
  return [sql`${sortExpr(filter.sort, type)} ${ascDir ? sql`ASC` : sql`DESC`} NULLS LAST`, desc(noroformSubmissions.id)];
}

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  async list(
    formId: string,
    range: DateRange,
    page: { limit?: number; offset?: number },
    filter: ListFilter = {},
  ): Promise<SubmissionPage> {
    checkRange(range);
    const limit = Math.min(page.limit ?? PAGE_LIMIT.default, PAGE_LIMIT.max);
    const offset = page.offset ?? 0;
    const cap = await this.monthlyCap();
    return this.ctx.run(async (tx) => {
      const versions = await this.versions(tx, formId);
      const columns = buildColumns(versions);
      const where = rangeFilter(formId, range, filter);
      const [{ total } = { total: 0 }] = await tx
        .select({ total: count() })
        .from(noroformSubmissions)
        .innerJoin(noroformFormVersions, eq(noroformFormVersions.id, noroformSubmissions.versionId))
        .where(where);
      const items = await this.lock(tx, await this.rows(tx, where, limit, offset, filter, columns), cap);
      return {
        columns: columns.map(({ settings: _settings, ...c }) => c),
        items,
        total,
        limit,
        offset,
        versions: versions.map((v) => v.versionNumber).sort((a, b) => a - b),
        quota: { limit: cap, used: await submissionsThisMonth(tx) },
      };
    });
  }

  /**
   * مقدارهای یکتای یک ستون برای کارت فیلتر اکسل‌مانند. فیلتر همین ستون اعمال نمی‌شود
   * (وگرنه فقط گزینه‌های انتخاب‌شده می‌ماند) ولی بقیه‌ی فیلترها برای هم‌خوانی با جدول اعمال می‌شوند.
   */
  async values(
    formId: string,
    range: DateRange,
    fieldId: string,
    filter: ListFilter = {},
  ): Promise<ColumnValues> {
    checkRange(range);
    return this.ctx.run(async (tx) => {
      const versions = await this.versions(tx, formId);
      const column = buildColumns(versions).find((c) => c.fieldId === fieldId);
      if (!column) throw new BadRequestException('unknown_field');

      const others = { ...filter.filters };
      delete others[fieldId];
      const where = rangeFilter(formId, range, { ...filter, filters: others });
      const order =
        column.type === 'number' || column.type === 'rating'
          ? sql`ORDER BY val::numeric NULLS LAST`
          : sql`ORDER BY val`;

      // ستون چندگزینه‌ای آرایه است؛ برای یکتا‌سازی عنصرهایش را باز می‌کنیم.
      const result = await tx.execute<{ value: string; n: number }>(sql`
        SELECT val AS value, count(*)::int AS n
        FROM ${noroformSubmissions}
        INNER JOIN ${noroformFormVersions} ON ${noroformFormVersions.id} = ${noroformSubmissions.versionId}
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(${noroformSubmissions.answers} -> ${fieldId}) = 'array'
              THEN ${noroformSubmissions.answers} -> ${fieldId}
            ELSE jsonb_build_array(${noroformSubmissions.answers} -> ${fieldId})
          END
        ) AS val
        WHERE ${where}
          AND ${noroformSubmissions.answers} ? ${fieldId}
          AND jsonb_typeof(${noroformSubmissions.answers} -> ${fieldId}) <> 'null'
          AND val IS NOT NULL
        GROUP BY val
        ${order}
        LIMIT ${VALUES_LIMIT + 1}
      `);

      return {
        values: result.rows.slice(0, VALUES_LIMIT).map((r) => ({
          value: r.value,
          label: formatRawValue(column, r.value),
          count: Number(r.n),
        })),
        truncated: result.rows.length > VALUES_LIMIT,
      };
    });
  }

  async get(formId: string, submissionId: string): Promise<SubmissionDetail> {
    const cap = await this.monthlyCap();
    return this.ctx.run(async (tx) => {
      const versions = await this.versions(tx, formId);
      const [row] = await this.lock(
        tx,
        await this.rows(tx, and(eq(noroformSubmissions.formId, formId), eq(noroformSubmissions.id, submissionId)), 1, 0),
        cap,
      );
      if (!row) throw new NotFoundException();
      const version = versions.find((v) => v.versionNumber === row.versionNumber);
      const fields = version ? fieldsOf(version.definition) : [];
      return {
        ...row,
        fields: fields.map((f) => ({
          fieldId: f.fieldId,
          label: f.label,
          type: f.type,
          value: row.locked ? null : (row.answers[f.fieldId] ?? null),
          display: row.locked ? '' : formatValue(f, row.answers[f.fieldId]),
        })),
      };
    });
  }

  /** CSV کامل (با BOM) برای بازه؛ ستون‌ها: شناسه، زمان (شمسی تهران و UTC)، نسخه، سپس فیلدها. */
  async exportCsv(
    formId: string,
    range: DateRange,
    filter: ListFilter = {},
    /** فهرست مرتب ستون‌های سفارشی‌شده؛ نبودنش = همه‌ی فیلدها، خالی = بدون ستون فیلد. */
    columnIds?: string[],
  ): Promise<{ filename: string; body: string }> {
    checkRange(range);
    const cap = await this.monthlyCap();
    return this.ctx.run(async (tx) => {
      const [form] = await tx
        .select({ slug: noroformForms.slug })
        .from(noroformForms)
        .where(eq(noroformForms.id, formId))
        .limit(1);
      if (!form) throw new NotFoundException();
      const allColumns = buildColumns(await this.versions(tx, formId));
      // خروجی دقیقاً ستون‌های شخصی‌سازی‌شده (نمایش‌داده‌شده‌ها و ترتیبشان) را دارد؛
      // ترتیب‌دهی ردیف‌ها از همه‌ی ستون‌ها استفاده می‌کند تا نوع ستون مرتب‌سازی هم پیدا شود.
      const columns = pickColumns(allColumns, columnIds);

      let body =
        UTF8_BOM +
        csvRow(['شناسه پاسخ', 'زمان ثبت (شمسی)', 'زمان ثبت (UTC)', 'نسخه', ...columns.map((c) => c.label)]);
      const where = rangeFilter(formId, range, filter);
      for (let offset = 0; ; offset += EXPORT_BATCH) {
        const batch = await this.rows(tx, where, EXPORT_BATCH, offset, filter, allColumns);
        for (const r of await this.lock(tx, batch, cap)) {
          body += csvRow([
            r.id,
            formatSubmittedAt(r.createdAt),
            r.createdAt.toISOString(),
            String(r.versionNumber),
            ...columns.map((c, i) => (r.locked ? (i === 0 ? LOCKED_CELL : '') : formatValue(c, r.answers[c.fieldId]))),
          ]);
        }
        if (batch.length < EXPORT_BATCH) break;
      }
      return { filename: `noroform-${form.slug}-responses.csv`, body };
    });
  }

  /**
   * خروجی XLSX راست‌چین و استایل‌دار: دقیقاً ستون‌های جدول نمایشی (زمان ثبت + ستون‌های
   * شخصی‌سازی‌شده) تا فایل با چیزی که کاربر می‌بیند یکی باشد. متادیتا (شناسه، UTC، نسخه)
   * در این فایل نمی‌آید؛ داده‌ی کامل در `exportCsv` است.
   */
  async exportXlsx(
    formId: string,
    range: DateRange,
    filter: ListFilter = {},
    /** فهرست مرتب ستون‌های سفارشی‌شده؛ نبودنش = همه‌ی فیلدها، خالی = بدون ستون فیلد. */
    columnIds?: string[],
  ): Promise<{ filename: string; body: Buffer }> {
    checkRange(range);
    const cap = await this.monthlyCap();
    return this.ctx.run(async (tx) => {
      const [form] = await tx
        .select({ slug: noroformForms.slug, title: noroformForms.title })
        .from(noroformForms)
        .where(eq(noroformForms.id, formId))
        .limit(1);
      if (!form) throw new NotFoundException();
      const allColumns = buildColumns(await this.versions(tx, formId));
      const columns = pickColumns(allColumns, columnIds);
      const headers = ['زمان ثبت', ...columns.map((c) => c.label)];

      const rows: string[][] = [];
      const where = rangeFilter(formId, range, filter);
      for (let offset = 0; ; offset += EXPORT_BATCH) {
        const batch = await this.rows(tx, where, EXPORT_BATCH, offset, filter, allColumns);
        for (const r of await this.lock(tx, batch, cap)) {
          rows.push([
            formatSubmittedAt(r.createdAt),
            ...columns.map((c, i) => (r.locked ? (i === 0 ? LOCKED_CELL : '') : formatValue(c, r.answers[c.fieldId]))),
          ]);
        }
        if (batch.length < EXPORT_BATCH) break;
      }

      const activeFilters = Object.keys(filter.filters ?? {}).length;
      const subtitle = [
        `${faNumber.format(rows.length)} پاسخ`,
        rangeLabel(range),
        filter.version ? `نسخه ${faNumber.format(filter.version)}` : null,
        activeFilters > 0 ? `${faNumber.format(activeFilters)} فیلتر فعال` : null,
        `تاریخ خروجی: ${formatSubmittedAt(new Date())}`,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ');

      return {
        filename: `noroform-${form.slug}-responses.xlsx`,
        body: buildXlsx({
          title: `پاسخ‌های ${form.title}`,
          subtitle,
          headers,
          rows,
          // ستون زمان ثابت و کمی باریک‌تر؛ بقیه از طول عنوان ستون.
          widths: [22],
        }),
      };
    });
  }

  /** لینک مشاهده‌ی بیرونی پاسخ؛ فقط فرم external با روش احراز انتخاب‌شده. */
  async createResponseLink(
    formId: string,
    submissionId: string,
    dto: CreateResponseLinkDto,
  ): Promise<{ token: string; expiresAt: string; authMode: 'link' | 'key' | 'otp'; key: string | null }> {
    const [form] = await this.ctx.run((tx) =>
      tx
        .select({ responseAccess: noroformForms.responseAccess, responseAuth: noroformForms.responseAuth })
        .from(noroformForms)
        .where(eq(noroformForms.id, formId))
        .limit(1),
    );
    if (!form) throw new NotFoundException();
    if (form.responseAccess !== 'external') throw new ConflictException('response_access_internal');
    if (!form.responseAuth) throw new ConflictException('response_auth_required');

    const authMode = form.responseAuth;
    const rawKey = authMode === 'key' ? (dto.key ?? responseKey()) : null;
    const keyHash = rawKey ? await hashPassword(rawKey) : null;
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const days = dto.expiresInDays ?? 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const link = await insertResponseLinkDb({
      tenantId: this.ctx.tenantId(),
      formId,
      submissionId,
      tokenHash,
      authMode,
      keyHash,
      expiresAt,
      createdBy: this.ctx.userId(),
    });
    if (!link) throw new NotFoundException();
    return { token, expiresAt: expiresAt.toISOString(), authMode, key: rawKey };
  }

  /** ابطال همه‌ی لینک‌های فعال یک پاسخ؛ پاسخ و داده‌ها دست‌نخورده می‌مانند. */
  async revokeResponseLink(formId: string, submissionId: string): Promise<void> {
    await revokeResponseLinksDb(this.ctx.tenantId(), formId, submissionId);
  }

  private async monthlyCap(): Promise<number> {
    // سقف پاسخ در ماه از پلن دامنه‌ی نوروفرم (§9.11)، نه اجتماع همه‌ی محصولات.
    return productPlan(await this.plans.resolve(this.ctx.tenantId()), 'noroform').entitlements['noroform.submissions_monthly'];
  }

  /**
   * قفل پاسخ‌های بالای سقف: در هر ماه شمسیِ ردیف‌ها، پاسخ‌های tenant به ترتیب (created_at, id) شماره می‌خورند
   * و شماره‌ی بزرگ‌تر از cap قفل است (دقیق در SQL، با دقت میکروثانیه). با ارتقای پلن همان پاسخ‌ها باز می‌شوند.
   */
  private async lock(tx: Db, rows: Omit<SubmissionRow, 'locked'>[], cap: number): Promise<SubmissionRow[]> {
    const months = new Map<string, { start: Date; end: Date; ids: string[] }>();
    for (const r of rows) {
      const m = tehranMonthRange(r.createdAt);
      const entry = months.get(m.key) ?? { start: m.start, end: m.end, ids: [] };
      entry.ids.push(r.id);
      months.set(m.key, entry);
    }
    const locked = new Set<string>();
    for (const m of months.values()) {
      const result = await tx.execute<{ id: string }>(sql`
        SELECT id FROM (
          SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
          FROM ${noroformSubmissions}
          WHERE created_at >= ${m.start} AND created_at < ${m.end}
        ) ranked
        WHERE n > ${cap} AND id IN (${sql.join(m.ids.map((id) => sql`${id}::uuid`), sql`, `)})`);
      for (const row of result.rows) locked.add(row.id);
    }
    return rows.map((r) => (locked.has(r.id) ? { ...r, answers: {}, locked: true } : { ...r, locked: false }));
  }

  /** نسخه‌های فرم؛ ۴۰۴ اگر فرم در این tenant نیست. */
  private async versions(tx: Db, formId: string) {
    const [form] = await tx.select({ id: noroformForms.id }).from(noroformForms).where(eq(noroformForms.id, formId)).limit(1);
    if (!form) throw new NotFoundException();
    const rows = await tx
      .select({ versionNumber: noroformFormVersions.versionNumber, definition: noroformFormVersions.definition })
      .from(noroformFormVersions)
      .where(eq(noroformFormVersions.formId, formId));
    // تعریف‌ها هنگام انتشار validate شده‌اند و immutable هستند.
    return rows.map((r) => ({ versionNumber: r.versionNumber, definition: r.definition as FormDefinition }));
  }

  private rows(
    tx: Db,
    where: ReturnType<typeof and>,
    limit: number,
    offset: number,
    filter?: ListFilter,
    columns?: FieldColumn[],
  ): Promise<Omit<SubmissionRow, 'locked'>[]> {
    return tx
      .select(rowColumns)
      .from(noroformSubmissions)
      .innerJoin(noroformFormVersions, eq(noroformFormVersions.id, noroformSubmissions.versionId))
      .where(where)
      .orderBy(...orderByFor(filter, columns))
      .limit(limit)
      .offset(offset) as Promise<Omit<SubmissionRow, 'locked'>[]>;
  }
}
