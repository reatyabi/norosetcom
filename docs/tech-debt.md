# بدهی فنی (Tech Debt)

مواردی که آگاهانه به بعد موکول شده‌اند. پیش از لانچ production باید بررسی و بسته شوند.

## Auth / امنیت

### 1. rate limit درون‌حافظه
- **وضعیت فعلی:** `RateLimitService` (`apps/api/src/rate-limit/rate-limit.service.ts`) شمارنده‌ها را در یک `Map` داخل همان پروسه نگه می‌دارد. سقف OTP هر موبایل از `otp_codes` خوانده می‌شود. لانچ با یک instance این وضعیت را پذیرفته است.
- **مشکل:** با چند instance یا ری‌استارت پروسه، محدودیت‌ها دور زده می‌شوند یا ریست می‌شوند. حافظه هم برای کلیدهای قدیمی به‌طور کامل آزاد نمی‌شود.
- **اقدام:** پیش از اجرای چند instance به ذخیره‌سازی مشترک (مثلاً Redis یا جدول Postgres) منتقل شود.

### 2. trustProxy و IP واقعی پشت reverse proxy (انجام شد)
- **وضعیت فعلی:** `TRUST_PROXY` در `apps/api/src/config/http.ts` خوانده می‌شود و production مقدار `loopback` دارد. نکته‌های زیر برای توپولوژی‌های دیگر (مثلاً پراکسی CDN) می‌مانند.
- **مشکل:** rate limit مبتنی بر IP (`otp_request:ip:*`، و فرم عمومی: `noroform_public_read:ip:*` و `noroform_submit:ip:*`)، IP ثبت‌شده در `otp_codes` و `sessions` و `ip_hash` پاسخ‌های فرم برای همهٔ کاربران یکسان می‌شود — یعنی چند ارسال از کاربران مختلف کل فرم عمومی را ۴۲۹ می‌کند. اگر هم `trustProxy` بی‌احتیاط فعال شود، `X-Forwarded-For` قابل جعل است.
- **اقدام:** توپولوژی استقرار مشخص شود و `trustProxy` فقط برای IP یا تعداد hopهای proxy مورد اعتماد تنظیم شود.

### 3. CSRF برای endpointهای تغییردهنده با cookie (انجام شد)
- **وضعیت فعلی:** در production درخواست تغییردهنده با کوکی نشست یا روی `/auth/` فقط از `WEB_ORIGIN` پذیرفته می‌شود (`apps/api/src/config/csrf.ts`).
- **مشکل:** `lax` بخش زیادی از CSRF را پوشش می‌دهد اما نه همه را (مثلاً subdomainهای هم‌سایت، یا endpointهای تغییردهنده‌ای که با GET یا فرم ساده قابل فراخوانی‌اند).
- **اقدام:** همهٔ endpointهای POST/PUT/PATCH/DELETE که با cookie احراز می‌شوند (از جمله `auth/refresh` و `auth/logout`) بررسی شوند. در صورت نیاز بررسی `Origin`/`Referer`، الگوی double-submit token یا `sameSite: 'strict'` برای refresh cookie اضافه شود.

### 4. زمان‌بندی `cleanup_expired_auth()` (انجام شد)
- **وضعیت فعلی:** `deploy/ops/cleanup-auth.sh` روزی یک بار با cron اجرا می‌شود.
- **مشکل:** جدول‌های `otp_codes` و `sessions` بی‌نهایت بزرگ می‌شوند.
- **اقدام:** اجرای دوره‌ای آن زمان‌بندی شود (pg_cron، cron job خارجی یا scheduler داخل API) و نقش اجراکننده و دسترسی‌های لازم مشخص شوند.

### 5. رمز نقش‌ها در `roles.sql` با sed
- **وضعیت فعلی:** رمز `noroset_migrator` و `noroset_app` با `sed` جای placeholderهای `packages/db/sql/roles.sql` گذاشته می‌شود (`docker/initdb/00-roles.sh`). اسکریپت در نبود رمز متوقف می‌شود و رمزهای production طبق `deploy/production.env.example` hex هستند.
- **مشکل:** رمز ممکن است در command line، history شل یا لاگ‌ها دیده شود. کاراکترهای خاص (`'`، `|`، `&`) SQL یا عبارت sed را خراب می‌کنند.
- **اقدام:** در فرصت بعدی از `psql -v` با متغیرهای quote‌شده (`:'app_password'`) استفاده شود.

## تست / CI

### 6. اجرای موازی تست‌های وابسته به دیتابیس در ریشه
- **وضعیت فعلی:** اسکریپت ریشه `test` با `pnpm -r` همهٔ پکیج‌ها را **هم‌زمان** اجرا می‌کند؛ پکیج‌هایی مثل `products/blog`، `products/admin` و `products/norofile` روی یک دیتابیس تست مشترک کار می‌کنند.
- **مشکل:** با اجرای موازی، تست‌های `products/blog` (۵ مورد) به‌خاطر تداخل داده/تراکنش روی همان DB شکست می‌خورند، در حالی که همان تست‌ها به‌تنهایی ۲۰/۲۰ و با اجرای سریالی `pnpm -r --workspace-concurrency=1 --if-present run test` همهٔ ۵۲۱ تست پاس می‌شوند.
- **اقدام:** یا اجرای سریالی پکیج‌های DB-محور در اسکریپت ریشه/CI، یا ساختن دیتابیس تست جدا به‌ازای هر پکیج (`{POSTGRES_DB}_test_<pkg>`).
