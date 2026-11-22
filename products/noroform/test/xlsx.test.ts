import { describe, expect, it } from 'vitest';
import { buildXlsx, xlsxParts } from '../api/submissions/xlsx';
import { unzip } from './zip-reader';

// خروجی XLSX: بستهٔ OOXML معتبر، راست‌چین و استایل‌دار، بدون وابستگی بیرونی.

const table = {
  title: 'پاسخ‌های فرم تماس',
  subtitle: '۳ پاسخ · از ۱۴۰۵/۰۱/۰۱ تا ۱۴۰۵/۰۱/۳۱ · تاریخ خروجی: ۱۴۰۵/۰۲/۰۱، ۱۰:۳۰',
  headers: ['زمان ثبت', 'نام کامل', 'ایمیل'],
  widths: [22],
  rows: [
    ['۱۴۰۵/۰۱/۰۲، ۱۳:۳۰', 'سارا', 'a@b.com'],
    ['۱۴۰۵/۰۱/۰۳، ۰۹:۰۰', 'مهدی & دوستان <تست>', ''],
  ],
};

function part(name: string): string {
  const found = xlsxParts(table).find((p) => p.name === name);
  if (!found) throw new Error(`missing part ${name}`);
  return found.data.toString('utf8');
}

describe('buildXlsx', () => {
  it('produces a readable zip package with the required OOXML parts', () => {
    const files = unzip(buildXlsx(table));
    expect([...files.keys()].sort()).toEqual(
      ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'].sort(),
    );
    const sheet = files.get('xl/worksheets/sheet1.xml')!.toString('utf8');
    expect(sheet).toContain('rightToLeft="1"'); // شیت راست‌چین
    expect(sheet).toContain('<t xml:space="preserve">پاسخ‌های فرم تماس</t>');
    expect(sheet).toContain('r="A4" s="3"');
    expect(sheet).toContain('r="C6" s="5"'); // ردیف راه‌راه
    expect(sheet).toContain('<autoFilter ref="A4:C6"/>');
    expect(files.get('xl/workbook.xml')!.toString('utf8')).toContain('name="پاسخ‌ها"');
  });

  it('keeps every cell as inline text and escapes XML', () => {
    const sheet = part('xl/worksheets/sheet1.xml');
    expect(sheet).toContain('<t xml:space="preserve">مهدی &amp; دوستان &lt;تست&gt;</t>');
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).not.toContain('<f>'); // هیچ فرمولی ساخته نمی‌شود
    // سلول خالی: فقط استایل و مرجع، بدون مقدار
    expect(sheet).toContain('<c r="C6" s="5"/>');
    // منطقهٔ عنوان/زیرعنوان روی همهٔ ستون‌ها ادغام می‌شود.
    expect(sheet).toContain('<mergeCell ref="A1:C1"/>');
    expect(sheet).toContain('<mergeCell ref="A2:C2"/>');
  });

  it('styles the header row and freezes it', () => {
    const sheet = part('xl/worksheets/sheet1.xml');
    expect(sheet).toContain('<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>');
    expect(sheet).toContain('r="A4" s="3"');
    expect(sheet).toContain('r="C4" s="3"');
    const styles = part('xl/styles.xml');
    expect(styles).toContain('<fgColor rgb="FF217346"/>'); // سرستون سبز
    expect(styles).toContain('readingOrder="2"'); // جهت متن راست‌به‌چپ
    expect(styles).toContain('horizontal="right" vertical="top" readingOrder="2" wrapText="1"');
    expect(styles).toContain('<name val="Tahoma"/>');
  });

  it('picks A4 landscape only for wide tables and sizes the time column', () => {
    expect(part('xl/worksheets/sheet1.xml')).toContain('orientation="portrait"');
    const wide = buildXlsx({ ...table, headers: ['زمان ثبت', 'a', 'b', 'c', 'd', 'e'] });
    const sheet = unzip(wide).get('xl/worksheets/sheet1.xml')!.toString('utf8');
    expect(sheet).toContain('orientation="landscape"');
    expect(sheet).toContain('<col min="1" max="1" width="22" customWidth="1"/>');
  });

  it('sanitizes the sheet name and ignores extra cells in a row', () => {
    const workbook = xlsxParts({ ...table, sheetName: "/a[b]:c*?\\d'" }).find((p) => p.name === 'xl/workbook.xml')!;
    expect(workbook.data.toString('utf8')).toContain('name="a b c d"');
    const long = xlsxParts({ ...table, sheetName: 'x'.repeat(40) }).find((p) => p.name === 'xl/workbook.xml')!;
    expect(long.data.toString('utf8')).toContain(`name="${'x'.repeat(31)}"`);
    const extra = unzip(
      buildXlsx({ ...table, rows: [['۱۴۰۵/۰۱/۰۲', 'سارا', 'a@b.com', 'سلول اضافه']] }),
    )
      .get('xl/worksheets/sheet1.xml')!
      .toString('utf8');
    expect(extra).not.toContain('سلول اضافه'); // ردیف با سلول بیشتر از تعداد ستون‌ها بریده می‌شود
    expect(extra).not.toContain('r="D5"');
  });

  it('drops XML-illegal control characters', () => {
    const dirty = buildXlsx({ ...table, rows: [['a\u0000b\u0007c', 'x', 'y']] });
    const sheet = unzip(dirty).get('xl/worksheets/sheet1.xml')!.toString('utf8');
    expect(sheet).toContain('>abc<');
  });
});
