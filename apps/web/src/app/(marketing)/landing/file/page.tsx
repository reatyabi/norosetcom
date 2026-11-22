'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FolderIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlayIcon,
  PauseIcon,
  ServerIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  HelpCircleIcon,
  CropIcon,
  LockIcon,
  ZapIcon,
  DatabaseIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import { DesktopMockup } from '../../_components/desktop-mockup';
import { MobileMockup } from '../../_components/mobile-mockup';

const FILE_SLIDES = [
  {
    id: 'webp-optimization',
    title: 'کاهش تا ۶۸٪ حجم تصاویر با تبدیل خودکار به WebP',
    subtitle: 'تصاویر بارگذاری‌شده در مرورگر بهینه‌سازی و به WebP تبدیل می‌شوند؛ بارگذاری آنی صفحات و صرفه‌جویی چشمگیر در پهنای باند اینترنت.',
    badge: 'بهینه‌سازی کلاینت‌ساید WebP',
    color: 'from-purple-600 to-pink-600',
    highlight: 'کاهش حجم از ۲.۴MB به ۳۴۰KB بدون افت کیفیت مشهود',
    mode: 'pipeline' as const,
  },
  {
    id: 'unified-picker',
    title: 'کارت انتخاب فایل یکپارچه (FilePicker) در تمام محصولات',
    subtitle: 'مانند Google Drive Picker، در فرم‌ساز، صفحه بیو و پروفایل از یک کتابخانه واحد فایل‌های خود را انتخاب یا آپلود کنید.',
    badge: 'کارت آپلود ماژولار',
    color: 'from-blue-600 to-indigo-600',
    highlight: 'کراپ زنده دایره و مستطیل با زوم و چرخش پیشرفته',
    mode: 'mobile' as const,
  },
  {
    id: 's3-security',
    title: 'امنیت در سطح سرویس‌های ابری S3 و ایزولاسیون کامل',
    subtitle: 'باکت‌های خصوصی با کنترل دسترسی دقیق، اعتبارسنجی بایت‌های جادویی (Magic Bytes) و جلوگیری از آپلود کدهای مخرب.',
    badge: 'معماری ابری S3 سازمانی',
    color: 'from-emerald-600 to-teal-600',
    highlight: 'لینک‌های عمومی CDN با کش غیرقابل تغییر (Immutable)',
    mode: 'default' as const,
  },
];

const FILE_FEATURES = [
  {
    icon: ServerIcon,
    title: 'معماری S3 خصوصی و توزیع از طریق API',
    desc: 'تنها سرویس فایل پلتفرم نوروست؛ مرورگر هرگز دسترسی مستقیم به باکت S3 ندارد و تمامی درخواست‌ها با هدرهای امنیتی CORS و CSP تایید می‌شوند.',
    tag: 'Private S3 Bucket',
  },
  {
    icon: ZapIcon,
    title: 'بهینه‌سازی خودکار به فرمت کم‌حجم WebP',
    desc: 'تصاویر پیش از ذخیره در ابر، در سمت کلاینت با حفظ کیفیت بالا فشرده و به WebP تبدیل می‌شوند تا سرعت لود سایت‌های شما زیر ۲۰ میلی‌ثانیه بماند.',
    tag: 'Client-side WebP',
  },
  {
    icon: CropIcon,
    title: 'ابزار کراپ هوشمند و غیرمخرب (Non-destructive)',
    desc: 'امکان تعیین نسبت ابعاد آزاد، ۱:۱، ۴:۳ و ۱۶:۹ با ابزار کراپ اختصاصی و ذخیره نقطه کانونی بدون صدمه زدن به اصل فایل بارگذاری‌شده.',
    tag: 'Smart Crop Tool',
  },
  {
    icon: ShieldCheckIcon,
    title: 'اعتبارسنجی جادویی محتوای فایل (Magic Bytes)',
    desc: 'سرور نوع واقعی فایل را نه از پسوند ظاهری، بلکه از بایت‌های جادویی داخل فایل تشخیص می‌دهد؛ پسوندهای SVG و فایل‌های اجرایی خطرناک مسدود می‌شوند.',
    tag: 'Magic Byte Security',
  },
  {
    icon: DatabaseIcon,
    title: 'تفکیک فضای سازمانی و فضای شخصی با FORCE RLS',
    desc: 'مدیریت مجزای دارایی‌های چندمستاجره سازمان و فضای شخصی کاربر (عکس پروفایل) با سیاست‌های سطح دیتابیس PostgreSQL.',
    tag: 'Multi-Tenant Isolation',
  },
  {
    icon: LockIcon,
    title: 'ردیابی استفاده از فایل (Usage Tracking)',
    desc: 'هر فایلی که در فرم یا صفحه بیو استفاده می‌شود ثبت شده و از حذف ناخواسته فایل‌های فعال با خطای امنیتی 409 جلوگیری می‌شود.',
    tag: 'Zero Orphan Files',
  },
];

