// XLSX راست‌چین و استایل‌دار بدون هیچ وابستگی: بستهٔ OOXML (یک ZIP ساده) با یک شیت.
//
// چرا دستی؟ خروجی فقط یک جدول متنی است و برای همین exceljs/SheetJS لازم نیست.
// همهٔ سلول‌ها inlineStr هستند تا مقدارها دست‌نخورده بمانند (صفرِ ابتدای شماره،
// متن‌هایی مثل «=فرمول» که نباید فرمول شوند، تاریخ شمسی).
//
// استایل: عنوان و زیرعنوان ادغام‌شده، ردیف سرستون سبز پُر با متن سفید، بدنهٔ
// راه‌راه با خطوط نازک، راست‌چین با readingOrder=2 (RTL)، عرض ستون‌ها، قفل ردیف
// سرستون، AutoFilter، و تنظیم چاپ A4 (افقی اگر ستون‌ها بیشتر از ۵ باشد).

import { deflateRawSync } from 'node:zlib';

export interface XlsxTable {
  /** ردیف اول (ادغام‌شده روی همهٔ ستون‌ها). */
  title: string;
  /** ردیف دوم (ادغام‌شده)؛ مثلاً بازه، تعداد و تاریخ خروجی. */
  subtitle?: string;
  headers: string[];
  rows: string[][];
  /** عرض ستون‌ها به واحد کاراکتر؛ پیش‌فرض از طول عنوان ستون. */
  widths?: number[];
  /** نام تب شیت (≤۳۱ کاراکتر، نویسه‌های ممنوع حذف می‌شوند). */
  sheetName?: string;
}

/** ردیف ۱ عنوان، ۲ زیرعنوان، ۳ فاصله، ۴ سرستون، ۵ به بعد داده. */
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;
/** سقف طول متن یک سلول در Excel. */
const MAX_CELL = 32_767;
const DEFAULT_SHEET_NAME = 'پاسخ‌ها';

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** نویسه‌های کنترلی که در XML 1.0 مجاز نیستند (به‌جز tab/LF/CR) حذف می‌شوند. */
function stripControl(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    out += char;
  }
  return out;
}

