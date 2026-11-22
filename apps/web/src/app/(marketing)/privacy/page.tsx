import Link from 'next/link';
import {
  ShieldCheckIcon,
  DatabaseIcon,
  LockIcon,
  ServerIcon,
  FileSpreadsheetIcon,
  ArrowRightIcon,
  HeadphonesIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';

export const metadata = {
  title: 'حریم خصوصی و حفاظت از داده‌ها | نوروست',
  description: 'سیاست حفظ حریم خصوصی، امنیت چندمستاجره و اصول حفاظت از اطلاعات کاربران و سازمان‌ها در پلتفرم ابری نوروست.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowRightIcon className="size-4" />
          <span>بازگشت به صفحه اصلی</span>
        </Link>

        {/* Page Header */}
        <div className="border-b border-border/50 pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
            <ShieldCheckIcon className="size-3.5" />
            <span>امنیت و اعتماد سازمانی</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-foreground">
            سیاست حفظ حریم خصوصی و امنیت داده‌ها
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            ما در نوروست معتقدیم امنیت داده‌ها و حریم خصوصی سازمان‌ها یک ارزش بنیادی و غیرقابل مصالحه است. این سند نحوه نگهداری، حفاظت و حقوق شما بر روی دارایی‌های دیجیتالتان را تشریح می‌کند.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span>نسخه رسمی: ۲.۴</span>
            <span>•</span>
            <span className="num-fa">آخرین بازنگری: آبان ۱۴۰۳</span>
          </div>
        </div>

        {/* Core Principles Cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DatabaseIcon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">ایزولاسیون کامل PostgreSQL RLS</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              جداسازی ۱۰۰٪ رکوردها در لایه پایگاه‌داده؛ هیچ سازمانی امکان مشاهده داده‌های دیگران را ندارد.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success dark:text-success">
              <LockIcon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">بدون کوکی‌های ردیاب تجاری</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              صفحات عمومی نورولینک و فرم‌های نوروفرم بدون نصب هرگونه ردیاب شخص ثالث و کوکی فعال هستند.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileSpreadsheetIcon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">مالکیت و خروجی آزاد داده‌ها</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              داده‌های فرم‌ها و فایل‌های شما در هر لحظه به صورت اکسل UTF-8 و لینک مستقیم قابل خروجی یا حذف قطعی هستند.
            </p>
          </div>
        </div>

        {/* Detailed Articles */}
        <div className="mt-12 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۱</span>
              اطلاعاتی که جمع‌آوری می‌کنیم
            </h2>
            <div className="mt-3 space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p>
                <strong>اطلاعات حساب کاربری:</strong> شماره تلفن همراه معتبر جهت احراز هویت پیامکی یکبار مصرف (OTP) و مدیریت ورود به سازمان. ما از رمزهای عبور متنی استفاده نمی‌کنیم.
              </p>
              <p>
                <strong>داده‌های ایجادشده توسط شما:</strong> عناوین فرم‌ها، گزینه‌ها، فایل‌های آپلودشده در انبار S3 و لینک‌های بیو که به خواست خود ایجاد می‌نمایید.
              </p>
              <p>
                <strong>داده‌های لاگ و پردازش فنی:</strong> آدرس هش‌شده IP و متادیتای درخواست‌ها صرفاً جهت مقابله با حملات انکار سرویس (DDoS) و تله‌های اسپم (Honeypot).
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۲</span>
              معماری حفاظت چندمستاجره (Multi-Tenant Isolation)
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              تمامی جداول اطلاعاتی در هسته پایگاه داده با سیستم امنیتی <strong>Row-Level Security (FORCE RLS)</strong> محافظت می‌شوند. بدین معنی که حتی در صورت بروز خطای نرم‌افزاری در سطح کلاینت، سرور دیتابیس به صورت قطعی از نشت یا بازگشت اطلاعات متعلق به فضاهای کاری دیگر ممانعت به عمل می‌آورد.
            </p>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۳</span>
              عدم فروش یا افشای داده‌ها به اشخاص ثالث
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              نوروست تحت هیچ شرایطی اطلاعات مشتریان، پاسخ‌های دریافتی فرم‌ها، لیست اعضا یا فایل‌های ذخیره‌شده را به شبکه‌های تبلیغاتی، بازاریاب‌های شخص ثالث یا شرکت‌های تجاری دیگر نمی‌فروشد و به اشتراک نمی‌گذارد. تبادل داده تنها با درگاه‌های ضروری زیرساخت (نظیر ارسال پیامک ورود با سرشماره‌های رسمی) و با رعایت محرمانگی انجام می‌شود.
            </p>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۴</span>
              حق حذف قطعی و خروجی داده‌ها (Data Portability)
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              شما در هر زمان می‌توانید با کلیک بر روی حذف فضای کاری، تمام رکوردهای ثبت‌شده، فایل‌های رسانه‌ای و تاریخچه فرم‌های خود را از سرورها و باکت‌های ذخیره‌سازی ابری به شکل غیرقابل بازگشت پاکسازی نمایید. خروجی کامل اطلاعات با استانداردهای بین‌المللی CSV، UTF-8 BOM و باکت‌های S3 همواره در پنل کاربری در دسترس است.
            </p>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۵</span>
              ارتباط با تیم امنیت و حفاظت داده
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              در صورت وجود هرگونه پرسش، ابهام حقوقی یا گزارش آسیب‌پذیری فنی، تیم امنیت و حریم خصوصی نوروست مستقر در تهران آماده پاسخگویی به شماست:
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground">
                <HeadphonesIcon className="size-4 text-success" />
                <span>پشتیبانی: support@noroset.com</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground">
                <ServerIcon className="size-4 text-primary" />
                <span>دفتر مرکزی: تهران، کارخانه نوآوری</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer CTA Strip */}
        <div className="mt-12 rounded-3xl border border-border bg-card p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground">آیا آماده ساخت صفحه‌ی خود هستید؟</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">ثبت‌نام فوری بدون نیاز به کارت بانکی و با ۱۴ روز استفاده‌ی رایگان.</p>
          </div>
          <Link
            href={routes.link.home}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
          >
            <span>ورود به پنل</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
