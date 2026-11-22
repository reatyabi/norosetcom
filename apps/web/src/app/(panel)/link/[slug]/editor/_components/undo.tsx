'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Undo2Icon } from 'lucide-react';
import { cn } from '@noroset/ui';

/** مهلت بازگردانی حذف (المان یا آیتم شبکه). */
export const UNDO_MS = 5000;

type ShowUndo = (text: string, undo: () => void) => void;

const UndoContext = createContext<ShowUndo>(() => undefined);

/** نمایش اعلان «حذف شد · بازگردانی»؛ هر اعلان جدید قبلی را کنار می‌زند (حذف قبلی نهایی می‌ماند). */
export function useUndo(): ShowUndo {
  return useContext(UndoContext);
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; text: string; undo: () => void } | null>(null);
  const [hasDrawer, setHasDrawer] = useState(false);

  const checkDrawer = useCallback(() => {
    if (typeof document === 'undefined') return;
    setHasDrawer(!!document.querySelector('[data-slot="element-mobile-drawer"]'));
  }, []);

  const show = useCallback<ShowUndo>((text, undo) => {
    checkDrawer();
    setToast({ id: Date.now(), text, undo });
  }, [checkDrawer]);

  useEffect(() => {
    if (!toast) return;
    const raf = requestAnimationFrame(checkDrawer);

    const observer = new MutationObserver(checkDrawer);
    observer.observe(document.body, { childList: true, subtree: true });

    const t = setTimeout(() => setToast(null), UNDO_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      observer.disconnect();
    };
  }, [toast, checkDrawer]);

  return (
    <UndoContext.Provider value={show}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed inset-x-0 z-[60] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-lg ring-1 ring-border animate-in fade-in-0 slide-in-from-bottom-2 transition-[bottom] duration-200',
            hasDrawer
              ? 'bottom-[calc(50svh+1rem)] md:bottom-8'
              : 'bottom-20 max-md:bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:bottom-8',
          )}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
            onClick={() => {
              toast.undo();
              setToast(null);
            }}
          >
            <Undo2Icon className="size-4" />
            بازگردانی
          </button>
        </div>
      ) : null}
    </UndoContext.Provider>
  );
}
