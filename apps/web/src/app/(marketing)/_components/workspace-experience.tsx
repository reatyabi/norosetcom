'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  SparklesIcon,
  CheckCircle2Icon,
  UsersIcon,
  LaptopIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';

const WORKSPACE_STORIES = [
  {
    id: 'tech-office',
    tag: 'تیم‌های استارتاپی و توسعه محصول',
    icon: UsersIcon,
    title: 'هماهنگی بخش‌های مارکتینگ، منابع انسانی و پشتیبانی',
    desc: 'طراحی فرم‌های استخدام، نظرسنجی و دریافت بازخورد مشتریان بدون نیاز به سرور و تحلیل آنی در اکسل فارسی.',
    image: '/images/tehran-tech-office.jpg',
    imageAlt: 'تیم نوآوری و مهندسی در دفتر تهران با نمای برج میلاد',
    badge: '۹۹.۹۵٪ پایداری',
    badgeSub: 'محیط کاری تیم‌های فعال در کارخانه نوآوری',
    actionText: 'ورود به مدیریت فرم‌ها',
    actionHref: routes.form.home,
    features: [
      'ورود سریع پیامکی با کاوه‌نگار و ملی‌پیامک',
      'ایزولاسیون کامل داده‌ها با PostgreSQL FORCE RLS',
    ],
    borderColor: 'hover:border-blue-500/50',
    tagColor: 'text-primary',
    badgeColor: 'text-success dark:text-success bg-success/15',
  },
  {
    id: 'creative-studio',
    tag: 'استودیوها، طراحان و برندهای دیجیتال',
    icon: LaptopIcon,
    title: 'هویت دیجیتال قدرتمند و بهینه‌سازی دارایی‌ها',
    desc: 'اتصال مخاطبان به خدمات و شبکه‌های اجتماعی با ۱۲ قالب شیک، ویجت‌های ویدیویی آپارات و میزبانی سبک WebP.',
    image: '/images/iran-creative-studio.jpg',
    imageAlt: 'استودیو طراحی خلاق در تهران با تجهیزات تولید محتوا',
    badge: 'n8l.ir',
    badgeSub: 'درگاه ارتباطی برند روی دامنه کوتاه',
    actionText: 'ورود به مدیریت لینک‌ها',
    actionHref: routes.link.home,
    features: [
      'آمار دقیق کلیک و بازدید بدون نیاز به کوکی',
      'کراپ غیرمخرب و فشرده‌سازی تا ۶۵٪ کمتر',
    ],
    borderColor: 'hover:border-cyan-500/50',
    tagColor: 'text-cyan-600 dark:text-cyan-400',
    badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/15',
  },
  {
    id: 'meeting-room',
    tag: 'مدیران ارشد، راهبران فنی و امنیت',
    icon: ShieldCheckIcon,
    title: 'جلسات راهبری و معماری سیستم‌های سازمانی',
    desc: 'پایش بلادرنگ پاسخ‌ها، مدیریت متمرکز اعضای تیم و اطمینان از ایزولاسیون صددرصدی داده‌ها در بستر شبکه ملی.',
    image: '/images/iran-meeting-room.jpg',
    imageAlt: 'جلسه تیم محصول و مدیران فناوری پیرامون معماری سیستم در تهران',
    badge: '۱۰۰٪ ایزوله',
    badgeSub: 'ایزولاسیون سازمانی PostgreSQL RLS',
    actionText: 'ورود به فضای کاری',
    actionHref: routes.link.home,
    features: [
      'کنترل دسترسی اعضای تیم با تفکیک کامل دسترسی‌ها',
      'سرعت پاسخ‌دهی زیر ۲۰ میلی‌ثانیه بر سرورهای ابری',
    ],
    borderColor: 'hover:border-success/50',
    tagColor: 'text-success dark:text-success',
    badgeColor: 'text-success dark:text-success bg-success/15',
  },
];

export function WorkspaceExperience() {
  return (
    <section id="solutions" className="py-14 sm:py-20 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <SparklesIcon className="size-3.5" />
            <span>تجربه واقعی کسب‌وکارهای ایران</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-foreground">
            تلفیق فضای کار واقعی با نسل جدید وب‌اپلیکیشن‌ها
          </h2>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            ترکیب محیط‌های کاری پویا و حرفه‌ای در ایران با ابزارهای ابری سازمانی، بدون نیاز به زیرساخت‌های پیچیده.
          </p>
        </div>

        {/* 3 Real Workplace Photographic Feature Cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {WORKSPACE_STORIES.map((story) => {
            const Icon = story.icon;
            return (
              <div
                key={story.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card shadow-md transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 ${story.borderColor} hover:shadow-2xl hover:-translate-y-1`}
              >
                <div>
                  {/* Real Workplace Photo */}
                  <div className="relative h-48 sm:h-56 w-full overflow-hidden">
                    <Image
                      src={story.image}
                      alt={story.imageAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 400px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                    {/* Floating live metric chip on the photo with high contrast */}
                    <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between rounded-xl border border-white/20 bg-background/90 p-2 sm:p-2.5 shadow-xl backdrop-blur-md text-[11px] drop-shadow-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex size-2 rounded-full bg-success animate-pulse shrink-0" />
                        <span className="font-bold text-foreground truncate drop-shadow-xs">{story.badgeSub}</span>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black shrink-0 ${story.badgeColor}`}>
                        {story.badge}
                      </span>
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="p-4 sm:p-6">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${story.tagColor}`}>
                      <Icon className="size-4" />
                      <span>{story.tag}</span>
                    </div>

                    <h3 className="mt-2 text-base font-extrabold text-foreground sm:text-lg leading-snug">
                      {story.title}
                    </h3>

                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {story.desc}
                    </p>

                    <div className="mt-3 sm:mt-4 flex flex-col gap-1.5">
                      {story.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-xs text-foreground font-medium">
                          <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-4 sm:p-6 pt-0">
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <Link
                      href={story.actionHref}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <span>{story.actionText}</span>
                      <ArrowLeftIcon className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
