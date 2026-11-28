'use client';

/**
 * کامپوننت‌های داخل بوم ادیتور:
 * - FormCanvas: اسکلت ۶ ناحیه‌ای بوم فرم (هدر، فوتر، سایدبار، TopBar، Main با zone-main، BottomBar)
 * - FieldCard: کارت هر المان (با شناسه DOM card-${id} و دکمه settings-${id})
 * - SkeletonFieldCard: حالت اسکلت بارگذاری کارت
 */

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EllipsisIcon,
  GitBranchIcon,
  InfoIcon,
  LayoutGridIcon,
  LayoutListIcon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
  Skeleton,
  Switch,
} from '@noroset/ui';
import type {
  FormTheme,
  FormLayout,
  FormDefaults,
  TopBarDefaults,
  SidebarDefaults,
  BottomBarDefaults,
  FooterDefaults,
} from '@noroset/field-engine';
import { hoverScroll, IconAction } from '@/components/editor-ui';
import { type EditorField, type EditorPage, fa } from './types';
import { FieldInline } from './field-inline';
import { advancedCount, settingsIssues } from './settings-drawer';

/* ─── ابزارهای کمکی بوم ─── */

import { resolveFormThemeTokens, getCanvasContrast } from '@noroset/field-engine';
export { resolveFormThemeTokens, getCanvasContrast } from '@noroset/field-engine';

import { TopBarEditor } from './top-bar-editor';
export { TopBarEditor } from './top-bar-editor';
import { SidebarEditor } from './sidebar-editor';
export { SidebarEditor } from './sidebar-editor';
import { BottomBarEditor } from './bottom-bar-editor';
export { BottomBarEditor } from './bottom-bar-editor';

/* ─── FormCanvas (اسکلت ۶ ناحیه‌ای بوم ادیتور) ─── */

export interface FormCanvasProps {
  theme: FormTheme;
  header: ReactNode;
  formTitle: string;
  formDescription?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onTitleBlur?: () => void;
  onDescriptionBlur?: () => void;
  pages?: EditorPage[];
  activePageIndex?: number;
  activePageId?: string;
  onSelectPage?: (id: string) => void;
  onAddPage?: () => void;
  onRemovePage?: (id: string) => void;
  onDuplicatePage?: (id: string) => void;
  onRenamePage?: (id: string, title: string) => void;
  layout?: FormLayout;
  defaults?: FormDefaults;
  onLayoutChange?: (patch: Partial<FormLayout>) => void;
  onTopBarChange?: (patch: Partial<TopBarDefaults>) => void;
  onSidebarChange?: (patch: Partial<SidebarDefaults>) => void;
  onBottomBarChange?: (patch: Partial<BottomBarDefaults>) => void;
  children: ReactNode;
  drawerOpen?: boolean;
}

