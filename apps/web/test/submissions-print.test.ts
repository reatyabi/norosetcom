import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../src/lib/format';
import { parseCsv, printDocumentHtml, printRows } from '../src/lib/submissions-print';

// ستون‌های CSV سرور: شناسه پاسخ، زمان ثبت (شمسی)، زمان ثبت (UTC)، نسخه، سپس فیلدها.
const CSV_HEAD = 'شناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه,ایمیل,نام کامل';

describe('submissions print export', () => {
  it('parses CSV with BOM, quoted commas, newlines and doubled quotes', () => {
    const text = '\uFEFFa,b\r\n"x,y","line1\nline2"\r\n"say ""hi""",z\r\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x,y', 'line1\nline2'],
      ['say "hi"', 'z'],
    ]);
  });

  it('keeps only the table columns: fixed time + customized fields in their order', () => {
    const csv = parseCsv(
      `\uFEFF${CSV_HEAD}\r\ns1,۱۴۰۵/۰۱/۱۲ ۱۰:۳۰,2026-04-01T07:00:00.000Z,2,a@b.com,سارا\r\n`,
    );
    expect(printRows(csv)).toEqual([
      ['زمان ثبت', 'ایمیل', 'نام کامل'],
      // ستون ثابت زمان با همان قالب جدول نمایشی (شمسی تهران) چاپ می‌شود.
      [formatDateTime('2026-04-01T07:00:00.000Z'), 'a@b.com', 'سارا'],
    ]);
  });

  it('prints even when all custom columns are hidden', () => {
    const rows = printRows(
      parseCsv('\uFEFFشناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه\r\ns1,۱۴۰۵/۰۱/۱۲ ۱۰:۳۰,2026-04-01T07:00:00.000Z,1\r\n'),
    );
    expect(rows).toEqual([['زمان ثبت'], [formatDateTime('2026-04-01T07:00:00.000Z')]]);
  });

  it('falls back to the server Jalali text when the UTC cell is missing', () => {
    const rows = printRows(parseCsv('\uFEFFشناسه پاسخ,زمان ثبت (شمسی),زمان ثبت (UTC),نسخه\r\ns1,۱۴۰۵/۰۱/۱۲ ۱۰:۳۰,,1\r\n'));
    expect(rows).toEqual([['زمان ثبت'], ['۱۴۰۵/۰۱/۱۲ ۱۰:۳۰']]);
  });

  it('escapes values and drops the CSV formula guard in the printed document', () => {
    const html = printDocumentHtml(
      'پاسخ‌های <فرم>',
      [['زمان ثبت', 'نام'], ['۱۴۰۵/۰۱/۱۲', "'=<b>x</b>"]],
      'بازه: همهٔ زمان‌ها',
    );
    expect(html).toContain('&lt;فرم&gt;');
    expect(html).toContain('=&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<فرم>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('@page { size: A4 portrait;');
    expect(html).toContain('بازه: همهٔ زمان‌ها');
    expect(html).toContain('۱ پاسخ');
  });

  it('switches to landscape for wide tables and renders an empty state', () => {
    const html = printDocumentHtml('قالب', [['زمان ثبت', 'a', 'b', 'c', 'd', 'e']], 'بازه: امروز');
    expect(html).toContain('@page { size: A4 landscape;');
    expect(html).toContain('پاسخی با این فیلترها پیدا نشد.');
    expect(html).toContain('۰ پاسخ');
  });
});
