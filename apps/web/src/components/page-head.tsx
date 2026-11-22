'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// سرصفحه‌ی پنل (عنوان، اقدام‌ها و کنترل‌های اصلی صفحه) بیرون و بالای کارت جزیره‌ای محتوا روی Mica می‌نشیند.
// پوسته‌ی پنل جای آن را می‌سازد و صفحه‌ها با `PageHead` محتوای خود را به آن‌جا می‌فرستند (portal).

const SlotContext = createContext<HTMLElement | null>(null);

export function PageHeadProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>;
}

/**
 * محتوا را در سرصفحه‌ی پنل رندر می‌کند؛ بیرون از پوسته‌ی پنل (بدون جا) همان‌جا رندر می‌شود.
 * `PageHead` تودرتو (مثلاً `PageHeader` داخل سرصفحه‌ی مدیریت پلتفرم) سر جای خودش می‌ماند.
 */
export function PageHead({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext);
  if (!slot) return children;
  return createPortal(<SlotContext.Provider value={null}>{children}</SlotContext.Provider>, slot);
}