const FAQS = [
  {
    q: 'چه نوع فایل‌هایی را می‌توان در نوروفایل ذخیره کرد؟',
    a: 'شما می‌توانید انواع تصاویر (PNG، JPG، WebP و GIF)، اسناد رسمی (PDF و فایل‌های مایکروسافت آفیس DOCX، XLSX، PPTX) و فایل‌های فشرده ZIP را با امنیت کامل ذخیره کنید.',
  },
  {
    q: 'سقف حجم هر فایل و سهمیه فضای رایگان چقدر است؟',
    a: 'در حال حاضر سقف بارگذاری هر فایل تا ۲۰ مگابایت و سهمیه فضای رایگان هر فضای کاری ۱۰۰ مگابایت است که برای هزاران تصویر و سند کاملاً بهینه‌سازی شده کافی است.',
  },
  {
    q: 'آیا فایل‌های عمومی در دسترس موتورهای جستجو و عموم هستند؟',
    a: 'فایل‌هایی که برای نمایش عمومی (مانند بنر بیو یا تصاویر عمومی فرم) تعیین می‌شوند، از طریق لینک CDN پرسرعت و امن با هدرهای ضد دستکاری در دسترس مخاطبان قرار می‌گیرند.',
  },
  {
    q: 'آیا در صورت تغییر تصویر، کش مرورگر کاربر به روز می‌شود؟',
    a: 'بله، نوروفایل از شناسه‌های تصادفی غیرقابل تغییر (Immutable) استفاده می‌کند؛ هر ویرایش یا آپلود جدید یک آدرس یکتای تازه می‌سازد تا کاربر همواره آخرین نسخه را ببیند.',
  },
];

