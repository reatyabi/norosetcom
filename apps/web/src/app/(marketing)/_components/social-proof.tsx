'use client';

import {
  Building2Icon,
  SparklesIcon,
  CheckCircle2Icon,
  Users2Icon,
  RocketIcon,
  GraduationCapIcon,
} from 'lucide-react';

const TRUSTED_SECTORS = [
  { name: 'استارتاپ‌ها و تیم‌های محصول', sub: 'کارخانه‌های نوآوری آزادی و های‌وب', icon: RocketIcon },
  { name: 'استودیوهای طراحی و آژانس‌ها', sub: 'مدیریت دارایی و هویت دیجیتال n8l.ir', icon: SparklesIcon },
  { name: 'منابع انسانی و سازمان‌ها', sub: 'فرم‌های استخدامی و ارزیابی عملکرد', icon: Users2Icon },
  { name: 'مراکز آموزشی و رویدادها', sub: 'ثبت‌نام و نظرسنجی دوره‌های تخصصی', icon: GraduationCapIcon },
  { name: 'کسب‌وکارهای تجاری و خدماتی', sub: 'درگاه بیو و تحلیل بدون کوکی', icon: Building2Icon },
];

export function SocialProof() {
  return (
    <section className="border-b border-border/40 bg-muted/15 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
            <CheckCircle2Icon className="size-4 text-success shrink-0" />
            <span>مورد اعتماد و استفاده روزانه بیش از <strong className="text-foreground num-fa">+۲,۴۰۰</strong> تیم محصول، استارتاپ و کسب‌وکار در ایران</span>
          </p>

          {/* Clean minimal badge strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 w-full">
            {TRUSTED_SECTORS.map((sector) => {
              const Icon = sector.icon;
              return (
                <div
                  key={sector.name}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/60 p-3.5 text-center shadow-xs transition-colors hover:border-primary/40 hover:bg-card"
                >
                  <Icon className="size-5 text-muted-foreground/80 mb-2" />
                  <span className="text-xs font-bold text-foreground truncate max-w-full">{sector.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{sector.sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
