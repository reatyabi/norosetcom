'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

export function ResizeHandle({ onPointerDown }: { onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="تغییر اندازهٔ ستون"
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none select-none hover:bg-primary/40"
    />
  );
}
