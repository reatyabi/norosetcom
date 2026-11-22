import { formatDateTime } from './format';

/**
 * ابزارهای خروجی چاپی پاسخ‌های فرم: تجزیه‌ی CSV سرور، تبدیلش به ستون‌های جدول نمایشی
 * (زمان ثبت + ستون‌های شخصی‌سازی‌شده) و ساخت سند HTML آماده‌ی چاپ. جدا از صفحه است
 * تا بدون وابستگی به React مستقیم تست شود؛ PDF با «Save as PDF» دیالوگ چاپ مرورگر ساخته می‌شود.
 */

/** تجزیه‌ی CSV سرور (RFC 4180) برای نمایش چاپی؛ BOM اول فایل حذف می‌شود. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** فرار دادن داده‌ی کاربر پیش از گذاشتن در سند چاپی (جلوگیری از تزریق HTML). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

/** سلول چاپی: علامت `'` که فقط برای خنثی‌سازی فرمول در CSV گذاشته شده حذف می‌شود. */
export function printCell(value: string | undefined): string {
  return escapeHtml((value ?? '').replace(/^'(?=[=+\-@\t\r])/, ''));
}

/**
 * ساختار CSV سرور: «شناسه پاسخ»، «زمان ثبت (شمسی)»، «زمان ثبت (UTC)»، «نسخه»، سپس فیلدها.
 * برگه‌ی چاپ فقط همان ستون‌های جدول نمایشی را می‌خواهد: ستون ثابت «زمان ثبت» + فیلدهای
 * شخصی‌سازی‌شده؛ شناسه/UTC/نسخه متادیتاست و چاپ نمی‌شود.
 */
export const CSV_META_COLUMNS = 4;
export const CSV_TIME_COLUMN = 1;
export const CSV_UTC_COLUMN = 2;
export const PRINT_TIME_LABEL = 'زمان ثبت';

/** سطرهای CSV را به ستون‌های جدول نمایشی (ثابت + شخصی‌سازی‌شده، با همان ترتیب) تبدیل می‌کند. */
export function printRows(rows: string[][]): string[][] {
  const [head = [], ...body] = rows;
  if (head.length === 0) return [];
  const keep = head
    .map((_, index) => index)
    .filter((index) => index === CSV_TIME_COLUMN || index >= CSV_META_COLUMNS);
  // عنوان ستون زمان در جدول نمایشی «زمان ثبت» است (نسخه‌ی UTC چاپ نمی‌شود).
  const labels = keep.map((index) => (index === CSV_TIME_COLUMN ? PRINT_TIME_LABEL : (head[index] ?? '')));
  return [
    labels,
    ...body.map((row) =>
      keep.map((index) => {
        if (index !== CSV_TIME_COLUMN) return row[index] ?? '';
        // همان قالب ستون ثابت جدول نمایشی (تاریخ و ساعت شمسی تهران) از روی UTC؛
        // اگر مقدار UTC نامعتبر بود، متن شمسی سرور می‌ماند.
        const utc = row[CSV_UTC_COLUMN];
        const date = utc ? new Date(utc) : null;
        return date && !Number.isNaN(date.getTime()) ? formatDateTime(date) : (row[index] ?? '');
      }),
    ),
  ];
}

/**
 * سند چاپی PDF از سطرهای آماده (خروجی printRows): سربرگ عنوان + زیرنویس بازه/نسخه/فیلتر،
 * جدول راه‌راه با تکرار سربرگ در صفحات و پانویس تاریخ چاپ. جهت و صفحه‌بندی خودکار است.
 */
export function printDocumentHtml(title: string, rows: string[][], subtitle: string): string {
  const [head = [], ...body] = rows;
  const columnCount = Math.max(1, head.length);
  const headerCells = head.map((h) => `<th>${printCell(h)}</th>`).join('');
  const bodyRows =
    body.length === 0
      ? `<tr><td class="empty" colspan="${columnCount}">پاسخی با این فیلترها پیدا نشد.</td></tr>`
      : body
          .map(
            (row) =>
              `<tr>${head
                .map((_, i) => `<td${i === 0 ? ' class="time"' : ''}>${printCell(row[i])}</td>`)
                .join('')}</tr>`,
          )
          .join('');
  // با ستون‌های زیاد چاپ افقی خواناتر است.
  const orientation = columnCount > 5 ? 'landscape' : 'portrait';
  return `<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<title>${printCell(title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 14mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'IRANYekan', Tahoma, 'Segoe UI', sans-serif;
    font-size: 9.5pt; line-height: 1.7; color: #0f172a;
  }
  header {
    display: flex; align-items: flex-end; justify-content: space-between; gap: 6mm;
    padding-bottom: 3mm; margin-bottom: 5mm; border-bottom: 2px solid #0f172a;
  }
  h1 { margin: 0; font-size: 15pt; font-weight: 800; line-height: 1.45; }
  p { margin: 0; }
  .meta { margin-top: 1.5mm; font-size: 8.5pt; color: #475569; }
  .brand { font-size: 8pt; color: #94a3b8; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
  thead { display: table-header-group; }
  tbody tr { break-inside: avoid; page-break-inside: avoid; }
  th, td {
    padding: 1.8mm 2mm; text-align: right; vertical-align: top;
    border-bottom: 1px solid #e2e8f0; overflow-wrap: anywhere; unicode-bidi: plaintext;
  }
  th {
    background: #f1f5f9; font-weight: 700;
    border-top: 1px solid #94a3b8; border-bottom: 1.5px solid #94a3b8;
  }
  th + th, td + td { border-right: 1px solid #eef2f7; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  th:first-child, td.time {
    width: 18%; white-space: nowrap; vertical-align: top;
    font-variant-numeric: tabular-nums; color: #334155;
  }
  td.empty { text-align: center; color: #64748b; padding: 12mm 2mm; }
  footer {
    display: flex; justify-content: space-between; gap: 6mm;
    margin-top: 4mm; padding-top: 2mm; border-top: 1px solid #e2e8f0;
    font-size: 8pt; color: #94a3b8;
  }
</style>
</head>
<body>
<header>
  <div>
    <h1>${printCell(title)}</h1>
    <p class="meta">${printCell(subtitle)}</p>
  </div>
  <p class="brand">نوروفرم</p>
</header>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<footer>
  <span>تاریخ چاپ: ${printCell(formatDateTime(new Date()))}</span>
  <span>${body.length.toLocaleString('fa-IR')} پاسخ</span>
</footer>
</body>
</html>`;
}