export default function FileLandingPage() {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev + 1) % FILE_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev - 1 + FILE_SLIDES.length) % FILE_SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const currentSlide = FILE_SLIDES[activeSlideIdx] ?? FILE_SLIDES[0]!;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Top Badge with Persian & English Names */}
            <div className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1.5 text-xs font-bold text-warning dark:text-tone-amber backdrop-blur-md">
              <FolderIcon className="size-4" />
              <span>نوروفایل</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[11px] font-bold tracking-wider">Norofile</span>
            </div>

            {/* Headline: [Product Name]؛ [Slogan] with distinctive product name color */}
            <h1 className="mt-4 max-w-4xl text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-foreground leading-tight sm:whitespace-nowrap">
              <span className="text-warning dark:text-tone-amber">نوروفایل</span>
              <span className="text-muted-foreground/80 font-normal mx-1">؛</span>
              <span>میزبان امن داده‌های شما</span>
            </h1>

            <p className="mt-4 max-w-2xl text-xs sm:text-base text-muted-foreground leading-relaxed">
              فضای ابری اختصاصی S3 با فشرده‌سازی خودکار WebP، کراپ هوشمند غیرمخرب و ایزولاسیون کامل سطح دیتابیس (RLS).
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={routes.file.home}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
              >
                <span>شروع مدیریت فایل‌ها با نوروفایل</span>
                <ArrowLeftIcon className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm sm:text-base font-semibold text-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted hover:scale-[1.02] active:scale-95"
              >
                <span>مشاهده ویژگی‌های ابری</span>
              </a>
            </div>
          </div>

          {/* Interactive S3 Storage Slider with Real Photo Preview */}
          <div
            className="mt-14 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Top Slider Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                {FILE_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`relative rounded-full px-4 py-1.5 text-xs font-bold transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                      idx === activeSlideIdx
                        ? 'border border-primary/40 bg-primary/10 text-primary shadow-xs'
                        : 'border border-border/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{slide.badge}</span>
                    {idx === activeSlideIdx && !isPaused && (
                      <span className="absolute bottom-0 start-3 end-3 h-0.5 overflow-hidden rounded-full bg-primary/20">
                        <span className="mkt-slider-bar-active block h-full bg-primary" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Slider Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                  aria-label={isPaused ? 'ادامه' : 'توقف'}
                >
                  {isPaused ? <PlayIcon className="size-3.5 fill-current" /> : <PauseIcon className="size-3.5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={prevSlide}
                  className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                  aria-label="اسلاید قبلی"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                  aria-label="اسلاید بعدی"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Slide Body: Animated Mockup + Workplace Photography */}
            <div key={currentSlide.id} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Copy */}
              <div className="lg:col-span-5 flex flex-col gap-3 text-start">
                <span className="text-xs font-extrabold text-warning dark:text-tone-amber">{currentSlide.badge}</span>
                <h3 className="text-2xl font-black text-foreground sm:text-3xl leading-snug">{currentSlide.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{currentSlide.subtitle}</p>

                <div className="mt-3 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-primary w-fit">
                  <TrendingUpIcon className="size-4 shrink-0 text-primary" />
                  <span>{currentSlide.highlight}</span>
                </div>
              </div>

              {/* Right Mockup Showcase with High-Detail Views */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
                {currentSlide.mode === 'mobile' ? (
                  <div key="norofile-mobile-slide" className="w-[235px] sm:w-[260px] py-2">
                    <MobileMockup productId="norofile" showFloatingBadges={true} />
                  </div>
                ) : (
                  <div key={`norofile-desktop-${currentSlide.mode}`} className="w-full">
                    <DesktopMockup productId="norofile" detailMode={currentSlide.mode} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
              مشخصات فنی و زیرساخت ابری نوروفایل
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              تنها سرویس فایل S3 پلتفرم نوروست، طراحی‌شده برای سرعت، امنیت و بهینه‌سازی خودکار.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FILE_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-primary hover:shadow-md transition-[color,background-color,border-color,box-shadow,opacity,transform]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning dark:text-tone-amber">
                        <Icon className="size-5" />
                      </div>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground num-en">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-foreground">{feat.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section with Real Workplace Photo */}
      <section className="py-16 bg-muted/20 border-y border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 relative h-80 sm:h-96 rounded-3xl overflow-hidden border border-border/70 shadow-xl">
              <Image
                src="/images/iran-tech-office.jpg"
                alt="تیم مهندسی و مدیریت ابری فایل‌ها"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent flex items-end p-6">
                <div className="text-white text-xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  <div className="font-extrabold text-sm">میزبانی پایدار دارایی‌ها در شبکه ملی و اینترنت</div>
                  <div className="text-white/90 mt-1">توزیع از طریق لینک‌های امن API با پشتیبانی از کدهای تصادفی یکتا</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4 text-start">
              <span className="text-xs font-bold text-warning dark:text-tone-amber">کاربردهای حرفه‌ای در سازمان‌ها</span>
              <h2 className="text-2xl font-black text-foreground sm:text-3xl leading-snug">
                یکپارچه با فرم‌ها، صفحات بیو و پروفایل‌های کاربری
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                هر محصول پلتفرم از طریق درگاه اختصاصی FileService به نوروفایل متصل است؛ تصاویر بیو، آواتارهای کاربری و مدارک دریافتی در یک فضای هماهنگ و ایزوله نگهداری می‌شوند.
              </p>

              <div className="mt-2 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>تبدیل آنی عکس‌های دوربین به وب‌پی تا بارگذاری صفحات موبایل کند نشود</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>جلوگیری از حذف تصادفی فایل‌های در حال استفاده با رهگیری هوشمند</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>فضای شخصی مجزا برای عکس‌های پروفایل کاربران بدون تداخل با سازمان</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-foreground">سوالات متداول درباره نوروفایل</h2>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-border/60 bg-card p-5 text-start">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <HelpCircleIcon className="size-4 text-warning shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed ps-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-12 border-t border-border/40 bg-gradient-to-br from-tone-amber/10 via-background to-yellow-500/10 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-black text-foreground sm:text-3xl">فایل‌های سازمان خود را با امنیت ابری میزبانی کنید</h2>
          <p className="mt-2 text-sm text-muted-foreground">۱۰۰ مگابایت فضای ابری رایگان برای هر فضای کاری فعال.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={routes.file.home}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
            >
              <span>ورود به مدیر فایل در پنل</span>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
