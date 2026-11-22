'use client';

import Link from 'next/link';
import { routes } from '@/lib/routes';

/**
 * نماد اعتماد الکترونیکی با همان ویژگی‌های کد اینماد: اعتبارسنجی به referrer نیاز دارد، پس
 * referrerPolicy می‌ماند و `rel="noreferrer"` نباید اضافه شود. ویژگی `code` در تایپ img نیست.
 */
const ENAMAD_ID = '727202';
const ENAMAD_CODE = '00hV4zY8oGIIhlPqNOikoO2SFdYpukWN';

function EnamadSeal() {
  const query = `id=${ENAMAD_ID}&Code=${ENAMAD_CODE}`;
  return (
    <a
      referrerPolicy="origin"
      target="_blank"
      href={`https://trustseal.enamad.ir/?${query}`}
      aria-label="نماد اعتماد الکترونیکی"
      className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card p-1.5 shadow-2xs transition-shadow hover:shadow-xs"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- تصویر را سرور اینماد می‌سازد */}
      <img
        referrerPolicy="origin"
        src={`https://trustseal.enamad.ir/logo.aspx?${query}`}
        alt="نماد اعتماد الکترونیکی"
        className="size-full object-contain"
        style={{ cursor: 'pointer' }}
        {...{ code: ENAMAD_CODE }}
      />
    </a>
  );
}

function ZarinpalSeal() {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href="https://www.zarinpal.com/trustPage/noroset.com"
      aria-label="درگاه پرداخت معتبر زرین‌پال"
      className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card p-1.5 shadow-2xs transition-shadow hover:shadow-xs"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://cdn.zarinpal.com/badges/trustLogo/1.svg"
        alt="زرین‌پال"
        className="size-full object-contain"
      />
    </a>
  );
}

/** فوتر کم‌ارتفاع و مینیمال به سبک صفحات گوگل: لینک‌های متنی و نمادهای اعتماد. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/20 text-xs text-muted-foreground transition-colors">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-3.5 sm:flex-row sm:gap-6 sm:px-6">
        {/* لینک‌های متنی سبک گوگل: خانه، محصولات، حریم خصوصی، قوانین، بلاگ */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-medium" aria-label="پیوندهای سایت">
          <Link href={routes.home} className="transition-colors hover:text-foreground">
            خانه
          </Link>
          <Link href={routes.landing.link} className="transition-colors hover:text-foreground">
            نورولینک
          </Link>
          <Link href={routes.landing.file} className="transition-colors hover:text-foreground">
            نوروفایل
          </Link>
          <Link href={routes.privacy} className="transition-colors hover:text-foreground">
            حریم خصوصی
          </Link>
          <Link href={routes.terms} className="transition-colors hover:text-foreground">
            شرایط استفاده
          </Link>
          <Link href={routes.blog.home} className="transition-colors hover:text-foreground">
            بلاگ
          </Link>
          <Link href={routes.contact} className="transition-colors hover:text-foreground">
            پشتیبانی
          </Link>
        </nav>

        {/* نمادهای اعتماد: اینماد و زرین‌پال */}
        <div className="flex items-center gap-2 shrink-0">
          <EnamadSeal />
          <ZarinpalSeal />
        </div>
      </div>

      {/* سطر پایانی کم‌ارتفاع کپی‌رایت */}
      <div className="border-t border-border/30 py-2 text-center text-[11px] text-muted-foreground/75">
        <p>© ۱۴۰۵ کلیه حقوق برای پلتفرم ابری نوروست محفوظ است.</p>
      </div>
    </footer>
  );
}
