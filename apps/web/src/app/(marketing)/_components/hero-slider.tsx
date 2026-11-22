'use client';

import { useState, useEffect, useCallback, type FocusEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  PlayIcon,
  PauseIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  SparklesIcon,
  FileTextIcon,
  LinkIcon,
  FolderIcon,
  LayersIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import { DesktopMockup } from './desktop-mockup';
import { MobileMockup } from './mobile-mockup';

interface SlideData {
  id: 'noroform' | 'norolink' | 'norofile' | 'ecosystem';
  name: string;
  englishName: string;
  slogan: string;
  brandColor: string;
  badge: string;
  badgeColor: string;
  accentGlow: string;
  subtitle: string;
  features: string[];
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  icon: typeof FileTextIcon;
}

const SLIDES: SlideData[] = [
  {
    id: 'noroform',
    name: 'نوروفرم',
    englishName: 'Noroform',
    slogan: 'فرم‌ساز هوشمند سازمانی',
    brandColor: 'text-purple-600 dark:text-purple-400',
    badge: 'فرم‌ساز و نظرسنجی ابری',
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
    accentGlow: 'from-purple-600/20 via-violet-600/15 to-transparent',
    subtitle: 'طراحی انواع فرم و آزمون آنلاین با منطق شرطی و خروجی استاندارد اکسل.',
    features: [
      'منطق شرطی پیشرفته فیلدها و صفحات',
      'خروجی CSV و اکسل سازگار با خط فارسی',
      'اعتبارسنجی خودکار شماره موبایل ایران',
    ],
    primaryCtaText: 'ورود به مدیریت فرم‌ها',
    primaryCtaHref: routes.form.home,
    secondaryCtaText: 'امکانات اختصاصی نوروفرم',
    secondaryCtaHref: routes.landing.form,
    icon: FileTextIcon,
  },
  {
    id: 'norolink',
    name: 'نورولینک',
    englishName: 'Norolink',
    slogan: 'درگاه هوشمند پیوندها و بیو',
    brandColor: 'text-tone-rose dark:text-tone-rose',
    badge: 'درگاه ارتباطی و لینک در بیو',
    badgeColor: 'border-pink-500/30 bg-tone-rose/10 text-tone-rose dark:text-tone-rose',
    accentGlow: 'from-pink-500/20 via-rose-500/15 to-transparent',
    subtitle: 'دامنه کوتاه yourname.n8l.ir با ۱۲ قالب شیک، ویجت آپارات و آمار بدون کوکی.',
    features: [
      'دامنه کوتاه و اختصاصی n8l.ir',
      'ویجت‌های ویدیویی آپارات و نشان',
      'آمار تحلیلی بازدید بدون کوکی و ردیاب',
    ],
    primaryCtaText: 'ورود به مدیریت لینک‌ها',
    primaryCtaHref: routes.link.home,
    secondaryCtaText: 'امکانات اختصاصی نورولینک',
    secondaryCtaHref: routes.landing.link,
    icon: LinkIcon,
  },
  {
    id: 'norofile',
    name: 'نوروفایل',
    englishName: 'Norofile',
    slogan: 'میزبان امن داده‌های شما',
    brandColor: 'text-warning dark:text-tone-amber',
    badge: 'میزبانی ابری و بهینه‌ساز رسانه',
    badgeColor: 'border-warning/30 bg-warning/10 text-warning dark:text-tone-amber',
    accentGlow: 'from-tone-amber/20 via-yellow-500/15 to-transparent',
    subtitle: 'ذخیره‌سازی پایدار ابری S3 با فشرده‌سازی خودکار WebP و کراپ غیرمخرب.',
    features: [
      'کاهش حجم تصاویر تا ۶۵٪ با WebP',
      'کراپ غیرمخرب با حفظ فایل اصلی',
      'ایزولاسیون کامل سطح دیتابیس (RLS)',
    ],
    primaryCtaText: 'ورود به مدیریت فایل‌ها',
    primaryCtaHref: routes.file.home,
    secondaryCtaText: 'امکانات اختصاصی نوروفایل',
    secondaryCtaHref: routes.landing.file,
    icon: FolderIcon,
  },
  {
    id: 'ecosystem',
    name: 'نوروست',
    englishName: 'Noroset',
    slogan: 'پلتفرم یکپارچه ابزارهای ابری',
    brandColor: 'text-primary',
    badge: 'اکوسیستم جامع ابری سازمانی',
    badgeColor: 'border-primary/30 bg-primary/10 text-primary',
    accentGlow: 'from-primary/25 via-blue-600/15 to-transparent',
    subtitle: 'یکپارچگی فرم، فایل و لینک با احراز هویت پیامکی OTP و امنیت داده‌ها.',
    features: [
      'احراز هویت بدون رمز با پیامک OTP',
      'معماری چندمستاجره با PostgreSQL RLS',
      'پایداری ۹۹.۹۵٪ و سرعت پاسخگویی بالا',
    ],
    primaryCtaText: 'ورود به پنل',
    primaryCtaHref: routes.link.home,
    secondaryCtaText: 'معماری و امنیت پلتفرم',
    secondaryCtaHref: '#security',
    icon: LayersIcon,
  },
];

const AUTO_PLAY_INTERVAL = 6500;

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'mobile' | 'desktop'>('mobile');

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // احترام به prefers-reduced-motion (قاعده‌ی auto-rotation-controls)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (isPaused || reducedMotion) return;
    const timer = setInterval(nextSlide, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, reducedMotion, nextSlide]);

  // خروج فوکوس از کل بخش (نه جابه‌جایی بین کنترل‌ها) چرخش را از سر می‌گیرد.
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
  };

  const activeSlide = SLIDES[currentSlide] ?? SLIDES[0]!;

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-24"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlur={handleBlur}
    >
      {/* Photographic Backdrop: Tehran Tech Campus at Golden Hour */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <Image
          src="/images/iran-tech-campus-hero.jpg"
          alt="پردیس فناوری و شرکت‌های دانش‌بنیان تهران"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45 sm:opacity-65 dark:opacity-40 scale-105 transition-opacity duration-700"
        />
        {/* Subtle cinematic gradient overlay to eliminate milky white haze and keep text crisp */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-900/5 to-background/80 dark:from-slate-950/45 dark:via-transparent dark:to-background/85" />
      </div>

      {/* Dynamic Ambient Aurora Glow behind Hero */}
      <div
        className={`mkt-aurora -top-20 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 h-[450px] w-[700px] bg-gradient-to-br ${activeSlide.accentGlow} transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-1000`}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Slide Grid */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Left Column (in RTL): Copy & CTAs */}
          <div className="flex flex-col items-start text-start lg:col-span-5">
            {/* Product Badge with Persian & English Names */}
            <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold backdrop-blur-md shadow-xs transition-[color,background-color,border-color,box-shadow,opacity,transform] ${activeSlide.badgeColor}`}>
              <SparklesIcon className="size-3.5" />
              <span>{activeSlide.badge}</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[11px] font-bold tracking-wider">{activeSlide.englishName}</span>
            </div>

            {/* Headline: [Product Name]؛ [Slogan] with distinctive product name color */}
            <h1 className="mt-3 sm:mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-snug text-foreground drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)] sm:whitespace-nowrap">
              <span className={activeSlide.brandColor}>{activeSlide.name}</span>
              <span className="text-muted-foreground/80 font-normal mx-1">؛</span>
              <span>{activeSlide.slogan}</span>
            </h1>

            {/* Subtitle with subtle shadow for high contrast */}
            <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-muted-foreground leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
              {activeSlide.subtitle}
            </p>

            {/* Highlights List - Concise and Useful */}
            <div className="mt-4 sm:mt-6 flex flex-col gap-2 sm:gap-2.5 w-full">
              {activeSlide.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                  <CheckCircle2Icon className="size-3.5 sm:size-4 shrink-0 text-success" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-6 sm:mt-8 flex flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <Link
                href={activeSlide.secondaryCtaHref}
                className="inline-flex min-w-0 flex-1 sm:flex-none text-center items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-3 text-xs sm:text-sm font-semibold text-foreground backdrop-blur-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted/70 hover:border-border  text-center"
              >
                <span>{activeSlide.secondaryCtaText}</span>
              </Link>

              <Link
                href={activeSlide.primaryCtaHref}
                className="inline-flex min-w-0 flex-1 sm:flex-none text-center items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary  text-center"
              >
                <span>{activeSlide.primaryCtaText}</span>
                <ArrowLeftIcon className="size-4" />
              </Link>
            </div>
          </div>

          {/* Right Column (in RTL): Responsive Mockups */}
          <div className="relative lg:col-span-7 flex flex-col items-center justify-center w-full">
            {/* Mobile View Switcher (Only visible on screens smaller than sm) */}
            <div className="flex sm:hidden items-center justify-center gap-1 p-1 rounded-xl bg-muted/70 border border-border/50 mb-3 w-full max-w-[260px]">
              <button
                type="button"
                onClick={() => setMobileViewMode('mobile')}
                className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                  mobileViewMode === 'mobile'
                    ? 'bg-card shadow-sm text-foreground border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📱 نمای موبایل
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('desktop')}
                className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                  mobileViewMode === 'desktop'
                    ? 'bg-card shadow-sm text-foreground border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💻 نمای دسکتاپ
              </button>
            </div>

            {/* Mobile Device View (Screens < sm) */}
            <div className="sm:hidden w-full flex justify-center py-1">
              {mobileViewMode === 'mobile' ? (
                <div key={`mobile-solo-${activeSlide.id}`} className="w-[230px]">
                  <MobileMockup productId={activeSlide.id} />
                </div>
              ) : (
                <div key={`desktop-solo-${activeSlide.id}`} className="w-full">
                  <DesktopMockup productId={activeSlide.id} />
                </div>
              )}
            </div>

            {/* Tablet & Desktop View (Screens >= sm): Studio-Grade Dual Showcase */}
            <div className="hidden sm:flex relative items-center justify-center w-full min-h-[470px] lg:min-h-[500px] pt-4 pb-8">
              {/* Desktop Display Mockup */}
              <div key={`desktop-${activeSlide.id}`} className="w-full max-w-[620px] lg:max-w-[660px] transition-transform duration-700 ease-out">
                <DesktopMockup productId={activeSlide.id} />
              </div>

              {/* Flagship Mobile Device - Positioned Elegantly on the Trailing (Left in RTL) Side */}
              <div
                key={`mobile-${activeSlide.id}`}
                className="absolute -bottom-6 sm:-bottom-8 end-2 sm:end-6 lg:end-8 z-30 -rotate-2 sm:-rotate-3 hover:rotate-0 transition-transform duration-500 ease-out drop-shadow-[0_25px_35px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_30px_45px_rgba(0,0,0,0.8)]"
              >
                <MobileMockup productId={activeSlide.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Microsoft-Style Slide Navigator & Controls Bar */}
        <div className="mt-8 sm:mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 pt-5 sm:pt-6">
          {/* Slide Indicator Tabs with Timer Progress */}
          <div className="grid w-full sm:w-auto grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {SLIDES.map((slide, idx) => {
              const Icon = slide.icon;
              const isActive = idx === currentSlide;

              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                    isActive
                      ? 'border border-primary/40 bg-primary/10 text-primary shadow-sm'
                      : 'border border-border/40 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-label={`اسلاید ${slide.name} (${slide.englishName})`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{slide.name}</span>
                  <span className="hidden sm:inline text-[10px] font-mono opacity-70">({slide.englishName})</span>

                  {/* Progress Line for Active Slide */}
                  {isActive && !isPaused && !reducedMotion && (
                    <span className="absolute bottom-0 start-2 end-2 h-0.5 overflow-hidden rounded-full bg-primary/20">
                      <span className="mkt-slider-bar-active block h-full bg-primary" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation & Pause/Play Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={isPaused ? 'ادامه حرکت خودکار' : 'توقف حرکت خودکار'}
              title={isPaused ? 'ادامه حرکت خودکار' : 'توقف حرکت خودکار'}
            >
              {isPaused ? <PlayIcon className="size-4 fill-current" /> : <PauseIcon className="size-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={prevSlide}
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="اسلاید قبلی"
              title="اسلاید قبلی"
            >
              <ChevronRightIcon className="size-4" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="اسلاید بعدی"
              title="اسلاید بعدی"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
