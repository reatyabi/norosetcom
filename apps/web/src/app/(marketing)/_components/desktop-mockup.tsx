'use client';

import { LockIcon, PlusIcon, RotateCcwIcon, Share2Icon, XIcon } from 'lucide-react';
import { desktopMockupSrc, desktopVariant } from '@/lib/marketing-shots';
import { MockupImage } from './mockup-image';

interface DesktopMockupProps {
  productId: 'noroform' | 'norolink' | 'norofile' | 'ecosystem';
  detailMode?: 'default' | 'builder' | 'analytics' | 'pipeline' | 'theme';
  className?: string;
}

export function DesktopMockup({ productId, detailMode = 'default', className = '' }: DesktopMockupProps) {
  return (
    <div className={`mkt-desktop-frame mkt-animate-enter-desktop w-full select-none text-start text-xs sm:text-sm drop-shadow-2xl ${className}`}>
      {/* Top Camera Sensor on Display Bezel */}
      <div className="pointer-events-none absolute top-1 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-40 flex items-center justify-center">
        <span className="size-1.5 rounded-full bg-slate-900 dark:bg-slate-800 ring-1 ring-slate-700/60" />
      </div>

      {/* Glossy Diagonal Reflection Sheen */}
      <div className="pointer-events-none absolute -inset-full z-20 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-12" />

      {/* Browser Chrome Header */}
      <div className="flex h-11 items-center justify-between border-b border-border/40 bg-muted/80 px-4">
        {/* Window Controls & Tabs */}
        <div className="flex items-center gap-3">
          {/* Traffic Light Buttons */}
          <div className="flex items-center gap-1.5 group">
            <span className="size-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm flex items-center justify-center text-[7px] text-[#5e0000] opacity-90 group-hover:opacity-100 font-mono">
              ✕
            </span>
            <span className="size-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm flex items-center justify-center text-[7px] text-[#614200] opacity-90 group-hover:opacity-100 font-mono">
              −
            </span>
            <span className="size-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm flex items-center justify-center text-[7px] text-[#004d11] opacity-90 group-hover:opacity-100 font-mono">
              +
            </span>
          </div>

          {/* Active Tab */}
          <div className="hidden sm:flex items-center gap-2 rounded-t-lg border-t border-x border-border/60 bg-background px-3 py-1 text-[11px] font-bold text-foreground shadow-xs">
            <span className="size-2 rounded-full bg-primary" />
            <span className="truncate max-w-[140px]">
              {productId === 'noroform' && (detailMode === 'analytics' ? 'پاسخ‌ها و اکسل' : 'ادیتور نوروفرم')}
              {productId === 'norolink' && (detailMode === 'analytics' ? 'آمار کلیک‌ها' : 'استودیو نورولینک')}
              {productId === 'norofile' && (detailMode === 'pipeline' ? 'کراپ و بهینه‌سازی' : 'انبار ابری S3')}
              {productId === 'ecosystem' && 'داشبورد سازمانی'}
            </span>
            <XIcon className="size-3 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>

          <button type="button" className="hidden sm:flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="افزودن برگه جدید">
            <PlusIcon className="size-3" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex max-w-md flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1 text-[11px] text-muted-foreground shadow-xs mx-2">
          <LockIcon className="size-3 text-success shrink-0" />
          <span className="truncate num-en font-medium text-foreground">
            {productId === 'noroform' && (detailMode === 'analytics' ? 'https://noroset.com/form/customer-experience/analytics' : 'https://noroset.com/form/customer-experience/editor')}
            {productId === 'norolink' && (detailMode === 'analytics' ? 'https://noroset.com/link/tehran-creative/analytics' : 'https://noroset.com/link/tehran-creative/editor')}
            {productId === 'norofile' && (detailMode === 'pipeline' ? 'https://noroset.com/file/cloud-vault/pipeline' : 'https://noroset.com/file/cloud-vault')}
            {productId === 'ecosystem' && 'https://noroset.com/ws/tech-hub/dashboard'}
          </span>
        </div>

        {/* Browser utility icons */}
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <button type="button" aria-label="تازه‌سازی" className="hover:text-foreground cursor-pointer transition-colors">
            <RotateCcwIcon className="size-3" />
          </button>
          <button type="button" aria-label="اشتراک‌گذاری" className="hover:text-foreground cursor-pointer transition-colors">
            <Share2Icon className="size-3.5" />
          </button>
          <span className="flex size-2 rounded-full bg-success ring-4 ring-success/20" title="اتصال امن و ایزوله" />
        </div>
      </div>

      {/* Browser Body: تصویر ثابت از desktop-mockup-screen.tsx (lib/marketing-shots.ts) */}
      <div className="relative h-[380px] overflow-hidden bg-background sm:h-[440px]">
        <MockupImage
          light={desktopMockupSrc(productId, desktopVariant(productId, detailMode), false)}
          dark={desktopMockupSrc(productId, desktopVariant(productId, detailMode), true)}
          sizes="(min-width: 1024px) 960px, 100vw"
        />
      </div>
    </div>
  );
}

