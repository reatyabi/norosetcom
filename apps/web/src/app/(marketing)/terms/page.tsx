import Link from 'next/link';
import {
  ScrollTextIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  ScaleIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';

export const metadata = {
  title: 'شرایط استفاده و قوانین سرویس | نوروست',
  description: 'قوانین و شرایط استفاده از خدمات پلتفرم ابری نوروست، نوروفرم، نورولینک و نوروفایل.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
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
            <ScrollTextIcon className="size-3.5" />
            <span>قوانین و توافق‌نامه کاربری</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-foreground">
            شرایط استفاده از پلتفرم ابری نوروست
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            استفاده از خدمات پلتفرم نوروست (شامل نوروفرم، نورولینک، نوروفایل و فضای کاری سازمانی) به منزله پذیرش کامل این توافق‌نامه است. هدف این قوانین، تضمین محیطی امن، پایدار و قانون‌مند برای تمام کسب‌وکارهاست.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span>نسخه حقوقی: ۱.۸</span>
            <span>•</span>
            <span className="num-fa">تاریخ لازم‌الاجرا شدن: ۱۴۰۳/۰۸/۰۱</span>
          </div>
        </div>

        {/* Key Highlights */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success dark:text-success">
              <CheckCircle2Icon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">شفافیت و ۱۴ روز رایگان</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              پلن پایه نورولینک برای هر کاربر یک بار و ۱۴ روز رایگان است. اگر پس از آن پلن نخرید، صفحه‌های لینک غیرفعال می‌شوند ولی داده‌ای پاک نمی‌شود. هیچ هزینه پنهان یا تمدید خودکاری وجود ندارد.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ScaleIcon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">مالکیت انحصاری بر محتوا</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              تمامی داده‌ها، پاسخ‌ها، فایل‌ها و طرح‌های ساخته‌شده ۱۰۰٪ متعلق به سازمان و شخص ایجادکننده است.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning dark:text-tone-amber">
              <ShieldAlertIcon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">منع رفتارهای مخرب و اسپم</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              ساخت صفحات فیشینگ، ارسال هرزنامه یا سوءاستفاده از پهنای باند شبکه منجر به مسدودی فوری سرویس خواهد شد.
            </p>
          </div>
        </div>

        {/* Detailed Articles */}
        <div className="mt-12 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۱</span>
              حساب کاربری و مسئولیت دسترسی‌ها
            </h2>
            <div className="mt-3 space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p>
                احراز هویت در نوروست از طریق کد یکبار مصرف پیامکی (OTP) و شماره موبایل معتبر انجام می‌گیرد. حفظ دسترسی به شماره تلفن اعلام‌شده بر عهده شخص کاربر است.
              </p>
              <p>
                مدیران فضاهای کاری می‌توانند اعضای تیم را با نقش‌های مختلف دعوت نمایند. هرگونه اقدام انجام‌شده توسط اعضای دعوت‌شده تحت نام فضای کاری، در حیطه مسئولیت مدیر آن سازمان است.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۲</span>
              محتوای مجاز و قوانین انتشار عمومی
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              استفاده از پلتفرم نوروست برای موارد زیر اکیداً ممنوع بوده و در صورت مشاهده منجر به مسدودسازی آنی بدون اخطار قبلی می‌گردد:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-muted-foreground list-disc list-inside ps-2">
              <li>طراحی فرم‌های فیشینگ و جعل درگاه‌های بانکی، مؤسسات مالی یا سامانه‌های دولتی</li>
              <li>بارگذاری و توزیع بدافزارها، کدهای مخرب یا فایل‌های مشکوک به آلودگی امنیتی</li>
              <li>انتشار محتوای غیراخلاقی یا ناقض قوانین رسمی جرایم رایانه‌ای و تجارت الکترونیک کشور</li>
              <li>ارسال انبوه و غیرمجاز فرم‌ها و لینک‌ها با ابزارهای خودکار و ربات‌های مخرب</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۳</span>
              تعهدات سطح پایداری خدمات (SLA)
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              نوروست متعهد به حفظ پایداری حداقل <strong>۹۹.۹۵٪ در ماه</strong> بر روی زیرساخت سرورهای ابری، فرم‌ها و درگاه‌های n8l.ir است. در صورت نیاز به به‌روزرسانی‌های اساسی دیتابیس یا نگهداری دوره‌ای، عملیات در ساعات کم‌ترافیک شبانه (۱ تا ۵ بامداد) انجام و از قبل اطلاع‌رسانی خواهد شد.
            </p>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۴</span>
              پشتیبانی و رفع اشکال
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              تیم پشتیبانی فنی نوروست مستقر در تهران، از طریق تیکت داخل پنل کاربری و ایمیل پشتیبانی در روزهای کاری آماده رفع هرگونه اختلال یا راهنمایی سازمان‌ها در اتصال دامنه‌ها و APIهاست.
            </p>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">۵</span>
              قوانین حاکم و مراجع حل اختلاف
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              این توافق‌نامه تابع قوانین و مقررات تجارت الکترونیک و حمایت از حقوق مصرف‌کننده جمهوری اسلامی ایران است. هرگونه اختلاف حقوقی ابتدا از طریق مذاکره و میانجی‌گری مسالمت‌آمیز میان طرفین حل‌وفصل خواهد شد.
            </p>
          </section>
        </div>

        {/* Footer CTA Strip */}
        <div className="mt-12 rounded-3xl border border-border bg-card p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground">سوالی درباره قوانین و اشتراک‌های سازمانی دارید؟</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">کارشناسان ما مشتاقانه پاسخگوی نیازمندی‌های خاص سازمان شما هستند.</p>
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
