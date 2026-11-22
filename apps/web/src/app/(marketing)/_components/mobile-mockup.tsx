'use client';

import { SparklesIcon, ZapIcon, ShieldCheckIcon, TrendingUpIcon } from 'lucide-react';
import { mobileMockupSrc } from '@/lib/marketing-shots';
import { MockupImage } from './mockup-image';

interface MobileMockupProps {
  productId: 'noroform' | 'norolink' | 'norofile' | 'ecosystem';
  showFloatingBadges?: boolean;
  className?: string;
}

export function MobileMockup({ productId, showFloatingBadges = true, className = '' }: MobileMockupProps) {
  return (
    <div className={`relative select-none ${className}`}>
      {/* Floating Badge 1 (Top Left in RTL) - Animated on Slide */}
      {showFloatingBadges && (
        <div className="mkt-animate-enter-badge-1 absolute -top-5 -start-6 z-30 hidden sm:flex">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-background/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl">
            <span className="flex size-2.5 rounded-full bg-success ring-4 ring-success/20 animate-pulse" />
            <div className="text-xs">
              {productId === 'noroform' && <span className="font-bold text-foreground">پاسخ جدید: علی کمالی</span>}
              {productId === 'norolink' && <span className="font-bold text-tone-rose dark:text-tone-rose">+۵,۱۲۰ بازدید زنده</span>}
              {productId === 'norofile' && <span className="font-bold text-warning dark:text-tone-amber">بهینه‌سازی WebP (-۶۸٪)</span>}
              {productId === 'ecosystem' && <span className="font-bold text-primary">امنیت ایزوله FORCE RLS</span>}
            </div>
          </div>
        </div>
      )}

      {/* Floating Badge 2 (Bottom Right in RTL) - Animated on Slide */}
      {showFloatingBadges && (
        <div className="mkt-animate-enter-badge-2 absolute -bottom-5 -end-6 z-30 hidden sm:flex">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-background/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl">
            <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-blue-500 text-white shadow-sm">
              {productId === 'noroform' && <TrendingUpIcon className="size-4" />}
              {productId === 'norolink' && <SparklesIcon className="size-4" />}
              {productId === 'norofile' && <ZapIcon className="size-4" />}
              {productId === 'ecosystem' && <ShieldCheckIcon className="size-4" />}
            </div>
            <div className="text-xs">
              {productId === 'noroform' && <span className="font-extrabold text-success dark:text-success num-fa">نرخ تبدیل ۸۴.۶٪</span>}
              {productId === 'norolink' && <span className="font-extrabold text-tone-rose dark:text-tone-rose">بدون کوکی و ردیاب</span>}
              {productId === 'norofile' && <span className="font-extrabold text-warning dark:text-tone-amber">تحویل آنی از CDN</span>}
              {productId === 'ecosystem' && <span className="font-extrabold text-primary">آپ‌تایم ۹۹.۹۵٪</span>}
            </div>
          </div>
        </div>
      )}

      {/* Smartphone Chassis with Entrance Motion & Hardware Frame */}
      <div className="mkt-mobile-frame mkt-animate-enter-mobile relative w-[215px] sm:w-[245px] drop-shadow-2xl">
        {/* Physical Hardware Buttons (Side Rails) */}
        <span className="pointer-events-none absolute -start-[11px] top-14 h-5 w-[3px] rounded-s bg-slate-700 dark:bg-slate-600 shadow-sm" title="Action Button" />
        <span className="pointer-events-none absolute -start-[11px] top-23 h-9 w-[3px] rounded-s bg-slate-700 dark:bg-slate-600 shadow-sm" title="Volume Up" />
        <span className="pointer-events-none absolute -start-[11px] top-36 h-9 w-[3px] rounded-s bg-slate-700 dark:bg-slate-600 shadow-sm" title="Volume Down" />
        <span className="pointer-events-none absolute -end-[11px] top-26 h-14 w-[3px] rounded-e bg-slate-700 dark:bg-slate-600 shadow-sm" title="Power / Lock" />

        {/* Top Speaker Earpiece Slit */}
        <div className="absolute top-1 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 h-0.5 w-12 rounded-full bg-slate-800 dark:bg-slate-700 z-40" />

        {/* Dynamic Island with True Optical Camera Lens & Sensor */}
        <div className="absolute top-2.5 start-1/2 z-30 flex -translate-x-1/2 rtl:translate-x-1/2 items-center justify-between px-2.5 h-4.5 w-22 rounded-full bg-black shadow-inner">
          <span className="flex size-2 rounded-full bg-slate-900 ring-1 ring-slate-800 items-center justify-center">
            <span className="size-1 rounded-full bg-blue-950/80" />
          </span>
          <span className="size-1.5 rounded-full bg-slate-900" />
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="pointer-events-none absolute bottom-1.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 h-1 w-24 rounded-full bg-foreground/35 z-30" />

        {/* Glossy Reflection Highlight */}
        <div className="pointer-events-none absolute -inset-full z-20 bg-gradient-to-tr from-transparent via-white/8 to-transparent rotate-12" />

        {/* Screen Content: تصویر ثابت از mobile-mockup-screen.tsx (lib/marketing-shots.ts) */}
        <div className="relative h-[390px] sm:h-[450px] overflow-hidden bg-background">
          <MockupImage light={mobileMockupSrc(productId, false)} dark={mobileMockupSrc(productId, true)} sizes="245px" />
        </div>
      </div>
    </div>
  );
}

