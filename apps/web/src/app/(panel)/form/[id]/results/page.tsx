'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';
import Link from 'next/link';
import {
  ArrowDownAZ,
  ArrowDownIcon,
  ArrowDownNarrowWide,
  ArrowUpAZ,
  ArrowUpDown,
  ArrowUpIcon,
  ArrowUpNarrowWide,
  ArrowRightIcon,
  Building2Icon,
  CalendarArrowDown,
  CalendarArrowUp,
  CalendarDays,
  Check,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ClockIcon,
  Columns3Icon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  ListFilterIcon,
  LockIcon,
  Layers3Icon,
  LayoutGridIcon,
  LinkIcon,
  MoveDownIcon,
  MoveUpIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  PrinterIcon,
  RotateCcwIcon,
  SaveIcon,
  Search,
  Settings2Icon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Checkbox,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FileTypeIcon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@noroset/ui';
import type { JsonValue } from '@noroset/field-engine';
import { PageHead } from '@/components/page-head';
import { hoverScroll } from '@/components/editor-ui';
import { api, errorMessage, rawApi } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { parseCsv, printDocumentHtml, printRows } from '@/lib/submissions-print';
import { routes, publicResponseUrl } from '@/lib/routes';
import { useTenant } from '../../../session';
import { ItemTableSkeleton } from '../../../_components/page-skeletons';
import type { FormSummary } from '../../forms-shared';

// صفحه‌ی پاسخ‌های یک فرم (docs/architecture.md §8.7): جدول صفحه‌بندی‌شده، فیلتر بازه‌ی تاریخ شمسی،
// نمایش پاسخ تکی در Sheet و خروجی CSV/XLSX و PDF. فقط خواندن؛ داده‌ها از API tenant-scoped می‌آیند.

import { PRINT_STYLES } from './_components/print-styles';
import { ResizeHandle } from './_components/resize-handle';
import { SubmissionList } from './_components/submission-list';
import { CompactMenuSelect, SummaryFieldCard } from './_components/summary-card';
import {
  cardGripClass,
  cardToolBase,
  cardToolHidden,
  cellText,
  detailClock,
  fa,
  rangeDays,
  RANGES,
  type ColumnFilters,
  type FieldColumn,
  type Range,
  type SubmissionDetail,
  type SubmissionItem,
} from './_components/results-model';



interface SubmissionPage {
  columns: FieldColumn[];
  items: SubmissionItem[];
  total: number;
  limit: number;
  offset: number;
  versions: number[];
  quota: { limit: number; used: number };
}


type DetailWidget = 'auto' | 'text' | 'number' | 'currency' | 'progress' | 'tags' | 'table';
type DetailFieldLayout = {
  /** ترتیب فیلد در بدنه (درگ‌اند‌دراپ). */
  order?: number;
  /** ترتیب کارت در بخش خلاصه؛ مستقل از ترتیب بدنه است. */
  summaryOrder?: number;
  span?: 'half' | 'full';
  pinned?: boolean;
  hidden?: boolean;
  widget?: DetailWidget;
};
type DetailLayout = Record<string, DetailFieldLayout>;
interface SavedDetailView {
  id: string;
  name: string;
  layout: DetailLayout;
}

/** فیلدی که در حال کشیده‌شدن است: از بدنه یا از کارت‌های خلاصه. */
interface DetailDragItem {
  source: 'body' | 'summary';
  fieldId: string;
}

/** مقصد رهاکردن درگ؛ نبود `fieldId` یعنی خودِ ناحیه. */
interface DetailDropTarget {
  zone: 'body' | 'summary';
  fieldId?: string;
}

/** یک مقدار یکتا از یک ستون در کارت فیلتر. */
interface ColumnValue {
  /** مقدار خام ذخیره‌شده؛ همین برای فیلتر فرستاده می‌شود. */
  value: string;
  /** نمایش انسانی (تاریخ شمسی، عنوان گزینه، ...). */
  label: string;
  count: number;
}

interface ColumnValues {
  values: ColumnValue[];
  /** بیش از سقف سرور مقدار یکتا وجود دارد. */
  truncated: boolean;
}

/** نگاشت field_id → مقدارهای خام انتخاب‌شده در کارت فیلتر. */

/** فیلتر فعال یک ستون: undefined یعنی بدون فیلتر؛ آرایه‌ی خالی یعنی «هیچ ردیفی». */
type ColumnFilter = string[] | undefined;






/** سقف مقدارهای یکتای هر ستون (هم‌راستا با VALUES_LIMIT سرور). */
const VALUES_LIMIT = 200;

/** برچسب و آیکون گزینه‌های مرتب‌سازی، بر اساس نوع داده‌ی ستون. */
function sortOptionsFor(type: string): {
  asc: { label: string; icon: ReactNode };
  desc: { label: string; icon: ReactNode };
} {
  if (type === 'number' || type === 'rating') {
    return {
      asc: { label: 'کمتر به بیشتر', icon: <ArrowDownNarrowWide /> },
      desc: { label: 'بیشتر به کمتر', icon: <ArrowUpNarrowWide /> },
    };
  }
  if (type === 'date') {
    return {
      asc: { label: 'قدیمی‌ترین', icon: <CalendarArrowDown /> },
      desc: { label: 'جدیدترین', icon: <CalendarArrowUp /> },
    };
  }
  return {
    asc: { label: 'الف تا ی (A→Z)', icon: <ArrowDownAZ /> },
    desc: { label: 'ی تا الف (Z→A)', icon: <ArrowUpAZ /> },
  };
}

/** فیلترها به‌صورت JSON؛ آرایه‌ی خالی می‌ماند چون یعنی «هیچ ردیفی». */
function filtersParam(filters: ColumnFilters): string | undefined {
  return Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined;
}

function filenameOf(res: Response): string | null {
  const header = res.headers.get('content-disposition');
  if (!header) return null;
  const m = /filename=(?:"([^"]+)"|([^;]+))/i.exec(header);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

/**
 * ارتفاعِ در دسترسِ محتوا تا پایینِ جزیره‌ی پنل. جدول/فهرست پاسخ‌ها حتی بدون رکورد
 * تا انتهای صفحه کشیده می‌شود و اسکرول به داخل همان ناحیه می‌رود (نه کل صفحه).
 * اندازه‌گیری از ویوپورت انجام می‌شود تا با رشد محتوا حلقه‌ی اندازه‌گیری نسازد.
 */
function useFillHeight(ref: RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!el.isConnected) return;
      // فاصله‌ی بالای محتوا از ابتدای سند (مستقل از مقدار اسکرول).
      const top = el.getBoundingClientRect().top + window.scrollY;
      // فاصله‌ی پایین محتوا تا لبه‌ی پایین ویوپورت: پدینگ کارت جزیره + حاشیه و خط آن.
      const padded = el.parentElement;
      const card = padded?.parentElement;
      const paddedStyle = padded ? getComputedStyle(padded) : null;
      const cardStyle = card ? getComputedStyle(card) : null;
      const gap =
        (paddedStyle ? parseFloat(paddedStyle.paddingBottom) : 0) +
        (cardStyle ? parseFloat(cardStyle.marginBottom) + parseFloat(cardStyle.borderBottomWidth) : 0);
      const available = document.documentElement.clientHeight - top - gap;
      setHeight(Math.max(320, Math.floor(available)));
    };
    // فریم بعد از چیدمان اول (سرصفحه از پورتال تازه آن‌جا نشسته) و با هر تغییر اندازه.
    const frame = requestAnimationFrame(measure);
    // تغییر ارتفاع کارت جزیره (سرصفحه/بنرها) یعنی فضای بالای محتوا جابه‌جا شده و باید دوباره اندازه گرفت.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    const card = el.parentElement?.parentElement;
    if (card) observer.observe(card);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);
  return height;
}

export default function FormResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tenant = useTenant();
  // با تغییر فضای کاری، وضعیت صفحه از نو ساخته می‌شود.
  return <Results key={`${tenant.tenantId}:${id}`} id={id} />;
}

