'use client';

import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

// همه‌ی آیکون‌های Lucide برای دکمه‌های صفحه‌ی لینک (docs/architecture.md §9.2): مجموعه‌ی کامل بزرگ است، پس در
// مرورگر فقط وقتی لازم شد (المانی با آیکون Lucide یا باز شدن انتخابگر) به‌صورت تنبل و یک‌بار بارگذاری می‌شود.
// صفحه‌ی عمومی همین را در سرور رندر می‌کند (lucide-icons.server.tsx) و JS اضافه نمی‌فرستد.

export type LucideIcons = (typeof import('lucide-react'))['icons'];

let cache: LucideIcons | null = null;
let loading: Promise<LucideIcons> | null = null;
const listeners = new Set<() => void>();

export function loadLucideIcons(): Promise<LucideIcons> {
  loading ??= import('lucide-react').then((m) => {
    cache = m.icons;
    listeners.forEach((l) => l());
    return m.icons;
  });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** رندر آیکون با نام کلید `icons` (همان مقدار ذخیره‌شده)؛ نام ناشناخته ← null. */
export function renderLucide(icons: LucideIcons, name: string): ReactNode {
  const Icon = (icons as Record<string, LucideIcons[keyof LucideIcons] | undefined>)[name];
  return Icon ? <Icon aria-hidden /> : null;
}

/** مجموعه‌ی آیکون‌ها (null تا بارگذاری)؛ با `enabled` بارگذاری شروع می‌شود. */
export function useLucideSet(enabled = true): LucideIcons | null {
  const icons = useSyncExternalStore(subscribe, () => cache, () => null);
  useEffect(() => {
    if (enabled && !cache) void loadLucideIcons();
  }, [enabled]);
  return icons;
}

/** resolver برای `LinkPage.lucideIcon` در مرورگر؛ تا بارگذاری undefined (جای خالی هم‌اندازه). */
export function useLucideIcon(enabled: boolean): ((name: string) => ReactNode) | undefined {
  const icons = useLucideSet(enabled);
  return useMemo(() => (icons ? (name: string) => renderLucide(icons, name) : undefined), [icons]);
}

/** آیا صفحه آیکون Lucide دارد (تا مجموعه فقط در صورت نیاز بارگذاری شود). */
export function usesLucide(elements: readonly { kind: string; settings: unknown }[]): boolean {
  return elements.some(
    (e) => e.kind === 'link_button' && (e.settings as { icon?: { kind?: string } | null }).icon?.kind === 'lucide',
  );
}
