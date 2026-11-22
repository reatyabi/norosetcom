import { beforeAll, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db,
  platformUsers, eq, noroformForms, noroformSubmissions, tenants, withTenant, type TenantContext } from '@noroset/core';
import { FormsService } from '../api/forms/forms.service';
import { csvCell, csvRow, UTF8_BOM } from '../api/submissions/csv';
import { SubmissionsService } from '../api/submissions/submissions.service';
import { fixedPlan } from '@noroset/core';
import { unzip } from './zip-reader';

/** پلن بدون سقف عملی برای تست‌های رفتار (سقف‌ها جدا تست می‌شوند). */
const PLANS = fixedPlan({ 'noroform.forms': 1000, 'noroform.submissions_monthly': 100000 });

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

/** کاربر واقعی برای ستون created_by (FK به platform_users). */
let testUserId = '';
beforeAll(async () => {
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('creator')}@test.local` }).returning();
  testUserId = u!.id;
});

const NAME = 'f_name0001';
const BDAY = 'f_bday0001';
const TAGS = 'f_tags0001';
const OLD = 'f_old00001';
const NEW = 'f_new00001';

const field = (n: number, field_id: string, type: string, label: string, settings?: unknown) => ({
  kind: 'field',
  item_id: `i_item000${n}`,
  field_id,
  type,
  label,
  ...(settings ? { settings } : {}),
});

const TAG_OPTIONS = { options: [{ value: 'a', label: 'الف' }, { value: 'b', label: 'ب' }] };

function definition(items: unknown[]) {
  return { version_schema: 1, pages: [{ page_id: 'p_page0001', kind: 'main', body: { items } }] };
}

const V1 = definition([
  field(1, NAME, 'short_text', 'نام'),
  field(2, BDAY, 'date', 'تولد'),
  field(3, TAGS, 'multi_choice', 'برچسب', TAG_OPTIONS),
  field(4, OLD, 'short_text', 'قدیمی'),
]);
const V2 = definition([
  field(1, NAME, 'short_text', 'نام کامل'),
  field(2, BDAY, 'date', 'تولد'),
  field(3, TAGS, 'multi_choice', 'برچسب', TAG_OPTIONS),
  field(5, NEW, 'email', 'ایمیل'),
]);

async function setup() {
  const [t] = await db.insert(tenants).values({ name: 'subs', slug: uniq('subs') }).returning();
  const tenantId = t!.id;
  const ctx: TenantContext = {
    tenantId: () => tenantId,
    userId: () => testUserId,
    role: () => 'member',
    run: (fn) => withTenant(tenantId, fn),
  };
  const forms = new FormsService(ctx, PLANS);
  const form = await forms.create({ title: 'پاسخ‌ها' });
  await forms.update(form.id, { draftDefinition: V1 });
  await forms.publish(form.id);
  const v1 = await currentVersionId(tenantId, form.id);
  await forms.update(form.id, { draftDefinition: V2 });
  await forms.publish(form.id);
  const v2 = await currentVersionId(tenantId, form.id);
  return { tenantId, formId: form.id, slug: form.slug, v1, v2, subs: new SubmissionsService(ctx, PLANS) };
}

async function currentVersionId(tenantId: string, formId: string): Promise<string> {
  const [f] = await withTenant(tenantId, (tx) => tx.select().from(noroformForms).where(eq(noroformForms.id, formId)));
  return f!.currentVersionId!;
}

async function insert(
  s: Awaited<ReturnType<typeof setup>>,
  versionId: string,
  answers: Record<string, unknown>,
  createdAt: Date,
): Promise<string> {
  const [row] = await withTenant(s.tenantId, (tx) =>
    tx
      .insert(noroformSubmissions)
      .values({ tenantId: s.tenantId, formId: s.formId, versionId, answers, idempotencyKey: uniq('k'), createdAt })
      .returning({ id: noroformSubmissions.id }),
  );
  return row!.id;
}

describe('csv helpers', () => {
  it('quotes, escapes and neutralizes formulas (but not plain numbers)', () => {
    expect(csvCell('ساده')).toBe('ساده');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('+98912')).toBe("'+98912");
    expect(csvCell('-5')).toBe('-5');
    expect(csvCell('-1+2')).toBe("'-1+2");
    expect(csvRow(['a', 'b'])).toBe('a,b\r\n');
  });
});

describe('SubmissionsService.list', () => {
  it('pages newest first with total, and columns across versions (latest labels, removed fields last)', async () => {
    const s = await setup();
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push(await insert(s, s.v2, { [NAME]: `n${i}` }, new Date(Date.UTC(2026, 5, 1 + i))));
    const page = await s.subs.list(s.formId, {}, { limit: 2, offset: 0 });
    expect(page.total).toBe(3);
    expect(page.items.map((i) => i.id)).toEqual([ids[2], ids[1]]);
    expect(page.items[0]).toMatchObject({ versionNumber: 2, answers: { [NAME]: 'n2' } });
    expect((await s.subs.list(s.formId, {}, { limit: 2, offset: 2 })).items.map((i) => i.id)).toEqual([ids[0]]);
    expect(page.columns).toEqual([
      { fieldId: NAME, label: 'نام کامل', type: 'short_text', removed: false },
      { fieldId: BDAY, label: 'تولد', type: 'date', removed: false },
      { fieldId: TAGS, label: 'برچسب', type: 'multi_choice', removed: false },
      { fieldId: NEW, label: 'ایمیل', type: 'email', removed: false },
      { fieldId: OLD, label: 'قدیمی', type: 'short_text', removed: true },
    ]);
  });

  it('caps limit at 200 and defaults to 50', async () => {
    const s = await setup();
    expect((await s.subs.list(s.formId, {}, {})).limit).toBe(50);
    expect((await s.subs.list(s.formId, {}, { limit: 1000 })).limit).toBe(200);
  });

  it('filters by inclusive Tehran-day range', async () => {
    const s = await setup();
    // 2026-03-19 23:59 تهران = 20:29Z ؛ 2026-03-20 00:01 تهران = 20:31Z
    const lateOn19 = await insert(s, s.v2, {}, new Date('2026-03-19T20:29:00Z'));
    const earlyOn20 = await insert(s, s.v2, {}, new Date('2026-03-19T20:31:00Z'));
    const on18 = await insert(s, s.v2, {}, new Date('2026-03-18T10:00:00Z'));
    const ids = async (range: { from?: string; to?: string }) =>
      (await s.subs.list(s.formId, range, {})).items.map((i) => i.id).sort();
    expect(await ids({ from: '2026-03-19', to: '2026-03-19' })).toEqual([lateOn19]);
    expect(await ids({ from: '2026-03-20' })).toEqual([earlyOn20]);
    expect(await ids({ to: '2026-03-18' })).toEqual([on18]);
    expect(await ids({ from: '2026-03-18', to: '2026-03-20' })).toEqual([lateOn19, earlyOn20, on18].sort());
  });

  it('rejects invalid ranges with 400', async () => {
    const s = await setup();
    await expect(s.subs.list(s.formId, { from: '2026-02-30' }, {})).rejects.toThrow(BadRequestException);
    await expect(s.subs.list(s.formId, { from: '2026-03-02', to: '2026-03-01' }, {})).rejects.toThrow(BadRequestException);
  });

  it('404 for a form of another tenant', async () => {
    const a = await setup();
    const b = await setup();
    await expect(b.subs.list(a.formId, {}, {})).rejects.toThrow(NotFoundException);
    await expect(b.subs.exportCsv(a.formId, {})).rejects.toThrow(NotFoundException);
  });

  it('filters by version number and exposes the available versions', async () => {
    const s = await setup();
    const a = await insert(s, s.v1, { [NAME]: 'نسخه یک' }, new Date('2026-05-01T10:00:00Z'));
    const b = await insert(s, s.v2, { [NAME]: 'نسخه دو' }, new Date('2026-05-02T10:00:00Z'));
    expect((await s.subs.list(s.formId, {}, {})).versions).toEqual([1, 2]);
    expect((await s.subs.list(s.formId, {}, {}, { version: 1 })).items.map((i) => i.id)).toEqual([a]);
    expect((await s.subs.list(s.formId, {}, {}, { version: 2 })).items.map((i) => i.id)).toEqual([b]);
    expect((await s.subs.list(s.formId, {}, {}, { version: 3 })).items).toEqual([]);
  });

  it('sorts by a text field ascending and descending', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'ب' }, new Date('2026-05-01T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'الف' }, new Date('2026-05-02T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'ج' }, new Date('2026-05-03T10:00:00Z'));
    const names = async (dir: 'asc' | 'desc') => (await s.subs.list(s.formId, {}, {}, { sort: NAME, dir })).items.map((i) => i.answers[NAME]);
    expect(await names('asc')).toEqual(['الف', 'ب', 'ج']);
    expect(await names('desc')).toEqual(['ج', 'ب', 'الف']);
  });

  it('sorts dates chronologically (not lexicographically)', async () => {
    const s = await setup();
    await insert(s, s.v2, { [BDAY]: '2026-10-20' }, new Date('2026-05-01T10:00:00Z'));
    await insert(s, s.v2, { [BDAY]: '2026-03-21' }, new Date('2026-05-02T10:00:00Z'));
    await insert(s, s.v2, { [BDAY]: '2026-07-01' }, new Date('2026-05-03T10:00:00Z'));
    const days = (await s.subs.list(s.formId, {}, {}, { sort: BDAY, dir: 'asc' })).items.map((i) => i.answers[BDAY]);
    expect(days).toEqual(['2026-03-21', '2026-07-01', '2026-10-20']);
  });

  it('filters a column by case-insensitive text contains', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا محمدی' }, new Date('2026-05-01T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'علی رضایی' }, new Date('2026-05-02T10:00:00Z'));
    const found = (await s.subs.list(s.formId, {}, {}, { filterField: NAME, filterValue: 'سارا' })).items;
    expect(found).toHaveLength(1);
    expect(found[0]!.answers[NAME]).toBe('سارا محمدی');
  });

  it('filters by selected values, including multi-choice elements and several columns', async () => {
    const s = await setup();
    const sara = await insert(s, s.v2, { [NAME]: 'سارا محمدی', [TAGS]: ['a'] }, new Date('2026-05-01T10:00:00Z'));
    const ali = await insert(s, s.v2, { [NAME]: 'علی رضایی', [TAGS]: ['b'] }, new Date('2026-05-02T10:00:00Z'));

    const byName = await s.subs.list(s.formId, {}, {}, { filters: { [NAME]: ['سارا محمدی'] } });
    expect(byName.items.map((i) => i.id)).toEqual([sara]);
    expect(byName.total).toBe(1);

    // ستون چندگزینه‌ای با هر یک از عنصرهای آرایه مطابقت می‌کند.
    const byTag = await s.subs.list(s.formId, {}, {}, { filters: { [TAGS]: ['b'] } });
    expect(byTag.items.map((i) => i.id)).toEqual([ali]);

    // فیلتر چند ستون هم‌زمان (AND).
    const both = await s.subs.list(s.formId, {}, {}, { filters: { [NAME]: ['سارا محمدی'], [TAGS]: ['b'] } });
    expect(both.items).toEqual([]);

    // آرایه‌ی خالی یعنی هیچ ردیفی مطابقت ندارد.
    const none = await s.subs.list(s.formId, {}, {}, { filters: { [NAME]: [] } });
    expect(none.items).toEqual([]);
    expect(none.total).toBe(0);
  });
});

describe('SubmissionsService.values', () => {
  it('lists distinct raw values with display labels and counts', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا', [TAGS]: ['a', 'b'], [BDAY]: '2026-10-20' }, new Date('2026-05-01T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'سارا', [TAGS]: ['a'], [BDAY]: '2026-03-21' }, new Date('2026-05-02T10:00:00Z'));

    expect(await s.subs.values(s.formId, {}, NAME)).toEqual({
      values: [{ value: 'سارا', label: 'سارا', count: 2 }],
      truncated: false,
    });

    // ستون چندگزینه‌ای به عنصرها باز می‌شود و برچسب گزینه می‌آید.
    expect((await s.subs.values(s.formId, {}, TAGS)).values).toEqual([
      { value: 'a', label: 'الف', count: 2 },
      { value: 'b', label: 'ب', count: 1 },
    ]);

    // تاریخ‌ها به ترتیب زمانی و با برچسب شمسی.
    const days = await s.subs.values(s.formId, {}, BDAY);
    expect(days.values.map((v) => v.value)).toEqual(['2026-03-21', '2026-10-20']);
    expect(days.values[0]!.label).not.toBe(days.values[0]!.value);
  });

  it('ignores the column’s own filter but applies the other columns’ filters', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا', [TAGS]: ['a'] }, new Date('2026-05-01T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'علی', [TAGS]: ['b'] }, new Date('2026-05-02T10:00:00Z'));

    const own = await s.subs.values(s.formId, {}, NAME, { filters: { [NAME]: ['علی'] } });
    expect(own.values.map((v) => v.value)).toEqual(['سارا', 'علی']);

    const other = await s.subs.values(s.formId, {}, NAME, { filters: { [TAGS]: ['a'] } });
    expect(other.values).toEqual([{ value: 'سارا', label: 'سارا', count: 1 }]);
  });

  it('rejects unknown fields and forms of another tenant', async () => {
    const a = await setup();
    const b = await setup();
    await expect(a.subs.values(a.formId, {}, 'f_zzzzzzzz')).rejects.toThrow(BadRequestException);
    await expect(b.subs.values(a.formId, {}, NAME)).rejects.toThrow(NotFoundException);
  });
});

describe('SubmissionsService.get', () => {
  it('returns the submission with its own version’s fields and display values', async () => {
    const s = await setup();
    const id = await insert(s, s.v1, { [NAME]: 'علی', [BDAY]: '2026-10-20', [TAGS]: ['a', 'b'], [OLD]: 'x' }, new Date());
    const detail = await s.subs.get(s.formId, id);
    expect(detail).toMatchObject({ id, versionNumber: 1 });
    expect(detail.fields).toEqual([
      { fieldId: NAME, label: 'نام', type: 'short_text', value: 'علی', display: 'علی' },
      { fieldId: BDAY, label: 'تولد', type: 'date', value: '2026-10-20', display: '۱۴۰۵/۰۷/۲۸' },
      { fieldId: TAGS, label: 'برچسب', type: 'multi_choice', value: ['a', 'b'], display: 'الف، ب' },
      { fieldId: OLD, label: 'قدیمی', type: 'short_text', value: 'x', display: 'x' },
    ]);
  });

  it('404 for unknown submission or submission of another form', async () => {
    const s = await setup();
    const other = await setup();
    const id = await insert(other, other.v2, {}, new Date());
    await expect(s.subs.get(s.formId, id)).rejects.toThrow(NotFoundException);
  });
});

describe('SubmissionsService.exportCsv', () => {
  it('UTF-8 BOM, Persian headers, formatted values, all versions, safe cells', async () => {
    const s = await setup();
    await insert(s, s.v1, { [NAME]: '=HYPERLINK("x")', [OLD]: 'قدیمی، با ویرگول' }, new Date('2026-01-01T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'سارا', [BDAY]: '2025-03-21', [TAGS]: ['b'], [NEW]: 'a@b.com' }, new Date('2026-01-02T10:00:00Z'));
    const { filename, body } = await s.subs.exportCsv(s.formId, {});
    expect(filename).toBe(`noroform-${s.slug}-responses.csv`);
    expect(body.startsWith(UTF8_BOM)).toBe(true);
    const lines = body.slice(1).split('\r\n');
    expect(lines[0]).toBe('شناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه,نام کامل,تولد,برچسب,ایمیل,قدیمی');
    expect(lines).toHaveLength(4); // header + 2 rows + '' پایانی
    // جدیدترین اول
    expect(lines[1]).toContain(',2026-01-02T10:00:00.000Z,2,سارا,۱۴۰۴/۰۱/۰۱,ب,a@b.com,');
    expect(lines[1]).toContain('۱۴۰۴/۱۰/۱۲'); // 2026-01-02 13:30 تهران
    expect(lines[2]).toContain(`,1,"'=HYPERLINK(""x"")",,,,قدیمی، با ویرگول`);
  });

  it('applies the date range', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'in' }, new Date('2026-04-10T08:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'out' }, new Date('2026-04-12T08:00:00Z'));
    const { body } = await s.subs.exportCsv(s.formId, { from: '2026-04-10', to: '2026-04-10' });
    expect(body).toContain(',in,');
    expect(body).not.toContain(',out,');
  });

  it('exports only the customized columns, in their order', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا', [BDAY]: '2025-03-21', [NEW]: 'a@b.com' }, new Date('2026-01-02T10:00:00Z'));
    const { body } = await s.subs.exportCsv(s.formId, {}, {}, [NEW, NAME]);
    const lines = body.slice(1).split('\r\n');
    expect(lines[0]).toBe('شناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه,ایمیل,نام کامل');
    expect(lines[1]).toContain(',2,a@b.com,سارا');
  });

  it('treats an empty column list as base columns only and ignores unknown ids', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا' }, new Date('2026-01-02T10:00:00Z'));
    // آرایه‌ی خالی یعنی کاربر همه‌ی ستون‌های فرم را پنهان کرده است.
    const empty = (await s.subs.exportCsv(s.formId, {}, {}, [])).body;
    expect(empty.slice(1).split('\r\n')[0]).toBe('شناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه');
    // شناسه‌ی ناشناخته (فیلد حذف‌شده از همه‌ی نسخه‌ها) نادیده گرفته می‌شود.
    const unknown = (await s.subs.exportCsv(s.formId, {}, {}, ['f_zzzzzzzz'])).body;
    expect(unknown.slice(1).split('\r\n')[0]).toBe('شناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه');
  });

  it('exports more rows than one batch', async () => {
    const s = await setup();
    await withTenant(s.tenantId, (tx) =>
      tx.insert(noroformSubmissions).values(
        Array.from({ length: 1001 }, (_, i) => ({
          tenantId: s.tenantId,
          formId: s.formId,
          versionId: s.v2,
          answers: { [NAME]: `r${i}` },
          idempotencyKey: `bulk-key-${i}`,
        })),
      ),
    );
    const { body } = await s.subs.exportCsv(s.formId, {});
    expect(body.slice(1).split('\r\n').length - 2).toBe(1001);
  });
});

describe('SubmissionsService.exportXlsx', () => {
  const sheetOf = (body: Buffer) => unzip(body).get('xl/worksheets/sheet1.xml')!.toString('utf8');

  it('exports a styled RTL sheet with the table columns and no metadata', async () => {
    const s = await setup();
    const id = await insert(
      s,
      s.v2,
      { [NAME]: 'سارا', [BDAY]: '2025-03-21', [NEW]: 'a@b.com' },
      new Date('2026-01-02T10:00:00Z'),
    );
    const { filename, body } = await s.subs.exportXlsx(s.formId, {});
    expect(filename).toBe(`noroform-${s.slug}-responses.xlsx`);
    expect(body.subarray(0, 2).toString()).toBe('PK');

    const sheet = sheetOf(body);
    expect(sheet).toContain('rightToLeft="1"');
    expect(sheet).toContain('>زمان ثبت<');
    expect(sheet).toContain('>نام کامل<');
    expect(sheet).toContain('>ایمیل<');
    expect(sheet).toContain('سارا');
    expect(sheet).toContain('a@b.com');
    expect(sheet).toContain('۱۴۰۴/۱۰/۱۲'); // 2026-01-02 در تهران
    expect(sheet).toContain('۱ پاسخ');
    expect(sheet).toContain('همهٔ زمان‌ها');

    // متادیتای پاسخ (شناسه، UTC، نسخه) در فایل نمی‌آید — دادهٔ کامل در CSV است.
    expect(sheet).not.toContain(id);
    expect(sheet).not.toContain('شناسه پاسخ');
    expect(sheet).not.toContain('(UTC)');
    expect(sheet).not.toContain('>نسخه<');
  });

  it('keeps the customized column order, hides removed columns and honors the date range', async () => {
    const s = await setup();
    await insert(s, s.v2, { [NAME]: 'سارا', [BDAY]: '2025-03-21', [NEW]: 'a@b.com' }, new Date('2026-01-02T10:00:00Z'));
    await insert(s, s.v2, { [NAME]: 'مهدی', [NEW]: 'c@d.com' }, new Date('2026-01-03T10:00:00Z'));

    const sheet = sheetOf((await s.subs.exportXlsx(s.formId, {}, {}, [NEW, NAME])).body);
    expect(sheet.indexOf('>ایمیل<')).toBeLessThan(sheet.indexOf('>نام کامل<'));
    expect(sheet).not.toContain('>تولد<');

    const filtered = sheetOf(
      (await s.subs.exportXlsx(s.formId, { from: '2026-01-02', to: '2026-01-02' }, {}, [NAME])).body,
    );
    expect(filtered).toContain('سارا');
    expect(filtered).not.toContain('مهدی');

    // آرایهٔ خالی یعنی کاربر همهٔ ستون‌ها را پنهان کرده است: فقط ستون زمان.
    const empty = sheetOf((await s.subs.exportXlsx(s.formId, {}, {}, [])).body);
    expect(empty).toContain('>زمان ثبت<');
    expect(empty).not.toContain('>نام کامل<');
  });

  it('404 for a form outside the tenant', async () => {
    const a = await setup();
    const b = await setup();
    await expect(b.subs.exportXlsx(a.formId, {})).rejects.toThrow(NotFoundException);
  });
});

describe('monthly soft cap (docs/architecture.md §9.11)', () => {
  it('locks responses beyond the cap per Persian month, everywhere, and unlocks on a bigger plan', async () => {
    const s = await setup();
    const ctx: TenantContext = { tenantId: () => s.tenantId, userId: () => '0', role: () => 'member', run: (fn) => withTenant(s.tenantId, fn) };
    const capped = new SubmissionsService(ctx, fixedPlan({ 'noroform.submissions_monthly': 2 }));
    // سه پاسخ در یک ماه شمسی (مهر ۱۴۰۵) و یکی در ماه بعد.
    const a = await insert(s, s.v2, { [NAME]: 'a' }, new Date('2026-09-25T10:00:00Z'));
    const b = await insert(s, s.v2, { [NAME]: 'b' }, new Date('2026-09-26T10:00:00Z'));
    const c = await insert(s, s.v2, { [NAME]: 'c' }, new Date('2026-09-27T10:00:00Z'));
    const d = await insert(s, s.v2, { [NAME]: 'd' }, new Date('2026-10-25T10:00:00Z'));

    const page = await capped.list(s.formId, {}, {});
    const byId = new Map(page.items.map((i) => [i.id, i]));
    expect([a, b, d].map((id) => byId.get(id)!.locked)).toEqual([false, false, false]);
    expect(byId.get(c)).toMatchObject({ locked: true, answers: {} });
    expect(page.quota.limit).toBe(2);

    const detail = await capped.get(s.formId, c);
    expect(detail.locked).toBe(true);
    expect(detail.fields.every((f) => f.value === null && f.display === '')).toBe(true);

    const csv = (await capped.exportCsv(s.formId, {})).body;
    expect(csv).toContain('قفل — برای دیدن، پلن را ارتقا دهید');
    expect(csv).not.toContain(',c,');

    // همان قفل در XLSX هم هست (محتوا نشان داده نمی‌شود).
    const xlsx = unzip((await capped.exportXlsx(s.formId, {})).body)
      .get('xl/worksheets/sheet1.xml')!
      .toString('utf8');
    expect(xlsx).toContain('قفل — برای دیدن، پلن را ارتقا دهید');
    expect(xlsx).not.toContain('>c<');

    // پلن بزرگ‌تر: همان پاسخ باز است.
    expect((await s.subs.get(s.formId, c)).locked).toBe(false);
  });
});
