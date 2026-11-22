import { icons } from 'lucide-react';
import type { ReactNode } from 'react';

/** آیکون Lucide صفحه‌ی عمومی در سرور (Server Component؛ بدون JS در مرورگر). نام ناشناخته ← null. */
export function lucideServerIcon(name: string): ReactNode {
  const Icon = (icons as Record<string, (typeof icons)[keyof typeof icons] | undefined>)[name];
  return Icon ? <Icon aria-hidden /> : null;
}
