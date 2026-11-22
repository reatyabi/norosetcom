'use client';

import Image from 'next/image';
import {
  FileTextIcon,
  StarIcon,
  SparklesIcon,
  LockIcon,
  Share2Icon,
  PaletteIcon,
  FolderIcon,
  UploadCloudIcon,
  PlayIcon,
  MapPinIcon,
  SmartphoneIcon,
  LayersIcon,
  RotateCcwIcon,
  PlusIcon,
  XIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  TrendingUpIcon,
  CropIcon,
  CheckIcon,
} from 'lucide-react';

// بدنه‌ی مرورگر موکاپ دسکتاپ؛ فقط برای ساخت تصویر ثابت (مسیر توسعه‌ی /shots). سایت تصویر آن را نشان می‌دهد.
export function DesktopMockupScreen({ productId, detailMode }: { productId: 'noroform' | 'norolink' | 'norofile' | 'ecosystem'; detailMode: string }) {
  return (
    <div className="size-full overflow-hidden bg-background p-4 text-start text-sm">
      {productId === 'noroform' && <NoroformDesktopView detailMode={detailMode} />}
      {productId === 'norolink' && <NorolinkDesktopView detailMode={detailMode} />}
      {productId === 'norofile' && <NorofileDesktopView detailMode={detailMode} />}
      {productId === 'ecosystem' && <EcosystemDesktopView />}
    </div>
  );
}

