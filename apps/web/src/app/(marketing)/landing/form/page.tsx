'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileTextIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlayIcon,
  PauseIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  FileSpreadsheetIcon,
  LayersIcon,
  HelpCircleIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import { DesktopMockup } from '../../_components/desktop-mockup';
import { MobileMockup } from '../../_components/mobile-mockup';

const FORM_SLIDES = [
  {
    id: 'conditional',
    title: 'منطق شرطی هوشمند و بدون کدنویسی',
    subtitle: 'مسیر پاسخ‌دهی را شخصی‌سازی کنید؛ هر کاربر دقیقاً سوالات مرتبط با پاسخ‌های قبلی خود را می‌بیند.',
    badge: 'منطق شرطی پیشرفته',
    color: 'from-blue-600 to-cyan-500',
    highlight: 'افزایش ۴۵٪ نرخ تکمیل فرم با حذف سوالات نامربوط',
    mode: 'builder' as const,
  },
  {
    id: 'multipage',
    title: 'صفحات سه‌گانه خوش‌آمد، اصلی و پایانی',
    subtitle: 'طراحی گام‌به‌گام با نوار پیشرفت زنده که حس یک مکالمه حرفه‌ای و مدرن را به مخاطب منتقل می‌کند.',
    badge: 'تجربه زنده موبایل پاسخ‌دهنده',
    color: 'from-indigo-600 to-purple-600',
    highlight: 'سازگار کامل با موبایل، تبلت و دسکتاپ روی دامنه n8l.ir',
    mode: 'mobile' as const,
  },
  {
    id: 'excel-export',
    title: 'خروجی اکسل استاندارد بدون به‌هم‌ریختگی فارسی',
    subtitle: 'دریافت آنی داده‌ها با فرمت CSV و کدگذاری اختصاصی UTF-8 BOM برای نمایش بی‌نقص کلمات و تاریخ‌های شمسی در Excel.',
    badge: 'گزارش‌گیری و خروجی استاندارد اکسل',
    color: 'from-emerald-600 to-teal-600',
    highlight: 'فیلتر بازه‌های زمانی شمسی بر اساس ساعت رسمی تهران',
    mode: 'analytics' as const,
  },
];

const FORM_FEATURES = [
  {
    icon: SparklesIcon,
    title: 'منطق شرطی در لایه سرور و کلاینت',
    desc: 'شرط‌های نمایش و مخفی‌سازی علاوه بر مرورگر، در سرور نیز دوباره اعتبارسنجی می‌شوند تا هیچ داده‌ی نامعتبری در دیتابیس ثبت نشود.',
    tag: 'Strict Validation',
  },
  {
    icon: SmartphoneIcon,
    title: 'اعتبارسنجی خودکار شماره‌های ایران (E.164)',
    desc: 'تشخیص هوشمند پیش‌شماره‌های همراه اول، ایرانسل و رایتل، تبدیل ارقام فارسی و عربی و نرمال‌سازی خودکار به فرمت بین‌المللی.',
    tag: 'E.164 Iran',
  },
  {
    icon: ShieldCheckIcon,
    title: 'ضد اسپم هوشمند بدون حل کپچای آزاردهنده',
    desc: 'ترکیب تله مخفی Honeypot، کلید یکتایی Idempotency برای جلوگیری از ثبت تکراری و محدودیت نرخ درخواست بر اساس هش IP.',
    tag: 'Zero Friction',
  },
  {
    icon: FileSpreadsheetIcon,
    title: 'خروجی اکسل با فرمت UTF-8 BOM',
    desc: 'دیگر نگران کاراکترهای عجیب در اکسل نباشید؛ تمامی خروجی‌ها با فرمت رسمی مایکروسافت اکسل و تقویم شمسی هماهنگ هستند.',
    tag: 'Persian Excel Ready',
  },
  {
    icon: LayersIcon,
    title: 'صفحات چندگانه و هدایت هوشمند پس از ثبت',
    desc: 'تعریف صفحات خوش‌آمدگویی، صفحات اصلی با حداکثر ۲۰ صفحه و ریدایرکت امن HTTPS با تأخیر ثانیه‌ای به وب‌سایت شما.',
    tag: 'Multi-Page Workflow',
  },
  {
    icon: DatabaseIcon,
    title: 'ایزولاسیون کامل سطح دیتابیس (FORCE RLS)',
    desc: 'پاسخ‌ها در جدول‌های تفکیک‌شده با PostgreSQL Row-Level Security ذخیره شده و دسترسی بین مستاجران غیرممکن است.',
    tag: 'Enterprise Security',
  },
];

