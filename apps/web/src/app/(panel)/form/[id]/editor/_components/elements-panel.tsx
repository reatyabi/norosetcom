'use client';

/**
 * فهرست المان‌های پایه: کلیک روی هر المان آن را به پایان صفحه اضافه می‌کند و دکمه‌ی چشم،
 * پیش‌نمایش قابل‌امتحان را پیش از افزودن نشان می‌دهد.
 * جستجو با «ی/ك» عربی و نیم‌فاصله هم تطبیق داده می‌شود تا تایپ فارسی همیشه نتیجه بدهد.
 */

import { useState } from 'react';
import { EyeIcon, SearchIcon } from 'lucide-react';
import { cn, Input, ScrollArea, Skeleton } from '@noroset/ui';
import { type ElementDef, fa } from './types';
import { hoverScroll, IconAction } from '@/components/editor-ui';
import { BASIC_GROUPS } from './data';
import { filterGroups } from './editor-ops';

const ALL_ITEMS = BASIC_GROUPS.flatMap((group) => group.items);

export function ElementsPanel({
  loading,
  onAdd,
  onPreview,
  className,
}: {
  loading: boolean;
  onAdd: (d: ElementDef) => void;
  onPreview: (d: ElementDef) => void;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const groups = filterGroups(BASIC_GROUPS, query);

  return (
    <aside
      aria-label="المان‌های فرم"
      className={cn(
        'flex w-58 shrink-0 flex-col overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-border',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-3.5 pt-3">
        <span className="text-sm font-semibold">المان‌ها</span>
        {!loading && !searching && (
          <span className="text-[11px] text-muted-foreground">{fa(ALL_ITEMS.length)} المان</span>
        )}
      </div>
      <div className="relative p-3 pb-2">
        <SearchIcon className="pointer-events-none absolute start-5.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          aria-label="جستجوی المان"
          placeholder="جستجو"
          className="ps-8"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ScrollArea className={cn('min-h-0 flex-1', hoverScroll)}>
        <div className="flex flex-col gap-3 px-3 pb-3">
          {loading ? (
            [6, 4].map((n, gi) => (
              <div key={gi} className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-14" />
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: n }, (_, i) => (
                    <Skeleton key={i} className="h-9 rounded-lg" />
                  ))}
                </div>
              </div>
            ))
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-foreground/15 px-3 py-6 text-center">
              <span className="text-xs font-medium">المانی با این نام نیست</span>
              <span className="text-[11px] leading-5 text-muted-foreground">عبارت کوتاه‌تری بنویس یا جستجو را پاک کن.</span>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.title} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{g.title}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.items.map((d) => (
                    <div key={d.key} className="group/tile relative">
                      <button
                        type="button"
                        aria-label={`افزودن ${d.label}`}
                        onClick={() => onAdd(d)}
                        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-secondary px-2.5 text-start transition-colors duration-150 ease-fluent outline-none hover:bg-card focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{d.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-xs">{d.label}</span>
                      </button>
                      <IconAction
                        label={`پیش‌نمایش ${d.label}`}
                        size="icon-xs"
                        className="absolute end-1 top-1/2 -translate-y-1/2 bg-card opacity-0 shadow-xs transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
                        onClick={() => onPreview(d)}
                      >
                        <EyeIcon />
                      </IconAction>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
