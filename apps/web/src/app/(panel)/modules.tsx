'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, MotionArt } from '@noroset/ui';
import { MODULE_DEFAULT_MESSAGE, MODULE_LABEL, type ModuleKey, type ModuleState } from '@noroset/admin/ui';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';

// وضعیت سراسری ماژول‌ها در پنل (docs/architecture.md §9.11). گارد واقعی در بک‌اند است (۵۰۳)؛ اینجا فقط
// منو و یک پیام روشن به‌جای خطاهای پراکنده.

/** مسیر پنل هر ماژول (ادیتورها هم زیر همین مسیرند). */
export const MODULE_HOME: Record<ModuleKey, string> = {
  noroform: routes.form.home,
  norolink: routes.link.home,
  norofile: routes.file.home,
};

const ModuleStatesContext = createContext<ModuleState[]>([]);

/** یک‌بار هنگام بالا آمدن پنل؛ خطا ← همه فعال فرض می‌شوند (بک‌اند به‌هرحال اعمال می‌کند). */
export function ModuleStatesProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<ModuleState[]>([]);
  useEffect(() => {
    let current = true;
    api<ModuleState[]>('/modules').then(
      (rows) => {
        if (current) setStates(rows);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);
  return <ModuleStatesContext.Provider value={states}>{children}</ModuleStatesContext.Provider>;
}

export function useModuleStates(): ModuleState[] {
  return useContext(ModuleStatesContext);
}

/** محصولی که مسیر جاری زیر آن است (صفحه‌های هسته‌ی پلتفرم ← null). */
export function moduleOfPath(pathname: string): ModuleKey | null {
  // فرم داخلی در پوسته‌ی پنل، ماژول نوروفرم است.
  if (pathname === routes.form.internalRoot || pathname.startsWith(`${routes.form.internalRoot}/`)) return 'noroform';
  const keys = Object.keys(MODULE_HOME) as ModuleKey[];
  return keys.find((k) => pathname === MODULE_HOME[k] || pathname.startsWith(`${MODULE_HOME[k]}/`)) ?? null;
}

/** ماژول غیرفعالِ مسیر جاری، اگر باشد. */
export function unavailableModule(states: ModuleState[], pathname: string): ModuleState | null {
  const key = moduleOfPath(pathname);
  return states.find((m) => m.key === key && m.status !== 'active') ?? null;
}

export function ModuleUnavailable({ module }: { module: ModuleState }) {
  const status = module.status === 'off' ? 'off' : 'maintenance';
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia>
          <MotionArt key={status} name={status === 'off' ? 'offline' : 'maintenance'} className="size-28" />
        </EmptyMedia>
        <EmptyTitle>
          {MODULE_LABEL[module.key]} {status === 'off' ? 'در دسترس نیست' : 'در حال به‌روزرسانی است'}
        </EmptyTitle>
        <EmptyDescription>{module.message || MODULE_DEFAULT_MESSAGE[status]}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
