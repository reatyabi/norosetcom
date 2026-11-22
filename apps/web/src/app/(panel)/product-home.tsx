'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import {
  ArrowDownAZIcon,
  CheckIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  ListIcon,
} from 'lucide-react';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@noroset/ui';
import type { ModuleKey } from '@noroset/admin/ui';
import { PageHead } from '@/components/page-head';
import { formatShort } from '@/lib/format';

// اجزای مشترک صفحه‌ی اصلی محصولات به سبک گوگل فرم/درایو (docs/design-system.md): نوار «شروع» با کارت خالی و
// قالب‌ها روی Mica (بیرون کارت)، و در کارت جزیره‌ای فهرست «اخیر» با سرتیتر چسبان، فیلتر مالک، نمای
// شبکه/فهرست و مرتب‌سازی؛ دکمه‌ی + شناور وقتی نوار «شروع» از دید خارج شد.

export type HomeView = 'grid' | 'list';
export type HomeSort = 'updated' | 'title' | 'created';
export type OwnerFilter = 'all' | 'me' | 'others';

interface HomePrefs {
  view: HomeView;
  sort: HomeSort;
  owner: OwnerFilter;
}

const DEFAULT_PREFS: HomePrefs = { view: 'grid', sort: 'updated', owner: 'all' };
const prefsKey = (product: ModuleKey) => `noroset.home.${product}`;
const prefListeners = new Set<() => void>();
const prefCache = new Map<string, HomePrefs>();

function readPrefs(product: ModuleKey): HomePrefs {
  const key = prefsKey(product);
  const cached = prefCache.get(key);
  if (cached) return cached;
  let prefs = DEFAULT_PREFS;
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<HomePrefs> | null;
    if (raw) prefs = { ...DEFAULT_PREFS, ...raw };
  } catch {
    // انتخاب نما فقط راحتی است
  }
  prefCache.set(key, prefs);
  return prefs;
}

/** نما، مرتب‌سازی و فیلتر مالک هر محصول در localStorage همین مرورگر می‌ماند. */
export function useHomePrefs(product: ModuleKey) {
  const prefs = useSyncExternalStore(
    (l) => {
      prefListeners.add(l);
      return () => prefListeners.delete(l);
    },
    () => readPrefs(product),
    () => DEFAULT_PREFS,
  );
  const set = (patch: Partial<HomePrefs>) => {
    const next = { ...readPrefs(product), ...patch };
    prefCache.set(prefsKey(product), next);
    try {
      localStorage.setItem(prefsKey(product), JSON.stringify(next));
    } catch {
      // بدون ذخیره هم کار می‌کند
    }
    prefListeners.forEach((l) => l());
  };
  return { ...prefs, set };
}

