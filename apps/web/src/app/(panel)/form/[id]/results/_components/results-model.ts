/**
 * منطق خالص صفحه‌ی پاسخ‌ها (بدون JSX) — از `results/page.tsx` جدا شد (فاز ۵ ساختار).
 * این ماژول تست‌پذیر است و به React وابسته نیست.
 */
import { formatJalali, parseIsoDate, type JsonValue } from '@noroset/field-engine';

export interface FieldColumn {
  fieldId: string;
  label: string;
  type: string;
  removed: boolean;
}

export interface SubmissionItem {
  id: string;
  createdAt: string;
  versionId: string;
  versionNumber: number;
  answers: Record<string, JsonValue>;
  locked: boolean;
}

/** نگاشت field_id → مقدارهای خام انتخاب‌شده در کارت فیلتر. */
export type ColumnFilters = Record<string, string[]>;

export type Range = 'all' | 'today' | '7' | '30' | '90';

export const fa = (n: number) => n.toLocaleString('fa-IR');

/** ساعت تهران برای خط تاریخ/زمان هدر دراور (تاریخ از `formatDate` می‌آید). */
export const detailClock = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
});

export const RANGES: { value: Range; label: string }[] = [
  { value: 'all', label: 'همهٔ زمان‌ها' },
  { value: 'today', label: 'امروز' },
  { value: '7', label: '۷ روز اخیر' },
  { value: '30', label: '۳۰ روز اخیر' },
  { value: '90', label: '۹۰ روز اخیر' },
];

/** امروز (YYYY-MM-DD) به وقت تهران. */
export function tehranToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}

/** بازه‌ی میلادی (شامل) برای query؛ UI روزها را به وقت تهران می‌برد. */
export function rangeDays(range: Range): { from?: string; to?: string } {
  if (range === 'all') return {};
  const to = tehranToday();
  if (range === 'today') return { from: to, to };
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (Number(range) - 1));
  return { from: d.toISOString().slice(0, 10), to };
}

/** نمایش کوتاه مقدار خام در سلول جدول (برچسب گزینه‌ها در جزئیات پاسخ می‌آید). */
export function cellText(value: JsonValue | undefined, type: string): string {
  if (value === undefined || value === null) return '';
  if (type === 'date' && typeof value === 'string' && parseIsoDate(value) === value) return formatJalali(value);
  if (Array.isArray(value)) return value.map((v) => cellText(v, '')).join('، ');
  if (typeof value === 'number') return fa(value);
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
}

/**
 * خلاصهٔ یک‌خطی یک پاسخ برای فهرست موبایل: تا دو مقدار پرشده از ستون‌های
 * نمایش‌داده‌شده (با برچسب) تا کارت کوتاه ولی گویا باشد.
 */
export function summaryOf(item: SubmissionItem, columns: FieldColumn[]): string {
  return columns
    .map((column) => {
      const text = cellText(item.answers[column.fieldId], column.type);
      return text ? `${column.label}: ${text}` : '';
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');
}

/** ابزارهای گوشهٔ کارت (درگ، حذف، تنظیمات) فقط با هاور/فوکوس/لمس دیده می‌شوند. */
export const cardToolBase =
  'z-20 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-opacity hover:text-foreground disabled:opacity-40';
/** حالت پنهانِ ابزار کارت؛ با هاور گروه، فوکوس داخل کارت یا انتخاب لمسی آشکار می‌شود. */
export const cardToolHidden =
  'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';
/** دستهٔ درگ؛ `touch-none` لازم است تا در لمس هم درگ شروع شود و صفحه اسکرول نکند. */
export const cardGripClass = 'cursor-grab touch-none active:cursor-grabbing';

/** پاسخ با فیلدهای آمادهٔ نمایش (endpoint جزئیات). */
export interface SubmissionDetail extends SubmissionItem {
  fields: Array<{ fieldId: string; label: string; type: string; value: JsonValue | null; display: string }>;
}
