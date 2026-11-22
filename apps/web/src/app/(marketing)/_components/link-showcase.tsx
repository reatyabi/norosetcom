'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChartNoAxesCombined, LayoutTemplate, Link2, Search } from 'lucide-react';
import Image from 'next/image';
import { linkTemplate } from '@noroset/norolink/ui';
import { routes } from '@/lib/routes';
import { templateThumbSrc } from '@/lib/marketing-shots';

const FEATURED_TEMPLATES = [
  'beauty',
  'fitness',
  'cafe',
  'creator',
  'shop',
  'portfolio',
  'course',
] as const;
const HERO_BENEFITS = [
  { label: 'قالب‌های آماده', icon: LayoutTemplate },
  { label: 'آمار بازدید و نرخ کلیک', icon: ChartNoAxesCombined },
  { label: 'نمایش در نتایج گوگل', icon: Search },
  { label: 'نشانی کوتاه yourname.n8l.ir', icon: Link2 },
] as const;

/** فاصله‌ی چرخش خودکار قالب‌های هیرو. */
const AUTOPLAY_MS = 3500;

export function LinkShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % FEATURED_TEMPLATES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion]);

  return (
    <section aria-labelledby="home-hero-title" className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16 lg:pb-24">
      <div className="flex flex-col items-center gap-8 xl:flex-row xl:gap-12">
        <div className="order-2 w-full space-y-6 text-center xl:order-none xl:w-[44%] xl:shrink-0 xl:text-start">
          <h1 id="home-hero-title" className="text-4xl leading-[1.25] font-black text-foreground sm:text-5xl lg:text-6xl">
            <span className="text-tone-rose dark:text-tone-rose">نورولینک</span>
            <br />
            دروازه ارتباطات شما
          </h1>
          <p className="mx-auto max-w-lg text-base leading-8 text-muted-foreground sm:text-lg xl:mx-0">
            تمام کانال‌های ارتباطی و شناسه‌های دیجیتال خود را از طریق یک لینک‌پیج مدیریت کنید.
          </p>
          <div className="flex flex-wrap justify-center gap-3 xl:justify-start">
            <Link
              href={routes.link.home}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              شروع رایگان
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="relative order-1 min-w-0 w-full xl:order-none xl:flex-1">
          <div className="absolute inset-x-0 top-12 bottom-2 rounded-3xl bg-muted/70" aria-hidden="true" />
          <div className="mkt-ticker-viewport relative min-h-14 overflow-hidden py-3 text-xs font-medium text-muted-foreground sm:text-sm" role="region" aria-label="امکانات نورولینک" dir="ltr">
            <div className="mkt-ticker-track" role="list" dir="ltr">
              <div className="flex shrink-0 items-center gap-8 px-4">
                {HERO_BENEFITS.map(({ label, icon: Icon }) => (
              <span key={label} role="listitem" dir="rtl" className="flex items-center gap-2 whitespace-nowrap">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
              <div aria-hidden="true" className="flex shrink-0 items-center gap-8 px-4">
                {HERO_BENEFITS.map(({ label, icon: Icon }) => (
                  <span key={label} dir="rtl" className="flex items-center gap-2 whitespace-nowrap">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative mx-auto flex h-[430px] w-full items-center justify-center overflow-hidden [perspective:1200px] sm:h-[500px]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
            role="region"
            aria-label="قالب‌های نورولینک"
          >
            {FEATURED_TEMPLATES.map((templateId, index) => {
              const template = linkTemplate(templateId);
              if (!template) return null;
              const len = FEATURED_TEMPLATES.length;
              let offset = (index - activeIndex) % len;
              if (offset < -Math.floor(len / 2)) offset += len;
              else if (offset > Math.floor(len / 2)) offset -= len;

              const isActive = offset === 0;
              const isVisible = Math.abs(offset) <= 2;

              return (
                <motion.div
                  key={template.id}
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`نمایش قالب ${template.title}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveIndex(index);
                    }
                  }}
                  initial={false}
                  animate={{
                    x: `${offset * 52}%`,
                    y: isActive ? 0 : 20,
                    rotateY: offset * -16,
                    scale: isActive ? 1 : Math.max(0.7, 0.85 - Math.abs(offset) * 0.08),
                    opacity: isActive ? 1 : isVisible ? Math.max(0, 0.7 - Math.abs(offset) * 0.25) : 0,
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
                  style={{
                    zIndex: 10 - Math.abs(offset),
                    transformStyle: 'preserve-3d',
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                  className="absolute left-1/2 top-1/2 h-[350px] w-[195px] -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-3xl border border-border bg-background p-1.5 text-start shadow-xl focus-visible:outline-2 focus-visible:outline-ring sm:h-[420px] sm:w-[250px]"
                >
                  <div className="relative size-full overflow-hidden rounded-[1.25rem]">
                    <Image src={templateThumbSrc(templateId)} alt="" fill sizes="250px" className="object-cover object-top" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="relative flex items-center justify-center gap-2 pb-5">
            <div className="flex items-center gap-2" role="group" aria-label="انتخاب قالب">
              {FEATURED_TEMPLATES.map((templateId, index) => {
                const template = linkTemplate(templateId);
                if (!template) return null;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={templateId}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`قالب ${template.title}`}
                    aria-pressed={isActive}
                    className={`h-2 rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] ${isActive ? 'w-6 bg-primary' : 'w-2 bg-foreground/25 hover:bg-foreground/50'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
