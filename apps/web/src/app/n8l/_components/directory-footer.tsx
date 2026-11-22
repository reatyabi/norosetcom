import Link from 'next/link';
import { BrandLogo } from '@/components/brand';

export function DirectoryFooter() {
  return (
    <footer className="w-full border-t border-border/40 bg-muted/20 text-muted-foreground transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="h-5 w-auto" />
              <span className="text-base font-extrabold text-foreground">دایرکتوری نورولینک</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground" dir="ltr">
                n8l.ir
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              شبکه رسمی صفحات پیوند اختصاصی در ایران؛ طراحی شده برای دسترسی سریع، بارگذاری آنی و معرفی حرفه‌ای پیوندها و کسب‌وکارها.
            </p>
          </div>

          {/* Links Col 1 */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-semibold text-foreground">محصولات پلتفرم</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://noroset.com/landing/link" className="hover:text-foreground transition-colors">
                  نورولینک (Link in Bio)
                </a>
              </li>
              <li>
                <a href="https://noroset.com/landing/file" className="hover:text-foreground transition-colors">
                  نوروفایل (ذخیره‌ساز ابری)
                </a>
              </li>
              <li>
                <a href="https://noroset.com/link" className="hover:text-foreground transition-colors">
                  ورود به پنل کاربری
                </a>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-semibold text-foreground">دسترسی و قوانین</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://noroset.com/privacy" className="hover:text-foreground transition-colors">
                  حریم خصوصی کاربران
                </a>
              </li>
              <li>
                <a href="https://noroset.com/terms" className="hover:text-foreground transition-colors">
                  قوانین و شرایط استفاده
                </a>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  صفحه اصلی دایرکتوری n8l
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 text-[11px] sm:flex-row">
          <p>© ۱۴۰۵ کلیه حقوق برای پلتفرم ابری نوروست (Noroset) محفوظ است.</p>
          <p className="text-muted-foreground/80">میزبانی پایدار روی زیرساخت ملی ایران</p>
        </div>
      </div>
    </footer>
  );
}
