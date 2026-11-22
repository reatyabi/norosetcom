'use client';

import Image from 'next/image';
import {
  SparklesIcon,
  ArrowLeftIcon,
  PlayIcon,
  UploadCloudIcon,
  ZapIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  CropIcon,
} from 'lucide-react';

// صفحه‌ی داخل قاب موکاپ موبایل؛ فقط برای ساخت تصویر ثابت (مسیر توسعه‌ی /shots). سایت تصویر آن را نشان می‌دهد.
export function MobileMockupScreen({ productId }: { productId: 'noroform' | 'norolink' | 'norofile' | 'ecosystem' }) {
  return (
    <div className="flex size-full flex-col justify-between overflow-hidden bg-background px-3.5 pt-8 pb-4 text-xs">
      {productId === 'noroform' && <NoroformMobileScreen />}
      {productId === 'norolink' && <NorolinkMobileScreen />}
      {productId === 'norofile' && <NorofileMobileScreen />}
      {productId === 'ecosystem' && <EcosystemMobileScreen />}
    </div>
  );
}

function NoroformMobileScreen() {
  return (
    <div className="flex h-full flex-col justify-between">
      {/* Top progress bar with vivid gradient */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
          <span>مرحله ۲ از ۳</span>
          <span className="text-primary font-black num-fa">۶۶٪</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" style={{ width: '66%' }} />
        </div>
      </div>

      {/* Main question with vivid options */}
      <div className="my-auto flex flex-col gap-3">
        <div className="text-xs font-black text-foreground leading-snug">
          کیفیت خدمات و سرعت پشتیبانی را چطور ارزیابی می‌کنید؟
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border-2 border-success bg-gradient-to-r from-tone-emerald/15 to-emerald-500/5 p-2.5 font-black text-success dark:text-tone-emerald shadow-sm">
            <span className="text-xs">بسیار عالی و راضی ★★★★★</span>
            <span className="size-4 rounded-full bg-success flex items-center justify-center text-[10px] text-white">✓</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2.5 text-xs font-medium text-foreground">
            <span>در حد انتظار و مناسب</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2.5 text-xs font-medium text-foreground">
            <span>نیاز به بررسی و بهبود</span>
          </div>
        </div>
      </div>

      {/* High contrast gradient CTA button */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/25"
      >
        <span>مرحله بعد</span>
        <ArrowLeftIcon className="size-4" />
      </button>
    </div>
  );
}

function NorolinkMobileScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-pink-950/40 p-2.5 text-white shadow-inner">
      {/* Profile Header with Real Iranian Creator Photo */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <div className="relative size-14 rounded-full ring-2 ring-pink-400 shadow-lg overflow-hidden">
          <Image
            src="/images/iran-creative-studio.jpg"
            alt="استودیو دیزاین نارنج تهران"
            fill
            sizes="56px"
            className="object-cover"
          />
          <span className="absolute bottom-0 end-0 size-4 rounded-full bg-tone-rose flex items-center justify-center text-[9px] text-white ring-1 ring-white">
            ✓
          </span>
        </div>
        <div className="font-black text-sm text-white">استودیو طراحی تهران</div>
        <div className="text-[10px] text-pink-200/80">طراحی نسل جدید نرم‌افزارهای ابری</div>
      </div>

      {/* Social Row with Official Brand Colors */}
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-tone-amber/100 via-rose-500 to-purple-600 text-white text-[9px] font-bold shadow">
          IG
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-[#24A1DE] text-white text-[9px] font-bold shadow">
          TG
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white text-[9px] font-bold shadow">
          WA
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-[#0A66C2] text-white text-[9px] font-bold shadow">
          IN
        </span>
      </div>

      {/* Vibrant Gradient Links */}
      <div className="flex w-full flex-col gap-2">
        <div className="rounded-xl border border-pink-400/40 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 p-2.5 text-xs font-black text-white shadow-md">
          رزرو وقت مشاوره آنلاین
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-2 text-xs font-bold text-white shadow-sm">
          کاتالوگ دیجیتال محصولات ۱۴۰۳
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-tone-rose/40 bg-gradient-to-r from-rose-600 to-rose-700 p-2 text-xs font-bold text-white shadow-sm">
          <PlayIcon className="size-3.5 fill-current" />
          <span>ویدیو معرفی در آپارات</span>
        </div>
      </div>

      {/* Powered by */}
      <div className="text-[9px] text-pink-200/60 pb-1">
        قدرت‌گرفته از <strong>نورولینک</strong>
      </div>
    </div>
  );
}

function NorofileMobileScreen() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="font-extrabold text-xs text-foreground">کارت آپلود نوروفایل</span>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning dark:text-tone-amber">
          سرویس S3
        </span>
      </div>

      {/* Real Workplace Photo in the Crop Frame */}
      <div className="my-auto flex flex-col items-center gap-2.5">
        <div className="relative size-32 rounded-2xl border-2 border-dashed border-warning bg-warning/5 flex items-center justify-center overflow-hidden shadow-inner">
          <Image
            src="/images/tehran-tech-office.jpg"
            alt="پیش‌نمایش تصویر دفتر نوآوری تهران"
            fill
            sizes="130px"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 border-2 border-warning rounded-2xl flex items-center justify-center bg-black/20">
            <CropIcon className="size-7 text-white drop-shadow-md" />
          </div>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">تنظیم کراپ هوشمند کلاینت‌ساید</span>

        <div className="w-full rounded-xl border border-success/30 bg-success/10 p-2 text-center text-[11px]">
          <span className="font-extrabold text-success dark:text-success">تبدیل به WebP:</span>
          <span className="ms-1.5 text-foreground font-bold">کاهش از ۱.۴MB به ۳۲۰KB (-۶۸٪)</span>
        </div>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-tone-amber/100 to-yellow-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25"
      >
        <UploadCloudIcon className="size-4" />
        <span>تأیید و ذخیره در ابر</span>
      </button>
    </div>
  );
}

function EcosystemMobileScreen() {
  return (
    <div className="flex h-full flex-col justify-between">
      {/* Mobile Workspace bar with Emerald Accent */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="font-extrabold text-xs text-foreground truncate">شرکت فناوری هوش‌افزار</span>
        <span className="size-2.5 rounded-full bg-success ring-2 ring-success/20" />
      </div>

      <div className="my-auto flex flex-col gap-2">
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-card p-2.5 shadow-sm">
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">نوروفرم: دریافت پاسخ</div>
          <div className="text-base font-black text-foreground num-fa">۸ فرم آنلاین</div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-card p-2.5 shadow-sm">
          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">نورولینک: آمار بازدید بیو</div>
          <div className="text-base font-black text-foreground num-fa">۳۴,۸۰۰ کلیک</div>
        </div>

        <div className="rounded-xl border border-success/30 bg-gradient-to-r from-tone-emerald/10 to-card p-2.5 shadow-sm">
          <div className="text-[10px] text-success dark:text-success font-bold">امنیت: ورود OTP</div>
          <div className="text-xs font-black text-success">پیامک رسمی کاوه‌نگار</div>
        </div>
      </div>

      <div className="rounded-xl bg-muted/60 p-2 text-center text-[10px] font-semibold text-muted-foreground">
        ایزولاسیون کامل سطح دیتابیس (FORCE RLS)
      </div>
    </div>
  );
}
