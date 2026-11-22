'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LinkIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  PlayIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PauseIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  PaletteIcon,
  TrendingUpIcon,
  HelpCircleIcon,
  CropIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import { DesktopMockup } from '../../_components/desktop-mockup';
import { MobileMockup } from '../../_components/mobile-mockup';

const LINK_SLIDES = [
  {
    id: 'aurora',
    title: '۱۲ قالب اختصاصی و استودیوی شخصی‌سازی درگاه',
    subtitle: 'ظاهری چشم‌نواز با گرادیان‌های مِش، نئون شیشه‌ای، تم‌های دارک و چیدمان آسان بلوک‌های کاربردی.',
    badge: 'استودیو طراحی و قالب‌ها',
    color: 'from-cyan-500 via-blue-600 to-indigo-600',
    highlight: '+۴۲٪ تعامل بالاتر با دکمه‌های شیشه‌ای و نوری',
    mode: 'theme' as const,
  },
  {
    id: 'mobile-view',
    title: 'پیش‌نمایش زنده درگاه بیو روی گوشی موبایل مخاطب',
    subtitle: 'پخش مستقیم ویدیوی آپارات، دکمه‌های مستقیم واتساپ و تلگرام و تیک رسمی تایید در موبایل مخاطب.',
    badge: 'نمای زنده موبایل مخاطب',
    color: 'from-purple-600 via-pink-600 to-rose-600',
    highlight: 'گواهی کنتراست WCAG برای دسترسی‌پذیری و خوانایی متن',
    mode: 'mobile' as const,
  },
  {
    id: 'analytics',
    title: 'آنالیتیکس دقیق ترافیک با حفظ ۱۰۰٪ حریم خصوصی',
    subtitle: 'پایش بازدیدها، تفکیک کلیک‌های اینستاگرام و تلگرام بدون هیچ‌گونه ذخیره‌سازی کوکی و ردیاب.',
    badge: 'آنالیتیکس بدون کوکی',
    color: 'from-emerald-600 via-teal-600 to-cyan-700',
    highlight: 'تحلیل دقیق ترافیک ایران و نرخ کلیک CTR',
    mode: 'analytics' as const,
  },
];

const LINK_FEATURES = [
  {
    icon: LinkIcon,
    title: 'زیردامنه فوق‌العاده کوتاه اختصاصی',
    desc: 'آدرس اختصاصی شما به صورت slug.n8l.ir بدون نیاز به خرید دامنه یا راه‌اندازی هاست، آماده قرارگیری در بیو اینستاگرام و شبکه‌های اجتماعی.',
    tag: '{slug}.n8l.ir',
  },
  {
    icon: PaletteIcon,
    title: '۱۲ قالب اختصاصی با استانداردهای ترند جهانی',
    desc: 'انتخاب از بین ۱۲ قالب آماده شامل شفق، نئون، موکا، نیمه‌شب، فیروزه‌ای، جنگل و بروتال با امکان شخصی‌سازی رنگ اصلی و سبک دکمه‌ها.',
    tag: '12 Curated Themes',
  },
  {
    icon: PlayIcon,
    title: 'ویجت‌های بومی: آپارات، یوتیوب، نشان و بلد',
    desc: 'پخش روان ویدیوهای آپارات بدون نیاز به خروج کاربر، به همراه نقشه تعاملی نشان و بلد برای هدایت حضوری مشتریان به دفتر شما.',
    tag: 'Aparat & Neshan',
  },
  {
    icon: ShieldCheckIcon,
    title: 'آمار دقیق بدون کوکی و با حفظ حریم خصوصی',
    desc: 'رهگیری کلیک‌ها، دستگاه‌ها و دامنه‌های ارجاع‌دهنده بدون استفاده از کوکی‌های ردیاب و کاملاً منطبق بر حریم خصوصی مدرن.',
    tag: 'Zero-Cookie Privacy',
  },
  {
    icon: SmartphoneIcon,
    title: 'ورودی هوشمند لینک و نرمال‌سازی خودکار',
    desc: 'کافیست شناسه شبکه یا شماره تلفن را وارد کنید؛ سیستم لینک واتساپ، تماس، تلگرام و اینستاگرام را خودکار می‌سازد.',
    tag: 'Smart URL Normalizer',
  },
  {
    icon: CropIcon,
    title: 'کراپ غیرمخرب تصاویر با فوکوس درصدی',
    desc: 'تنظیم نقطه کانونی، زوم و کادربندی تصاویر بدون دستکاری یا تخریب فایل اصلی، با بهینه‌سازی خودکار در زمان رندر.',
    tag: 'Non-Destructive Crop',
  },
];

const FAQS = [
  {
    q: 'آیا برای ساخت صفحه در نورولینک نیاز به خرید هاست یا دامنه دارم؟',
    a: 'خیر، به محض ساخت صفحه در نوروست، یک آدرس اختصاصی روی دامنه کوتاه n8l.ir (مثلاً shop.n8l.ir) به صورت رایگان و آنی به شما اختصاص می‌یابد.',
  },
  {
    q: 'آیا ویدیوهای آپارات مستقیماً در صفحه پخش می‌شوند؟',
    a: 'بله، با قرار دادن لینک ویدیوی آپارات، پلیر بومی و بدون تبلیغات مزاحم در صفحه شما جاسازی شده و کاربر بدون خروج از صفحه بیو می‌تواند ویدیو را تماشا کند.',
  },
  {
    q: 'آمار بازدیدها و کلیک‌ها چگونه ثبت می‌شود؟',
    a: 'سیستم آمار نورولینک از رویدادهای زنده sendBeacon استفاده می‌کند و بدون افت سرعت یا نصب کوکی‌های جاسوسی، تعداد کلیک هر دکمه را دقیق گزارش می‌دهد.',
  },
  {
    q: 'چند لینک می‌توانم در یک صفحه اضافه کنم؟',
    a: 'در پلن پایه می‌توانید تا حدود ۳۰ المان شامل دکمه‌ها، آیکون‌های شبکه، ویدیو، متن غنی، تصویر و نقشه را در یک صفحه بچینید.',
  },
];

