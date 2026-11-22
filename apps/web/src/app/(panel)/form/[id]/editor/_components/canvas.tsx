'use client';

/**
 * کامپوننت‌های داخل بوم ادیتور:
 * - PageBar: نوار صفحه‌ها (انتخاب، نام‌گذاری، کپی، حذف)
 * - FieldZone: کادر عنوان‌دار ناحیه‌های بوم (هدر، فوتر)
 * - ChromeAreas: خلاصه‌ی خواندنی ناحیه‌های قالب (نوار بالا/کنار/پایین/فوتر)
 * - FieldCard: کارت هر المان
 */

import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EllipsisIcon,
  GitBranchIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { Badge, Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Skeleton } from '@noroset/ui';
import { Switch } from '@noroset/ui';
import { type EditorField, type EditorPage, fa } from './types';
import { IconAction } from '@/components/editor-ui';
import { FieldInline } from './field-inline';
import { advancedCount, settingsIssues } from './settings-drawer';

/* ─── PageBar ─── */

export function PageBar({
  pages,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onDuplicate,
  onRename,
}: {
  pages: EditorPage[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Esc نویسه‌ها را ذخیره نمی‌کند؛ onBlur تنها جایی است که نام نوشته می‌شود.
  const cancelled = useRef(false);

  const startRename = (id: string, title: string) => {
    cancelled.current = false;
    setDraft(title);
    setRenaming(id);
  };

  const commitRename = () => {
    if (renaming && !cancelled.current && draft.trim()) onRename(renaming, draft.trim());
    setRenaming(null);
  };

  return (
    <nav aria-label="صفحه‌های فرم" className="flex items-center gap-1 py-1 max-md:overflow-x-auto max-md:[scrollbar-width:none] md:flex-wrap md:justify-center">
      {pages.map((p, i) => {
        const active = p.id === activeId;
        return (
          <div key={p.id} className="flex shrink-0 items-center gap-1 whitespace-nowrap">
            {renaming === p.id ? (
              <input
                autoFocus
                value={draft}
                aria-label="نام صفحه"
                maxLength={200}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    cancelled.current = true;
                    e.currentTarget.blur();
                  }
                }}
                className="h-7 w-32 min-w-0 rounded-lg bg-card px-2 text-sm ring-2 ring-primary outline-none"
              />
            ) : active ? (
              <div
                aria-current="page"
                className="flex h-7 items-center gap-1 rounded-lg bg-card ps-3 pe-1 text-sm shadow-xs ring-1 ring-border"
              >
                {p.title}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="گزینه‌های صفحه" />}>
                    <EllipsisIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem onClick={() => startRename(p.id, p.title)}>
                      <PencilIcon />
                      تغییر نام
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(p.id)}>
                      <CopyIcon />
                      کپی صفحه
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={pages.length < 2}
                      onClick={() => onRemove(p.id)}
                    >
                      <Trash2Icon />
                      حذف صفحه
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`صفحه ${fa(i + 1)}: ${p.title}`}
                onClick={() => onSelect(p.id)}
                className="h-7 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {p.title}
              </button>
            )}
            {/* جدا‌کننده‌ی صفحه‌ها (در RTL شِوران سمت چپ) */}
            {i < pages.length - 1 && (
              <span className="size-3 text-muted-foreground/60 [&_svg]:size-3">
                <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M7 2L3 6L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
        );
      })}
      <IconAction
        label="افزودن صفحه"
        className="ms-1 shrink-0 border border-dashed border-foreground/30"
        onClick={onAdd}
      >
        <PlusIcon />
      </IconAction>
    </nav>
  );
}

/* ─── FieldZone ─── */

/** کادر عنوان‌دار یک ناحیه‌ی بوم؛ فقط ظرف است، کنترل ناحیه‌ای ندارد. */
export function FieldZone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative rounded-xl border border-dashed border-foreground/15 bg-card/50 px-4 pt-5 pb-4">
      <span className="absolute -top-2.5 start-3 bg-background px-1.5 text-[11px] font-semibold text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

/* ─── ChromeAreas ─── */

/**
 * ناحیه‌های chrome (نوار بالا/کنار/پایین/فوتر) از قالب یا تعریف فرم می‌آیند و در این نسخه
 * ویرایش نمی‌شوند؛ به‌جای سه کادر خالی و دکمه‌های بی‌اثر، یک ردیف خلاصه‌ی خواندنی نشان داده می‌شود.
 */
export function ChromeAreas({ areas }: { areas: { label: string; count: number }[] }) {
  const filled = areas.some((area) => area.count > 0);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <InfoIcon className="size-3.5" aria-hidden />
        ناحیه‌های قالب
      </span>
      {areas.map((area) => (
        <span key={area.label}>
          {area.label}: {area.count > 0 ? `${fa(area.count)} المان` : 'خالی'}
        </span>
      ))}
      <span className="w-full">
        {filled
          ? 'این ناحیه‌ها از قالب فرم می‌آیند و در این نسخه فقط خواندنی‌اند؛ ویرایششان در قالب انجام می‌شود.'
          : 'این ناحیه‌ها از قالب فرم می‌آیند و در قالب فعلی خالی‌اند.'}
      </span>
    </div>
  );
}

/* ─── FieldCard ─── */

