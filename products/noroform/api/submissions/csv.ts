// CSV برای Excel فارسی: UTF-8 با BOM، CRLF، نقل‌قول RFC 4180.

export const UTF8_BOM = '﻿';

/**
 * جلوگیری از CSV/formula injection: سلولی که با = + - @ یا tab/CR شروع شود در Excel فرمول
 * تفسیر می‌شود؛ با یک ' در ابتدا متن می‌ماند (توصیه‌ی OWASP).
 */
function neutralize(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) return value; // عدد خالص (مثلاً -5) فرمول نیست
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function csvCell(value: string): string {
  const v = neutralize(value);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',') + '\r\n';
}
