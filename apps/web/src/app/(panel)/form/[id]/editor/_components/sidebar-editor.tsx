'use client';

import { useRef, useState } from 'react';
import {
  CopyIcon,
  EllipsisIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@noroset/ui';
import { type EditorPage, fa } from './types';

export interface SidebarEditorProps {
  pages: EditorPage[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function SidebarEditor({
  pages,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onDuplicate,
  onRename,
  title: controlledTitle,
  onTitleChange,
  collapsible = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
}: SidebarEditorProps) {
  const [localOpen, setLocalOpen] = useState(true);
  const open = controlledCollapsed !== undefined ? !controlledCollapsed : localOpen;

  const toggleOpen = () => {
    const next = !open;
    setLocalOpen(next);
    onCollapsedChange?.(!next);
  };

  const title = controlledTitle ?? 'مراحل فرم';
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);

  const startRename = (id: string, currentTitle: string) => {
    cancelled.current = false;
    setDraft(currentTitle);
    setRenaming(id);
  };

  const commitRename = () => {
    if (renaming && !cancelled.current && draft.trim()) {
      onRename?.(renaming, draft.trim());
    }
    setRenaming(null);
  };

  return (
    <aside
      aria-label="سایدبار قالب و مراحل فرم"
      className={cn(
        'transition-all duration-200 ease-fluent shrink-0',
        open ? 'w-full md:w-64' : 'w-full md:w-16',
        className,
      )}
    >
      <div className="rounded-nf-card border border-nf-border bg-nf-card text-nf-card-foreground shadow-sm overflow-hidden transition-colors">
        {/* نمای موبایل (< md): نوار افقی اسکرول‌پذیر برای اشغال نکردن فضای عمودی */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto p-2 [scrollbar-width:none]">
          {pages.map((p, i) => {
            const active = p.id === activeId;
            return (
              <div key={p.id} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors duration-150 ease-fluent outline-none',
                    active
                      ? 'bg-nf-primary text-nf-primary-foreground shadow-xs font-semibold'
                      : 'bg-nf-muted text-nf-muted-foreground hover:text-nf-card-foreground',
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-[10px] font-bold">
                    {fa(i + 1)}
                  </span>
                  <span className="max-w-24 truncate">{p.title || `مرحله ${fa(i + 1)}`}</span>
                </button>
              </div>
            );
          })}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              aria-label="افزودن مرحله"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-nf-border text-nf-muted-foreground hover:border-nf-primary hover:text-nf-primary outline-none"
            >
              <PlusIcon className="size-3" />
            </button>
          )}
        </div>

        {/* نمای دسکتاپ (>= md): حالت باز (w-64) یا جمع‌شده (w-16) */}
        <div className="hidden md:flex flex-col gap-3 p-3">
          {/* هدر سایدبار و دکمه جمع/باز کردن */}
          <div
            className={cn(
              'flex items-center gap-1.5 pb-2 border-b border-nf-border/40',
              open ? 'justify-between' : 'justify-center',
            )}
          >
            {open && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  value={title}
                  placeholder="عنوان سایدبار…"
                  aria-label="عنوان سایدبار"
                  maxLength={100}
                  onChange={(e) => onTitleChange?.(e.target.value)}
                  className="nf-inline-edit h-6 w-full min-w-0 truncate bg-transparent px-1 text-xs font-semibold text-nf-card-foreground border-b border-transparent hover:border-nf-border focus:border-nf-primary focus:outline-none transition-colors"
                />
              </div>
            )}

            {collapsible && (
              <button
                type="button"
                onClick={toggleOpen}
                aria-label={open ? 'جمع کردن سایدبار' : 'باز کردن سایدبار'}
                title={open ? 'جمع کردن سایدبار' : 'باز کردن سایدبار'}
                className="flex size-7 items-center justify-center rounded-md text-nf-muted-foreground hover:bg-nf-muted hover:text-nf-card-foreground transition-colors outline-none"
              >
                {open ? (
                  <PanelRightCloseIcon className="size-4" />
                ) : (
                  <PanelRightOpenIcon className="size-4" />
                )}
              </button>
            )}
          </div>

          {/* لیست مراحل در حالت باز */}
          {open ? (
            <div className="flex flex-col gap-1">
              {pages.map((p, i) => {
                const active = p.id === activeId;
                const isRenamingThis = renaming === p.id;

                if (isRenamingThis) {
                  return (
                    <div key={p.id} className="flex w-full items-center gap-2 rounded-lg bg-nf-muted/50 p-1.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nf-primary text-nf-primary-foreground text-xs font-bold">
                        {fa(i + 1)}
                      </span>
                      <input
                        autoFocus
                        value={draft}
                        aria-label="نام مرحله"
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
                        className="h-7 w-full min-w-0 rounded-md bg-nf-card px-2 text-xs font-medium text-nf-card-foreground ring-1 ring-nf-primary outline-none"
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={cn(
                      'group/item relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors duration-150 ease-fluent',
                      active
                        ? 'bg-nf-primary/10 text-nf-card-foreground font-medium'
                        : 'hover:bg-nf-muted/60 text-nf-muted-foreground hover:text-nf-card-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        active
                          ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                          : 'bg-nf-muted text-nf-muted-foreground group-hover/item:bg-nf-card-foreground/10',
                      )}
                    >
                      {fa(i + 1)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium">
                        {p.title || `مرحله ${fa(i + 1)}`}
                      </span>
                      <span className="truncate text-[10px] text-nf-muted-foreground">
                        {p.fields?.length > 0 ? `${fa(p.fields.length)} پرسش` : 'بدون پرسش'}
                      </span>
                    </div>

                    {/* منوی گزینه‌های صفحه (تغییر نام، کپی، حذف) */}
                    {(onRename || onDuplicate || onRemove) && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'shrink-0 transition-opacity',
                          active ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100 focus-within:opacity-100',
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="گزینه‌های مرحله"
                                className="size-6 text-nf-muted-foreground hover:text-nf-card-foreground"
                              />
                            }
                          >
                            <EllipsisIcon className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-36">
                            {onRename && (
                              <DropdownMenuItem onClick={() => startRename(p.id, p.title)}>
                                <PencilIcon className="size-3.5" />
                                تغییر نام
                              </DropdownMenuItem>
                            )}
                            {onDuplicate && (
                              <DropdownMenuItem onClick={() => onDuplicate(p.id)}>
                                <CopyIcon className="size-3.5" />
                                کپی مرحله
                              </DropdownMenuItem>
                            )}
                            {onRemove && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={pages.length < 2}
                                  onClick={() => onRemove(p.id)}
                                >
                                  <Trash2Icon className="size-3.5" />
                                  حذف مرحله
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {active && !onRename && !onDuplicate && !onRemove && (
                      <span className="size-1.5 shrink-0 rounded-full bg-nf-primary" />
                    )}
                  </div>
                );
              })}

              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-nf-border py-1.5 text-xs text-nf-muted-foreground transition-colors hover:border-nf-primary hover:text-nf-primary outline-none"
                >
                  <PlusIcon className="size-3.5" />
                  <span>افزودن مرحله</span>
                </button>
              )}
            </div>
          ) : (
            /* لیست مراحل در حالت جمع‌شده: دایره‌ها به همراه Tooltip */
            <div className="flex flex-col items-center gap-2">
              {pages.map((p, i) => {
                const active = p.id === activeId;
                return (
                  <Tooltip key={p.id}>
                    <TooltipTrigger
                      onClick={() => onSelect(p.id)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors outline-none',
                        active
                          ? 'bg-nf-primary text-nf-primary-foreground shadow-xs'
                          : 'bg-nf-muted text-nf-muted-foreground hover:bg-nf-card-foreground/10 hover:text-nf-card-foreground',
                      )}
                    >
                      {fa(i + 1)}
                    </TooltipTrigger>
                    <TooltipContent side="inline-end" sideOffset={8}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{p.title || `مرحله ${fa(i + 1)}`}</span>
                        <span className="text-[10px] opacity-80">
                          {p.fields?.length > 0 ? `${fa(p.fields.length)} پرسش` : 'بدون پرسش'}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {onAdd && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={onAdd}
                    aria-label="افزودن مرحله"
                    className="flex size-7 items-center justify-center rounded-full border border-dashed border-nf-border text-nf-muted-foreground hover:border-nf-primary hover:text-nf-primary outline-none"
                  >
                    <PlusIcon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="inline-end" sideOffset={8}>
                    افزودن مرحله
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
