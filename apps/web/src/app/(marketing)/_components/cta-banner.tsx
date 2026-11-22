'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, SparklesIcon, CheckCircle2Icon, HeadphonesIcon } from 'lucide-react';
import { routes } from '@/lib/routes';

export function CtaBanner() {
  return (
    <section id="cta" className="py-12 sm:py-16 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Main CTA Card Frame - Sized structurally for both desktop and mobile */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 sm:p-10 lg:py-12 lg:px-14 shadow-2xl lg:min-h-[480px] flex flex-col justify-center">
          {/* Real Iranian Workplace Photographic Ambient Background */}
          <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none">
            <Image
              src="/images/iran-meeting-room.jpg"
              alt="تیم سازمان‌ها و جلسات محصول در تهران"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover opacity-35 sm:opacity-50 dark:opacity-35 transition-transform duration-1000 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-card/75 to-card/90" />
          </div>

          {/* Ambient Radial Aurora Glows */}
          <div className="pointer-events-none absolute -top-24 start-1/4 size-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 end-1/4 size-96 rounded-full bg-cyan-500/20 blur-3xl" />

          {/* Responsive Layout Grid: Text & Actions (Start) + Iranian Businesswoman (End) */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Copy & CTAs Column */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-start lg:col-span-7 xl:col-span-7">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
                <SparklesIcon className="size-3.5" />
                <span>فضای کاری ابری</span>
                <span className="opacity-40">•</span>
                <span className="font-mono text-[11px] font-bold">Noroset Workspace</span>
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-foreground leading-[1.25] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)] sm:whitespace-nowrap">
                <span className="text-primary">نوروست</span>
                <span className="text-muted-foreground/80 font-normal mx-1">؛</span>
                <span>پلتفرم یکپارچه ابزارهای ابری</span>
              </h2>

              <p className="mt-3 max-w-2xl text-xs sm:text-base text-muted-foreground leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
                فرم‌های حرفه‌ای، درگاه بیو اختصاصی و میزبانی امن فایل‌ها در ابری پایدار؛ همراه با پشتیبانی اختصاصی برای کسب‌وکارهای ایرانی.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  href={routes.auth()}
                  className="inline-flex min-w-0 flex-1 sm:flex-none text-center items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-foreground backdrop-blur-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted/70 hover:border-border"
                >
                  <span>ورود به حساب کاربری</span>
                </Link>

                <Link
                  href={routes.link.home}
                  className="inline-flex min-w-0 flex-1 sm:flex-none text-center items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <span>شروع رایگان با نوروست</span>
                  <ArrowLeftIcon className="size-5" />
                </Link>
              </div>

              {/* Guarantees List */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>۱۴ روز رایگان با پلن پایه</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>ورود فوری بدون نیاز به کارت بانکی</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>احراز هویت پیامکی با سرشماره رسمی</span>
                </div>
              </div>

              {/* Mobile-Only Persona Presentation - Positioned below content, flush to bottom border with zero button collision */}
              <div className="relative lg:hidden w-full flex flex-col items-center justify-end mt-8 -mb-6 sm:-mb-10 pt-3 overflow-hidden">
                {/* Ambient Aura on mobile */}
                <div className="pointer-events-none absolute bottom-0 size-48 rounded-full bg-gradient-to-t from-primary/20 via-cyan-500/15 to-transparent blur-2xl" />

                {/* Floating Trust Badge on mobile */}
                <div className="mb-2.5 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/95 px-3 py-1 shadow-md backdrop-blur-md">
                  <div className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success dark:text-success">
                    <HeadphonesIcon className="size-3" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">پشتیبانی و راهنمایی</span>
                  <span className="text-muted-foreground text-[9px] flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-success animate-pulse" />
                    مستقر در تهران • آنلاین
                  </span>
                </div>

                {/* Woman Portrait Image flush to bottom */}
                <div className="relative w-[200px] sm:w-[240px] h-[255px] sm:h-[305px]">
                  <Image
                    src="/images/iran-corporate-woman-transparent.png"
                    alt="کارشناس پشتیبانی و موفقیت مشتریان نوروست در تهران"
                    fill
                    sizes="(max-width: 640px) 200px, 240px"
                    className="object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Spacer for desktop layout so content doesn't collide with the persona */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-5 h-full pointer-events-none" />
          </div>

          {/* Desktop-Only Iranian Businesswoman Persona - Beside Content, Flush to Bottom Edge (bottom-0), Top Never Clipped */}
          <div className="pointer-events-none select-none absolute bottom-0 end-4 sm:end-8 lg:end-12 xl:end-16 z-10 hidden lg:flex h-[calc(100%-2.5rem)] max-h-[440px] aspect-[500/755] max-w-[40%] items-end justify-center">
            {/* Ambient Aura behind her */}
            <div className="absolute top-1/3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 size-56 sm:size-72 rounded-full bg-gradient-to-br from-primary/25 via-cyan-500/20 to-transparent blur-3xl pointer-events-none" />

            {/* Cutout Image of Iranian Businesswoman - Flush to bottom border, head fully intact */}
            <div className="relative w-full h-full">
              <Image
                src="/images/iran-corporate-woman-transparent.png"
                alt="کارشناس پشتیبانی و موفقیت مشتریان نوروست در تهران"
                fill
                sizes="(max-width: 1024px) 280px, 340px"
                className="object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
                priority
              />
            </div>

            {/* Floating Trust Badge next to her waist/chest */}
            <div className="absolute bottom-16 sm:bottom-20 -start-8 sm:-start-12 lg:-start-16 z-30 hidden sm:flex items-center gap-2 rounded-2xl border border-white/20 bg-background/95 px-3 py-1.5 shadow-xl backdrop-blur-xl pointer-events-auto">
              <div className="flex size-6 items-center justify-center rounded-lg bg-success/15 text-success dark:text-success">
                <HeadphonesIcon className="size-3.5" />
              </div>
              <div className="text-[11px] leading-tight text-start">
                <span className="font-bold text-foreground block">پشتیبانی و راهنمایی</span>
                <span className="text-muted-foreground text-[9px] flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  مستقر در تهران • آنلاین
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
