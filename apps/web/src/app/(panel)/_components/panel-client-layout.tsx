'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '@noroset/ui';
import { SkipLink } from '@/components/skip-link';
import { PageHeadProvider } from '@/components/page-head';
import { isTenantFree, SessionProvider, useSession } from '../session';
import { moduleOfPath, ModuleStatesProvider, ModuleUnavailable, unavailableModule, useModuleStates } from '../modules';
import { PlatformBar, ProductBar, ProductSearchProvider } from '../product-bar';
import { Announcements } from '../announcements';
import { PlanBanner } from '../plan-banner';
import { SupportBanner } from '../support-banner';
import { ItemGridSkeleton, PanelLayoutSkeleton } from './page-skeletons';

/** تا ساخته شدن فضای کاری خودکار، یا پیام خطا اگر نشد. */
function TenantPending({ className }: { className: string }) {
  const { tenantSetupFailed } = useSession();
  return (
    <div className={className}>
      {tenantSetupFailed ? (
        <p className="text-sm text-muted-foreground">حساب شما آماده نشد. صفحه را دوباره باز کنید.</p>
      ) : (
        <div className="w-full max-w-7xl px-4 py-8">
          <ItemGridSkeleton count={4} />
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { tenant } = useSession();
  const pathname = usePathname();
  const isEditor = pathname.endsWith('/editor');
  const fullWidth = isFullWidthPath(pathname);
  const product = moduleOfPath(pathname);
  const modules = useModuleStates();
  const blocked = unavailableModule(modules, pathname);

  const content = blocked ? (
    <ModuleUnavailable module={blocked} />
  ) : tenant || isTenantFree(pathname) ? (
    children
  ) : (
    <TenantPending className="flex justify-center py-10" />
  );

  // ادیتورها تمام‌صفحه‌اند: بدون سایدبار و نوار عنوان پنل.
  if (isEditor) {
    return (
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <SkipLink />
        <SupportBanner />
        <main id="main-content" className="flex min-h-0 flex-1 flex-col">
          {blocked ? (
            <div className="mx-auto w-full max-w-xl p-6">
              <ModuleUnavailable module={blocked} />
            </div>
          ) : tenant || isTenantFree(pathname) ? (
            children
          ) : (
            <TenantPending className="flex flex-1 items-center justify-center" />
          )}
        </main>
      </div>
    );
  }

  if (product) {
    return (
      // key: عبارت جست‌وجو با رفتن به محصول دیگر پاک می‌شود.
      <ProductSearchProvider key={product}>
        <div className="flex min-h-svh flex-col">
          <SkipLink />
          <Banners />
          <ProductBar
            product={product}
            className="sticky top-0 z-20 border-b border-transparent px-2 transition-colors data-scrolled:bg-background data-scrolled:border-border md:px-3"
          />
          <Body fullWidth={fullWidth}>{content}</Body>
        </div>
      </ProductSearchProvider>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <Banners />
      <PlatformBar className="sticky top-0 z-20 border-b border-transparent px-2 transition-colors data-scrolled:bg-background data-scrolled:border-border md:px-3" />
      <Body fullWidth={fullWidth}>{content}</Body>
    </div>
  );
}

function Banners() {
  return (
    <>
      <SupportBanner />
      <PlanBanner />
      <Announcements />
    </>
  );
}

/** صفحه‌های جدول‌محور (مثل پاسخ‌های فرم) تمام عرض بدنه را می‌گیرند تا ستون‌های جدول جا شوند. */
const FULL_WIDTH_ROUTES: RegExp[] = [/^\/form\/[^/]+\/results\/?$/];

function isFullWidthPath(pathname: string) {
  return FULL_WIDTH_ROUTES.some((route) => route.test(pathname));
}

/** ویندوز ۱۱: سرصفحه (عنوان، اقدام‌ها و کنترل‌های اصلی صفحه) روی Mica، محتوا روی کارت جزیره‌ای گرد. */
function Body({ children, fullWidth = false }: { children: ReactNode; fullWidth?: boolean }) {
  // جای سرصفحه‌ی صفحه‌ها (`PageHead`)؛ با رندر شدن div ست می‌شود.
  const [headSlot, setHeadSlot] = useState<HTMLElement | null>(null);
  // صفحه‌های معمول در عرض خوانا وسط‌چین‌اند؛ صفحه‌های جدول‌محور تمام عرض را می‌گیرند.
  const container = fullWidth ? 'w-full' : 'mx-auto w-full max-w-7xl';
  return (
    <PageHeadProvider slot={headSlot}>
      <div ref={setHeadSlot} className={cn(container, 'px-4 pt-2 pb-5 empty:hidden max-md:pt-5 md:px-8')} />
      <div className="mx-2 mb-2 flex-1 rounded-xl border border-border bg-background shadow-xs md:mx-3 md:mb-3">
        <main id="main-content" className={cn(container, 'px-4 py-6 md:px-8 md:py-8')}>
          {children}
        </main>
      </div>
    </PageHeadProvider>
  );
}

export function PanelClientLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider fallback={<PanelLayoutSkeleton />}>
      <ModuleStatesProvider>
        <Shell>{children}</Shell>
      </ModuleStatesProvider>
    </SessionProvider>
  );
}

