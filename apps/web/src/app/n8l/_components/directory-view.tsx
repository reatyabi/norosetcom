'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowLeftIcon, FilterIcon, SearchIcon, SlidersHorizontalIcon, SparklesIcon, XIcon } from 'lucide-react';
import type { DirectoryPageItem } from '../types';
import { PageCard } from './page-card';
import { QrModal } from './qr-modal';

interface DirectoryViewProps {
  initialPages: DirectoryPageItem[];
  publicHost: string;
  devPort?: string;
}

export function DirectoryView({ initialPages, publicHost, devPort }: DirectoryViewProps) {
  const searchInputId = useId();
  const sortSelectId = useId();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'links'>('newest');

  // QR Modal state
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    title: string;
    slug: string;
    url: string;
  }>({
    isOpen: false,
    title: '',
    slug: '',
    url: '',
  });

  const handleOpenQr = (item: DirectoryPageItem, url: string) => {
    setQrModalData({
      isOpen: true,
      title: item.title,
      slug: item.slug,
      url,
    });
  };

  const handleCloseQr = () => {
    setQrModalData((prev) => ({ ...prev, isOpen: false }));
  };

  // Filter & Sort
  const filteredPages = useMemo(() => {
    let result = [...initialPages];

    // Filter Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.links.some((l) => l.label.toLowerCase().includes(q)),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title, 'fa');
      if (sortBy === 'links') return (b.links.length || 0) - (a.links.length || 0);
      // newest
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    });

    return result;
  }, [initialPages, search, sortBy]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section — سبک marketing نوروست */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-pink-500/[0.05] via-rose-500/[0.02] to-background py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/20 bg-tone-rose/10 px-3.5 py-1 text-xs font-semibold text-tone-rose dark:text-tone-rose mb-5">
            <SparklesIcon className="size-3.5 text-pink-500" />
            <span>شبکه صفحات پیوند اختصاصی n8l.ir</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground max-w-2xl mx-auto leading-tight">
            دایرکتوری صفحات پیوند{' '}
            <span className="text-tone-rose dark:text-tone-rose">نورولینک</span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            مجموعه‌ای از صفحات اختصاصی کسب‌وکارها، سازندگان محتوا و برندها در بستر یکپارچه n8l.ir
          </p>

          {/* Stats Cards — hardcoded, marketing-style */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm mx-auto sm:max-w-md">
            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-4 shadow-xs">
              <p className="text-xl font-black text-tone-rose dark:text-tone-rose" dir="ltr">+۵۰۰</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">صفحه فعال</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-4 shadow-xs">
              <p className="text-xl font-black text-tone-rose dark:text-tone-rose" dir="ltr">۱۲</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">قالب اختصاصی</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-4 shadow-xs">
              <p className="text-xl font-black text-tone-rose dark:text-tone-rose" dir="ltr">رایگان</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">شروع کنید</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-7 mx-auto max-w-xl">
            <div className="relative flex items-center rounded-xl border border-border/70 bg-card/90 p-1 shadow-2xs backdrop-blur-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20">
              <label htmlFor={searchInputId} className="sr-only">
                جستجوی صفحه، نام یا موضوع
              </label>
              <div className="flex size-10 items-center justify-center text-muted-foreground">
                <SearchIcon className="size-4" />
              </div>
              <input
                id={searchInputId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو بر اساس نام، نشانی (slug)، بیو یا پیوندها..."
                className="w-full bg-transparent px-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="پاک کردن جستجو"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Controls & Active State Bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FilterIcon className="size-3.5 text-tone-rose dark:text-tone-rose" />
            <span>
              نمایش <strong className="font-bold text-foreground">{filteredPages.length}</strong> صفحه در شبکه
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mr-2 inline-flex items-center gap-1 text-[11px] font-medium text-tone-rose dark:text-tone-rose hover:underline"
              >
                <XIcon className="size-3" />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor={sortSelectId} className="flex items-center gap-1.5 text-muted-foreground">
              <SlidersHorizontalIcon className="size-3.5" />
              <span>مرتب‌سازی:</span>
            </label>
            <select
              id={sortSelectId}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'name' | 'links')}
              className="rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs text-foreground focus:border-pink-500 focus:outline-none"
            >
              <option value="newest">جدیدترین صفحات</option>
              <option value="links">بیشترین پیوندها</option>
              <option value="name">بر اساس نام (الفبا)</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        {filteredPages.length > 0 ? (
          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPages.map((item) => (
              <PageCard
                key={item.slug}
                item={item}
                publicHost={publicHost}
                devPort={devPort}
                onOpenQr={handleOpenQr}
              />
            ))}
          </div>
        ) : initialPages.length === 0 ? (
          <div className="my-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <SparklesIcon className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">هنوز صفحه‌ای در دایرکتوری نیست</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              صفحه‌هایی که صاحبشان نمایش در موتورهای جستجو را روشن کرده‌اند این‌جا می‌آیند.
            </p>
          </div>
        ) : (
          /* Empty State */
          <div className="my-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <SearchIcon className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">صفحه‌ای با این مشخصات پیدا نشد</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              عبارت جستجو را تغییر دهید.
            </p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 transition-colors"
            >
              <span>مشاهده تمام صفحات</span>
            </button>
          </div>
        )}

        {/* CTA Banner to Norolink Landing */}
        <section className="mt-14 overflow-hidden rounded-3xl border border-pink-500/25 bg-gradient-to-br from-pink-500/[0.06] via-rose-500/[0.02] to-card p-7 sm:p-10 shadow-2xs">
          <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/25 bg-tone-rose/10 px-3 py-1 text-xs font-bold text-tone-rose dark:text-tone-rose">
              <SparklesIcon className="size-3.5" />
              <span>نورولینک — ساخت صفحه پیوند اختصاصی</span>
            </span>

            <h2 className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
              صفحه اختصاصی خود را در n8l.ir بسازید
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              ویترین پیوندهای شبکه‌های اجتماعی، نمونه‌کارها، خدمات و محصولات خود را در کمتر از ۲ دقیقه با قالب‌های هوشمند طراحی و منتشر کنید.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="https://noroset.com/landing/link"
                className="inline-flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
              >
                <span>مشاهده امکانات و ویژگی‌های نورولینک</span>
                <ArrowLeftIcon className="size-3.5" />
              </a>
              <a
                href="https://noroset.com/link"
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <span>ورود به پنل و ساخت صفحه</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* QR Code Modal Instance */}
      <QrModal
        isOpen={qrModalData.isOpen}
        onClose={handleCloseQr}
        title={qrModalData.title}
        slug={qrModalData.slug}
        url={qrModalData.url}
      />
    </div>
  );
}
