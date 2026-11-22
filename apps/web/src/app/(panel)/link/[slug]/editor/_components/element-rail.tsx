'use client';

import { cn, Skeleton, Tooltip, TooltipContent, TooltipTrigger } from '@noroset/ui';
import type { ElementKind } from '@noroset/norolink/ui';
import { ELEMENT_GROUPS } from './meta';

/** نیم‌پهنای بوم (`--canvas-half` از نمای موبایل/دسکتاپ؛ board.tsx) + فاصله تا ریل؛ ریل درست بیرون لبه‌ی بوم می‌نشیند. */
const BESIDE_CANVAS = 'md:left-[min(calc(50%_+_var(--canvas-half)_+_14px),calc(100%_-_4.25rem))]';

/**
 * ریل افزودن المان: هر المان یک دکمه‌ی آیکونی مربعی با رنگ ملایم خودش.
 * دسکتاپ: absolute کنار لبه‌ی بوم، وسط عمودی، زمینه‌ی شفاف، دکمه‌ی ۵۶px با tooltip (نام و توضیح) — جای بوم را تغییر نمی‌دهد.
 * موبایل: نوار ناوبری شیشه‌ای پایین صفحه با نام کوتاه زیر هر آیکون.
 */
export function ElementRail({
  loading,
  onAdd,
  className,
}: {
  loading: boolean;
  onAdd: (kind: ElementKind) => void;
  className?: string;
}) {
  const items = ELEMENT_GROUPS.flatMap((g) => g.items);
  return (
    <nav
      aria-label="افزودن المان"
      className={cn(
        'z-20 flex',
        // دسکتاپ: ستون عمودی شناور کنار بوم
        'md:absolute md:top-1/2 md:-translate-y-1/2 md:flex-col md:gap-2.5',
        BESIDE_CANVAS,
        // موبایل: نوار پایین شیشه‌ای
        'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:justify-around max-md:border-t max-md:border-white/15 max-md:bg-background/60 max-md:px-1 max-md:pt-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-8px_24px_rgba(0,0,0,0.12)] max-md:backdrop-blur-xl max-md:backdrop-saturate-150',
        // هنگام تایپ (کیبورد باز) نوار جای فیلد در حال ویرایش را نگیرد
        'max-md:[body:has(input:focus,textarea:focus)_&]:hidden',
        className,
      )}
    >
      {items.map((m) =>
        loading ? (
          <Skeleton key={m.kind} className="size-11 rounded-xl md:size-14 md:rounded-2xl" />
        ) : (
          <Tooltip key={m.kind}>
            <TooltipTrigger
              delay={150}
              render={
                <button
                  type="button"
                  aria-label={`افزودن ${m.label}`}
                  onClick={() => onAdd(m.kind)}
                  className="group flex flex-col items-center gap-1 outline-none max-md:min-w-12 max-md:flex-1"
                />
              }
            >
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl shadow-xs transition-[background-color,transform] duration-150 ease-fluent group-hover:scale-105 group-focus-visible:outline-2 group-focus-visible:outline-ring group-active:scale-95 md:size-14 md:rounded-2xl [&_svg]:size-5 md:[&_svg]:size-6',
                  m.tone,
                )}
              >
                {m.icon}
              </span>
              <span className="text-[10px] leading-none font-medium text-foreground/80 md:hidden">{m.short}</span>
            </TooltipTrigger>
            <TooltipContent side="inline-start" className="max-md:hidden">
              <span className="flex flex-col gap-0.5 py-0.5">
                <span className="text-sm font-semibold">{m.label}</span>
                <span className="text-muted-foreground">{m.description}</span>
              </span>
            </TooltipContent>
          </Tooltip>
        ),
      )}
    </nav>
  );
}