export function FormCanvas({
  theme,
  header,
  formTitle,
  formDescription,
  onTitleChange,
  onDescriptionChange,
  onTitleBlur,
  onDescriptionBlur,
  pages,
  activePageIndex = 0,
  activePageId,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onDuplicatePage,
  onRenamePage,
  layout,
  defaults,
  onLayoutChange,
  onTopBarChange,
  onSidebarChange,
  onBottomBarChange,
  children,
  drawerOpen = false,
}: FormCanvasProps) {
  const resolved = resolveFormThemeTokens(theme);

  // ستون‌های بدنه اصلی: خواندن مستقیم از layout.main_columns با فال‌بک به state محلی
  const [localColumns, setLocalColumns] = useState<1 | 2>(1);
  const columns = layout?.main_columns ?? localColumns;

  const toggleColumns = () => {
    const next: 1 | 2 = columns === 1 ? 2 : 1;
    setLocalColumns(next);
    onLayoutChange?.({ main_columns: next });
  };

  // فلگ‌های نمایش ۵ ناحیه از layout.zones
  const zones = layout?.zones ?? {
    header: true,
    top_bar: true,
    sidebar: true,
    bottom_bar: true,
    footer: true,
  };

  return (
    <div
      data-nf-canvas=""
      data-canvas-contrast={resolved.contrast}
      data-button-style={theme?.button_style || 'filled'}
      style={resolved.cssVars as CSSProperties}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-nf-canvas"
    >
      <ScrollArea className={cn('relative z-10 min-h-0 flex-1 overflow-x-hidden', hoverScroll)}>
        <div
          className={cn(
            'flex min-h-full w-full flex-col justify-between transition-all',
            drawerOpen ? 'pb-[calc(50dvh+1.5rem)]' : 'pb-16 md:pb-8',
          )}
        >
          {/* ۱. ناحیه هدر (در صورت فعال بودن zones.header) */}
          {zones.header && (
            <div className="w-full shrink-0 pt-4 overflow-visible">
              {header}
            </div>
          )}

          {/* نواحی میانی: چیدمان ریسپانسیو (سایدبار مستقل + ستون کارت‌های مرکزی) با مقیاس یکپارچه فرم */}
          <div
            data-nf-content-area=""
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-3 py-3 md:flex-row md:px-6"
          >
            {/* ۲. ستون سایدبار مستقل (در صورت فعال بودن zones.sidebar) */}
            {zones.sidebar && (
              <SidebarEditor
                pages={pages ?? []}
                activeId={
                  activePageId ??
                  (pages && activePageIndex !== undefined ? pages[activePageIndex]?.id : undefined) ??
                  (pages?.[0]?.id ?? '')
                }
                onSelect={onSelectPage ?? (() => { })}
                onAdd={onAddPage}
                onRemove={onRemovePage}
                onDuplicate={onDuplicatePage}
                onRename={onRenamePage}
                title={defaults?.sidebar?.title}
                onTitleChange={(title) => onSidebarChange?.({ title })}
                collapsible={layout?.sidebar_collapsible}
                collapsed={layout?.sidebar_collapsed}
                onCollapsedChange={(collapsed) => onLayoutChange?.({ sidebar_collapsed: collapsed })}
              />
            )}

            {/* ستون کارت‌های میانی: TopBar + Main + BottomBar */}
            <div className="flex min-w-0 flex-1 flex-col gap-4 pt-6 overflow-visible">
              {/* ۳. کارت مستقل TopBar (در صورت فعال بودن zones.top_bar) */}
              {zones.top_bar && (
                <TopBarEditor
                  formTitle={formTitle}
                  formDescription={defaults?.top_bar?.description || formDescription}
                  onTitleChange={onTitleChange}
                  onDescriptionChange={(desc) => {
                    onDescriptionChange?.(desc);
                    onTopBarChange?.({ description: desc });
                  }}
                  onTitleBlur={onTitleBlur}
                  onDescriptionBlur={onDescriptionBlur}
                  mode={defaults?.top_bar?.mode}
                  onModeChange={(mode) => onTopBarChange?.({ mode })}
                  noticeText={defaults?.top_bar?.notice_text}
                  onNoticeTextChange={(noticeText) => onTopBarChange?.({ notice_text: noticeText })}
                  pages={pages}
                  activePageIndex={activePageIndex}
                />
              )}

              {/* ۴. کارت واحد بدنه اصلی: دارای شناسه zone-main شامل FieldCardها */}
              <div
                id="zone-main"
                className="group/main relative flex flex-col gap-4 rounded-nf-card border border-nf-border bg-nf-card p-4 md:p-6 text-nf-card-foreground shadow-sm transition-colors overflow-visible"
              >
                {/* میکرو-تولبار شناور روی لبه بالای کارت بدنه اصلی برای کنترل چیدمان ستون‌ها */}
                <div className="absolute -top-3.5 end-4 z-10 flex items-center gap-1.5 opacity-90 transition-opacity md:opacity-0 group-hover/main:opacity-100 focus-within:opacity-100">
                  <div className="flex items-center gap-1 rounded-lg border border-nf-border bg-nf-card px-2 py-0.5 text-xs shadow-xs">
                    <span className="text-[11px] font-medium text-nf-muted-foreground ps-0.5">چیدمان بدنه</span>
                    <div className="h-3 w-px bg-nf-border" />
                    <button
                      type="button"
                      onClick={toggleColumns}
                      aria-label={columns === 1 ? 'تغییر به دو ستونه' : 'تغییر به تک ستونه'}
                      title={columns === 1 ? 'چیدمان دو ستونه' : 'چیدمان تک ستونه'}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-nf-muted-foreground hover:bg-nf-muted hover:text-nf-card-foreground transition-colors outline-none cursor-pointer"
                    >
                      {columns === 1 ? (
                        <>
                          <LayoutGridIcon className="size-3" />
                          <span className="hidden sm:inline">دو ستونه</span>
                        </>
                      ) : (
                        <>
                          <LayoutListIcon className="size-3" />
                          <span className="hidden sm:inline">تک ستونه</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <section
                  aria-label="المان‌های صفحه"
                  className={cn(
                    'grid gap-x-5 gap-y-5',
                    columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
                  )}
                >
                  {children}
                </section>
              </div>

              {/* ۵. کارت مستقل BottomBar (در صورت فعال بودن zones.bottom_bar) */}
              {zones.bottom_bar && (
                <BottomBarEditor
                  pages={pages}
                  activePageIndex={activePageIndex}
                  fixed={layout?.bottom_bar_fixed}
                  onFixedChange={(fixed) => onLayoutChange?.({ bottom_bar_fixed: fixed })}
                  prevLabel={defaults?.bottom_bar?.prev_label}
                  nextLabel={defaults?.bottom_bar?.next_label}
                  submitLabel={defaults?.bottom_bar?.submit_label}
                  onPrevLabelChange={(label) => onBottomBarChange?.({ prev_label: label })}
                  onNextLabelChange={(label) => onBottomBarChange?.({ next_label: label })}
                  onSubmitLabelChange={(label) => onBottomBarChange?.({ submit_label: label })}
                />
              )}
            </div>
          </div>

          {/* ۶. فوتر تمام‌عرض، شفاف و نمایشی (در صورت فعال بودن zones.footer) */}
          {zones.footer && (
            <footer className="w-full shrink-0 py-4 px-4 text-center text-xs text-nf-on-canvas-muted bg-transparent">
              <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-2 font-medium">
                  <span>فرم‌ساز نوروست</span>
                  <span>•</span>
                  <span>نوروفرم</span>
                </div>
                <p className="text-[11px] opacity-75">
                  {defaults?.footer?.text || 'این فرم با نوروست طراحی شده است.'}
                </p>
              </div>
            </footer>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

import { FieldCard, RuleChip } from './field-card';
export { FieldCard, RuleChip } from './field-card';

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
