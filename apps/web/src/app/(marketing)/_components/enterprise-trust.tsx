'use client';

import {
  ShieldCheckIcon,
  LockIcon,
  ServerIcon,
  SmartphoneIcon,
  DatabaseIcon,
  ClockIcon,
  FileSpreadsheetIcon,
} from 'lucide-react';

const TRUST_POINTS = [
  {
    title: 'ایزولاسیون دیتابیس (FORCE RLS)',
    desc: 'جداسازی ۱۰۰٪ داده‌های هر سازمان در سطح PostgreSQL بدون دسترسی متقابل.',
    icon: DatabaseIcon,
    accent: 'text-blue-500 bg-blue-500/10',
  },
  {
    title: 'ورود پیامکی با کد یکبار مصرف (OTP)',
    desc: 'ارسال فوری از سرشماره‌های کاوه‌نگار و ملی‌پیامک با ذخیره ایمن هش HMAC-SHA256.',
    icon: SmartphoneIcon,
    accent: 'text-cyan-500 bg-cyan-500/10',
  },
  {
    title: 'میزبانی ابری S3 سازمانی',
    desc: 'باکت‌های خصوصی، تحویل بهینه CDN، تبدیل خودکار WebP و اعتبارسنجی بایت‌ها.',
    icon: ServerIcon,
    accent: 'text-purple-500 bg-purple-500/10',
  },
  {
    title: 'اکسل استاندارد سازگار با فارسی',
    desc: 'خروجی با استاندارد UTF-8 BOM بدون به‌هم‌ریختگی حروف و تاریخ‌های دقیق شمسی.',
    icon: FileSpreadsheetIcon,
    accent: 'text-success dark:text-success bg-success/10',
  },
  {
    title: 'ضد اسپم هوشمند بدون کپچا',
    desc: 'تله اسپم (Honeypot) و محدودکننده نرخ ارسال لحظه‌ای بدون نیاز به حل تست تصویری.',
    icon: ShieldCheckIcon,
    accent: 'text-indigo-500 bg-indigo-500/10',
  },
  {
    title: 'پایداری ۹۹.۹۵٪ و سرعت پاسخگویی',
    desc: 'پاسخگویی سریع زیر ۲۰ms در بستر اینترنت و شبکه ملی اطلاعات.',
    icon: ClockIcon,
    accent: 'text-success bg-success/10',
  },
];

export function EnterpriseTrust() {
  return (
    <section id="security" className="py-16 sm:py-24 bg-muted/20 border-y border-border/40 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success dark:text-success">
            <LockIcon className="size-3.5" />
            <span>معماری و امنیت بومی</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-foreground">
            ساخته‌شده بر پایه استانداردهای جهانی، مهندسی‌شده برای ایران
          </h2>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            از ایزولاسیون کامل داده‌ها تا پیامک‌های آنی، زیرساخت نوروست طوری مهندسی شده تا سازمان‌ها با آسودگی خاطر رشد کنند.
          </p>
        </div>

        {/* 6 Grid items */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:border-primary/40 hover:shadow-md"
              >
                <div className={`flex size-10 items-center justify-center rounded-xl ${point.accent}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{point.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Proof counter strip */}
        <div className="mt-14 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-primary num-fa">۹۹.۹۵٪</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">پایداری آپ‌تایم سرورها</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground num-fa">+۵۰,۰۰۰</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">پاسخ ثبت‌شده فرم‌ها</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground num-fa">&lt; ۲۰ms</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">میانگین زمان پردازش</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-success dark:text-success num-fa">۱۰۰٪</div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">ایزولاسیون داده‌ها با RLS</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