function NoroformDesktopView({ detailMode }: { detailMode: string }) {
  if (detailMode === 'analytics') {
    return (
      <div className="flex h-full flex-col gap-3">
        {/* Top Status Bar with Excel Export CTA */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheetIcon className="size-4" />
            </div>
            <div>
              <div className="font-extrabold text-foreground text-sm">پاسخ‌ها و تحلیل رضایت مشتریان</div>
              <div className="text-[11px] text-muted-foreground">
                به‌روزرسانی لحظه‌ای • زمان استاندارد رسمی تهران (+3:30)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-success hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-colors"
            >
              <DownloadIcon className="size-3.5" />
              <span>خروجی Excel (UTF-8 BOM)</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">مجموع پاسخ‌ها</div>
            <div className="text-sm sm:text-base font-black text-foreground num-fa">۱,۴۸۰ پاسخ</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">نرخ تکمیل</div>
            <div className="text-sm sm:text-base font-black text-success dark:text-success num-fa">۸۴.۶٪</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">میانگین امتیاز</div>
            <div className="text-sm sm:text-base font-black text-warning num-fa">۴.۸ از ۵ ★</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">زمان تکمیل</div>
            <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 num-fa">۱:۴۵ دقیقه</div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs flex flex-col">
          <div className="grid grid-cols-12 border-b border-border/50 bg-muted/40 px-3 py-2 text-[10px] font-black text-muted-foreground">
            <span className="col-span-3">پاسخ‌دهنده</span>
            <span className="col-span-3">شماره تماس (E.164)</span>
            <span className="col-span-2 text-center">امتیاز</span>
            <span className="col-span-2 text-center">تاریخ ثبت (شمسی)</span>
            <span className="col-span-2 text-end">وضعیت</span>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-border/40 text-[11px]">
            {[
              { name: 'علی کمالی', phone: '0912***4512', stars: 5, date: '۱۴۰۳/۰۸/۰۵ - ۱۱:۳۰', status: 'تایید شده' },
              { name: 'سارا تهرانی', phone: '0935***8890', stars: 4, date: '۱۴۰۳/۰۸/۰۵ - ۱۰:۱۵', status: 'تایید شده' },
              { name: 'نوآوران پارس', phone: '0921***3344', stars: 5, date: '۱۴۰۳/۰۸/۰۴ - ۱۸:۴۵', status: 'تایید شده' },
              { name: 'مهرداد رضایی', phone: '0919***6721', stars: 5, date: '۱۴۰۳/۰۸/۰۴ - ۱۶:۲۰', status: 'تایید شده' },
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-muted/30">
                <span className="col-span-3 font-bold text-foreground truncate">{row.name}</span>
                <span className="col-span-3 text-muted-foreground num-en">{row.phone}</span>
                <span className="col-span-2 text-center text-warning font-bold">{row.stars} ★</span>
                <span className="col-span-2 text-center text-muted-foreground num-fa">{row.date}</span>
                <span className="col-span-2 text-end">
                  <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold text-success dark:text-success">
                    {row.status}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            <span>کدگذاری فایل اکسل: UTF-8 with BOM (سازگار ۱۰۰٪ با اکسل بدون به‌هم‌ریختگی فارسی)</span>
            <span className="font-bold text-foreground">صفحه ۱ از ۱۲</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Form Status Bar with Vivid Accent */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/20">
            <FileTextIcon className="size-4" />
          </div>
          <div>
            <div className="font-extrabold text-foreground text-sm">ارزیابی تجربه مشتریان و کیفیت خدمات</div>
            <div className="text-[11px] text-muted-foreground">
              نسخه ۲ • آدرس فرم عمومی: <span className="font-semibold text-purple-600 dark:text-purple-400 num-en">n8l.ir/f/k7m3</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[11px] font-bold text-success dark:text-success sm:inline-flex">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span>آماده دریافت پاسخ</span>
          </span>
          <button type="button" className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-500/25">
            انتشار فرم
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
        {/* Question Palette (Right in RTL) */}
        <div className="col-span-4 hidden flex-col gap-1.5 rounded-2xl border border-border/60 bg-muted/25 p-3 sm:flex">
          <div className="text-[11px] font-bold text-muted-foreground">فیلدهای فرم</div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-2 text-xs font-semibold text-foreground">
            <span>۱. نام و سازمان</span>
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">متن کوتاه</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-primary/10 p-2 text-xs font-black text-primary shadow-sm">
            <span>۲. میزان رضایت</span>
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">امتیازدهی ★</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-2 text-xs font-semibold text-foreground">
            <span>۳. شماره تماس</span>
            <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">موبایل E.164</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-2 text-xs font-semibold text-foreground">
            <span>۴. پیشنهادات تکمیلی</span>
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">متن بلند</span>
          </div>
          <div className="mt-auto rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2 text-center text-[11px] font-bold text-primary">
            + افزودن فیلد جدید
          </div>
        </div>

        {/* Live Canvas (Center) */}
        <div className="col-span-12 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/15 p-3.5 sm:col-span-8">
          {/* Active Question Card */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 start-0 end-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold text-foreground">
                سوال ۲: سرعت و پایداری سرویس را چگونه ارزیابی می‌کنید؟
              </span>
              <span className="rounded-full bg-tone-rose/10 border border-tone-rose/20 px-2 py-0.5 text-[10px] font-bold text-destructive dark:text-tone-rose">
                الزامی
              </span>
            </div>

            {/* Glowing Rating Stars */}
            <div className="mt-3.5 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className={`flex size-9 items-center justify-center rounded-xl border transition-[color,background-color,border-color,box-shadow,opacity,transform] ${
                    star <= 4
                      ? 'border-amber-400/80 bg-gradient-to-tr from-tone-amber/20 to-amber-400/30 text-warning shadow-sm shadow-amber-500/20'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <StarIcon className="size-4 fill-current" />
                </div>
              ))}
              <span className="ms-2 rounded-lg bg-warning/15 border border-warning/30 px-2 py-1 text-xs font-black text-warning dark:text-tone-amber">
                عالی (۴ از ۵)
              </span>
            </div>

            {/* Smart Logic Branch */}
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <SparklesIcon className="size-4 shrink-0 text-blue-500 animate-pulse" />
              <span>
                <strong>منطق شرطی فعال:</strong> اگر امتیاز &lt; ۳ باشد ➔ فیلد «علت نارضایتی و پیشنهادات» فعال شود.
              </span>
            </div>
          </div>

          {/* Response Metrics Chart Strip */}
          <div className="mt-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2 shadow-sm">
              <div className="relative size-8 rounded-lg overflow-hidden shrink-0">
                <Image
                  src="/images/iran-customer-operations.jpg"
                  alt="تیم تحلیل پاسخ‌ها"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-foreground block">واحد ارزیابی مشتریان</span>
                <span className="text-muted-foreground text-[9px]">پایش زنده در تهران</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 text-center">
              <div className="rounded-xl border border-border/50 bg-card p-2 shadow-sm">
                <div className="text-[9px] text-muted-foreground font-semibold">پاسخ‌های ثبت‌شده</div>
                <div className="mt-0.5 text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 num-fa">۱,۴۸۰ پاسخ</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-2 shadow-sm">
                <div className="text-[9px] text-muted-foreground font-semibold">خروجی اکسل</div>
                <div className="mt-0.5 text-xs font-bold text-success dark:text-success">UTF-8 BOM آماده</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NorolinkDesktopView({ detailMode }: { detailMode: string }) {
  if (detailMode === 'analytics') {
    return (
      <div className="flex h-full flex-col gap-3">
        {/* Top Bar with Pink Accent */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25">
              <TrendingUpIcon className="size-4" />
            </div>
            <div>
              <div className="font-extrabold text-foreground text-sm">آنالیتیکس حریم‌خصوصی و بازدیدها</div>
              <div className="text-[11px] text-muted-foreground">
                آدرس فعال: <span className="font-semibold text-tone-rose dark:text-tone-rose num-en">creative.n8l.ir</span> • ۱۰۰٪ بدون کوکی و ردیاب
              </div>
            </div>
          </div>
          <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success dark:text-success">
            حفاظت حریم خصوصی فعال
          </span>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">کلیک‌های هفته اخیر</div>
            <div className="text-base font-black text-tone-rose dark:text-tone-rose num-fa">۲۲,۸۴۰ کلیک</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">نرخ کلیک (CTR)</div>
            <div className="text-base font-black text-success dark:text-success num-fa">۲۸.۴٪</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-xs">
            <div className="text-[10px] text-muted-foreground font-semibold">ترافیک ارگانیک ایران</div>
            <div className="text-base font-black text-foreground num-fa">۸۹٪</div>
          </div>
        </div>

        {/* Traffic Sources & Top Links */}
        <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
          <div className="col-span-6 rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-foreground">منابع ورودی ترافیک</div>
            <div className="flex flex-col gap-2">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-foreground">
                  <span>اینستاگرام (Instagram Bio)</span>
                  <span className="num-fa">۷۲٪</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-tone-amber/100 to-rose-500" style={{ width: '72%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-foreground">
                  <span>تلگرام و ایتا</span>
                  <span className="num-fa">۱۸٪</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-tone-rose" style={{ width: '18%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-foreground">
                  <span>جستجوی مستقیم و QR Code</span>
                  <span className="num-fa">۱۰٪</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-success" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">پایش بدون ذخیره کوکی یا اثرانگشت مرورگر کاربر</div>
          </div>

          <div className="col-span-6 rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col justify-between">
            <div className="text-xs font-bold text-foreground">پرکلیک‌ترین پیوندهای صفحه</div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                <span className="truncate">رزرو وقت مشاوره آنلاین</span>
                <span className="font-bold text-tone-rose dark:text-tone-rose num-fa">۱,۲۴۰ کلیک</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                <span className="truncate">ویدیو معرفی در آپارات</span>
                <span className="font-bold text-rose-500 num-fa">۵۸۰ پخش</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                <span className="truncate">مسیریابی روی نقشه نشان و بلد</span>
                <span className="font-bold text-success num-fa">۲۹۰ کلیک</span>
              </div>
            </div>
            <div className="rounded-lg bg-tone-rose/10 border border-pink-500/20 p-1.5 text-center text-[10px] font-bold text-tone-rose dark:text-tone-rose">
              میانگین زمان توقف در صفحه: ۲:۲۰ دقیقه
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Bar with Pink Accent */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25">
            <SmartphoneIcon className="size-4" />
          </div>
          <div>
            <div className="font-extrabold text-foreground text-sm">استودیو طراحی و نوآوری تهران</div>
            <div className="text-[11px] text-muted-foreground">
              زیردامنه اختصاصی: <span className="font-semibold text-tone-rose dark:text-tone-rose num-en">creative.n8l.ir</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 px-2.5 py-0.5 text-[11px] font-bold text-tone-rose dark:text-tone-rose">
            قالب: شفق قطبی (Aurora Mesh)
          </span>
          <button type="button" className="rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25">
            انتشار صفحه
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
        {/* Preset Selector */}
        <div className="col-span-4 hidden flex-col gap-2 rounded-2xl border border-border/60 bg-muted/25 p-3 sm:flex">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <PaletteIcon className="size-3.5 text-cyan-500" />
            <span>۱۲ قالب اختصاصی مش و شیشه</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border-2 border-cyan-500 bg-gradient-to-br from-cyan-500/30 via-tone-sky/20 to-purple-500/30 p-2 text-center text-[10px] font-black text-foreground shadow-sm">
              شفق قطبی
            </div>
            <div className="rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2 text-center text-[10px] font-semibold text-foreground">
              نئون شیشه‌ای
            </div>
            <div className="rounded-xl border border-warning/40 bg-gradient-to-br from-tone-amber/20 to-orange-500/15 p-2 text-center text-[10px] font-semibold text-foreground">
              موکا گرم
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-2 text-center text-[10px] font-semibold text-foreground">
              نیمه‌شب
            </div>
          </div>
          <div className="mt-auto rounded-xl border border-cyan-500/30 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 p-2.5 text-center text-xs">
            <div className="text-muted-foreground text-[10px]">بازدید کل هفته</div>
            <div className="text-lg font-black text-cyan-600 dark:text-cyan-400 num-fa">۲۲,۸۴۰ بازدید</div>
          </div>
        </div>

        {/* Elements Stack with Real Workplace Visual */}
        <div className="col-span-12 flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-muted/15 p-3.5 sm:col-span-8">
          {/* Profile Card with Real Iranian Creator Photo */}
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2.5 shadow-sm">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-cyan-500 shadow-md">
              <Image
                src="/images/iran-creative-studio.jpg"
                alt="مدیر استودیو دیزاین نارنج"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-extrabold text-foreground text-xs">
                <span>استودیو طراحی و فناوری تهران</span>
                <span className="size-3.5 rounded-full bg-cyan-500 flex items-center justify-center text-[9px] text-white">✓</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">توسعه نرم‌افزارهای مدرن ابری و دیزاین سیستم</div>
            </div>
          </div>

          <div className="rounded-xl border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-card p-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>رزرو وقت مشاوره آنلاین و خدمات استارتاپی</span>
              <span className="rounded bg-tone-rose/20 px-1.5 py-0.5 text-[10px] text-tone-rose dark:text-tone-rose num-fa">۱,۲۴۰ کلیک</span>
            </div>
          </div>

          {/* Aparat Card */}
          <div className="flex items-center gap-2.5 rounded-xl border border-tone-rose/30 bg-gradient-to-r from-tone-rose/10 to-card p-2.5 shadow-sm">
            <div className="flex size-7 items-center justify-center rounded-lg bg-tone-rose text-white shadow-sm">
              <PlayIcon className="size-3.5 fill-current" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-foreground">ویدیو معرفی خدمات در آپارات</div>
              <div className="text-[10px] text-muted-foreground num-en">aparat.com/v/tehran-tech</div>
            </div>
            <span className="rounded bg-tone-rose/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive dark:text-tone-rose">
              پلیر اختصاصی
            </span>
          </div>

          {/* Map Card */}
          <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-gradient-to-r from-tone-emerald/10 to-card p-2.5 shadow-sm">
            <div className="flex size-7 items-center justify-center rounded-lg bg-success text-white shadow-sm">
              <MapPinIcon className="size-3.5" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-foreground">مسیریابی دفتر مرکزی (نقشه نشان و بلد)</div>
              <div className="text-[10px] text-muted-foreground">تهران، کارخانه نوآوری آزادی</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NorofileDesktopView({ detailMode }: { detailMode: string }) {
  if (detailMode === 'pipeline') {
    return (
      <div className="flex h-full flex-col gap-3">
        {/* Top Bar with Amber Accent */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-tone-amber/100 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/25">
              <CropIcon className="size-4" />
            </div>
            <div>
              <div className="font-extrabold text-foreground text-sm">استودیو برش و تبدیل خودکار به WebP</div>
              <div className="text-[11px] text-muted-foreground">پردازش کلاینت‌ساید در مرورگر بدون اشغال منابع سرور</div>
            </div>
          </div>
          <button type="button" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-tone-amber/100 to-yellow-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25">
            <CheckIcon className="size-3.5" />
            <span>کپی آدرس بهینه CDN</span>
          </button>
        </div>

        {/* Cropper Studio Canvas */}
        <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
          {/* Image Canvas with Aspect Grid */}
          <div className="col-span-8 rounded-2xl border border-border/70 bg-card p-3 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="relative h-48 w-full rounded-xl overflow-hidden border border-border/40">
              <Image
                src="/images/tehran-tech-office.jpg"
                alt="دفتر نوآوری تهران"
                fill
                sizes="400px"
                className="object-cover"
              />
              {/* Crop Grid Lines */}
              <div className="absolute inset-4 border-2 border-dashed border-white/90 rounded-lg pointer-events-none shadow-2xl">
                <span className="absolute -top-3 start-3 bg-warning text-slate-950 px-2 py-0.5 rounded text-[9px] font-bold">
                  برش فعال: نسبت ۱۶:۹ افقی
                </span>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5">
                <button type="button" className="rounded-lg border border-warning bg-warning/15 px-2.5 py-1 text-[11px] font-bold text-tone-amber dark:text-tone-amber">
                  ۱۶:۹ افقی (بنر)
                </button>
                <button type="button" className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  ۱:۱ مربع (آواتار)
                </button>
                <button type="button" className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  ۹:۱۶ عمودی (استوری)
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">رزولوشن: 1920 × 1080</span>
            </div>
          </div>

          {/* Right Pipeline Specs */}
          <div className="col-span-4 flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3 justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-foreground">نتیجه فشرده‌سازی WebP</div>
              <div className="rounded-xl border border-border/60 bg-card p-2 text-xs">
                <div className="text-[10px] text-muted-foreground">حجم اولیه (JPG)</div>
                <div className="font-bold text-foreground num-en">1,240 KB</div>
              </div>
              <div className="rounded-xl border border-success/40 bg-success/10 p-2 text-xs">
                <div className="text-[10px] text-success dark:text-tone-emerald font-semibold">حجم بهینه WebP</div>
                <div className="font-black text-success dark:text-success num-en">380 KB (-۶۹٪)</div>
              </div>
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/10 p-2 text-[10px] text-amber-800 dark:text-tone-amber font-medium">
              تحویل فوری از طریق Edge CDN اختصاصی نوروست با کشینگ هوشمند
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Bar with Amber Accent */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-tone-amber/100 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/25">
            <FolderIcon className="size-4" />
          </div>
          <div>
            <div className="font-extrabold text-foreground text-sm">مدیریت دارایی‌ها و فضای ابری S3</div>
            <div className="text-[11px] text-muted-foreground">میزبانی فوق‌سریع با بهینه‌سازی کلاینت‌ساید WebP</div>
          </div>
        </div>
        <button type="button" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-tone-amber/100 to-yellow-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25">
          <UploadCloudIcon className="size-3.5" />
          <span>بارگذاری سریع فایل</span>
        </button>
      </div>

      {/* Saturated Storage Meter */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-foreground">فضای مصرف‌شده: ۳۲ مگابایت از ۱۰۰ مگابایت سهمیه</span>
          <span className="text-warning dark:text-tone-amber num-fa">۳۲٪</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500" style={{ width: '32%' }} />
        </div>
      </div>

      {/* Files Grid with Real Iranian Workplace Thumbnail */}
      <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-hidden sm:grid-cols-3">
        {/* Real Workplace Photo File */}
        <div className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-card p-2.5 shadow-sm">
          <div className="relative h-20 w-full overflow-hidden rounded-xl">
            <Image
              src="/images/tehran-tech-office.jpg"
              alt="تیم توسعه نوآوری تهران"
              fill
              sizes="(max-width: 640px) 150px, 200px"
              className="object-cover"
            />
            <span className="absolute top-1 end-1 rounded bg-blue-600 px-1 text-[8px] font-bold text-white">
              -۶۸٪ WebP
            </span>
          </div>
          <div className="mt-1.5 truncate text-xs font-extrabold text-foreground">tehran-tech-office.webp</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>۳۲۰ کیلوبایت</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">CDN فعال</span>
          </div>
        </div>

        {/* Real Creative Studio File */}
        <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-card p-2.5 shadow-sm">
          <div className="relative h-20 w-full overflow-hidden rounded-xl">
            <Image
              src="/images/iran-creative-studio.jpg"
              alt="استودیو خلاق نارنج"
              fill
              sizes="(max-width: 640px) 150px, 200px"
              className="object-cover"
            />
            <span className="absolute top-1 end-1 rounded bg-cyan-600 px-1 text-[8px] font-bold text-white">
              کراپ ۱:۱
            </span>
          </div>
          <div className="mt-1.5 truncate text-xs font-extrabold text-foreground">creative-avatar.webp</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>۱۸۰ کیلوبایت</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">آواتار رسمی</span>
          </div>
        </div>

        {/* Document Asset */}
        <div className="hidden flex-col justify-between rounded-2xl border border-warning/30 bg-card p-2.5 shadow-sm sm:flex">
          <div className="flex h-20 w-full items-center justify-center rounded-xl bg-warning/10">
            <FileTextIcon className="size-8 text-warning dark:text-tone-amber" />
          </div>
          <div className="mt-1.5 truncate text-xs font-extrabold text-foreground">system-architecture.pdf</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>۸.۲ مگابایت</span>
            <span className="text-warning font-bold">آرشیو اسناد</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EcosystemDesktopView() {
  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Bar with Emerald Accent */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-tone-emerald/100 to-teal-600 text-white shadow-md shadow-emerald-500/25">
            <LayersIcon className="size-4" />
          </div>
          <div>
            <div className="font-extrabold text-foreground text-sm">فضای کاری: شرکت فناوری هوش‌افزار پارس</div>
            <div className="text-[11px] text-muted-foreground">
              معماری Multi-Tenant با ایزولاسیون کامل سطح دیتابیس (FORCE RLS)
            </div>
          </div>
        </div>
        <span className="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-bold text-success dark:text-success">
          آپ‌تایم: ۹۹.۹۵٪ آنلاین
        </span>
      </div>

      {/* Grid of 3 Products with High Contrast Badges */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border-t-2 border-t-blue-500 border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <FileTextIcon className="size-4" />
            <span>نوروفرم</span>
          </div>
          <div className="mt-2 text-lg font-black text-foreground num-fa">۸ فرم فعال</div>
          <div className="text-[10px] text-muted-foreground">۵,۴۲۰ پاسخ ذخیره‌شده</div>
        </div>

        <div className="rounded-2xl border-t-2 border-t-cyan-500 border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <SmartphoneIcon className="size-4" />
            <span>نورولینک</span>
          </div>
          <div className="mt-2 text-lg font-black text-foreground num-fa">۳ صفحه بیو</div>
          <div className="text-[10px] text-muted-foreground">۳۴,۸۰۰ کلیک ماهانه</div>
        </div>

        <div className="rounded-2xl border-t-2 border-t-purple-500 border border-border/60 bg-card p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
            <FolderIcon className="size-4" />
            <span>نوروفایل</span>
          </div>
          <div className="mt-2 text-lg font-black text-foreground num-fa">۶۴ فایل ابری</div>
          <div className="text-[10px] text-muted-foreground">۴۸MB مصرف سرور S3</div>
        </div>
      </div>

      {/* Activity Timeline with Real Team Vignette */}
      <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="relative h-full w-36 shrink-0 overflow-hidden rounded-xl border border-border/40 hidden sm:block">
          <Image
            src="/images/iran-meeting-room.jpg"
            alt="جلسه معماری سیستم و مدیران فنی"
            fill
            sizes="150px"
            className="object-cover"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 text-xs justify-center">
          <div className="font-bold text-foreground">رویدادهای امنیتی و عملیاتی زنده:</div>
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span>✓ پاسخ جدید در «پرسشنامه استخدام مهندس هوش مصنوعی»</span>
            <span className="text-primary font-bold">لحظاتی پیش</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span>✓ ورود امن مدیر با سرشماره پیامکی رسمی (کاوه‌نگار)</span>
            <span>۱۰ دقیقه پیش</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
            <span>✓ همگام‌سازی دارایی‌های ابری با توکن‌های JWT چرخشی</span>
            <span>۲۵ دقیقه پیش</span>
          </div>
        </div>
      </div>
    </div>
  );
}