export function FieldCard({
  field,
  active,
  onSelect,
  onDuplicate,
  onRemove,
  onChange,
  onOpenSettings,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onCollapse,
  settingsOpen,
}: {
  field: EditorField;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<EditorField>) => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** بستن کارت باز (نمای جمع‌شده‌ی همه‌ی المان‌ها). */
  onCollapse: () => void;
  /** دیالوگ «تنظیمات پیشرفته» همین المان باز است. */
  settingsOpen: boolean;
}) {
  const rules = advancedCount(field);
  const invalid = settingsIssues(field).length > 0;
  const validationRules = rules - (field.condition ? 1 : 0);

  return (
    <div
      id={`card-${field.id}`}
      // کارت جمع‌شده با کیبورد هم انتخاب می‌شود؛ کارت باز خودش ورودی‌ها را دارد.
      role={active ? undefined : 'button'}
      tabIndex={active ? undefined : 0}
      aria-label={active ? undefined : `ویرایش ${field.typeLabel}${field.family === 'field' ? `: ${field.label}` : ''}`}
      onClick={active ? undefined : onSelect}
      onKeyDown={
        active
          ? undefined
          : (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
      }
      className={cn(
        // جای دیالوگ پیشرفته (پایین بوم) هنگام scrollIntoView خالی می‌ماند.
        'group/field relative scroll-mt-4 scroll-mb-[calc(70svh+1rem)] rounded-xl bg-card shadow-xs ring-1 outline-none transition-shadow duration-150 ease-fluent md:scroll-mb-[22.5rem]',
        active
          ? 'ring-2 ring-primary'
          : 'cursor-pointer ring-border hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* نوار ابزار شناور (فقط وقتی غیرفعال است) */}
      {!active && (
        <div
          role="group"
          aria-label="ابزارهای المان"
          className="absolute -top-3.5 start-3 z-10 hidden gap-0.5 rounded-lg bg-popover p-0.5 shadow-lg ring-1 ring-border md:group-hover/field:flex md:group-focus-within/field:flex"
        >
          <IconAction label="انتقال به بالا" size="icon-xs" disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUpIcon />
          </IconAction>
          <IconAction label="انتقال به پایین" size="icon-xs" disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDownIcon />
          </IconAction>
          <IconAction label="کپی" size="icon-xs" onClick={onDuplicate}>
            <CopyIcon />
          </IconAction>
          <IconAction
            label="حذف"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconAction>
        </div>
      )}

      {/* هدر کارت (فقط وقتی فعال است) */}
      {active && (
        <div
          role="group"
          aria-label="ابزارهای المان"
          className="flex items-center gap-1.5 rounded-t-xl border-b bg-muted/50 py-1.5 ps-2.5 pe-2"
        >
          <span className="text-xs text-muted-foreground">{field.typeLabel}</span>
          <div className="flex-1" />
          <IconAction label="انتقال به بالا" size="icon-xs" disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUpIcon />
          </IconAction>
          <IconAction label="انتقال به پایین" size="icon-xs" disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDownIcon />
          </IconAction>
          <IconAction label="کپی" onClick={onDuplicate}>
            <CopyIcon />
          </IconAction>
          <IconAction label="حذف" className="text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2Icon />
          </IconAction>
          <IconAction label="بستن کارت" onClick={onCollapse}>
            <XIcon />
          </IconAction>
        </div>
      )}

      {/* بدنه: تنظیمات عمومی و ظاهر (settings-spec.ts) */}
      <div className="px-4 py-3.5">
        <FieldInline field={field} active={active} onChange={onChange} />

        {/* کارت جمع‌شده: قاعده‌های دیالوگ پیشرفته بدون باز کردن آن دیده می‌شوند. */}
        {!active && (rules > 0 || invalid) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {invalid && (
              <RuleChip tone="error" icon={<TriangleAlertIcon />}>
                تنظیمات نامعتبر
              </RuleChip>
            )}
            {!invalid && validationRules > 0 && (
              <RuleChip icon={<ShieldCheckIcon />}>{fa(validationRules)} قاعده‌ی اعتبارسنجی</RuleChip>
            )}
            {field.condition && <RuleChip icon={<GitBranchIcon />}>نمایش شرطی</RuleChip>}
          </div>
        )}
      </div>

      {/* فوتر کارت (فقط وقتی فعال است) */}
      {active && (
        <div className="flex items-center gap-2 rounded-b-xl border-t bg-muted/50 px-2.5 py-2">
          {field.family === 'field' && (
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Switch checked={field.required} onCheckedChange={(required) => onChange({ required })} />
              اجباری
            </label>
          )}
          <div className="flex-1" />
          <Button
            id={`settings-${field.id}`}
            variant="secondary"
            size="sm"
            aria-expanded={settingsOpen}
            aria-controls="advanced-settings"
            aria-invalid={invalid || undefined}
            className="aria-invalid:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
          >
            {invalid ? <TriangleAlertIcon /> : <Settings2Icon />}
            تنظیمات پیشرفته
            {rules > 0 && (
              <Badge
                variant={invalid ? 'destructive' : 'secondary'}
                className="ms-0.5 h-4 min-w-4 px-1 text-[10px]"
                aria-label={`${fa(rules)} قاعده‌ی فعال`}
              >
                {fa(rules)}
              </Badge>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function RuleChip({ children, icon, tone }: { children: ReactNode; icon: ReactNode; tone?: 'error' }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] [&_svg]:size-3.5',
        tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ─── SkeletonFieldCard ─── */

export function SkeletonFieldCard() {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-border">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8" />
      <Skeleton className="h-2.5 w-2/5" />
    </div>
  );
}