function Results({ id }: { id: string }) {
  const tenant = useTenant();
  const [form, setForm] = useState<FormSummary | null>(null);
  const [page, setPage] = useState<SubmissionPage | null>(null);
  const [range, setRange] = useState<Range>('all');
  const [version, setVersion] = useState<number | ''>('');
  const [sort, setSort] = useState<string | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({ created_at: 200 });
  const [dragField, setDragField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const colRefs = useRef<Record<string, HTMLTableColElement | null>>({});
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summarySelectedId, setSummarySelectedId] = useState<string | null>(null);
  const [pinnedFieldId, setPinnedFieldId] = useState<string | null>(null);
  const [pinnedFieldIds, setPinnedFieldIds] = useState<string[]>([]);
  // ارتفاع جدول/فهرست تا پایین صفحه (حتی بدون رکورد) تا اسکرول به داخل همین ناحیه برود.
  const fillRef = useRef<HTMLDivElement>(null);
  const fillHeight = useFillHeight(fillRef);

  useEffect(() => {
    document.title = 'پاسخ‌های فرم';
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const storageKey = detailViewsStorageKey(tenant.tenantId, id);
        const rawViews = window.localStorage.getItem(storageKey);
        if (!rawViews) {
          const ids = pinnedListFieldIds(undefined, page?.columns ?? []);
          setPinnedFieldIds(ids);
          setPinnedFieldId(ids[0] ?? null);
          return;
        }
        const parsed: unknown = JSON.parse(rawViews);
        if (!Array.isArray(parsed) || !parsed.every(isSavedDetailView)) {
          throw new Error('ساختار نماهای ذخیره‌شده معتبر نیست.');
        }
        const activeViewId = window.localStorage.getItem(`${storageKey}:active`);
        const activeView = parsed.find((view) => view.id === activeViewId);
        const ids = pinnedListFieldIds(activeView, page?.columns ?? []);
        setPinnedFieldIds(ids);
        setPinnedFieldId(ids[0] ?? null);
      } catch {
        const ids = pinnedListFieldIds(undefined, page?.columns ?? []);
        setPinnedFieldIds(ids);
        setPinnedFieldId(ids[0] ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [id, page?.columns, tenant.tenantId]);

  // عنوان فرم (برای سرصفحه و نام فایل خروجی).
  useEffect(() => {
    let active = true;
    api<FormSummary>(`/noroform/forms/${id}`, { tenantId: tenant.tenantId })
      .then((f) => {
        if (active) setForm(f);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [id, tenant.tenantId]);

  const load = useCallback(
    (isCurrent: () => boolean = () => true) => {
      const { from, to } = rangeDays(range);
      const params = new URLSearchParams({ limit: '50', offset: String(offset) });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (version) params.set('version', String(version));
      if (sort) {
        params.set('sort', sort);
        params.set('dir', dir);
      }
      const serialized = filtersParam(filters);
      if (serialized) params.set('filters', serialized);
      api<SubmissionPage>(`/noroform/forms/${id}/submissions?${params}`, { tenantId: tenant.tenantId })
        .then((next) => {
          if (!isCurrent()) return;
          setPage(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (isCurrent()) setError(errorMessage(err));
        });
    },
    [dir, filters, id, offset, range, sort, tenant.tenantId, version],
  );

  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  const toggleSort = (key: string) => {
    setOffset(0);
    if (sort !== key) {
      setSort(key);
      setDir(key === 'created_at' ? 'desc' : 'asc');
      return;
    }
    if (dir === 'desc') setDir('asc');
    else {
      setSort(null);
      setDir('desc');
    }
  };

  const applyFilter = (fieldId: string, values: ColumnFilter) => {
    setOffset(0);
    setFilters((prev) => {
      const next = { ...prev };
      if (values === undefined) delete next[fieldId];
      else next[fieldId] = values;
      return next;
    });
  };

  const clearFilter = (fieldId: string) => applyFilter(fieldId, undefined);

  const clearAllFilters = () => {
    setOffset(0);
    setFilters({});
  };

  /** مرتب‌سازی مطلق (گزینه‌های کارت فیلتر). */
  const sortBy = (key: string, nextDir: 'asc' | 'desc') => {
    setOffset(0);
    setSort(key);
    setDir(nextDir);
  };

  /** فیلترهای بقیه‌ی ستون‌ها برای محدودکردن لیست مقدارهای یک ستون. */
  const otherFiltersFor = (fieldId: string): string | undefined => {
    const rest = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== fieldId));
    return Object.keys(rest).length > 0 ? JSON.stringify(rest) : undefined;
  };

  const setColumnVisible = (fieldId: string, visible: boolean) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const showAllColumns = () => setHiddenColumns(new Set());

  const visibleColumns = page
    ? page.columns.filter((c) => !hiddenColumns.has(c.fieldId) || c.fieldId === pinnedFieldId)
    : [];

  const userOrderedColumns = [
    ...columnOrder.map((id) => visibleColumns.find((c) => c.fieldId === id)).filter((c): c is FieldColumn => Boolean(c)),
    ...visibleColumns.filter((c) => !columnOrder.includes(c.fieldId)),
  ];
  const pinnedColumn = userOrderedColumns.find((column) => column.fieldId === pinnedFieldId);
  const orderedColumns = pinnedColumn
    ? [pinnedColumn, ...userOrderedColumns.filter((column) => column.fieldId !== pinnedFieldId)]
    : userOrderedColumns;
  const summaryRecord =
    page?.items.find((item) => item.id === summarySelectedId && !item.locked) ??
    page?.items.find((item) => item.id === selectedId && !item.locked) ??
    page?.items.find((item) => !item.locked);
  /** انتخاب/لغو انتخاب پاسخ مبنای کارت‌های خلاصه؛ هم در جدول دسکتاپ و هم در فهرست کارتی موبایل. */
  const toggleSummarySelection = useCallback((submissionId: string) => {
    setSummarySelectedId((current) => (current === submissionId ? null : submissionId));
  }, []);
  const summaryColumnById = new Map((page?.columns ?? []).map((column) => [column.fieldId, column]));
  const summaryCardData = summaryRecord
    ? [
        ...pinnedFieldIds
          .map((fieldId) => summaryColumnById.get(fieldId))
          .filter((column): column is FieldColumn => Boolean(column))
          .map((column) => ({
            field: { fieldId: column.fieldId, label: column.label },
            value: cellText(summaryRecord.answers[column.fieldId], column.type) || '—',
            pinned: true,
          })),
        ...(page?.columns ?? [])
          .filter(
            (column) =>
              !pinnedFieldIds.includes(column.fieldId) &&
              isFinancialValue(summaryRecord.answers[column.fieldId], column.label, column.type),
          )
          .map((column) => ({
            field: { fieldId: column.fieldId, label: column.label },
            value: formatNumericValue(summaryRecord.answers[column.fieldId], cellText(summaryRecord.answers[column.fieldId], column.type), column.label),
            pinned: false,
          })),
      ]
    : [];
  const contactSummaryData = summaryRecord
    ? (page?.columns ?? []).filter(
        (column) =>
          /email/i.test(column.type) ||
          /ایمیل|پست الکترونیک/i.test(column.label) ||
          /phone/i.test(column.type) ||
          /موبایل|تلفن|شماره تماس/i.test(column.label),
      )
    : [];

  /** ستون‌های سفارشی‌شده (فقط نمایش‌داده‌شده‌ها، با ترتیب کاربر) برای فایل خروجی. */
  const exportColumnIds = orderedColumns.map((c) => c.fieldId).join(',');

  /** پارامترهای مشترک خروجی اکسل و PDF: فیلترهای فعال + ستون‌های شخصی‌سازی‌شده. */
  const exportParams = useCallback(() => {
    const { from, to } = rangeDays(range);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (version) params.set('version', String(version));
    if (sort) {
      params.set('sort', sort);
      params.set('dir', dir);
    }
    const serialized = filtersParam(filters);
    if (serialized) params.set('filters', serialized);
    params.set('columns', exportColumnIds);
    return params.toString();
  }, [dir, exportColumnIds, filters, range, sort, version]);

  const reorderColumns = (fromId: string, toId: string) => {
    if (!fromId || fromId === toId) return;
    const ids = orderedColumns.map((c) => c.fieldId);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    setColumnOrder(next);
  };

  const startResize = (key: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const th = e.currentTarget.closest('th');
    const startWidth = th?.offsetWidth ?? 120;
    let latest = startWidth;
    // عرض را مستقیم روی <col> اعمال می‌کنیم تا حین کشیدن کل جدول re-render نشود؛
    // فقط هنگام رهاکردن یک‌بار به state commit می‌شود.
    const onMove = (ev: PointerEvent) => {
      latest = Math.max(72, Math.min(720, startWidth + (startX - ev.clientX)));
      const col = colRefs.current[key];
      if (col) col.style.width = `${latest}px`;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      setColumnWidths((w) => ({ ...w, [key]: latest }));
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /** دانلود خروجی جدولی: XLSX استایل‌دار یا CSV کامل (هر دو با فیلتر و ستون‌های فعلی). */
  const exportFile = useCallback(
    async (kind: 'xlsx' | 'csv') => {
      if (!form || exporting) return;
      setExporting(true);
      setError(null);
      try {
        const res = await rawApi(`/noroform/forms/${id}/submissions/export.${kind}?${exportParams()}`, {
          tenantId: tenant.tenantId,
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filenameOf(res) ?? `noroform-${form.slug}-responses.${kind}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setExporting(false);
      }
    },
    [exporting, exportParams, form, id, tenant.tenantId],
  );

  const exportPdf = useCallback(async () => {
    if (!form || exportingPdf) return;
    // پنجره پیش از درخواست باز می‌شود تا مرورگر آن را popup ناخواسته حساب نکند.
    const win = window.open('', '_blank');
    if (!win) {
      setError('مرورگر پنجره‌ی چاپ را مسدود کرد؛ برای خروجی PDF اجازه‌ی پنجره‌ی بازشو را بدهید.');
      return;
    }
    setExportingPdf(true);
    setError(null);
    try {
      win.document.write(
        '<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>آماده‌سازی PDF…</title></head><body style="font-family:Tahoma,sans-serif;padding:24px">در حال آماده‌سازی خروجی PDF…</body></html>',
      );
      const res = await rawApi(`/noroform/forms/${id}/submissions/export.csv?${exportParams()}`, {
        tenantId: tenant.tenantId,
      });
      const parsed = parseCsv(await res.text());
      // ستون‌های برگه‌ی چاپ = همان ستون‌های جدول نمایشی (زمان ثبت + سفارشی‌شده‌ها) بدون متادیتا.
      const rows = printRows(parsed);
      const activeFilters = Object.keys(filters).length;
      const subtitle = [
        `بازه: ${RANGES.find((r) => r.value === range)?.label ?? ''}`,
        version ? `نسخهٔ ${fa(version)}` : null,
        activeFilters > 0 ? `${fa(activeFilters)} فیلتر فعال` : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ');
      win.document.open();
      win.document.write(printDocumentHtml(`پاسخ‌های ${form.title}`, rows, subtitle));
      win.document.close();
      win.focus();
      // کمی صبر تا جدول چیده شود، بعد دیالوگ چاپ (Save as PDF) باز می‌شود.
      window.setTimeout(() => {
        if (!win.closed) win.print();
      }, 150);
    } catch (err) {
      win.close();
      setError(errorMessage(err));
    } finally {
      setExportingPdf(false);
    }
  }, [exportParams, exportingPdf, filters, form, id, range, tenant.tenantId, version]);

  const filtered = range !== 'all' || version !== '' || Object.keys(filters).length > 0;
  const updatePinnedFields = useCallback((fieldIds: string[]) => {
    setPinnedFieldIds(fieldIds);
    setPinnedFieldId(fieldIds[0] ?? null);
  }, []);
  const openSubmission = useCallback((submissionId: string) => {
    setSummarySelectedId(submissionId);
    setSelectedId(submissionId);
  }, []);

  return (
    <div
      ref={fillRef}
      className="flex min-h-0 flex-col gap-6"
      style={fillHeight ? { minHeight: fillHeight } : undefined}
    >
      <PageHead>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:grid-cols-[auto_minmax(10rem,1.1fr)_repeat(2,minmax(0,1fr))]">
            <Button
              nativeButton={false}
              render={<Link href={routes.form.home} />}
              variant="ghost"
              size="xs"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowRightIcon />
              نوروفرم
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                پاسخ‌های {form?.title ?? ''}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {page ? `${tenant.name} · ${fa(page.total)} پاسخ · این ماه ${fa(page.quota.used)} از ${fa(page.quota.limit)}` : tenant.name}
              </p>
            </div>
            {summaryCardData.slice(0, 2).map((card, index) => (
              <SummaryFieldCard
                key={card.field.fieldId}
                field={card.field}
                value={card.value}
                index={index}
              />
            ))}
          </div>
          {summaryCardData.length > 2 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {summaryCardData.slice(2).map((card, index) => (
                <SummaryFieldCard
                  key={card.field.fieldId}
                  field={card.field}
                  value={card.value}
                  index={index + 2}
                />
              ))}
            </div>
          ) : null}
        </div>
      </PageHead>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!page && !error ? (
        <ItemTableSkeleton count={8} />
      ) : page ? (
        <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2">
          <Card className="min-h-0 min-w-0 shrink-0 gap-0 py-0 md:flex-1">
            {/* هدر جدول — کنترل‌های سرصفحه‌ی صفحه (فیلترهای کلی، ستون‌ها و خروجی اکسل) این‌جا می‌نشینند. */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 max-md:gap-1 max-md:border-b-0 max-md:px-2 max-md:py-1.5">
              <div className="flex items-center gap-1">
                <CompactMenuSelect
                  ariaLabel="بازهٔ تاریخ"
                  icon={<CalendarDays />}
                  value={range}
                  active={range !== 'all'}
                  options={RANGES.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(value) => {
                    setRange(value as Range);
                    setOffset(0);
                  }}
                />
                <CompactMenuSelect
                  ariaLabel="نسخه"
                  icon={<Layers3Icon />}
                  value={String(version)}
                  active={version !== ''}
                  options={[
                    { value: '', label: 'همهٔ نسخه‌ها' },
                    ...(page?.versions ?? []).map((item) => ({ value: String(item), label: `نسخه ${fa(item)}` })),
                  ]}
                  onChange={(value) => {
                    setVersion(value === '' ? '' : Number(value));
                    setOffset(0);
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                {/* در موبایل جدول (و هدر ستون‌ها) دیده نمی‌شود؛ فیلتر/مرتب‌سازی ستونی از این شیت می‌آید. */}
                <MobileSortFilterSheet
                  formId={id}
                  columns={orderedColumns}
                  sort={sort}
                  dir={dir}
                  filters={filters}
                  range={range}
                  version={version}
                  otherFiltersFor={otherFiltersFor}
                  onSortBy={sortBy}
                  onFilter={applyFilter}
                  onClearFilters={clearAllFilters}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="md:w-auto md:gap-1.5 md:px-2 md:text-xs"
                        aria-label="انتخاب ستون‌ها"
                        title="انتخاب ستون‌ها"
                      />
                    }
                  >
                    <Columns3Icon className="size-3.5" />
                    <span className="hidden md:inline">ستون‌ها</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-48 text-xs [&_[data-slot=dropdown-menu-checkbox-item]]:min-h-7 [&_[data-slot=dropdown-menu-checkbox-item]]:py-1 [&_[data-slot=dropdown-menu-checkbox-item]]:text-xs [&_[data-slot=dropdown-menu-item]]:min-h-7 [&_[data-slot=dropdown-menu-item]]:py-1 [&_[data-slot=dropdown-menu-item]]:text-xs"
                  >
                    {(page?.columns ?? []).map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.fieldId}
                        checked={!hiddenColumns.has(c.fieldId)}
                        onCheckedChange={(checked) => setColumnVisible(c.fieldId, checked)}
                        className="min-h-7 py-1 text-xs [&_svg]:size-3"
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {(page?.columns ?? []).length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="min-h-7 py-1 text-xs" onClick={showAllColumns}>
                          نمایش همهٔ ستون‌ها
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* خروجی اکسل: آیکن رنگی؛ منو دو فرمت دارد (XLSX استایل‌دار یا CSV کامل). */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        aria-label="خروجی اکسل"
                        title="خروجی اکسل: XLSX راست‌چین یا CSV"
                        disabled={!page || page.total === 0 || exporting || exportingPdf}
                      />
                    }
                  >
                    {exporting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <span className="relative flex items-center justify-center">
                        <FileTypeIcon type="excel" className="size-4" />
                        <ChevronDownIcon className="absolute -bottom-1 -start-1 size-2.5 text-muted-foreground" />
                      </span>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-56 text-xs [&_[data-slot=dropdown-menu-item]]:min-h-8 [&_[data-slot=dropdown-menu-item]]:py-1.5 [&_[data-slot=dropdown-menu-item]]:text-xs"
                  >
                    <DropdownMenuItem className="text-xs [&_svg]:size-3.5" onClick={() => void exportFile('xlsx')}>
                      <FileTypeIcon type="excel" className="size-3.5" />
                      <span className="flex flex-col">
                        <span>اکسل (XLSX)</span>
                        <span className="text-[11px] text-muted-foreground">راست‌چین و استایل‌دار، مطابق ستون‌های جدول</span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs [&_svg]:size-3.5" onClick={() => void exportFile('csv')}>
                      <FileTypeIcon type="csv" className="size-3.5" />
                      <span className="flex flex-col">
                        <span>CSV</span>
                        <span className="text-[11px] text-muted-foreground">دادهٔ کامل با شناسه، UTC و نسخه</span>
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="max-md:size-7"
                        aria-label="خروجی PDF"
                        onClick={() => void exportPdf()}
                        disabled={!page || page.total === 0 || exporting || exportingPdf}
                      />
                    }
                  >
                    {exportingPdf ? <Spinner className="size-3.5" /> : <FileTypeIcon type="pdf" className="size-4" />}
                  </TooltipTrigger>
                  <TooltipContent>خروجی PDF (ستون‌های نمایش‌داده‌شده)</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {/* جدول فقط از md به بالا؛ بدنه در همین کارت اسکرول می‌شود و اسکرول‌بار فقط با هاور دیده می‌شود. */}
            <ScrollArea
              className={cn(
                'hidden min-h-0 min-w-0 flex-1 md:flex [&_[data-slot=scroll-area-content]]:min-w-0 [&_[data-slot=table-container]]:min-w-0 [&_[data-slot=table-container]]:max-w-full',
                hoverScroll,
              )}
            >
            <Table className="table-fixed min-w-0 max-w-full">
              <colgroup>
                <col
                  ref={(el) => {
                    colRefs.current['created_at'] = el;
                  }}
                  style={{ width: columnWidths['created_at'] ? `${columnWidths['created_at']}px` : undefined }}
                />
                {orderedColumns.map((c) => (
                  <col
                    key={c.fieldId}
                    ref={(el) => {
                      colRefs.current[c.fieldId] = el;
                    }}
                    style={{ width: columnWidths[c.fieldId] ? `${columnWidths[c.fieldId]}px` : undefined }}
                  />
                ))}
              </colgroup>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-9 px-2">
                    <span className="sr-only">انتخاب پاسخ برای کارت‌های خلاصه</span>
                  </TableHead>
                  <TableHead
                    className="relative"
                    aria-sort={sort === 'created_at' ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <TimeHead sort={sort} dir={dir} onSort={toggleSort} onSortBy={sortBy} />
                    <ResizeHandle onPointerDown={startResize('created_at')} />
                  </TableHead>
                  {orderedColumns.map((c) => (
                    <TableHead
                      key={c.fieldId}
                      aria-sort={sort === c.fieldId ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={cn('relative transition-colors duration-150', c.removed && 'text-muted-foreground/60', dragOverField === c.fieldId && dragField !== c.fieldId && 'bg-primary/10')}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverField !== c.fieldId) setDragOverField(c.fieldId);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOverField((v) => (v === c.fieldId ? null : v));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = e.dataTransfer.getData('text/plain') || dragField || '';
                        reorderColumns(from, c.fieldId);
                        setDragField(null);
                        setDragOverField(null);
                      }}
                    >
                      <FieldHead
                        formId={id}
                        column={c}
                        sort={sort}
                        dir={dir}
                        activeValues={filters[c.fieldId]}
                        range={range}
                        version={version}
                        otherFilters={otherFiltersFor(c.fieldId)}
                        dragging={dragField === c.fieldId}
                        onSort={toggleSort}
                        onSortBy={sortBy}
                        onFilter={applyFilter}
                        onClearFilter={clearFilter}
                        onDragStart={() => setDragField(c.fieldId)}
                        onDragEnd={() => setDragField(null)}
                      />
                      <ResizeHandle onPointerDown={startResize(c.fieldId)} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(3, orderedColumns.length + 2)} className="py-6 text-center text-sm text-muted-foreground">
                      {filtered ? 'پاسخی با این فیلترها پیدا نشد.' : 'هنوز پاسخی ثبت نشده؛ وقتی کسی فرم را پر کند، پاسخ‌ها همین‌جا می‌آیند.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  page.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn('cursor-pointer', summaryRecord?.id === item.id && 'bg-muted/40')}
                      onClick={() => openSubmission(item.id)}
                    >
                      <TableCell className="px-2" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={summaryRecord?.id === item.id}
                          disabled={item.locked}
                          aria-label={`انتخاب پاسخ ${formatDateTime(item.createdAt)} برای کارت‌های خلاصه`}
                          onCheckedChange={(checked) => setSummarySelectedId(checked === true ? item.id : null)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openSubmission(item.id)}
                          className="inline-flex min-w-0 max-w-full items-center gap-1.5 hover:underline"
                        >
                          {item.locked ? <LockIcon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                          <span className="truncate tabular-nums">{formatDateTime(item.createdAt)}</span>
                        </button>
                      </TableCell>
                      {item.locked ? (
                        <TableCell colSpan={Math.max(1, orderedColumns.length)} className="text-muted-foreground">
                          قفل — برای دیدن، پلن را ارتقا دهید
                        </TableCell>
                      ) : (
                        orderedColumns.map((c) => (
                          <TableCell key={c.fieldId} className="truncate">
                            {cellText(item.answers[c.fieldId], c.type)}
                          </TableCell>
                        ))
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </ScrollArea>
          </Card>

          {/* موبایل: هر پاسخ یک کارت کم‌ارتفاع و قابل انتخاب؛ محتوای آن با همان دراور جزئیات باز می‌شود. */}
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            {page.items.length === 0 ? (
              <SubmissionList
                items={page.items}
                columns={orderedColumns}
                pinnedFieldId={pinnedFieldId}
                filtered={filtered}
                selectedId={summaryRecord?.id ?? null}
                onToggleSelected={toggleSummarySelection}
                onSelect={openSubmission}
              />
            ) : (
              <ScrollArea className={cn('min-h-0 flex-1', hoverScroll)}>
                <SubmissionList
                  items={page.items}
                  columns={orderedColumns}
                  pinnedFieldId={pinnedFieldId}
                  filtered={filtered}
                  selectedId={summaryRecord?.id ?? null}
                  onToggleSelected={toggleSummarySelection}
                  onSelect={openSubmission}
                />
              </ScrollArea>
            )}
          </div>

          {page.total > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {fa(page.offset + 1)}–{fa(page.offset + page.items.length)} از {fa(page.total)} پاسخ
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page.offset === 0} onClick={() => setOffset(Math.max(0, page.offset - page.limit))}>
                  قبلی
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page.offset + page.items.length >= page.total}
                  onClick={() => setOffset(page.offset + page.limit)}
                >
                  بعدی
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {contactSummaryData.length > 0 ? (
        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {contactSummaryData.map((column) => {
            const value = cellText(summaryRecord?.answers[column.fieldId], column.type);
            if (!value) return null;
            const email = /email/i.test(column.type) || /ایمیل|پست الکترونیک/i.test(column.label);
            if (email) {
              return (
                <a
                  key={column.fieldId}
                  href={`mailto:${encodeURIComponent(value)}`}
                  className="max-w-full truncate underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                  dir="auto"
                >
                  {column.label}: {value}
                </a>
              );
            }
            const phone = toLatinDigits(value).replace(/[^\d+]/g, '');
            return (
              <span key={column.fieldId} className="inline-flex items-center gap-2">
                <a
                  href={`tel:${phone}`}
                  className="truncate underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                  dir="auto"
                >
                  {column.label}: {value}
                </a>
                <a
                  href={`sms:${phone}`}
                  className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                >
                  پیامک
                </a>
              </span>
            );
          })}
        </footer>
      ) : null}

      <SubmissionDetailSheet
        formId={id}
        formTitle={form?.title}
        submissionId={selectedId}
        submissionIds={page?.items.map((item) => item.id) ?? []}
        open={selectedId !== null}
        onNavigate={openSubmission}
        onPinnedFieldsChange={updatePinnedFields}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}



function TimeHead({
  sort,
  dir,
  onSort,
  onSortBy,
}: {
  sort: string | null;
  dir: 'asc' | 'desc';
  onSort: (key: string) => void;
  onSortBy: (key: string, dir: 'asc' | 'desc') => void;
}) {
  const [open, setOpen] = useState(false);
  const active = sort === 'created_at';
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onSort('created_at')} className="inline-flex items-center gap-1 hover:text-foreground">
        زمان ثبت
        {active ? (dir === 'asc' ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />) : null}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="گزینه‌های مرتب‌سازی زمان ثبت"
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            />
          }
        >
          <ArrowUpDown className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-1">
          <SortRow
            icon={<CalendarArrowUp />}
            label="جدیدترین"
            active={active && dir === 'desc'}
            onClick={() => {
              onSortBy('created_at', 'desc');
              setOpen(false);
            }}
          />
          <SortRow
            icon={<CalendarArrowDown />}
            label="قدیمی‌ترین"
            active={active && dir === 'asc'}
            onClick={() => {
              onSortBy('created_at', 'asc');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FieldHead({
  formId,
  column,
  sort,
  dir,
  activeValues,
  range,
  version,
  otherFilters,
  dragging,
  onSort,
  onSortBy,
  onFilter,
  onClearFilter,
  onDragStart,
  onDragEnd,
}: {
  formId: string;
  column: FieldColumn;
  sort: string | null;
  dir: 'asc' | 'desc';
  /** فیلتر فعال همین ستون؛ undefined یعنی بدون فیلتر. */
  activeValues: ColumnFilter;
  range: Range;
  version: number | '';
  otherFilters?: string;
  dragging: boolean;
  onSort: (key: string) => void;
  onSortBy: (key: string, dir: 'asc' | 'desc') => void;
  onFilter: (fieldId: string, values: ColumnFilter) => void;
  onClearFilter: (fieldId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = sort === column.fieldId;
  const filtering = activeValues !== undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span
          draggable
          title="جابه‌جایی ستون"
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', column.fieldId);
            e.dataTransfer.effectAllowed = 'move';
            // تصویر درگ را سرستون کامل می‌کنیم تا دنبال‌کردن آن روان‌تر باشد.
            const th = e.currentTarget.closest('th');
            if (th) e.dataTransfer.setDragImage(th, 16, 16);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className={cn(
            'flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing',
            dragging && 'opacity-40',
          )}
        >
          <GripVerticalIcon className="size-3.5" />
        </span>
        <button type="button" onClick={() => onSort(column.fieldId)} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
          <span className="truncate">{column.label}</span>
          {column.removed ? <span className="text-[10px] font-normal opacity-70">(حذف‌شده)</span> : null}
          {active ? (dir === 'asc' ? <ArrowUpIcon className="size-3 shrink-0" /> : <ArrowDownIcon className="size-3 shrink-0" />) : null}
        </button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`فیلتر ${column.label}`}
                className={cn(
                  'shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  filtering && 'text-primary',
                )}
              />
            }
          >
            <ListFilterIcon className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            <ColumnFilterCard
              formId={formId}
              column={column}
              open={open}
              active={activeValues}
              sort={sort}
              dir={dir}
              range={range}
              version={version}
              otherFilters={otherFilters}
              onSortBy={onSortBy}
              onApply={(values) => {
                onFilter(column.fieldId, values);
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
        {filtering && (
          <button
            type="button"
            aria-label="پاک کردن فیلتر"
            onClick={() => onClearFilter(column.fieldId)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function SortRow({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-foreground transition-colors hover:bg-muted',
        active && 'text-primary',
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {active ? <Check className="size-3.5 shrink-0" /> : null}
    </button>
  );
}

/** ردیف چک‌باکس کارت فیلتر؛ چک‌باکس تصویری است و کل ردیف نقش checkbox دارد. */
function FilterCheckRow({
  label,
  count,
  checked,
  indeterminate,
  disabled,
  strong,
  onToggle,
}: {
  label: string;
  count?: number;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  strong?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onToggle(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs outline-none transition-colors hover:bg-muted focus-visible:bg-muted',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <Checkbox checked={checked} indeterminate={indeterminate} tabIndex={-1} aria-hidden className="pointer-events-none" />
      <span className={cn('flex-1 truncate', strong && 'font-medium')}>{label}</span>
      {count !== undefined ? <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{fa(count)}</span> : null}
    </div>
  );
}


type ColumnFilterCardProps = {
  formId: string;
  column: FieldColumn;
  open: boolean;
  active: ColumnFilter;
  sort: string | null;
  dir: 'asc' | 'desc';
  range: Range;
  version: number | '';
  otherFilters?: string;
  onApply: (values: ColumnFilter) => void;
  onSortBy: (key: string, dir: 'asc' | 'desc') => void;
  onClose: () => void;
};

/**
 * مقدارها، جست‌وجو و انتخاب‌های کارت به پارامترهای درخواست گره خورده‌اند؛ پس با هر تغییر
 * (ستون، بازه، نسخه، فیلتر ستون‌های دیگر یا بازشدن دوباره) بدنه با `key` تازه mount می‌شود
 * تا وضعیت قبلی نشت نکند و setState همگام در effect لازم نباشد.
 */
function ColumnFilterCard(props: ColumnFilterCardProps) {
  const resetKey = [
    props.formId,
    props.column.fieldId,
    props.range,
    props.version,
    props.otherFilters ?? '',
    props.active === undefined ? '*' : props.active.join('\u0001'),
    props.open ? 'open' : 'closed',
  ].join('|');
  return <ColumnFilterCardBody key={resetKey} {...props} />;
}

function ColumnFilterCardBody({
  formId,
  column,
  open,
  active,
  sort,
  dir,
  range,
  version,
  otherFilters,
  onApply,
  onSortBy,
  onClose,
}: ColumnFilterCardProps) {
  const tenant = useTenant();
  const [values, setValues] = useState<ColumnValue[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(open);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /** null یعنی همه انتخاب شده‌اند. */
  const [checked, setChecked] = useState<Set<string> | null>(null);

  // هر بار بازشدن، مقدارهای یکتای ستون (با فیلترهای بقیه‌ی ستون‌ها) از نو خوانده می‌شوند.
  useEffect(() => {
    if (!open) return;
    let current = true;
    const { from, to } = rangeDays(range);
    const params = new URLSearchParams({ fieldId: column.fieldId });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (version !== '') params.set('version', String(version));
    if (otherFilters) params.set('filters', otherFilters);
    api<ColumnValues>(`/noroform/forms/${formId}/submissions/filter-values?${params}`, { tenantId: tenant.tenantId })
      .then((data) => {
        if (!current) return;
        setValues(data.values);
        setTruncated(data.truncated);
        setChecked(active === undefined ? null : new Set(active));
      })
      .catch((err: unknown) => {
        if (current) setError(errorMessage(err));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [active, column.fieldId, formId, open, otherFilters, range, tenant.tenantId, version]);

  const visible = useMemo(() => {
    if (!values) return [];
    const q = search.trim().toLocaleLowerCase('fa');
    if (!q) return values;
    return values.filter((v) => v.label.toLocaleLowerCase('fa').includes(q) || v.value.toLowerCase().includes(q));
  }, [search, values]);

  const isChecked = (value: string) => checked === null || checked.has(value);
  const allChecked = visible.length > 0 && visible.every((v) => isChecked(v.value));
  const someChecked = !allChecked && visible.some((v) => isChecked(v.value));

  /** اگر دوباره همه انتخاب شوند، به حالت «همه» برمی‌گردد تا فیلتری فرستاده نشود. */
  const commit = (next: Set<string>) => {
    setChecked(!truncated && values && next.size === values.length ? null : next);
  };

  const toggle = (value: string, next: boolean) => {
    const base = checked === null ? new Set((values ?? []).map((v) => v.value)) : new Set(checked);
    if (next) base.add(value);
    else base.delete(value);
    commit(base);
  };

  const toggleAll = (next: boolean) => {
    const base = checked === null ? new Set((values ?? []).map((v) => v.value)) : new Set(checked);
    for (const v of visible) {
      if (next) base.add(v.value);
      else base.delete(v.value);
    }
    commit(base);
  };

  const options = sortOptionsFor(column.type);
  const sortActive = sort === column.fieldId;

  return (
    <div className="flex flex-col text-xs">
      <div className="flex flex-col gap-0.5 p-1">
        <SortRow icon={options.asc.icon} label={options.asc.label} active={sortActive && dir === 'asc'} onClick={() => onSortBy(column.fieldId, 'asc')} />
        <SortRow icon={options.desc.icon} label={options.desc.label} active={sortActive && dir === 'desc'} onClick={() => onSortBy(column.fieldId, 'desc')} />
      </div>

      <div className="mx-2 border-t border-border/60" />
      <button
        type="button"
        onClick={() => onApply(undefined)}
        disabled={active === undefined}
        className="mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <XIcon className="size-3.5 shrink-0" />
        <span className="truncate">پاک کردن فیلتر «{column.label}»</span>
      </button>
      <div className="mx-2 border-t border-border/60" />

      <div className="p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجو…"
            aria-label={`جست‌وجوی مقدار ${column.label}`}
            className="h-7 ps-7 text-xs"
          />
        </div>
      </div>

      <div className="mx-2 border-t border-border/60" />
      <div className="max-h-56 min-h-24 overflow-y-auto p-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-4" />
          </div>
        ) : error ? (
          <p className="px-2 py-3 text-destructive">{error}</p>
        ) : values ? (
          <>
            <FilterCheckRow label="(انتخاب همه)" checked={allChecked} indeterminate={someChecked} disabled={visible.length === 0} strong onToggle={toggleAll} />
            {visible.map((v) => (
              <FilterCheckRow
                key={v.value}
                label={v.label || '(خالی)'}
                count={v.count}
                checked={isChecked(v.value)}
                onToggle={(next) => toggle(v.value, next)}
              />
            ))}
            {visible.length === 0 ? (
              <p className="px-2 py-3 text-muted-foreground">
                {values.length === 0 ? 'مقداری برای این ستون ثبت نشده.' : 'موردی با این جست‌وجو پیدا نشد.'}
              </p>
            ) : null}
            {truncated ? (
              <p className="px-2 py-2 text-[10px] text-muted-foreground">
                فقط {fa(VALUES_LIMIT)} مقدار اول نمایش داده می‌شود؛ برای بقیه از جست‌وجو استفاده کنید.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mx-2 border-t border-border/60" />
      <div className="flex justify-end gap-2 p-2">
        <Button size="xs" disabled={loading || !values} onClick={() => onApply(checked === null ? undefined : [...checked])}>
          تأیید
        </Button>
        <Button size="xs" variant="secondary" onClick={onClose}>
          لغو
        </Button>
      </div>
    </div>
  );
}

/**
 * در موبایل جدول و هدر ستون‌ها (با فیلتر/مرتب‌سازی) دیده نمی‌شود؛ این شیت پایینی
 * همان امکانات را می‌دهد: مرتب‌سازی زمان ثبت، انتخاب ستون برای کارت فیلتر مقدارها،
 * و پاک کردن همهٔ فیلترها. خود کارت فیلتر همان `ColumnFilterCard` جدول است.
 */
function MobileSortFilterSheet({
  formId,
  columns,
  sort,
  dir,
  filters,
  range,
  version,
  otherFiltersFor,
  onSortBy,
  onFilter,
  onClearFilters,
}: {
  formId: string;
  columns: FieldColumn[];
  sort: string | null;
  dir: 'asc' | 'desc';
  filters: ColumnFilters;
  range: Range;
  version: number | '';
  otherFiltersFor: (fieldId: string) => string | undefined;
  onSortBy: (key: string, dir: 'asc' | 'desc') => void;
  onFilter: (fieldId: string, values: ColumnFilter) => void;
  onClearFilters: () => void;
}) {
  const [open, setOpen] = useState(false);
  /** ستون باز در حالت فیلتر؛ null یعنی فهرست ستون‌ها. */
  const [activeField, setActiveField] = useState<string | null>(null);
  const activeColumn = activeField ? (columns.find((column) => column.fieldId === activeField) ?? null) : null;
  const activeCount = Object.keys(filters).length;
  const timeDesc = sort === 'created_at' && dir === 'desc';
  const timeAsc = sort === 'created_at' && dir === 'asc';

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // با بستن شیت، پنل ستون دوباره از فهرست شروع شود.
        if (!next) setActiveField(null);
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="secondary"
            size="icon"
            className="relative md:hidden"
            aria-label="فیلتر و مرتب‌سازی"
            title="فیلتر و مرتب‌سازی ستون‌ها"
          />
        }
      >
        <ListFilterIcon />
        {activeCount > 0 ? (
          <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground tabular-nums">
            {fa(activeCount)}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent side="bottom" dir="rtl" className="max-h-[85dvh] gap-0 overflow-y-auto p-0 [&>div]:gap-0">
        <SheetHeader className="border-b border-border px-3 py-2 pe-10">
          <SheetTitle className="text-sm">{activeColumn ? `فیلتر ${activeColumn.label}` : 'فیلتر و مرتب‌سازی'}</SheetTitle>
          <SheetDescription className="text-xs">
            {activeColumn
              ? 'مقدارهای این ستون یا ترتیب نمایش آن را تغییر دهید.'
              : 'ستون را انتخاب کنید تا مقدارهایش یا ترتیب نمایشش را تغییر دهید.'}
          </SheetDescription>
        </SheetHeader>
        <div className="p-2">
          {activeColumn ? (
            <ColumnFilterCard
              formId={formId}
              column={activeColumn}
              open={open}
              active={filters[activeColumn.fieldId]}
              sort={sort}
              dir={dir}
              range={range}
              version={version}
              otherFilters={otherFiltersFor(activeColumn.fieldId)}
              onSortBy={onSortBy}
              onApply={(values) => {
                onFilter(activeColumn.fieldId, values);
                setActiveField(null);
              }}
              onClose={() => setActiveField(null)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <p className="px-2 text-[10px] font-medium text-muted-foreground">مرتب‌سازی بر اساس زمان ثبت</p>
                <div className="flex gap-1 px-2">
                  <Button size="xs" variant={timeDesc ? 'secondary' : 'outline'} onClick={() => onSortBy('created_at', 'desc')}>
                    جدیدترین
                  </Button>
                  <Button size="xs" variant={timeAsc ? 'secondary' : 'outline'} onClick={() => onSortBy('created_at', 'asc')}>
                    قدیمی‌ترین
                  </Button>
                </div>
              </div>
              <div className="flex flex-col border-t border-border pt-1">
                <p className="px-2 text-[10px] font-medium text-muted-foreground">فیلتر و ترتیب ستون‌ها</p>
                {columns.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">این فرم فیلد دیگری برای فیلتر ندارد.</p>
                ) : (
                  columns.map((column) => {
                    const filter = filters[column.fieldId];
                    const sorted = sort === column.fieldId;
                    return (
                      <button
                        key={column.fieldId}
                        type="button"
                        onClick={() => setActiveField(column.fieldId)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-xs transition-colors hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {column.label}
                          {column.removed ? ' (حذف‌شده)' : ''}
                        </span>
                        {filter !== undefined ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary tabular-nums">
                            {filter.length > 0 ? `${fa(filter.length)} مقدار` : 'بدون نتیجه'}
                          </span>
                        ) : null}
                        {sorted ? (
                          dir === 'asc' ? (
                            <ArrowUpIcon className="size-3.5 shrink-0 text-primary" aria-label="صعودی" />
                          ) : (
                            <ArrowDownIcon className="size-3.5 shrink-0 text-primary" aria-label="نزولی" />
                          )
                        ) : null}
                        <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                      </button>
                    );
                  })
                )}
              </div>
              {activeCount > 0 ? (
                <Button size="xs" variant="ghost" className="self-start" onClick={onClearFilters}>
                  <XIcon className="size-3.5" />
                  پاک کردن همهٔ فیلترها
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubmissionDetailSheet({
  formId,
  formTitle,
  submissionId,
  submissionIds,
  open,
  onNavigate,
  onPinnedFieldsChange,
  onClose,
}: {
  formId: string;
  formTitle?: string;
  submissionId: string | null;
  submissionIds: string[];
  open: boolean;
  onNavigate: (id: string) => void;
  onPinnedFieldsChange: (fieldIds: string[]) => void;
  onClose: () => void;
}) {
  const tenant = useTenant();
  const [detailResult, setDetailResult] = useState<{
    submissionId: string;
    detail?: SubmissionDetail;
    error?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'answers' | 'metadata'>('answers');
  const [showEmpty, setShowEmpty] = useState(false);
  const [layout, setLayout] = useState<DetailLayout>({});
  const [savedViews, setSavedViews] = useState<SavedDetailView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [viewName, setViewName] = useState('');
  const [viewError, setViewError] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DetailDragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DetailDropTarget | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  /** کارتی که با لمس انتخاب شده تا ابزارهای گوشه‌اش دیده شوند. */
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  /** ساخت/کپی لینک مشاهده‌ی بیرونی همین پاسخ. */
  const [shareState, setShareState] = useState<'idle' | 'working' | 'copied'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  /** اندازهٔ کاغذ پیش‌نمایش چاپ؛ `null` یعنی پنل بسته است. */
  const [printSize, setPrintSize] = useState<'A4' | 'A5' | null>(null);
  const printHostRef = useRef<HTMLDivElement | null>(null);
  /** کارتِ شناورِ درگ؛ موقعیتش در هر حرکت مستقیم روی DOM نوشته می‌شود تا رندر سنگین نشود. */
  const dragChipRef = useRef<HTMLDivElement | null>(null);
  /** درگِ در جریان با اشاره‌گر (موس/لمس/قلم). */
  const pointerDrag = useRef<{
    item: DetailDragItem;
    startX: number;
    startY: number;
    pointerId: number;
    started: boolean;
  } | null>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const dragStartTime = useRef(0);
  const storageKey = detailViewsStorageKey(tenant.tenantId, formId);
  const detail = detailResult?.submissionId === submissionId ? detailResult.detail ?? null : null;
  const error = detailResult?.submissionId === submissionId ? detailResult.error ?? null : null;

  useEffect(() => {
    if (!submissionId) return;
    let active = true;
    api<SubmissionDetail>(`/noroform/forms/${formId}/submissions/${submissionId}`, { tenantId: tenant.tenantId })
      .then((d) => {
        if (!active) return;
        setDetailResult({ submissionId, detail: d });
      })
      .catch((err: unknown) => {
        if (active) setDetailResult({ submissionId, error: errorMessage(err) });
      });
    return () => {
      active = false;
    };
  }, [formId, submissionId, tenant.tenantId]);

  /** لینک مشاهده‌ی بیرونی پاسخ را می‌سازد و در کلیپ‌بورد می‌گذارد. */
  const shareResponse = async () => {
    if (!submissionId || shareState === 'working') return;
    setShareState('working');
    setShareError(null);
    setSharedKey(null);
    try {
      const link = await api<{ token: string; expiresAt: string; authMode: 'link' | 'key' | 'otp'; key: string | null }>(
        `/noroform/forms/${formId}/submissions/${submissionId}/response-link`,
        { method: 'POST', tenantId: tenant.tenantId },
      );
      const localhost = window.location.hostname.endsWith('localhost');
      const host = process.env.NOROSET_NOROFORM_HOST ?? (localhost ? 'n8f.localhost' : 'n8f.ir');
      const url = publicResponseUrl(host, link.token, localhost ? window.location.port || undefined : undefined);
      await navigator.clipboard.writeText(url);
      setSharedKey(link.key);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch (err) {
      setShareState('idle');
      setShareError(errorMessage(err));
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
          setSavedViews([]);
          setSelectedViewId('');
          setLayout({});
          setViewName('');
          setViewError(null);
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isSavedDetailView)) {
          throw new Error('ساختار نماهای ذخیره‌شده معتبر نیست.');
        }
        setSavedViews(parsed);
        const activeViewId = window.localStorage.getItem(`${storageKey}:active`) ?? '';
        const activeView = parsed.find((view) => view.id === activeViewId);
        setSelectedViewId(activeView?.id ?? '');
        setLayout(activeView?.layout ?? {});
        setViewName(activeView?.name ?? '');
        setViewError(null);
      } catch (err) {
        setViewError(err instanceof Error ? err.message : 'خواندن نماهای ذخیره‌شده ممکن نشد.');
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const currentIndex = submissionId ? submissionIds.indexOf(submissionId) : -1;
  const previousId = currentIndex > 0 ? submissionIds[currentIndex - 1] : undefined;
  const nextId = currentIndex >= 0 ? submissionIds[currentIndex + 1] : undefined;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }
      const key = event.key.toLocaleLowerCase();
      if (key === 'j' && nextId) {
        event.preventDefault();
        onNavigate(nextId);
      } else if (key === 'k' && previousId) {
        event.preventDefault();
        onNavigate(previousId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextId, onNavigate, open, previousId]);

  /** باز کردن پنل تمام‌صفحهٔ پیش‌نمایش چاپ روی همین صفحه (بدون تب/پنجرهٔ جدید). */
  const openPrintView = useCallback((size: 'A4' | 'A5') => {
    setPrintError(null);
    setPrintSize(size);
  }, []);

  // پیش‌نمایش: کلونِ محتوای پاسخ داخل پنل، قفل اسکرول صفحه و فعال‌سازی چاپ فقط برای پنل.
  useEffect(() => {
    if (!printSize) return;
    const host = printHostRef.current;
    const source = document.querySelector<HTMLElement>('.submission-detail-print');
    if (!host || !source) {
      queueMicrotask(() => setPrintError('محتوای پاسخ برای چاپ پیدا نشد.'));
      return;
    }
    host.replaceChildren();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.dataset.printSize = printSize;
    host.append(clone);
    document.body.dataset.printPreview = 'on';
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      delete document.body.dataset.printPreview;
      document.body.style.overflow = previousOverflow;
      host.replaceChildren();
    };
  }, [printSize]);

  useEffect(() => {
    if (!printSize) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPrintSize(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [printSize]);

  const orderedFields = useMemo(() => {
    if (!detail) return [];
    return detail.fields
      .map((field, index) => ({ field, index, config: layout[field.fieldId] }))
      .sort((a, b) => (a.config?.order ?? a.index) - (b.config?.order ?? b.index))
      .map((item, index) => ({ ...item, index }));
  }, [detail, layout]);

  const identityField = detail?.fields.find((field) => isIdentityLabel(field.label));
  const heroFieldId = identityField?.fieldId;

  /**
   * کارت‌های بخش خلاصه: فیلدهای سنجاق‌شده (شامل فیلد هویتی) به‌همراه
   * خلاصه‌های مالی خودکار. ترتیب با `summaryOrder` مستقل از ترتیب بدنه ذخیره می‌شود.
   */
  const summaryCards = useMemo(() => {
    if (!detail) return [];
    type Card = { field: SubmissionDetail['fields'][number]; value: string; pinned: boolean };
    const positions = new Map(detail.fields.map((field, index) => [field.fieldId, index]));
    const cards = new Map<string, Card>();
    for (const { field } of orderedFields) {
      if (!isPinnedField(field.fieldId, heroFieldId, layout)) continue;
      cards.set(field.fieldId, { field, value: field.display || '—', pinned: true });
    }
    for (const field of detail.fields) {
      if (cards.has(field.fieldId)) continue;
      // حذف دستی کارت (pinned === false) آن را برای این نما کنار می‌گذارد.
      if (layout[field.fieldId]?.pinned !== undefined) continue;
      if (!isFinancialField(field)) continue;
      cards.set(field.fieldId, {
        field,
        value: formatNumericValue(field.value, field.display, field.label),
        pinned: false,
      });
    }
    return [...cards.values()].sort((a, b) => {
      const aOrder = layout[a.field.fieldId]?.summaryOrder;
      const bOrder = layout[b.field.fieldId]?.summaryOrder;
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== undefined && bOrder === undefined) return -1;
      if (aOrder === undefined && bOrder !== undefined) return 1;
      return (positions.get(a.field.fieldId) ?? 0) - (positions.get(b.field.fieldId) ?? 0);
    });
  }, [detail, heroFieldId, layout, orderedFields]);

  const pinnedFieldIds = summaryCards.filter((card) => card.pinned).map((card) => card.field.fieldId);
  const pinnedFieldIdsKey = pinnedFieldIds.join(',');
  const contactFields = detail?.fields.filter(
    (field) =>
      /email/i.test(field.type) ||
      /ایمیل|پست الکترونیک/i.test(field.label) ||
      /phone/i.test(field.type) ||
      /موبایل|تلفن|شماره تماس/i.test(field.label),
  ) ?? [];
  const visibleFields = orderedFields.filter(
    ({ field, config }) =>
      !config?.hidden &&
      (showEmpty || !isEmptyField(field)),
  );
  const groupedFields = groupDetailFields(visibleFields, Object.values(layout).some((field) => field.order !== undefined));
  const complexLayout = Boolean(
    detail?.fields.some(
      (field) =>
        /image|file|table|signature|repeater|upload/i.test(field.type) ||
        isStructuredValue(field),
    ),
  );

  useEffect(() => {
    if (detail) onPinnedFieldsChange(pinnedFieldIdsKey ? pinnedFieldIdsKey.split(',') : []);
  }, [detail, onPinnedFieldsChange, pinnedFieldIdsKey]);

  /** چیدمان فعلی با نمای ذخیره‌شده (یا حالت خودکار) تفاوت دارد؟ */
  const isLayoutDirty = useMemo(() => {
    const savedLayout = savedViews.find((view) => view.id === selectedViewId)?.layout ?? {};
    const keys = new Set([...Object.keys(savedLayout), ...Object.keys(layout)]);
    for (const key of keys) {
      const saved = savedLayout[key] ?? {};
      const current = layout[key] ?? {};
      if (
        saved.order !== current.order ||
        saved.summaryOrder !== current.summaryOrder ||
        saved.span !== current.span ||
        saved.pinned !== current.pinned ||
        saved.hidden !== current.hidden ||
        saved.widget !== current.widget
      ) {
        return true;
      }
    }
    return false;
  }, [layout, savedViews, selectedViewId]);

  /** برچسب فیلدِ در حال درگ برای نشانگر شناور. */
  const dragLabel = useMemo(() => {
    if (!dragItem || !detail) return '';
    return detail.fields.find((field) => field.fieldId === dragItem.fieldId)?.label ?? '';
  }, [detail, dragItem]);

  const updateField = (fieldId: string, patch: DetailFieldLayout) => {
    setLayout((current) => ({ ...current, [fieldId]: { ...current[fieldId], ...patch } }));
  };

  /** ترتیب بدنه را ذخیره می‌کند؛ `order` همهٔ فیلدهای داده‌شده بازنویسی می‌شود. */
  const persistFieldOrder = (fieldIds: string[]) => {
    setLayout((current) => {
      const next = { ...current };
      fieldIds.forEach((fieldId, order) => {
        next[fieldId] = { ...next[fieldId], order };
      });
      return next;
    });
  };

  const reorderFields = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = orderedFields.map(({ field }) => field.fieldId);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    persistFieldOrder(next);
  };

  const moveField = (fieldId: string, direction: -1 | 1) => {
    const ids = orderedFields.map(({ field }) => field.fieldId);
    const index = ids.indexOf(fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    next.splice(index, 1);
    next.splice(target, 0, fieldId);
    persistFieldOrder(next);
  };

  /** ترتیب کارت‌های خلاصه را جدا از ترتیب بدنه ذخیره می‌کند. */
  const persistSummaryOrder = (fieldIds: string[]) => {
    setLayout((current) => {
      const next = { ...current };
      fieldIds.forEach((fieldId, summaryOrder) => {
        next[fieldId] = { ...next[fieldId], summaryOrder };
      });
      return next;
    });
  };

  const reorderSummary = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = summaryCards.map((card) => card.field.fieldId);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    persistSummaryOrder(next);
  };

  /** کپی فیلد بدنه در بخش خلاصه (سنجاق)؛ فیلد در بدنه باقی می‌ماند. */
  const addToSummary = (fieldId: string, beforeId?: string) => {
    setLayout((current) => {
      const next = { ...current };
      const ids = summaryCards
        .map((card) => card.field.fieldId)
        .filter((id) => id !== fieldId);
      const at = beforeId ? ids.indexOf(beforeId) : -1;
      if (at >= 0) ids.splice(at, 0, fieldId);
      else ids.push(fieldId);
      // کارت‌های آمده از خودکار هم صریح سنجاق می‌شوند تا ترتیبشان پایدار بماند.
      ids.forEach((id, summaryOrder) => {
        next[id] = { ...next[id], pinned: true, summaryOrder };
      });
      return next;
    });
  };

  /** حذف کارت از خلاصه بدون حذف فیلد از بدنه. */
  const removeFromSummary = (fieldId: string) => {
    setLayout((current) => {
      const next = { ...current };
      const entry = { ...current[fieldId], pinned: false };
      delete entry.summaryOrder;
      next[fieldId] = entry;
      return next;
    });
  };

  /** کارت/ناحیهٔ زیر نشانگر را به مقصد رهاکردن تبدیل می‌کند. */
  const resolveDropTarget = useCallback((x: number, y: number): DetailDropTarget | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const card = element.closest<HTMLElement>('[data-detail-card]');
    if (card) {
      return {
        zone: card.dataset.detailCard === 'summary' ? 'summary' : 'body',
        fieldId: card.dataset.fieldId,
      };
    }
    const zone = element.closest<HTMLElement>('[data-detail-zone]')?.dataset.detailZone;
    if (zone === 'summary' || zone === 'body') return { zone };
    return null;
  }, []);

  /** اسکرول خودکار نواحی اسکرول‌شونده وقتی نشانگر نزدیک لبه‌هاست. */
  const scrollDuringDrag = (x: number, y: number) => {
    const edge = 48;
    document.querySelectorAll<HTMLElement>('[data-detail-scroll]').forEach((scroller) => {
      const rect = scroller.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
      if (y - rect.top < edge) scroller.scrollTop -= 12;
      else if (rect.bottom - y < edge) scroller.scrollTop += 12;
    });
  };

  const commitDrop = (item: DetailDragItem, target: DetailDropTarget | null) => {
    if (!target) return;
    if (target.zone === 'summary') {
      if (item.source === 'summary') {
        if (target.fieldId && target.fieldId !== item.fieldId) reorderSummary(item.fieldId, target.fieldId);
        else if (!target.fieldId) {
          const ids = summaryCards.map((card) => card.field.fieldId).filter((id) => id !== item.fieldId);
          persistSummaryOrder([...ids, item.fieldId]);
        }
        return;
      }
      // فیلد بدنه روی خلاصه = کپی به خلاصه، در همان جای کارتِ زیر نشانگر.
      addToSummary(item.fieldId, target.fieldId);
      return;
    }
    if (item.source === 'summary') {
      // کشیدن کارت خلاصه به بدنه = حذف از خلاصه؛ فیلد در بدنه می‌ماند.
      removeFromSummary(item.fieldId);
      return;
    }
    if (target.fieldId && target.fieldId !== item.fieldId) reorderFields(item.fieldId, target.fieldId);
  };

  /** شروع درگ با اشاره‌گر؛ تا آستانهٔ حرکت، درگ فعال نمی‌شود تا لمس ساده کلیک بماند. */
  const startPointerDrag = (event: ReactPointerEvent<HTMLElement>, item: DetailDragItem) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current = {
      item,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      started: false,
    };
  };

  const movePointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = pointerDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.started) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5) return;
      current.started = true;
      setDragItem(current.item);
      setDragPoint({ x: event.clientX, y: event.clientY });
      if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
    } else if (dragChipRef.current) {
      // جابه‌جایی نشانگر بدون state جدید (فقط یک‌بار در شروع درگ رندر می‌شود).
      dragChipRef.current.style.left = `${event.clientX + 14}px`;
      dragChipRef.current.style.top = `${event.clientY}px`;
    }
    event.preventDefault();
    const next = resolveDropTarget(event.clientX, event.clientY);
    setDropTarget((currentTarget) => {
      if (currentTarget === next) return currentTarget;
      if (
        currentTarget &&
        next &&
        currentTarget.zone === next.zone &&
        currentTarget.fieldId === next.fieldId
      ) {
        return currentTarget;
      }
      return next;
    });
    scrollDuringDrag(event.clientX, event.clientY);
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLElement>, commit: boolean) => {
    const current = pointerDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pointerDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.started && commit) commitDrop(current.item, resolveDropTarget(event.clientX, event.clientY));
    setDragItem(null);
    setDropTarget(null);
    setDragPoint(null);
  };

  const persistViews = (views: SavedDetailView[]): boolean => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(views));
      setSavedViews(views);
      setViewError(null);
      return true;
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'ذخیرهٔ نما ممکن نشد.');
      return false;
    }
  };

  const persistActiveView = (id: string): boolean => {
    try {
      if (id) window.localStorage.setItem(`${storageKey}:active`, id);
      else window.localStorage.removeItem(`${storageKey}:active`);
      return true;
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'ذخیرهٔ نمای فعال ممکن نشد.');
      return false;
    }
  };

  const saveView = (asNew = false): boolean => {
    const name = viewName.trim() || DEFAULT_DETAIL_VIEW_NAME;
    if (!name) {
      setViewError('برای ذخیرهٔ نما، نام وارد کنید.');
      return false;
    }
    const existing = asNew ? undefined : savedViews.find((view) => view.id === selectedViewId);
    const view: SavedDetailView = existing
      ? { ...existing, name, layout: { ...layout } }
      : { id: crypto.randomUUID(), name, layout: { ...layout } };
    const next = existing
      ? savedViews.map((item) => (item.id === existing.id ? view : item))
      : [...savedViews, view];
    if (!persistViews(next)) return false;
    setSelectedViewId(view.id);
    setViewName(name);
    return persistActiveView(view.id);
  };

  const selectView = (id: string) => {
    setSelectedViewId(id);
    persistActiveView(id);
    const view = savedViews.find((item) => item.id === id);
    setLayout(view?.layout ?? {});
    setViewName(view?.name ?? '');
    setViewError(null);
  };

  const resetToAuto = () => {
    setSelectedViewId('');
    persistActiveView('');
    setLayout({});
    setViewName('');
    setShowEmpty(false);
    setViewError(null);
  };

  const deleteSelectedView = () => {
    if (!selectedViewId) return;
    if (!persistViews(savedViews.filter((view) => view.id !== selectedViewId))) return;
    resetToAuto();
  };

  /** ذخیرهٔ چیدمان فعلی در نمای انتخاب‌شده یا ساخت نمای تازه. */
  const saveLayout = (asNew = false) => saveView(asNew);

  /** بازگرداندن چیدمان به آخرین وضعیت ذخیره‌شده (لغو تغییرهای ذخیره‌نشده). */
  const discardLayoutChanges = () => {
    const activeView = savedViews.find((view) => view.id === selectedViewId);
    setLayout(activeView?.layout ?? {});
    setViewName(activeView?.name ?? '');
    setViewError(null);
  };

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragStartY.current = event.clientY;
    dragCurrentY.current = event.clientY;
    dragStartTime.current = event.timeStamp;
    setDragY(0);
    setIsClosing(false);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    dragCurrentY.current = event.clientY;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture can be released by the browser before this event.
    }

    const distance = dragCurrentY.current - dragStartY.current;
    const elapsed = Math.max(1, event.timeStamp - dragStartTime.current);
    const velocity = distance / elapsed;
    if (distance > 70 || (distance > 30 && velocity > 0.45)) {
      setIsClosing(true);
      setDragY(window.innerHeight);
      window.setTimeout(closeDrawer, 200);
      return;
    }
    // کشیدن به بالا یا ضربهٔ بدون جابه‌جایی کاری نمی‌کند؛ دراور همیشه تا ۸۰٪ صفحه باز است.
    setDragY(0);
  };

  const closeDrawer = () => {
    setDragY(0);
    setIsClosing(false);
    setIsDragging(false);
    onClose();
  };

  const loading = Boolean(submissionId && !detail && !error);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeDrawer()}>
      <SheetContent
        side="right"
        dir="rtl"
        showCloseButton={false}
        className={`submission-detail-drawer data-[side=right]:w-full ${complexLayout ? 'data-[side=right]:sm:max-w-5xl' : 'data-[side=right]:sm:max-w-2xl'} gap-0 p-0`}
        style={
          {
            '--submission-drawer-drag-y': `${Math.max(0, dragY)}px`,
            '--submission-drawer-drag-transition': isDragging
              ? 'translate 250ms cubic-bezier(0, 0, 0, 1), transform none'
              : isClosing
                ? 'translate 250ms cubic-bezier(0, 0, 0, 1), transform 200ms ease-in'
                : 'translate 250ms cubic-bezier(0, 0, 0, 1), transform 250ms cubic-bezier(0, 0, 0, 1)',
          } as CSSProperties
        }
      >
        <div
          className="submission-detail-print flex min-h-0 flex-1 flex-col overflow-hidden [&_button_svg]:size-3.5"
        >
          {/* دستگیرهٔ بصری؛ فقط برای کشیدن به پایین (بستن) است، نه دکمه؛ ارتفاع دراور ثابت ۸۰٪ صفحه است. */}
          <div
            className="flex h-6 shrink-0 touch-none select-none items-center justify-center sm:hidden"
            data-print-hide
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <span
              className={cn(
                'h-1 w-10 rounded-full bg-muted-foreground/30 transition-colors duration-150',
                isDragging && 'bg-muted-foreground/50',
              )}
            />
          </div>
          <div
            className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 border-b border-border px-2 py-1.5 sm:flex-nowrap sm:gap-x-2 sm:px-3 sm:py-2"
            dir="ltr"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-0.5" data-print-hide>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="بازگشت به فهرست پاسخ‌ها"
                title="بازگشت"
                onClick={closeDrawer}
              >
                <ArrowRightIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="پاسخ جدیدتر"
                title="پاسخ جدیدتر (K)"
                disabled={!previousId}
                onClick={() => previousId && onNavigate(previousId)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="پاسخ قدیمی‌تر"
                title="پاسخ قدیمی‌تر (J)"
                disabled={!nextId}
                onClick={() => nextId && onNavigate(nextId)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="ساخت و کپی لینک پاسخ"
                title="ساخت لینک مشاهده‌ی بیرونی و کپی آن"
                disabled={!detail || detail.locked || shareState === 'working'}
                onClick={() => void shareResponse()}
              >
                {shareState === 'copied' ? <Check className="size-3.5" /> : <LinkIcon className="size-3.5" />}
              </Button>
              {shareError ? (
                <span className="max-w-40 truncate text-[10px] text-destructive" title={shareError} dir="rtl">
                  {shareError}
                </span>
              ) : null}
              {sharedKey ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground" dir="ltr" title="کلید دسترسی این لینک">
                  {sharedKey}
                </span>
              ) : null}
              {detail && !detail.locked ? (
                <>
                  <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                  {/* ابزارهای تغییر نما، کنار دکمهٔ پرینت؛ در موبایل فقط آیکن. */}
                  <span className="hidden shrink-0 text-xs text-muted-foreground md:inline" dir="rtl">
                    نمای پاسخ
                  </span>
                  <CompactMenuSelect
                    ariaLabel="نمای پاسخ"
                    icon={<LayoutGridIcon />}
                    value={selectedViewId}
                    active={selectedViewId !== ''}
                    options={[
                      { value: '', label: 'خودکار' },
                      ...savedViews.map((view) => ({ value: view.id, label: view.name })),
                    ]}
                    onChange={selectView}
                  />
                  {selectedViewId || isLayoutDirty ? (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="بازگشت به چیدمان خودکار"
                      title="بازگشت به چیدمان خودکار"
                      onClick={resetToAuto}
                    >
                      <RotateCcwIcon className="size-3.5" />
                    </Button>
                  ) : null}
                  {isLayoutDirty ? (
                    <>
                      <Input
                        value={viewName}
                        onChange={(event) => setViewName(event.target.value)}
                        placeholder={DEFAULT_DETAIL_VIEW_NAME}
                        aria-label="نام نما"
                        className="h-7 min-w-0 basis-28 flex-1 text-xs sm:max-w-44"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        aria-label="ذخیرهٔ چیدمان"
                        title="ذخیرهٔ چیدمان"
                        onClick={() => saveLayout()}
                      >
                        <SaveIcon className="size-3.5" />
                      </Button>
                      {selectedViewId ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          aria-label="ذخیره به‌عنوان نمای تازه"
                          title="ذخیره به‌عنوان نمای تازه"
                          onClick={() => saveLayout(true)}
                        >
                          <PlusIcon className="size-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="لغو تغییرهای ذخیره‌نشده"
                        title="لغو تغییرها"
                        onClick={discardLayoutChanges}
                      >
                        <Undo2Icon className="size-3.5" />
                      </Button>
                      {selectedViewId ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label="حذف این نما"
                          title="حذف این نما"
                          onClick={deleteSelectedView}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button type="button" size="icon-xs" variant="ghost" aria-label="خروجی PDF" title="خروجی PDF">
                      <PrinterIcon className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="min-w-24 p-1 text-xs">
                  <DropdownMenuItem className="min-h-7 py-1 text-xs" onClick={() => openPrintView('A4')}>
                    PDF، کاغذ A4
                  </DropdownMenuItem>
                  <DropdownMenuItem className="min-h-7 py-1 text-xs" onClick={() => openPrintView('A5')}>
                    PDF، کاغذ A5
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="min-w-0 flex-1 basis-40 sm:basis-auto" dir="rtl">
              <SheetTitle className="truncate text-sm font-medium">{formTitle || 'جزئیات پاسخ'}</SheetTitle>
              {detail ? (
                <SheetDescription className="mt-0.5 flex items-center gap-x-2 overflow-hidden text-[11px] leading-4 whitespace-nowrap">
                  <span className="hidden min-w-0 items-center gap-1 sm:inline-flex">
                    <Building2Icon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{tenant.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <CalendarDays className="size-3 shrink-0" aria-hidden />
                    {formatDate(detail.createdAt)}
                  </span>
                  <span className="hidden items-center gap-1 whitespace-nowrap sm:inline-flex">
                    <ClockIcon className="size-3 shrink-0" aria-hidden />
                    {detailClock.format(new Date(detail.createdAt))}
                  </span>
                  <span className="hidden whitespace-nowrap sm:inline">نسخه {fa(detail.versionNumber)}</span>
                  {currentIndex >= 0 ? (
                    <span className="whitespace-nowrap">
                      {fa(currentIndex + 1)} از {fa(submissionIds.length)}
                    </span>
                  ) : null}
                  {identityField?.display ? (
                    <span className="min-w-0 truncate font-medium text-foreground" dir="auto">
                      {identityField.display}
                    </span>
                  ) : null}
                </SheetDescription>
              ) : (
                <SheetDescription className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[11px]">
                  <Building2Icon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{tenant.name}</span>
                </SheetDescription>
              )}
            </div>
          </div>
          <section
            aria-label="خلاصهٔ پاسخ"
            data-detail-zone="summary"
            data-detail-scroll
            className={cn(
              'detail-summary max-h-[34dvh] shrink-0 overflow-y-auto border-b border-border px-2 py-1.5 transition-colors sm:max-h-[45dvh] sm:px-3 sm:py-2',
              dragItem?.source === 'body' && 'bg-primary/[0.04]',
              dropTarget?.zone === 'summary' && !dropTarget.fieldId && 'bg-primary/[0.08]',
            )}
            data-print-hide={summaryCards.length === 0 ? '' : undefined}
            onPointerDown={(event) => {
              if (!(event.target as HTMLElement).closest('[data-detail-card]')) setActiveCardId(null);
            }}
          >
            <p
              className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"
              data-print-hide
            >
              <span className="font-medium">خلاصه</span>
              <span className="hidden truncate sm:inline">
                {dragItem
                  ? dragItem.source === 'body'
                    ? 'برای افزودن این فیلد به خلاصه رها کنید'
                    : 'برای تغییر ترتیب، روی کارت دیگر رها کنید'
                  : 'فیلد بدنه را اینجا رها کنید تا به خلاصه اضافه شود'}
              </span>
            </p>
            {summaryCards.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {summaryCards.map(({ field, value }, index) => (
                  <SummaryFieldCard
                    key={field.fieldId}
                    field={field}
                    value={value}
                    index={index}
                    draggable
                    active={activeCardId === field.fieldId}
                    dragging={dragItem?.source === 'summary' && dragItem.fieldId === field.fieldId}
                    dropTarget={
                      dropTarget?.zone === 'summary' &&
                      dropTarget.fieldId === field.fieldId &&
                      dragItem?.fieldId !== field.fieldId
                    }
                    onActivate={() => setActiveCardId(field.fieldId)}
                    onRemove={() => removeFromSummary(field.fieldId)}
                    onDragStart={(event) =>
                      startPointerDrag(event, { source: 'summary', fieldId: field.fieldId })
                    }
                    onDragMove={movePointerDrag}
                    onDragEnd={(event) => finishPointerDrag(event, true)}
                  />
                ))}
              </div>
            ) : (
              <p
                className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-[11px] text-muted-foreground"
                data-print-hide
              >
                هنوز کارتی در خلاصه نیست؛ فیلدی را از بدنهٔ پاسخ بکشید و اینجا رها کنید.
              </p>
            )}
          </section>

          {viewError ? (
            <div className="shrink-0 border-b border-border px-2 py-1 sm:px-3" data-print-hide>
              <Alert variant="destructive">
                <AlertDescription>{viewError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div
            className="submission-detail-content flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3"
            data-detail-scroll
          >
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner className="size-4" />
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {printError ? (
              <Alert variant="destructive" data-print-hide>
                <AlertDescription>{printError}</AlertDescription>
              </Alert>
            ) : null}

            {detail ? (
              detail.locked ? (
                <Alert>
                  <LockIcon className="size-3.5 text-muted-foreground" />
                  <AlertDescription>این پاسخ بالای سقف پلن است؛ برای دیدن، پلن را ارتقا دهید.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-border py-2" data-print-hide>
                    <div className="flex gap-1.5" role="tablist" aria-label="بخش‌های پاسخ">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'answers'}
                        onClick={() => setActiveTab('answers')}
                        className={cn(
                          'rounded-md px-2 py-1 text-xs',
                          activeTab === 'answers' ? 'bg-muted font-normal text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                        )}
                      >
                        پاسخ‌ها
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'metadata'}
                        onClick={() => setActiveTab('metadata')}
                        className={cn(
                          'rounded-md px-2 py-1 text-xs',
                          activeTab === 'metadata' ? 'bg-muted font-normal text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                        )}
                      >
                        متادیتا
                      </button>
                    </div>
                    {activeTab === 'answers' ? (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox checked={showEmpty} onCheckedChange={(checked) => setShowEmpty(checked === true)} />
                        نمایش پاسخ‌های خالی
                      </label>
                    ) : null}
                  </div>
                  {activeTab === 'metadata' ? (
                    <dl className="grid gap-2 py-3 sm:grid-cols-2">
                      <MetadataValue label="شناسهٔ پاسخ" value={detail.id} />
                      <MetadataValue label="زمان ثبت" value={formatDateTime(detail.createdAt)} />
                      <MetadataValue label="شمارهٔ نسخه" value={fa(detail.versionNumber)} />
                      <MetadataValue label="شناسهٔ نسخه" value={detail.versionId} />
                      <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
                        مدت تکمیل، IP و مشخصات دستگاه در دادهٔ فعلی پاسخ ارائه نمی‌شوند.
                      </p>
                    </dl>
                  ) : (
                    <>
                      {groupedFields.length ? (
                        <div
                          data-detail-zone="body"
                          data-detail-scroll
                          onPointerDown={(event) => {
                            if (!(event.target as HTMLElement).closest('[data-detail-card]')) {
                              setActiveCardId(null);
                            }
                          }}
                          className={cn(
                            'flex flex-col gap-4 rounded-lg transition-colors',
                            dropTarget?.zone === 'body' && !dropTarget.fieldId && 'bg-primary/[0.06]',
                          )}
                        >
                          {groupedFields.map(({ title, fields }, sectionIndex) => (
                            <section key={title} data-detail-section-index={sectionIndex}>
                              <h3 className="mb-1.5 text-xs font-normal text-muted-foreground">{title}</h3>
                              <div className="grid grid-cols-2 gap-2">
                                {fields.map(({ field, config }, fieldIndex) => (
                                  <article
                                    key={field.fieldId}
                                    data-detail-card="body"
                                    data-detail-card-index={fieldIndex}
                                    data-field-id={field.fieldId}
                                    onPointerDown={(event) => {
                                      // ابزارهای گوشه نباید حالت انتخاب کارت را عوض کنند.
                                      if ((event.target as HTMLElement).closest('[data-card-tools]')) return;
                                      setActiveCardId(field.fieldId);
                                    }}
                                    className={cn(
                                      'group relative flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-2.5 transition-[border-color,box-shadow,opacity]',
                                      (config?.span ?? autoSpan(field)) === 'full' && 'col-span-2',
                                      dragItem?.source === 'body' && dragItem.fieldId === field.fieldId && 'opacity-50',
                                      dropTarget?.zone === 'body' &&
                                        dropTarget.fieldId === field.fieldId &&
                                        dragItem?.fieldId !== field.fieldId &&
                                        'border-primary/60 ring-2 ring-primary/20',
                                    )}
                                  >
                                    {/* گوشهٔ کارت: دستهٔ درگ + همهٔ ابزارهای چیدمان، فقط با هاور/فوکوس/لمس. */}
                                    <span
                                      aria-hidden
                                      data-card-tools
                                      title="برای جابه‌جایی فیلد بکشید"
                                      className={cn(
                                        'absolute -start-1.5 -top-1.5 rounded-full',
                                        cardToolBase,
                                        cardGripClass,
                                        activeCardId === field.fieldId ? 'opacity-100' : cardToolHidden,
                                      )}
                                      data-print-hide
                                      onPointerDown={(event) =>
                                        startPointerDrag(event, { source: 'body', fieldId: field.fieldId })
                                      }
                                      onPointerMove={movePointerDrag}
                                      onPointerUp={(event) => finishPointerDrag(event, true)}
                                      onPointerCancel={(event) => finishPointerDrag(event, false)}
                                    >
                                      <GripVerticalIcon className="size-3" />
                                    </span>
                                    <div
                                      data-card-tools
                                      className={cn(
                                        'absolute -end-1.5 -top-1.5 z-20 flex items-center gap-0.5 rounded-full bg-card/85 p-0.5 backdrop-blur-sm transition-opacity sm:gap-1',
                                        activeCardId === field.fieldId ? 'opacity-100' : cardToolHidden,
                                      )}
                                      data-print-hide
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          config?.pinned
                                            ? removeFromSummary(field.fieldId)
                                            : addToSummary(field.fieldId)
                                        }
                                        aria-label={
                                          config?.pinned
                                            ? `حذف ${field.label} از خلاصه`
                                            : `افزودن ${field.label} به خلاصه`
                                        }
                                        title={config?.pinned ? 'حذف از خلاصه' : 'افزودن به خلاصه'}
                                        aria-pressed={Boolean(config?.pinned)}
                                        className={cn(cardToolBase, config?.pinned && 'text-primary')}
                                      >
                                        {config?.pinned ? (
                                          <PinOffIcon className="size-3" />
                                        ) : (
                                          <PinIcon className="size-3" />
                                        )}
                                      </button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger
                                          render={
                                            <button
                                              type="button"
                                              aria-label={`نوع نمایش ${field.label}`}
                                              title="نوع نمایش"
                                              className={cn(
                                                cardToolBase,
                                                config?.widget &&
                                                  config.widget !== 'auto' &&
                                                  'text-primary',
                                              )}
                                            >
                                              <EyeIcon className="size-3" />
                                            </button>
                                          }
                                        />
                                        <DropdownMenuContent
                                          align="end"
                                          className="min-w-40 p-1 text-xs [&_[data-slot=dropdown-menu-item]]:min-h-7 [&_[data-slot=dropdown-menu-item]]:py-1 [&_[data-slot=dropdown-menu-item]]:text-xs [&_[data-slot=dropdown-menu-item]_svg]:size-3.5"
                                        >
                                          <p className="px-1.5 py-1 text-[10px] text-muted-foreground">
                                            نوع نمایش
                                          </p>
                                          {DETAIL_WIDGET_OPTIONS.map((option) => (
                                            <DropdownMenuItem
                                              key={option.value}
                                              className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
                                              onClick={() =>
                                                updateField(field.fieldId, { widget: option.value })
                                              }
                                            >
                                              <Check
                                                className={cn(
                                                  'size-3.5',
                                                  (config?.widget ?? 'auto') === option.value
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                                )}
                                                aria-hidden
                                              />
                                              {option.label}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger
                                          render={
                                            <button
                                              type="button"
                                              aria-label={`تنظیمات ${field.label}`}
                                              title="تنظیمات چیدمان"
                                              className={cardToolBase}
                                            >
                                              <Settings2Icon className="size-3" />
                                            </button>
                                          }
                                        />
                                        <DropdownMenuContent
                                          align="end"
                                          className="min-w-48 p-1 text-xs [&_[data-slot=dropdown-menu-item]]:min-h-7 [&_[data-slot=dropdown-menu-item]]:py-1 [&_[data-slot=dropdown-menu-item]]:text-xs [&_[data-slot=dropdown-menu-item]_svg]:size-3.5"
                                        >
                                          <DropdownMenuItem
                                            className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
                                            onClick={() =>
                                              updateField(field.fieldId, {
                                                span:
                                                  (config?.span ?? autoSpan(field)) === 'full'
                                                    ? 'half'
                                                    : 'full',
                                              })
                                            }
                                          >
                                            <Columns3Icon />
                                            {(config?.span ?? autoSpan(field)) === 'full'
                                              ? 'نیم‌عرض کردن'
                                              : 'تمام‌عرض کردن'}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
                                            disabled={
                                              orderedFields.findIndex(
                                                (item) => item.field.fieldId === field.fieldId,
                                              ) === 0
                                            }
                                            onClick={() => moveField(field.fieldId, -1)}
                                          >
                                            <MoveUpIcon className="size-3.5" />
                                            انتقال به بالا
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
                                            disabled={
                                              orderedFields.findIndex(
                                                (item) => item.field.fieldId === field.fieldId,
                                              ) ===
                                              orderedFields.length - 1
                                            }
                                            onClick={() => moveField(field.fieldId, 1)}
                                          >
                                            <MoveDownIcon className="size-3.5" />
                                            انتقال به پایین
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="min-h-7 py-1 text-xs [&_svg]:size-3.5"
                                            onClick={() => updateField(field.fieldId, { hidden: true })}
                                          >
                                            <EyeOffIcon className="size-3.5" />
                                            پنهان کردن از این نما
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <button
                                        type="button"
                                        onClick={() => updateField(field.fieldId, { hidden: true })}
                                        aria-label={`حذف ${field.label} از این نما`}
                                        title="حذف از این نما"
                                        className={cn(
                                          cardToolBase,
                                          'hover:border-destructive/40 hover:text-destructive',
                                        )}
                                      >
                                        <XIcon className="size-3" />
                                      </button>
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="truncate text-xs text-muted-foreground" title={field.label}>
                                        {field.label}
                                      </h4>
                                      <div className="mt-1.5 text-xs leading-relaxed">
                                        <DetailValue field={field} widget={config?.widget ?? 'auto'} />
                                      </div>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                          {showEmpty ? 'فیلدی برای نمایش وجود ندارد.' : 'همهٔ پاسخ‌های قابل‌نمایش خالی هستند.'}
                        </div>
                      )}
                      {detail.fields.some((field) => layout[field.fieldId]?.hidden) ? (
                        <div className="rounded-lg border border-dashed border-border p-2.5" data-print-hide>
                          <p className="mb-1.5 text-xs text-muted-foreground">
                            فیلدهای حذف‌شده از این نما (برای بازگرداندن انتخاب کنید)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.fields
                              .filter((field) => layout[field.fieldId]?.hidden)
                              .map((field) => (
                                <Button
                                  key={field.fieldId}
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => updateField(field.fieldId, { hidden: false })}
                                >
                                  <EyeIcon className="size-3" />
                                  {field.label}
                                </Button>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )
            ) : null}
          </div>
          {detail && !detail.locked ? (
            <footer
              dir="ltr"
              className="flex shrink-0 flex-col gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground"
            >
              {contactFields.length ? (
                <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1">
                  {contactFields.map((field) => {
                    const value = String(field.value ?? field.display).trim();
                    if (!value || value === '—') return null;
                    const email = /email/i.test(field.type) || /ایمیل|پست الکترونیک/i.test(field.label);
                    if (email) {
                      return (
                        <a
                          key={field.fieldId}
                          href={`mailto:${encodeURIComponent(value)}`}
                          className="max-w-full truncate underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                          dir="auto"
                        >
                          {field.label}: {value}
                        </a>
                      );
                    }
                    const phone = toLatinDigits(value).replace(/[^\d+]/g, '');
                    return (
                      <span key={field.fieldId} className="inline-flex min-w-0 max-w-full items-center gap-2" dir="auto">
                        <a
                          href={`tel:${phone}`}
                          className="min-w-0 truncate underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                          dir="auto"
                        >
                          {field.label}: {value}
                        </a>
                        <a
                          href={`sms:${phone}`}
                          className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
                        >
                          پیامک
                        </a>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <a
                  href="https://noroset.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-medium text-muted-foreground no-underline hover:text-foreground"
                >
                  Powered by Noroset
                </a>
                {formTitle ? <span className="min-w-0 truncate text-[10px]">{formTitle}</span> : null}
              </div>
            </footer>
          ) : null}
        </div>
        {/* نشانگر شناور درگ: با انگشت/نشانگر جابه‌جا می‌شود و کلیک را نمی‌گیرد. */}
        {dragItem && dragPoint
          ? createPortal(
              <div
                ref={dragChipRef}
                className="pointer-events-none fixed z-[100] flex max-w-56 -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] shadow-lg"
                style={{ left: dragPoint.x + 14, top: dragPoint.y }}
                dir="rtl"
                data-print-hide
              >
                <GripVerticalIcon className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{dragLabel || 'جابه‌جایی کارت'}</span>
                <span className="shrink-0 text-muted-foreground">
                  {dragItem.source === 'body' ? 'به خلاصه' : 'تغییر ترتیب'}
                </span>
              </div>,
              document.body,
            )
          : null}

        {/* پنل تمام‌صفحهٔ چاپ: روی همین صفحه و بیرون از دراور (portal) باز می‌شود. */}
        {printSize
          ? createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label="پیش‌نمایش چاپ پاسخ"
                dir="rtl"
                className="submission-print-preview fixed inset-0 z-[110] flex flex-col bg-background"
              >
                <style>{`@page { size: ${printSize} portrait; margin: ${printSize === 'A5' ? '9mm' : '12mm'}; }`}</style>
                <header className="flex shrink-0 items-center justify-between gap-1 border-b border-border bg-card px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
                  <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                    <PrinterIcon className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
                    <span className="hidden truncate text-sm font-medium sm:inline">پیش‌نمایش چاپ</span>
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      {(['A4', 'A5'] as const).map((size) => (
                        <Button
                          key={size}
                          type="button"
                          size="xs"
                          variant={printSize === size ? 'secondary' : 'ghost'}
                          aria-pressed={printSize === size}
                          aria-label={`کاغذ ${size}`}
                          onClick={() => setPrintSize(size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="xs"
                      aria-label="چاپ یا ذخیرهٔ PDF"
                      title="چاپ / ذخیرهٔ PDF"
                      onClick={() => window.print()}
                    >
                      <PrinterIcon className="size-3.5" />
                      <span className="hidden sm:inline">چاپ / ذخیرهٔ PDF</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="بستن پیش‌نمایش چاپ"
                      title="بستن"
                      onClick={() => setPrintSize(null)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-5">
                  <div
                    ref={printHostRef}
                    data-print-paper
                    className="submission-print-host mx-auto w-full max-w-[860px] rounded-md bg-white shadow-lg"
                  />
                </div>
              </div>,
              document.body,
            )
          : null}
        <style>{PRINT_STYLES}</style>
      </SheetContent>
    </Sheet>
  );
}

function isSavedDetailView(value: unknown): value is SavedDetailView {
  if (typeof value !== 'object' || value === null) return false;
  const view = value as Partial<SavedDetailView>;
  return typeof view.id === 'string' && typeof view.name === 'string' && typeof view.layout === 'object' && view.layout !== null;
}

/** کلید localStorage نماهای جزئیات (به‌ازای tenant/form)؛ دراور و فهرست موبایل مشترکش هستند. */
const detailViewsStorageKey = (tenantId: string, formId: string) => `noroset:submission-detail-views:${tenantId}:${formId}`;

/** نام پیش‌فرض نمای چیدمان وقتی کاربر نامی وارد نکرده است. */
const DEFAULT_DETAIL_VIEW_NAME = 'چیدمان من';

/** گزینه‌های نوع نمایش هر فیلد در ابزار کارت. */
const DETAIL_WIDGET_OPTIONS: Array<{ value: DetailWidget; label: string }> = [
  { value: 'auto', label: 'هوشمند' },
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'currency', label: 'مبلغ' },
  { value: 'progress', label: 'نوار پیشرفت' },
  { value: 'tags', label: 'برچسب‌ها' },
  { value: 'table', label: 'جدول' },
];

/**
 * ستون عنوان کارت‌های فهرست موبایل: اولین فیلد «سنجاق‌شده»ی نمای فعال جزئیات
 * (به ترتیب نمایش) که در ستون‌های جدول هم وجود دارد؛ وگرنه ستون نام/عنوان؛
 * و اگر هیچ‌کدام نبود null تا کارت به متن پیش‌فرض برگردد.
 */
function pinnedListFieldIds(view: SavedDetailView | undefined, columns: FieldColumn[]): string[] {
  const layout: DetailLayout = view?.layout ?? {};
  const position = (column: FieldColumn) =>
    layout[column.fieldId]?.summaryOrder ?? layout[column.fieldId]?.order ?? columns.indexOf(column);
  const orderedColumns = [...columns].sort((a, b) => position(a) - position(b));
  return orderedColumns
    .filter((column) => layout[column.fieldId]?.pinned ?? isIdentityLabel(column.label))
    .map((column) => column.fieldId);
}

function isIdentityLabel(label: string): boolean {
  return /(نام|عنوان|موضوع|نام و نام خانوادگی|شرکت|name|title|subject|company)/i.test(label);
}

function isFinancialField(field: SubmissionDetail['fields'][number]): boolean {
  return (
    typeof field.value === 'number' &&
    /(مبلغ|جمع|هزینه|قیمت|امتیاز|رتبه|total|amount|price|score|rating)/i.test(`${field.label} ${field.type}`)
  );
}

function isFinancialValue(value: JsonValue | undefined, label: string, type: string): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && !value.trim()) return false;
  if (!/(مبلغ|جمع|هزینه|قیمت|امتیاز|رتبه|total|amount|price|score|rating)/i.test(`${label} ${type}`)) {
    return false;
  }
  const numeric =
    typeof value === 'number' ? value : Number(toLatinDigits(value.replaceAll(',', '')));
  return Number.isFinite(numeric);
}

function isEmptyField(field: SubmissionDetail['fields'][number]): boolean {
  if (field.value === null || field.value === undefined) return !field.display.trim() || field.display === '—';
  if (typeof field.value === 'string') return !field.value.trim();
  if (Array.isArray(field.value)) return field.value.length === 0;
  if (typeof field.value === 'object') return Object.keys(field.value).length === 0;
  return false;
}

function isPinnedField(fieldId: string, autoPinnedId: string | undefined, layout: DetailLayout): boolean {
  return layout[fieldId]?.pinned ?? fieldId === autoPinnedId;
}

function autoSpan(field: SubmissionDetail['fields'][number]): 'half' | 'full' {
  return /long_text|image|file|table|signature|repeater|content/i.test(field.type) ||
    isStructuredValue(field)
    ? 'full'
    : 'half';
}

function isStructuredValue(field: SubmissionDetail['fields'][number]): boolean {
  if (field.type === 'multi_choice') return false;
  if (Array.isArray(field.value)) {
    return field.value.some((item) => typeof item === 'object' && item !== null);
  }
  return typeof field.value === 'object' && field.value !== null;
}

function formatNumericValue(value: JsonValue | null | undefined, fallback: string, label = ''): string {
  if (value === null || value === undefined) return fallback;
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(toLatinDigits(value.replaceAll(',', '')))
        : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  const unit = /ریال/.test(label) ? 'ریال' : /تومان/.test(label) ? 'تومان' : '';
  return `${numeric.toLocaleString('fa-IR')}${unit ? ` ${unit}` : ''}`;
}

function groupDetailFields(
  fields: Array<{ field: SubmissionDetail['fields'][number]; index: number; config?: DetailFieldLayout }>,
  customOrder: boolean,
) {
  const groups = new Map<string, typeof fields>();
  for (const item of fields) {
    const { type } = item.field;
    const title = /file|image|signature|upload|attachment/i.test(type)
      ? 'پیوست‌ها و مستندات'
      : /long_text|textarea|rich_text/i.test(type)
        ? 'متن و توضیحات'
        : /table|repeater|array|object/i.test(type) || isStructuredValue(item.field)
          ? 'داده‌های ساختاریافته'
          : 'اطلاعات و پاسخ‌ها';
    groups.set(title, [...(groups.get(title) ?? []), item]);
  }
  const result = [...groups].map(([title, grouped]) => ({ title, fields: grouped }));
  if (customOrder) return result;
  const priority = ['اطلاعات و پاسخ‌ها', 'متن و توضیحات', 'داده‌های ساختاریافته', 'پیوست‌ها و مستندات'];
  return result.sort((a, b) => priority.indexOf(a.title) - priority.indexOf(b.title));
}

function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function MetadataValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
    </div>
  );
}

function DetailValue({ field, widget }: { field: SubmissionDetail['fields'][number]; widget: DetailWidget }) {
  const value = field.value;
  const effectiveWidget =
    widget === 'auto'
      ? field.type === 'single_choice' || field.type === 'multi_choice'
        ? 'tags'
        : Array.isArray(value) || (typeof value === 'object' && value !== null)
          ? 'table'
          : field.type === 'rating' || /درصد|percent/i.test(field.label)
          ? 'progress'
            : field.type === 'number'
              ? /(مبلغ|جمع|هزینه|قیمت|amount|total|price|ریال|تومان)/i.test(field.label)
                ? 'currency'
                : 'number'
              : 'text'
      : widget;

  if (isEmptyField(field)) return <span className="text-muted-foreground">بدون پاسخ</span>;
  if (effectiveWidget === 'currency' || effectiveWidget === 'number') {
    return <span className="font-medium tabular-nums">{formatNumericValue(value, field.display, field.label)}</span>;
  }
  if (effectiveWidget === 'progress') {
    const numeric = typeof value === 'number' ? value : Number(toLatinDigits(String(value)));
    if (!Number.isFinite(numeric)) return <span>{field.display}</span>;
    const maximum = /درصد|percent/i.test(field.label) ? 100 : 10;
    const percent = Math.max(0, Math.min(100, (numeric / maximum) * 100));
    return (
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-label={field.label}
          aria-valuemin={0}
          aria-valuemax={maximum}
          aria-valuenow={numeric}
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <span className="min-w-8 text-end tabular-nums">{fa(numeric)}</span>
      </div>
    );
  }
  if (effectiveWidget === 'tags') {
    const labels = field.display.split(/،\s*/);
    return (
      <div className="flex flex-wrap gap-1">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {label}
          </span>
        ))}
      </div>
    );
  }
  if (effectiveWidget === 'table') {
    const rows = Array.isArray(value)
      ? value.map((item, index) => ({ label: `ردیف ${fa(index + 1)}`, value: item }))
      : typeof value === 'object' && value !== null
        ? Object.entries(value).map(([label, item]) => ({ label, value: item }))
        : [];
    if (rows.length === 0) return <span className="whitespace-pre-wrap">{field.display}</span>;
    const rowObjects = rows.map((row) =>
      typeof row.value === 'object' && row.value !== null && !Array.isArray(row.value) ? row.value : null,
    );
    const tableColumns = [...new Set(rowObjects.flatMap((row) => (row ? Object.keys(row) : [])))];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          {tableColumns.length ? (
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {tableColumns.map((column) => (
                  <th key={column} className="px-1.5 py-1.5 text-start font-normal">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, index) => {
              const rowObject = rowObjects[index];
              return tableColumns.length && rowObject ? (
                <tr key={row.label} className="border-b border-border last:border-0">
                  {tableColumns.map((column) => (
                    <td key={column} className="px-1.5 py-1.5">
                      {jsonValueText(rowObject[column] ?? null)}
                    </td>
                  ))}
                </tr>
              ) : (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th scope="row" className="max-w-40 px-1.5 py-1.5 text-start font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  <td className="px-1.5 py-1.5">{jsonValueText(row.value)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{field.display || jsonValueText(value)}</span>;
}

function jsonValueText(value: JsonValue): string {
  if (value === null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return fa(value);
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (Array.isArray(value)) return value.map(jsonValueText).join('، ');
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${jsonValueText(item)}`)
    .join(' · ');
}