interface Arrangeable {
  title: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

const collator = new Intl.Collator('fa');

/** جست‌وجو (عنوان)، فیلتر مالک و مرتب‌سازی سمت کاربر؛ فهرست‌ها به سقف پلن محدودند. */
export function arrange<T extends Arrangeable>(items: T[], { query, sort, owner, me }: { query: string; sort: HomeSort; owner: OwnerFilter; me: string }): T[] {
  const q = query.toLocaleLowerCase('fa');
  const filtered = items.filter(
    (i) => (!q || i.title.toLocaleLowerCase('fa').includes(q)) && (owner === 'all' || (owner === 'me') === (i.createdBy === me)),
  );
  return filtered.sort((a, b) =>
    sort === 'title' ? collator.compare(a.title, b.title) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** نام مالک برای نمای فهرست. */
export function ownerLabel(createdBy: string | null, name: string | null, me: string): string {
  if (!createdBy) return '—';
  return createdBy === me ? 'من' : name || 'عضو دیگر';
}

// ---------- نوار «شروع» ----------

/**
 * دیده‌شدن یک بخش زیر نوار بالا (دکمه‌ی شناور، سرتیتر چسبان). ref تابعی است چون بخش ممکن است با portal
 * سرصفحه دوباره mount شود. پیش از اندازه‌گیری «دیده» فرض می‌شود.
 */
export function useInView(): [ref: (el: Element | null) => void, inView: boolean] {
  const [el, setEl] = useState<Element | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), { rootMargin: '-64px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, inView];
}

export function StartBand({
  title,
  galleryHref,
  bandRef,
  children,
}: {
  title: string;
  galleryHref?: string;
  bandRef?: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <PageHead>
      <section ref={bandRef} aria-label={title} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base font-medium">{title}</h1>
          {galleryHref ? (
            <Link href={galleryHref} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm hover:bg-muted">
              <LayoutTemplateIcon className="size-4" />
              گالری قالب‌ها
            </Link>
          ) : null}
        </div>
        {/* اسکرول افقی در موبایل؛ لبه‌ها تا gutter صفحه. */}
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8">{children}</div>
      </section>
    </PageHead>
  );
}

/** کارت نوار «شروع» یا گالری: تصویر ۴:۳ و نام زیر آن. */
export function StartCard({
  label,
  description,
  onClick,
  busy,
  disabled,
  className,
  thumbClassName,
  children,
}: {
  label: string;
  description?: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
  thumbClassName?: string;
  children: ReactNode;
}) {
  const isInteractive = !disabled && !busy;
  return (
    <div
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={(e) => {
        if (!isInteractive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-busy={busy || undefined}
      aria-disabled={!isInteractive || undefined}
      className={cn(
        'group flex w-36 shrink-0 cursor-pointer flex-col gap-2 text-start outline-none select-none sm:w-40',
        !isInteractive && 'cursor-default opacity-60 pointer-events-none',
        className,
      )}
    >
      <span
        className={cn(
          'relative block overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-colors duration-150 ease-fluent group-hover:border-primary group-focus-visible:ring-2 group-focus-visible:ring-ring',
          thumbClassName ?? 'aspect-[4/3]',
        )}
      >
        {children}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner className="size-6" />
          </span>
        ) : null}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{label}</span>
        {description ? <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </div>
  );
}

/** علامت + چهاررنگ (رنگ‌های سیستمی نوروست) مثل کارت «خالی» گوگل. */
export function BlankPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path d="M21 6h6v15h-6z" fill="#c42b1c" />
      <path d="M27 21h15v6H27z" fill="#005fb8" />
      <path d="M21 27h6v15h-6z" fill="#0f7b0f" />
      <path d="M6 21h15v6H6z" fill="#e8a300" />
      <path d="M21 21h6v6h-6z" fill="#005fb8" />
    </svg>
  );
}

export function BlankThumb() {
  return (
    <span className="flex size-full items-center justify-center bg-card">
      <BlankPlus className="size-14" />
    </span>
  );
}

/** دکمه‌ی + شناور گوشه‌ی پایین (در RTL چپ) وقتی نوار «شروع» دیده نمی‌شود. */
export function NewFab({ show, label, onClick, busy }: { show: boolean; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={busy}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show || undefined}
      className={cn(
        'fixed end-6 bottom-6 z-30 flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-lg transition-[opacity,scale] duration-200 ease-fluent hover:bg-muted',
        show ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
      )}
    >
      {busy ? <Spinner className="size-6" /> : <BlankPlus className="size-7" />}
    </button>
  );
}

// ---------- فهرست «اخیر» ----------

const OWNER_LABEL: Record<OwnerFilter, string> = { all: 'مالک: هر کسی', me: 'مالک: من', others: 'مالک: دیگران' };
const SORT_LABEL: Record<HomeSort, string> = { updated: 'آخرین تغییر', title: 'عنوان', created: 'تاریخ ساخت' };

function ToolButton({ label, children, ...props }: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={label} {...props} />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * سرتیتر چسبان فهرست (زیر نوار بالا): عنوان، فیلتر مالک، نمای شبکه/فهرست و مرتب‌سازی؛ `extra` برای فیلتر
 * خاص محصول (مثلاً نوع فایل). وقتی چسبید پس‌زمینه‌ی bg-background و سایه می‌گیرد.
 */
export function RecentHeader({
  title,
  prefs,
  sorts = ['updated', 'title', 'created'],
  extra,
}: {
  title: string;
  prefs: ReturnType<typeof useHomePrefs>;
  sorts?: HomeSort[];
  extra?: ReactNode;
}) {
  const [sentinelRef, sentinelInView] = useInView();
  const stuck = !sentinelInView;
  return (
    <TooltipProvider>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        className={cn(
          'sticky top-16 z-10 -mx-4 -mt-px flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 transition-shadow md:-mx-8 md:px-8',
          stuck && 'bg-background shadow-xs',
        )}
      >
        <h2 className="me-auto text-base font-medium">{title}</h2>
        {extra}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-10 rounded-full px-3" />}>
            {OWNER_LABEL[prefs.owner]}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {(Object.keys(OWNER_LABEL) as OwnerFilter[]).map((o) => (
              <DropdownMenuItem key={o} onClick={() => prefs.set({ owner: o })}>
                {OWNER_LABEL[o]}
                {prefs.owner === o ? <CheckIcon className="ms-auto" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {prefs.view === 'grid' ? (
          <ToolButton label="نمای فهرستی" onClick={() => prefs.set({ view: 'list' })}>
            <ListIcon className="size-5" />
          </ToolButton>
        ) : (
          <ToolButton label="نمای شبکه‌ای" onClick={() => prefs.set({ view: 'grid' })}>
            <LayoutGridIcon className="size-5" />
          </ToolButton>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="مرتب‌سازی" />} />}>
              <ArrowDownAZIcon className="size-5" />
            </TooltipTrigger>
            <TooltipContent>مرتب‌سازی: {SORT_LABEL[prefs.sort]}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-44">
            {sorts.map((s) => (
              <DropdownMenuItem key={s} onClick={() => prefs.set({ sort: s })}>
                {SORT_LABEL[s]}
                {prefs.sort === s ? <CheckIcon className="ms-auto" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

/** شبکه‌ی کارت‌ها. */
export function ItemGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] sm:gap-4">{children}</div>;
}

/** منوی «⋮» کارت/ردیف. */
export function ItemMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        render={<Button variant="ghost" size="icon" className="relative z-10 -me-1 shrink-0 rounded-full" aria-label={`گزینه‌های «${label}»`} />}
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48" onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * کارت شبکه: تصویر بندانگشتی، عنوان، آیکون نوع و زمان تغییر، منوی ⋮. کل کارت لینک است (stretched link)
 * و منو بالای آن کلیک می‌شود.
 */
export function ItemCard({
  href,
  onOpen,
  title,
  thumb,
  icon,
  meta,
  badges,
  menu,
}: {
  /** مقصد کارت؛ یا `onOpen` برای چیزی که صفحه ندارد (مثلاً باز کردن فایل)؛ بدون هر دو کارت فقط نمایشی است. */
  href?: string;
  onOpen?: () => void;
  title: string;
  thumb: ReactNode;
  icon: ReactNode;
  meta: string;
  badges?: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-colors duration-150 ease-fluent focus-within:ring-2 focus-within:ring-ring hover:border-primary/60">
      <div className="pointer-events-none aspect-[4/3] overflow-hidden border-b border-border">{thumb}</div>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-2">
        {href ? (
          <Link href={href} className="truncate text-sm font-medium outline-none after:absolute after:inset-0" title={title}>
            {title}
          </Link>
        ) : !onOpen ? (
          <span className="truncate text-sm font-medium" title={title}>
            {title}
          </span>
        ) : (
          <button type="button" onClick={onOpen} className="truncate text-start text-sm font-medium outline-none after:absolute after:inset-0" title={title} dir="auto">
            {title}
          </button>
        )}
        <div className="relative z-10 flex min-h-8 items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
          {icon}
          <span className="min-w-0 flex-1 truncate">{meta}</span>
          {menu}
        </div>
        {badges ? <div className="relative z-10 flex flex-wrap gap-1.5">{badges}</div> : null}
      </div>
    </article>
  );
}

export interface ItemRow {
  id: string;
  href: string;
  title: string;
  icon: ReactNode;
  owner: string;
  updatedAt: string;
  badges?: ReactNode;
  menu?: ReactNode;
}

/** نمای فهرستی: عنوان، مالک، آخرین تغییر، وضعیت. */
export function ItemTable({ rows, extraHead }: { rows: ItemRow[]; extraHead?: string }) {
  return (
    <div className="pt-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>عنوان</TableHead>
            <TableHead className="hidden md:table-cell">مالک</TableHead>
            <TableHead className="hidden sm:table-cell">آخرین تغییر</TableHead>
            <TableHead className="hidden lg:table-cell">{extraHead ?? 'وضعیت'}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="relative">
              <TableCell className="max-w-0 min-w-48">
                <Link href={r.href} className="flex items-center gap-3 font-medium after:absolute after:inset-0">
                  {r.icon}
                  <span className="truncate">{r.title}</span>
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{r.owner}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{formatShort(r.updatedAt)}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1.5">{r.badges}</div>
              </TableCell>
              <TableCell className="text-end">{r.menu}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { DropdownMenuItem as ItemMenuItem };
