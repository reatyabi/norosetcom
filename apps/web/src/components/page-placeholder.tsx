import type { ReactNode } from 'react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@noroset/ui';

/** صفحه‌ی پیش‌فرض برای مسیرهایی که محتوایشان هنوز ساخته نشده (docs/routes.md). */
export function PagePlaceholder({ icon, title, description = 'به‌زودی' }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** همان placeholder در صفحه‌ی تمام‌قد (بیرون از پوسته‌ی پنل). */
export function FullPagePlaceholder(props: Parameters<typeof PagePlaceholder>[0]) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <PagePlaceholder {...props} />
    </main>
  );
}