function xmlText(value: string): string {
  return stripControl(value.slice(0, MAX_CELL)).replace(/[&<>"]/g, (c) => XML_ESCAPES[c]!);
}

/** شمارهٔ ستون (۰ = A) به حروف Excel: 0→A، 25→Z، 26→AA. */
function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function cell(ref: string, style: number, value: string | undefined): string {
  if (!value) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

function safeSheetName(name?: string): string {
  const clean = (name ?? DEFAULT_SHEET_NAME)
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);
  return clean || DEFAULT_SHEET_NAME;
}

function columnWidth(header: string, custom: number | undefined): number {
  if (custom !== undefined) return Math.max(6, Math.min(120, custom));
  // حروف فارسی پهن‌اند؛ کمی سخاوتمندانه‌تر از طول متن.
  return Math.max(14, Math.min(42, header.length + 8));
}

/** استایل‌ها: ۰ پیش‌فرض، ۱ عنوان، ۲ زیرعنوان، ۳ سرستون، ۴ داده، ۵ دادهٔ راه‌راه. */
function stylesXml(): string {
  const alignment = (horizontal: string, extra: Record<string, string> = {}) => {
    const attrs = { horizontal, vertical: 'center', readingOrder: '2', ...extra };
    return `<alignment ${Object.entries(attrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')}/>`;
  };
  const dataAlignment = alignment('right', { vertical: 'top', wrapText: '1' });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="10"/><color rgb="FF0F172A"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Tahoma"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF64748B"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Tahoma"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF217346"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F8F4"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFE2E8F0"/></left>
<right style="thin"><color rgb="FFE2E8F0"/></right>
<top style="thin"><color rgb="FFE2E8F0"/></top>
<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">${alignment('right')}</xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">${alignment('right')}</xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignment('center', { wrapText: '1' })}</xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">${dataAlignment}</xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">${dataAlignment}</xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function sheetXml(table: XlsxTable): string {
  const headers = table.headers.length > 0 ? table.headers : [''];
  const width = headers.length;
  const lastCol = columnName(width - 1);
  const lastRow = Math.max(HEADER_ROW, FIRST_DATA_ROW - 1 + table.rows.length);
  const merge =
    width > 1 ? `<mergeCells count="2"><mergeCell ref="A1:${lastCol}1"/><mergeCell ref="A2:${lastCol}2"/></mergeCells>` : '';

  const cols = headers
    .map(
      (header, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${columnWidth(header, table.widths?.[i])}" customWidth="1"/>`,
    )
    .join('');

  const rowsXml: string[] = [];
  rowsXml.push(`<row r="1" ht="28" customHeight="1">${cell('A1', 1, table.title)}</row>`);
  rowsXml.push(`<row r="2" ht="18" customHeight="1">${cell('A2', 2, table.subtitle ?? '')}</row>`);
  rowsXml.push(`<row r="3" ht="8" customHeight="1"/>`);
  rowsXml.push(
    `<row r="${HEADER_ROW}" ht="26" customHeight="1">${headers
      .map((header, i) => cell(`${columnName(i)}${HEADER_ROW}`, 3, header))
      .join('')}</row>`,
  );
  table.rows.forEach((values, index) => {
    const rowNumber = FIRST_DATA_ROW + index;
    const style = index % 2 === 0 ? 4 : 5;
    rowsXml.push(
      `<row r="${rowNumber}">${values
        .slice(0, width)
        .map((value, i) => cell(`${columnName(i)}${rowNumber}`, style, value))
        .join('')}</row>`,
    );
  });

  // ترتیب عناصر بر اساس اسکیمای CT_Worksheet است (autoFilter پیش از mergeCells).
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0"><pane ySplit="${HEADER_ROW}" topLeftCell="A${FIRST_DATA_ROW}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${FIRST_DATA_ROW}" sqref="A${FIRST_DATA_ROW}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${rowsXml.join('')}</sheetData>
<autoFilter ref="A${HEADER_ROW}:${lastCol}${lastRow}"/>
${merge}
<pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${width > 5 ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

function workbookXml(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xmlText(name)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

/** اجزای بستهٔ XLSX؛ جدا شده تا در تست‌ها بدون باز کردن ZIP بررسی شوند. */
export function xlsxParts(table: XlsxTable): Array<{ name: string; data: Buffer }> {
  const text = (value: string) => Buffer.from(value, 'utf8');
  return [
    { name: '[Content_Types].xml', data: text(CONTENT_TYPES) },
    { name: '_rels/.rels', data: text(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: text(workbookXml(safeSheetName(table.sheetName))) },
    { name: 'xl/_rels/workbook.xml.rels', data: text(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: text(stylesXml()) },
    { name: 'xl/worksheets/sheet1.xml', data: text(sheetXml(table)) },
  ];
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** تاریخ/ساعت ثابت DOS (۲۰۲۰-۰۱-۰۱) تا خروجی برای یک ورودی همیشه یکسان باشد. */
const DOS_TIME = 0;
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;

/** ZIP با deflate (سازگار با Excel/Google Sheets/LibreOffice). */
function zip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(DOS_TIME, 10);
    header.writeUInt16LE(DOS_DATE, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28); // extra
    local.push(header, name, compressed);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(0, 8); // flags
    dir.writeUInt16LE(8, 10); // method
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(compressed.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30); // extra
    dir.writeUInt16LE(0, 32); // comment
    dir.writeUInt16LE(0, 34); // disk
    dir.writeUInt16LE(0, 36); // internal attributes
    dir.writeUInt32LE(0, 38); // external attributes
    dir.writeUInt32LE(offset, 42); // local header offset
    central.push(dir, name);

    offset += header.length + name.length + compressed.length;
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // disk
  end.writeUInt16LE(0, 6); // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment
  return Buffer.concat([...local, ...central, end]);
}

/** فایل .xlsx (Buffer) از جدول؛ بدون وابستگی بیرونی. */
export function buildXlsx(table: XlsxTable): Buffer {
  return zip(xlsxParts(table));
}

