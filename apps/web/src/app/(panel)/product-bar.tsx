'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowRightIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button, cn, Separator, SystemIcon } from '@noroset/ui';
import { MODULE_LABEL, type ModuleKey } from '@noroset/admin/ui';
import { BrandLogo } from '@/components/brand';
import { routes } from '@/lib/routes';
import { MODULE_HOME } from './modules';
import { ProductNavMenu } from './shell-menus';

// ---------- جست‌وجوی محصول ----------
// عبارت جست‌وجوی نوار بالا بین صفحه‌های یک محصول می‌ماند؛ صفحه‌ی اصلی محصول فهرستش را با آن فیلتر می‌کند.

const SearchContext = createContext<{ query: string; setQuery: (q: string) => void }>({ query: '', setQuery: () => undefined });

export function ProductSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useProductSearch(): string {
  return useContext(SearchContext).query.trim();
}

const SEARCH_PLACEHOLDER: Record<ModuleKey, string> = {
  noroform: 'جست‌وجو در فرم‌ها',
  norolink: 'جست‌وجو در صفحه‌های لینک',
  norofile: 'جست‌وجو در فایل‌ها',
};

function SearchField({ product, autoFocus, onClose, className }: { product: ModuleKey; autoFocus?: boolean; onClose?: () => void; className?: string }) {
  const { query, setQuery } = useContext(SearchContext);
  const router = useRouter();
  const pathname = usePathname();
  const home = MODULE_HOME[product];
  return (
    <div role="search" className={cn('flex h-11 items-center gap-1 rounded-full bg-muted px-1.5 focus-within:bg-card focus-within:shadow-lg', className)}>
      {onClose ? (
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="بستن جست‌وجو" onClick={onClose}>
          <ArrowRightIcon />
        </Button>
      ) : (
        <SearchIcon className="mx-2 size-5 shrink-0 text-muted-foreground" />
      )}
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        maxLength={100}
        placeholder={SEARCH_PLACEHOLDER[product]}
        aria-label={SEARCH_PLACEHOLDER[product]}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        onChange={(e) => {
          setQuery(e.target.value);
          // مثل گوگل: جست‌وجو از هر زیرصفحه نتیجه را در صفحه‌ی اصلی محصول نشان می‌دهد.
          if (pathname !== home) router.push(home);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('');
            onClose?.();
          }
        }}
      />
      {query ? (
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="پاک کردن جست‌وجو" onClick={() => setQuery('')}>
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}

// ---------- نوار ----------

function subscribeScroll(listener: () => void) {
  window.addEventListener('scroll', listener, { passive: true });
  return () => window.removeEventListener('scroll', listener);
}

/** صفحه از بالا اسکرول شده است (نوار چسبان پس‌زمینه و خط می‌گیرد، مثل گوگل). */
function useScrolled(): boolean {
  return useSyncExternalStore(subscribeScroll, () => window.scrollY > 0, () => false);
}

/**
 * نوار بالای همه‌ی صفحه‌های محصولات (نورولینک، نوروفرم، نوروفایل):
 * نشان و نام محصول در سمت راست، کادر جست‌وجو یا عنوان ادیتور در میانه،
 * و دکمه‌های اقدام صفحه به همراه آواتار کاربر با لاین ترند اشتراک در سمت چپ.
 */
export function ProductBar({
  product,
  actions,
  workspace = true,
  className,
  children,
}: {
  product: ModuleKey;
  actions?: ReactNode;
  /** انتخاب فضای کاری؛ در ادیتور نه (صفحه مال همین فضای کاری است). */
  workspace?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const browsing = !children;
  const scrolled = useScrolled();
  return (
    <header data-scrolled={scrolled || undefined} className={cn('relative flex h-16 shrink-0 items-center gap-2', className)}>
      <ProductNavMenu currentProduct={product} workspace={workspace} />
      <Link href={MODULE_HOME[product]} className={cn('flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 hover:bg-muted', children && 'max-md:hidden')}>
        <SystemIcon name={product} className="size-8" />
        <span className={cn('text-lg font-semibold sm:text-xl', children && 'max-md:sr-only')}>{MODULE_LABEL[product]}</span>
      </Link>
      {children ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-6 max-md:hidden" />
          <div className="flex min-w-0 flex-1 items-center">{children}</div>
        </>
      ) : (
        <div className="flex min-w-0 flex-1 justify-center px-2 md:px-6">
          <SearchField product={product} className="w-full max-w-2xl max-sm:hidden" />
          <Button variant="ghost" size="icon-lg" className="ms-auto rounded-full sm:hidden" aria-label="جست‌وجو" onClick={() => setMobileSearch(true)}>
            <SearchIcon className="size-5" />
          </Button>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 ms-auto">
        {actions}
      </div>
      {browsing && mobileSearch ? (
        <div className="absolute inset-0 z-10 flex items-center bg-background px-2 sm:hidden">
          <SearchField product={product} autoFocus onClose={() => setMobileSearch(false)} className="w-full" />
        </div>
      ) : null}
    </header>
  );
}

/**
 * نوار بالای صفحه‌های هسته‌ی پلتفرم (داشبورد، اشتراک، حساب کاربری، مدیریت):
 * نشان و نام پلتفرم نوروست در سمت راست، محتوا در میانه،
 * و اقدام‌ها در سمت چپ.
 */
export function PlatformBar({
  actions,
  className,
  children,
}: {
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
} = {}) {
  const scrolled = useScrolled();
  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn('relative flex h-16 shrink-0 items-center gap-2', className)}
    >
      <ProductNavMenu />
      <Link
        href={routes.link.home}
        aria-label="نوروست"
        className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 hover:bg-muted max-sm:absolute max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 sm:static sm:top-auto sm:translate-x-0 sm:translate-y-0"
      >
        <BrandLogo className="h-6 w-auto sm:h-7" />
      </Link>
      {children ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-6 max-md:hidden" />
          <div className="flex min-w-0 flex-1 items-center">{children}</div>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex shrink-0 items-center gap-2 ms-auto">
        {actions}
      </div>
    </header>
  );
}
