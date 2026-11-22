'use client';

import Link from 'next/link';
import {
  FileTextIcon,
  LinkIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';

interface ManagementCard {
  id: string;
  title: string;
  productName: string;
  englishName: string;
  slogan: string;
  brandColor: string;
  badge: string;
  description: string;
  managementHref: string;
  managementLabel: string;
  landingHref: string;
  landingLabel: string;
  icon: typeof FileTextIcon;
  badgeColor: string;
  iconBg: string;
  btnBg: string;
  borderColor: string;
}

const CARDS: ManagementCard[] = [
  {
    id: 'noroform',
    title: 'مدیریت فرم‌ها',
    productName: 'نوروفرم',
    englishName: 'Noroform',
    slogan: 'فرم‌ساز هوشمند سازمانی',
    brandColor: 'text-purple-600 dark:text-purple-400',
    badge: 'Noroform',
    description: 'طراحی فرم، مدیریت پاسخ‌های دریافتی و استخراج لحظه‌ای به اکسل فارسی.',
    managementHref: routes.form.home,
    managementLabel: 'ورود به مدیریت فرم‌ها',
    landingHref: routes.landing.form,
    landingLabel: 'امکانات اختصاصی نوروفرم',
    icon: FileTextIcon,
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    borderColor: 'hover:border-purple-500/50',
  },
  {
    id: 'norolink',
    title: 'مدیریت پیوندها',
    productName: 'نورولینک',
    englishName: 'Norolink',
    slogan: 'درگاه هوشمند پیوندها و بیو',
    brandColor: 'text-tone-rose dark:text-tone-rose',
    badge: 'Norolink',
    description: 'ویرایش درگاه بیو، قالب‌های مدرن، ویجت‌های ویدیویی و پایش آمار بازدید n8l.ir.',
    managementHref: routes.link.home,
    managementLabel: 'ورود به مدیریت لینک‌ها',
    landingHref: routes.landing.link,
    landingLabel: 'امکانات اختصاصی نورولینک',
    icon: LinkIcon,
    badgeColor: 'bg-tone-rose/10 text-tone-rose dark:text-tone-rose',
    iconBg: 'bg-tone-rose/10 text-tone-rose dark:text-tone-rose',
    btnBg: 'bg-pink-600 hover:bg-pink-700 text-white',
    borderColor: 'hover:border-pink-500/50',
  },
  {
    id: 'norofile',
    title: 'مدیریت فایل‌ها',
    productName: 'نوروفایل',
    englishName: 'Norofile',
    slogan: 'میزبان امن داده‌های شما',
    brandColor: 'text-warning dark:text-tone-amber',
    badge: 'Norofile',
    description: 'فضای امن ذخیره‌سازی S3، فشرده‌سازی WebP و سازمان‌دهی رسانه‌ها.',
    managementHref: routes.file.home,
    managementLabel: 'ورود به مدیریت فایل‌ها',
    landingHref: routes.landing.file,
    landingLabel: 'امکانات اختصاصی نوروفایل',
    icon: FolderIcon,
    badgeColor: 'bg-warning/10 text-warning dark:text-tone-amber',
    iconBg: 'bg-warning/10 text-warning dark:text-tone-amber',
    btnBg: 'bg-warning hover:bg-amber-600 text-slate-950 font-bold',
    borderColor: 'hover:border-warning/50',
  },
  {
    id: 'workspace',
    title: 'مدیریت فضای کاری',
    productName: 'نوروست',
    englishName: 'Noroset',
    slogan: 'پلتفرم یکپارچه ابزارهای ابری',
    brandColor: 'text-primary',
    badge: 'Noroset',
    description: 'مدیریت اعضای تیم، دسترسی‌ها و سوییچ بین فضاهای کاری مستقل با امنیت RLS.',
    managementHref: routes.link.home,
    managementLabel: 'ورود به پنل',
    landingHref: '/#security',
    landingLabel: 'معماری و امنیت داده‌ها',
    icon: LayoutDashboardIcon,
    badgeColor: 'bg-primary/10 text-primary',
    iconBg: 'bg-primary/10 text-primary',
    btnBg: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    borderColor: 'hover:border-primary/50',
  },
];

export function BentoShowcase() {
  return (
    <section id="showcase" className="py-12 sm:py-16 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header - Concise & Direct */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <SparklesIcon className="size-3.5" />
            <span>پنل مدیریت محصولات</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            مدیریت مستقیم ابزارها و محصولات پلتفرم
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg">
            جهت مدیریت هر محصول یا بررسی مشخصات، روی کارت مربوطه کلیک کنید.
          </p>
        </div>

        {/* 4 Focused Management Product Cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`group flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 ${card.borderColor} hover:shadow-xl hover:-translate-y-1`}
              >
                <div>
                  {/* Top Bar with Icon and English Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${card.iconBg}`}>
                      <Icon className="size-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>

                  {/* Slogan with Format: [Product Name]؛ [Slogan] */}
                  <div className="mt-4">
                    <div className="text-xs font-bold leading-tight">
                      <span className={card.brandColor}>{card.productName}</span>
                      <span className="text-muted-foreground/80 font-normal mx-0.5">؛ </span>
                      <span className="text-foreground/90">{card.slogan}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-foreground mt-1">
                      <Link href={card.managementHref} className="hover:underline focus:outline-none">
                        {card.title}
                      </Link>
                    </h3>
                  </div>

                  {/* Concise Description */}
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Actions: Direct Management Link + Compact Landing Link */}
                <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-border/40">
                  <Link
                    href={card.managementHref}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ${card.btnBg}`}
                  >
                    <span>{card.managementLabel}</span>
                    <ArrowLeftIcon className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  </Link>

                  <Link
                    href={card.landingHref}
                    className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <span>{card.landingLabel}</span>
                    <ExternalLinkIcon className="size-3 opacity-60" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