export default function LinkLandingPage() {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev + 1) % LINK_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlideIdx((prev) => (prev - 1 + LINK_SLIDES.length) % LINK_SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const currentSlide = LINK_SLIDES[activeSlideIdx] ?? LINK_SLIDES[0]!;

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Top Badge with Persian & English Names */}
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-tone-rose/10 px-4 py-1.5 text-xs font-bold text-tone-rose dark:text-tone-rose backdrop-blur-md">
              <LinkIcon className="size-4" />
              <span>نورولینک</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[11px] font-bold tracking-wider">Norolink</span>
            </div>

            {/* Headline: [Product Name]؛ [Slogan] with distinctive product name color */}
            <h1 className="mt-4 max-w-4xl text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-foreground leading-tight sm:whitespace-nowrap">
              <span className="text-tone-rose dark:text-tone-rose">نورولینک</span>
              <span className="text-muted-foreground/80 font-normal mx-1">؛</span>
              <span>درگاه هوشمند پیوندها و بیو</span>
            </h1>

            <p className="mt-4 max-w-2xl text-xs sm:text-base text-muted-foreground leading-relaxed">
              دامنه اختصاصی yourname.n8l.ir با ۱۲ قالب شیک، ویجت‌های ویدیویی آپارات، نشان و آمار دقیق بازدید بدون ردیاب.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={routes.link.home}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
              >
                <span>رزرو آدرس اختصاصی در نورولینک</span>
                <ArrowLeftIcon className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm sm:text-base font-semibold text-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:bg-muted hover:scale-[1.02] active:scale-95"
              >
                <span>مشاهده قالب‌ها و امکانات</span>
              </a>
            </div>
          </div>

          {/* Interactive Themes Slider with Real Creator Photo */}
          <div
            className="mt-14 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Top Slider Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                {LINK_SLIDES.map((slide, idx) => (
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
                <span className="text-xs font-extrabold text-tone-rose dark:text-tone-rose">{currentSlide.badge}</span>
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
                  <div key="norolink-mobile-slide" className="w-[235px] sm:w-[260px] py-2">
                    <MobileMockup productId="norolink" showFloatingBadges={true} />
                  </div>
                ) : (
                  <div key={`norolink-desktop-${currentSlide.mode}`} className="w-full">
                    <DesktopMockup productId="norolink" detailMode={currentSlide.mode} />
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
              امکانات قدرتمند نورولینک
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              سریع‌ترین و زیباترین راه برای گردآوری تمام راه‌های ارتباطی در یک آدرس به یادماندنی.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LINK_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-primary hover:shadow-md transition-[color,background-color,border-color,box-shadow,opacity,transform]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-tone-rose/10 text-tone-rose dark:text-tone-rose">
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
                src="/images/iran-creative-workspace.jpg"
                alt="خالق و طراح در حال استفاده از نورولینک"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent flex items-end p-6">
                <div className="text-white text-xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  <div className="font-extrabold text-sm">استودیوهای طراحی و فریلنسرهای ایرانی</div>
                  <div className="text-white/90 mt-1">معرفی کاتالوگ و رزرو مشاوره مستقیم بدون نیاز به وب‌سایت پیچیده</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4 text-start">
              <span className="text-xs font-bold text-tone-rose dark:text-tone-rose">مناسب برای تمام کسب‌وکارها در ایران</span>
              <h2 className="text-2xl font-black text-foreground sm:text-3xl leading-snug">
                یک لینک بیو که نرخ تبدیل فروشگاه و برند شما را چند برابر می‌کند
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                دیگر نیاز نیست در بیو شبکه‌های اجتماعی برای هر خدمت آدرس جداگانه بگذارید؛ همه چیز را در یک صفحه سبک، سریع و مجهز به ویدیو و نقشه به نمایش بگذارید.
              </p>

              <div className="mt-2 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>فروشگاه‌های اینستاگرامی: اتصال مستقیم به کانال بله، ایتا، تلگرام و درگاه سفارش</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>پزشکان، وکلا و مشاورین: آدرس مطب با نقشه نشان و بلد و شماره تماس مستقیم</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2Icon className="size-4 text-success shrink-0" />
                  <span>سازمان‌ها و استارتاپ‌ها: اشتراک‌گذاری کاتالوگ محصولات، اخبار و ویدیوهای آپارات</span>
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
            <h2 className="text-2xl font-black text-foreground">سوالات متداول درباره نورولینک</h2>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-border/60 bg-card p-5 text-start">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <HelpCircleIcon className="size-4 text-pink-500 shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed ps-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-12 border-t border-border/40 bg-gradient-to-br from-pink-500/10 via-background to-rose-500/10 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-black text-foreground sm:text-3xl">صفحه اختصاصی خود را در ۲ دقیقه فعال کنید</h2>
          <p className="mt-2 text-sm text-muted-foreground">آدرس کوتاه اختصاصی شما روی n8l.ir منتظر شماست.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={routes.link.home}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
            >
              <span>رزرو صفحه در پنل کاربری</span>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