const FAQS = [
  {
    q: 'آیا برای استفاده از نوروفرم نیاز به دانش برنامه‌نویسی است؟',
    a: 'خیر، ادیتور دیداری نوروفرم به شما امکان می‌دهد در چند دقیقه با کشیدن و رها کردن فیلدها و تعیین شروط، فرم‌های سازمانی پیچیده بسازید.',
  },
  {
    q: 'فرم‌ها روی چه دامنه‌ای منتشر می‌شوند؟',
    a: 'فرم‌های عمومی روی دامنه فوق‌العاده کوتاه و امن n8l.ir/f/{id} یا دامنه اختصاصی فضای کاری شما منتشر می‌شوند و در پیامک‌ها فضای کمی اشغال می‌کنند.',
  },
  {
    q: 'خروجی داده‌ها به چه شکل است؟',
    a: 'شما می‌توانید پاسخ‌ها را به صورت جدول زنده با قابلیت فیلتر تاریخ شمسی مشاهده کرده یا فایل خروجی CSV سازگار با مایکروسافت اکسل دریافت کنید.',
  },
  {
    q: 'امنیت پاسخ‌ها و حریم خصوصی چگونه تضمین می‌شود؟',
    a: 'پلتفرم نوروست از ایزولاسیون سخت‌گیرانه PostgreSQL FORCE RLS استفاده می‌کند؛ آدرس IP پاسخ‌دهندگان فقط به صورت HMAC هش‌شده ذخیره می‌شود.',
  },
];

export default function FormLandingPage() {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev + 1) % FORM_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev - 1 + FORM_SLIDES.length) % FORM_SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const currentSlide = FORM_SLIDES[activeSlideIdx] ?? FORM_SLIDES[0]!;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Top Badge with Persian & English Names */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 backdrop-blur-md">
              <FileTextIcon className="size-4" />
              <span>نوروفرم</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[11px] font-bold tracking-wider">Noroform</span>
            </div>

            {/* Headline: [Product Name]؛ [Slogan] with distinctive product name color */}
            <h1 className="mt-4 max-w-4xl text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-foreground leading-tight sm:whitespace-nowrap">
              <span className="text-purple-600 dark:text-purple-400">نوروفرم</span>
              <span className="text-muted-foreground/80 font-normal mx-1">؛</span>
              <span>فرم‌ساز هوشمند سازمانی</span>
            </h1>

            <p className="mt-4 max-w-2xl text-xs sm:text-base text-muted-foreground leading-relaxed">
              طراحی انواع فرم، نظرسنجی و آزمون چندصفحه‌ای با منطق شرطی، اعتبارسنجی شماره‌های ایران و خروجی استاندارد اکسل.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={routes.form.home}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
              >
                <span>شروع رایگان با نوروفرم</span>
                <ArrowLeftIcon className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm sm:text-base font-semibold text-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted hover:scale-[1.02] active:scale-95"
              >
                <span>بررسی تمام قابلیت‌ها</span>
              </a>
            </div>
          </div>

          {/* Interactive Feature Slider with Animations & Real Office Vignette */}
          <div
            className="mt-14 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Top Slider Navigation Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                {FORM_SLIDES.map((slide, idx) => (
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
                <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">{currentSlide.badge}</span>
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
                  <div key="noroform-mobile-slide" className="w-[235px] sm:w-[260px] py-2">
                    <MobileMockup productId="noroform" showFloatingBadges={true} />
                  </div>
                ) : (
                  <div key={`noroform-desktop-${currentSlide.mode}`} className="w-full">
                    <DesktopMockup productId="noroform" detailMode={currentSlide.mode} />
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
              قابلیت‌های فنی و مهندسی‌شده نوروفرم
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              هر آن‌چه برای جمع‌آوری دقیق، ایمن و حرفه‌ای داده‌ها در سازمان نیاز دارید.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FORM_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-primary hover:shadow-md transition-[color,background-color,border-color,box-shadow,opacity,transform]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
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
                alt="دفتر کار ایرانی و استفاده از نوروفرم"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent flex items-end p-6">
                <div className="text-white text-xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  <div className="font-extrabold text-sm">کارخانه نوآوری آزادی — استارتاپ‌های فعال در تهران</div>
                  <div className="text-white/90 mt-1">جمع‌آوری بیش از ۲۰,۰۰۰ پاسخ در ماه با پایداری کامل بدون قطعی</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4 text-start">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">کاربردهای سازمانی در ایران</span>
              <h2 className="text-2xl font-black text-foreground sm:text-3xl leading-snug">
                از استخدام نیروهای متخصص تا سنجش رضایت مشتریان
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                سازمان‌ها، استارتاپ‌ها و موسسات آموزشی ایرانی برای جمع‌آوری اطلاعات رزومه، نظرسنجی از خریداران، ثبت سفارشات اختصاصی و آزمون‌های آنلاین به نوروفرم اعتماد می‌کنند.
              </p>

              <div className="mt-2 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>فرم‌های جذب و استخدام با قابلیت اعتبارسنجی خودکار مشخصات متقاضی</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>نظرسنجی خدمات پس از فروش و ثبت تیکت با هدایت پیامکی</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>پرسشنامه‌های دانشگاهی و تحقیقات بازار بدون محدودیت تعداد پاسخ</span>
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
            <h2 className="text-2xl font-black text-foreground">سوالات متداول درباره نوروفرم</h2>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-border/60 bg-card p-5 text-start">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <HelpCircleIcon className="size-4 text-purple-500 shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed ps-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-12 border-t border-border/40 bg-gradient-to-br from-purple-600/10 via-background to-indigo-600/10 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-black text-foreground sm:text-3xl">همین حالا اولین فرم هوشمند خود را بسازید</h2>
          <p className="mt-2 text-sm text-muted-foreground">ساخت فرم در کمتر از ۲ دقیقه بدون نیاز به پرداخت یا ثبت کارت بانکی.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={routes.link.home}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
            >
              <span>ایجاد فرم در فضای کاری</span>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
