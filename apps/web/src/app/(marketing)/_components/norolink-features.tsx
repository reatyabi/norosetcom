'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Image as ImageIcon,
  Layers,
  MapPin,
  MousePointerClick,
  Share2,
  Type,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import type { AnyElement } from '@noroset/norolink/ui';

interface Feature {
  kind: AnyElement['kind'];
  title: string;
  switcherLabel: string;
  description: string;
  icon: LucideIcon;
  background: string;
  tone: string;
}

// تصویر گوشی هر امکان ثابت و دستی است: public/images/features/{kind}.webp (۷۲۰×۱۳۶۰، WebP؛ نمای ۲۶۴×۴۹۶ با
// object-top). برای تغییر، همان فایل را با همین نام جایگزین کنید؛ هیچ اسکریپتی آن را بازنویسی نمی‌کند.
const featureImageSrc = (kind: AnyElement['kind']) => `/images/features/${kind}.webp`;

const FEATURES: Feature[] = [
  {
    kind: 'link_button',
    title: 'دکمه لینک',
    switcherLabel: 'دکمه لینک',
    description: 'لینک‌های رزرو، خرید یا هر مقصد مهم را به شکل دکمه‌های واضح و قابل‌شخصی‌سازی بچین.',
    icon: MousePointerClick,
    background: '#fcd9c4',
    tone: 'bg-tone-sky/12 text-tone-sky hover:bg-tone-sky/22 dark:text-tone-sky',
  },
  {
    kind: 'social_icons',
    title: 'شبکه‌های اجتماعی',
    switcherLabel: 'شبکه‌ها',
    description: 'راه‌های ارتباطی‌ات را با آیکون‌های شبکه‌ها در یک ردیف مرتب نمایش بده.',
    icon: Share2,
    background: '#cfe3f7',
    tone: 'bg-tone-rose/12 text-tone-rose hover:bg-tone-rose/22 dark:text-tone-rose',
  },
  {
    kind: 'rich_text',
    title: 'متن',
    switcherLabel: 'متن',
    description: 'با تیتر، پاراگراف و فهرست، معرفی یا جزئیات کارت را خوانا منتشر کن.',
    icon: Type,
    background: '#f6cdd6',
    tone: 'bg-warning/14 text-tone-amber hover:bg-warning/24 dark:text-tone-amber',
  },
  {
    kind: 'image',
    title: 'تصویر و اسلایدر',
    switcherLabel: 'تصویر',
    description: 'نمونه‌کارت را به‌صورت تصویر یا گالری قابل‌ورق‌زدن با کادر دلخواه نشان بده.',
    icon: ImageIcon,
    background: '#dcd6f5',
    tone: 'bg-success/12 text-success hover:bg-success/22 dark:text-tone-emerald',
  },
  {
    kind: 'video_embed',
    title: 'ویدیو',
    switcherLabel: 'ویدیو',
    description: 'ویدیوهای آپارات، یوتیوب یا ویمیو را مستقیم در صفحه‌ی لینک نمایش بده.',
    icon: Video,
    background: '#d5ead9',
    tone: 'bg-tone-rose/12 text-tone-rose hover:bg-tone-rose/22 dark:text-tone-rose',
  },
  {
    kind: 'map_embed',
    title: 'نقشه',
    switcherLabel: 'نقشه',
    description: 'نشانی کسب‌وکارت را همراه نقشه و مسیر‌یابی در صفحه قرار بده.',
    icon: MapPin,
    background: '#f5e8b3',
    tone: 'bg-tone-violet/12 text-tone-violet hover:bg-tone-violet/22 dark:text-tone-violet',
  },
];

export function NorolinkFeatures() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const feature = FEATURES[activeIndex]!;
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' as const };

  return (
    <section aria-labelledby="norolink-features-heading" className="border-y border-border">
      <div
        className="mkt-features-container mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 xl:px-8"
      >
        <div className="mkt-features-grid grid gap-8 xl:items-center xl:gap-16">
          <div>
            <h2 id="norolink-features-heading" className="mkt-features-heading flex max-w-lg items-center gap-3 text-2xl leading-tight font-black text-foreground md:text-3xl">
              <Layers aria-hidden="true" className="mkt-features-heading-icon size-8 shrink-0 text-primary" />
              <span>المان‌های کاربردی</span>
            </h2>

            <div className="mkt-features-desktop-switcher mt-8 border-s border-border" role="group" aria-label="امکانات نورولینک">
              {FEATURES.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;

                return (
                  <div key={item.kind} className="relative">
                    {isActive ? (
                      <motion.span
                        layoutId="norolink-feature-indicator"
                        className="absolute inset-y-0 -start-px w-0.5 bg-primary"
                        transition={transition}
                        aria-hidden="true"
                      />
                    ) : null}
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveIndex(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="text-base font-semibold">{item.title}</span>
                        <span className="text-sm leading-6 text-muted-foreground">{item.description}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
          <motion.div
            className="relative isolate flex min-h-[34rem] items-center justify-center overflow-hidden rounded-3xl p-6 sm:min-h-[40rem] sm:p-8"
            animate={{ backgroundColor: feature.background }}
            transition={transition}
            aria-label={`پیش‌نمایش خروجی ${feature.title}`}
            role="region"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={feature.kind}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={transition}
                className="relative w-[min(16.5rem,100%)] rounded-[2.75rem] bg-[#171717] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]"
              >
                <div className="relative h-[31rem] overflow-hidden rounded-[2.25rem] bg-background">
                  <span aria-hidden="true" className="absolute top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#171717]" />
                  <Image src={featureImageSrc(feature.kind)} alt="" fill sizes="264px" className="object-cover object-top" />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

            <div className="mkt-features-mobile-switcher flex items-start justify-between gap-1" role="group" aria-label="امکانات نورولینک">
              {FEATURES.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={item.kind}
                    type="button"
                    aria-label={item.title}
                    aria-pressed={isActive}
                    onClick={() => setActiveIndex(index)}
                    className={`flex w-12 shrink-0 flex-col items-center gap-1.5 rounded-lg py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-ring ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <span className={`flex size-10 items-center justify-center rounded-xl ${item.tone}`}>
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-[10px] leading-4">{item.switcherLabel}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={feature.kind}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={transition}
                className="mkt-features-active-description text-sm leading-6 text-muted-foreground"
                aria-live="polite"
              >
                {feature.description}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}