# استقرار لانچ و انتشار ریلیز

این سند می‌گوید نسخه‌ی روی سرور چیست، ریلیز تازه چطور منتشر می‌شود و چطور بفهمیم چه چیزی هنوز منتشر نشده است. طراحی سرور، هزینه و راه‌اندازی اولیه در [`launch-blueprint.md`](./launch-blueprint.md) است.

هر فرمان مشخص کرده کجا اجرا می‌شود: **روی ویندوز** یعنی PowerShell در `C:\norosetcom` و **روی سرور** یعنی SSH با کاربر گفته‌شده.

## ۱. وضعیت در ۱۴۰۵/۸/۲۴

این جدول با هر انتشار کهنه می‌شود؛ منبع درست، فرمان‌های بخش ۴ است.

| مورد | مقدار |
|---|---|
| سرور | پارس‌پک، Ubuntu 24.04، `193.138.77.251` |
| ریلیز فعال | `427395a9bebc` |
| تغییرات commit‌نشده | ندارد |
| آخرین migration روی سرور | `0026_page_moderation` |
| migrationهای منتشرنشده | ندارد |
| ریلیز ساخته‌شده و منتشرنشده | ندارد |
| نسخه‌ی قابل برگشت | `007aaf66a99d` و `a6809ba83da0` (`c672a2b57da8` با ریلیز `427395a9bebc` پاک شد) |
| کار دستی باز | ندارد (`/etc/nginx/conf.d/noroset.conf` با فایل همین ریلیز یکسان است) |

ریلیزهای منتشرشده تا امروز:

| ریلیز | محتوا |
|---|---|
| `427395a9bebc` | صفحه‌ی پاسخ‌های فرم: هدر چسبان با ابزار نما کنار دکمه‌ی چاپ (بدون ردیف جدا)، فیلتر و مرتب‌سازی ستونی، نماهای ذخیره‌شده، فهرست کارتی موبایل، جزئیات پاسخ و چاپ A4/A5؛ خروجی CSV/XLSX دقیقاً با ستون‌ها و ترتیب جدول؛ کنترل لوگوی سربرگ در ادیتور فرم؛ `Checkbox` و `Popover` در `@noroset/ui`؛ پهنای کامل صفحه‌های جدول‌محور. بیلد روی سرور: سورس ۳۹MB به `tar.gz` ۳۳MB تبدیل و در هفت تکه‌ی ۵MB با بررسی sha256 به `/srv/noroset/build` رفت، `build-in-container.sh` در کانتینر `node:22-bookworm` اجرا شد و `activate.sh` با `nohup` (لاگ: `logs/activate-427395a9bebc.log`)؛ یک بار `scp` وسط آپلود قطع شد و از همان تکه‌ی ناقص ادامه داده نشد، بسته‌ی تازه از نو ساخته و فرستاده شد |
| `007aaf66a99d` | شروع ادیتور فرم (پیش‌نمایش زنده، متن کمکی rich-text، بدنه به سبک Google Forms، تنظیمات در کارت/دیالوگ پیشرفته، تفکیک نوع مقادیر از فیلدها) و سئوی صفحه‌های لندینگ و دایرکتوری (metadataBase، canonical، openGraph/Twitter و JSON-LD). بیلد روی سرور: سورس ۳۸MB در دو تکه‌ی ۲۰MB با بررسی sha256 به `/srv/noroset/build` رفت، `build-in-container.sh` در کانتینر `node:22-bookworm` اجرا و `activate.sh` با `nohup` (لاگ‌ها: `logs/build-<sha>.log` و `logs/activate-<sha>.log`) |
| `a6809ba83da0` | کنترل صفحه‌های لینک از سوی مدیریت پلتفرم (حذف از فهرست، هشدار، تعلیق با ۴۵۱/۴۰۳) و گزارش تخلف بازدیدکننده‌ها؛ دایرکتوری `n8l.ir` فقط صفحه‌های واقعی؛ دوره‌ی رایگان قابل تنظیم از مدیریت پلتفرم؛ صفحه‌ی `/contact`؛ migrationهای `0025_trial_settings` و `0026_page_moderation`. بیلد روی سرور: سورس ۳۸MB در دو تکه‌ی ۲۰MB با بررسی sha256 به `/srv/noroset/build` رفت، `build-in-container.sh` در کانتینر `node:22-bookworm` همان‌جا اجرا شد و `activate.sh` با `nohup` (لاگ‌ها: `logs/build-<sha>.log` و `logs/activate-<sha>.log`) |
| `c672a2b57da8` | سئوی نورولینک پیج: دایرکتوری فقط صفحه‌های قابل ایندکس، سقف `norolink.seo` در سرور و بسته در دوره‌ی رایگان با کارت خرید، حداقل ۵۰ نویسه توضیح، JSON-LD با «شخص/کسب‌وکار»، sitemap و robots.txt دامنه‌ی کوتاه، canonical؛ وضعیت HTTP درست (۴۰۴/۳۰۸/۵۰۳) برای صفحه‌ی لینک و بلاگ در proxy؛ حذف لودر صفحه‌ی لینک؛ پشتیبانی شناور فقط در مارکتینگ؛ اسلایدر لوگو و آخرین مطالب بلاگ در صفحه‌ی اصلی؛ migration `0024_directory_indexable`. بسته در آپلود یک‌جا قطع می‌شد و تکه‌تکه (۲۰MB) با بررسی sha256 فرستاده و با `nohup` فعال شد (§۷) |
| `e422241e7cdb` | فقط ثبت ریلیز قبلی در همین سند؛ کد همان `675fb8776dd1` (بیلد روی سرور به درخواست مالک) |
| `675fb8776dd1` | ریدایرکت نسبی لینک کوتاه واگذاری `/c/` (پشت nginx به `localhost:3000` می‌رفت) (بیلد روی سرور) |
| `6708814b3256` | بازطراحی قیف واگذاری: نشانی رزروشده، لینک کوتاه، صفحه‌ی تحویل تمام‌صفحه، قیف در کمپین‌ها، قفل رزرو پرداخت‌شده؛ migration `0023_claim_links` (بیلد روی سرور) |
| `559c78d95266` | محصول وبلاگ، بازطراحی اشتراک‌ها و کارت‌های پلن، هویت بصری تازه و تصاویر ثابت موکاپ‌ها، ژست‌های موبایل و رفع باگ‌های ادیتور (بیلد روی سرور) |
| `e0789665b2fb` | هیروی کاروسل قالب‌ها، بخش المان‌های نورولینک، هدر ساده‌ی مارکتینگ، وسط‌چین شدن صفحه‌ی ورود (بیلد روی سرور) |
| `b26ea22414ae` | صفحه‌ی اصلی معرفی نورولینک، ادیتور متن WYSIWYG، رفع باگ‌های موبایل ادیتور، حذف آواتار هدر، حذف پشتیبانی از صفحه‌های `n8l.ir` (بیلد روی خود سرور) |
| `f9f18da47f11` | صفحه‌ی اصلی تازه، پشتیبانی شناور، اسکلت بارگذاری و طراحی تازه‌ی صفحه‌ی اشتراک |
| `e97c0ec16e2c` | دایرکتوری عمومی `n8l.ir`، واگذاری از ادیتور قالب، حذف فضای کاری از مسیر کاربر، چیدمان دکمه‌ها و هدر موبایل |
| `2eea3dc6657b` | رفع خطای rewrite پشت nginx |
| `23c6e1aa8858` | اولین ریلیز روی سرور |

## ۲. نشانی‌ها

| چه چیزی | کجا |
|---|---|
| بسته‌های ساخته‌شده | ویندوز: `C:\norosetcom\.release\noroset-<sha>.tar.gz` (در git نیست) |
| بسته‌های فرستاده‌شده | سرور: `/srv/noroset/incoming/noroset-<sha>.tar.gz` |
| ریلیزهای بازشده | سرور: `/srv/noroset/releases/<sha>` |
| ریلیز فعال | سرور: symlink `/srv/noroset/current` |
| تنظیمات و secretها | سرور: `/srv/noroset/shared/.env`؛ هرگز وارد ریپو یا چت نشود |
| لاگ‌ها | سرور: `/srv/noroset/logs` |
| بک‌آپ دیتابیس | سرور: `/srv/noroset/backups/db` |
| nginx | سرور: `/etc/nginx/conf.d/noroset.conf`؛ منبع آن `deploy/nginx/noroset.conf` |
| cron و logrotate | سرور: `/etc/cron.d/noroset` و `/etc/logrotate.d/noroset`؛ منبع آن‌ها `deploy/ops/` |

`<sha>` همیشه ۱۲ نویسه‌ی اول شناسه‌ی commit است.

| سرویس | اجرا | نشانی داخلی |
|---|---|---|
| وب (Next) | PM2، `noroset-web` | `localhost:3000` |
| API | PM2، `noroset-api` | `127.0.0.1:3001` |
| PostgreSQL | Docker، `noroset-postgres` | `127.0.0.1:5433` |
| SeaweedFS | Docker، `noroset-storage` | `127.0.0.1:8333` |

## ۳. انتشار ریلیز تازه

**پیش‌نیاز:** Docker Desktop روشن باشد و کلید SSH کاربر `deploy` روی ماشین باشد. بیلد از روی commit ساخته می‌شود، پس هر چیزی که commit نشده باشد وارد ریلیز نمی‌شود.

### ۱. بررسی‌ها را اجرا کنید

CI تست‌ها را اجرا نمی‌کند، پس این مرحله تنها سد پیش از انتشار است. **روی ویندوز**:

```powershell
pnpm lint
```

```powershell
pnpm typecheck
```

```powershell
pnpm check:boundaries
```

```powershell
pnpm test
```

### ۲. تغییرات را commit کنید

پیش از commit، `git status` را ببینید تا کار نیمه‌تمام همراه ریلیز نرود.

### ۳. ببینید چه چیزی غیر از کد عوض شده است

از فرمان‌های بخش ۴ استفاده کنید. هر کدام کار جدایی دارد:

| چه چیزی عوض شده | چه باید کرد |
|---|---|
| `packages/db/migrations` | خودکار اجرا می‌شود؛ قاعده‌ی بخش ۶ را رعایت کنید |
| `deploy/production.env.example` | پیش از انتشار `shared/.env` را روی سرور به‌روز کنید |
| `deploy/nginx/noroset.conf` | پس از انتشار، مرحله‌ی ۵ |
| `deploy/ecosystem.config.cjs` | پس از انتشار، مرحله‌ی ۵ |
| `deploy/ops/noroset.cron` یا `noroset.logrotate` | پس از انتشار، با root همان فایل را در مسیر بخش ۲ نصب کنید |
| `deploy/docker-compose.prod.yml` | خودکار اعمال نمی‌شود. با `docker compose --env-file /srv/noroset/shared/.env -f /srv/noroset/current/deploy/docker-compose.prod.yml up -d` اجرا کنید؛ ممکن است دیتابیس ری‌استارت شود |

### ۴. منتشر کنید

در ساعت کم‌بار منتشر کنید؛ ری‌استارت چند ثانیه قطعی دارد. **روی ویندوز**:

```powershell
.\deploy\deploy.ps1 -Server deploy@193.138.77.251 -Ref main
```

این فرمان به ترتیب:

1. اگر بسته‌ی همین commit در `.release` نباشد، آن را داخل کانتینر `node:22-bookworm` می‌سازد.
2. بسته را به `incoming` سرور می‌فرستد.
3. `activate.sh` همان ریلیز را اجرا می‌کند: باز کردن بسته، بک‌آپ دیتابیس، migration، تعویض `current` و ری‌استارت PM2.
4. حدود یک دقیقه سلامت API و وب را می‌سنجد. اگر سالم نباشد نسخه‌ی قبلی را برمی‌گرداند و خطا می‌دهد، ولی **migration برنمی‌گردد**.
5. سه ریلیز آخر و سه بسته‌ی آخر را روی سرور نگه می‌دارد و بقیه را پاک می‌کند.

در پایان باید `active release: <sha>` چاپ شود. برای ساختن بسته بدون انتشار، `-BuildOnly` را اضافه کنید.

### ۵. فقط اگر فایل‌های استقرار عوض شده‌اند

اگر `noroset.conf` عوض شده است، **روی سرور با root**:

```bash
install -m 644 /srv/noroset/current/deploy/nginx/noroset.conf /etc/nginx/conf.d/noroset.conf && nginx -t && systemctl reload nginx
```

اگر آرگومان‌های `ecosystem.config.cjs` عوض شده‌اند، `startOrRestart` آن‌ها را نمی‌خواند. **روی سرور با `deploy`**:

```bash
pm2 delete all && set -a && . /srv/noroset/shared/.env && set +a && pm2 start /srv/noroset/current/deploy/ecosystem.config.cjs && pm2 save
```

### ۶. نتیجه را بسنجید

**روی ویندوز** هر دو باید `200` چاپ کنند:

```powershell
curl.exe -s -o NUL -w "%{http_code}\n" https://noroset.com/
```

```powershell
curl.exe -s -o NUL -w "%{http_code}\n" https://noroset.com/api/health
```

سپس یک صفحه‌ی لینک واقعی روی `n8l.ir` و ورود به پنل را باز کنید. **روی سرور با `deploy`** خطاهای تازه را ببینید:

```bash
pm2 logs --lines 30 --nostream
```

## ۴. تشخیص آنچه منتشر نشده است

ریلیز فعال را بگیرید و فرمان‌های بعدی را در همان پنجره اجرا کنید. **روی ویندوز**:

```powershell
$active = (ssh deploy@193.138.77.251 'basename $(readlink -f /srv/noroset/current)').Trim(); $active
```

| سؤال | فرمان روی ویندوز |
|---|---|
| چه commitهایی منتشر نشده‌اند؟ | `git log --oneline "$active..HEAD"` |
| چه چیزی commit نشده است؟ | `git status --short` |
| کل تفاوت با سرور چقدر است؟ | `git diff --stat $active` |
| فایل‌های تازه‌ی commit‌نشده کدام‌اند؟ | `git ls-files --others --exclude-standard` |
| migration تازه داریم؟ | `git status --short packages/db/migrations` و `git diff --name-only "$active..HEAD" -- packages/db/migrations` |
| فایل‌های استقرار عوض شده‌اند؟ | `git diff --name-only $active -- deploy` |
| چه بسته‌هایی ساخته شده‌اند؟ | `Get-ChildItem .release` |

`git diff` فایل‌های تازه را نشان نمی‌دهد، پس فرمان `ls-files` را هم ببینید.

وضعیت پوشه‌ها و آخرین migration روی سرور. **روی ویندوز**:

```powershell
ssh deploy@193.138.77.251 'ls -1t /srv/noroset/releases; echo ---; ls -1t /srv/noroset/incoming; echo ---; grep tag /srv/noroset/current/packages/db/migrations/meta/_journal.json | tail -1'
```

از روی نتیجه، هر تغییر در یکی از این حالت‌هاست:

| حالت | نشانه | قدم بعدی |
|---|---|---|
| فقط در پوشه‌ی کار | در `git status` هست | commit و انتشار |
| commit شده، بیلد نشده | در `git log` هست و بسته‌اش در `.release` نیست | `deploy.ps1` |
| بیلد شده، فرستاده نشده | بسته در `.release` هست و در `incoming` نیست | `deploy.ps1`؛ دوباره بیلد نمی‌کند |
| فرستاده شده، فعال نشده | بسته در `incoming` هست و پوشه در `releases` نیست | `deploy.ps1` و بررسی خطای آن |
| باز شده، فعال نیست | پوشه در `releases` هست و `current` به آن اشاره نمی‌کند | نسخه‌ی قبلی است یا سلامت‌سنجی‌اش رد شده؛ لاگ را ببینید |
| منتشر شده | `current` به آن اشاره می‌کند | |

بسته‌ای که در `.release` هست لزوماً منتظر انتشار نیست. اگر commit آن پیش از ریلیز فعال باشد، فقط نسخه‌ی قدیمی است. این فرمان می‌گوید کدام بسته‌ها **بعد از** ریلیز فعال ساخته شده‌اند. **روی ویندوز**:

```powershell
Get-ChildItem .release -Filter 'noroset-*.tar.gz' | ForEach-Object { $sha = $_.Name -replace '^noroset-|\.tar\.gz$',''; git merge-base --is-ancestor $sha $active; if ($LASTEXITCODE -ne 0) { "$sha منتشرنشده" } else { "$sha قدیمی یا فعال" } }
```

`.release` خودکار پاک نمی‌شود و هر بسته حدود ۲۸۰ مگابایت است. بسته‌های قدیمی را جز نسخه‌ی فعال و قبلی دستی پاک کنید.

## ۵. تغییرات منتشرنشده در ۱۴۰۵/۸/۲۴

همه‌ی تغییرات تا `427395a9bebc` منتشر شده‌اند: `6ba88c4` (گسترش تم‌های ادیتور)، `9cc232a` (انتشار فرم و صفحه‌ی عمومی)، رفکتور اجزای عمومی فرم به `products/noroform/ui`، هدر تازه‌ی صفحه‌ی پاسخ‌ها با نماهای ذخیره‌شده و خروجی XLSX و کنترل لوگوی سربرگ. دایرکتوری `n8l.ir` هم‌چنان نمونه‌ی ساختگی ندارد؛ تا وقتی صفحه‌ای قابل ایندکس نباشد پیام «هنوز صفحه‌ای در دایرکتوری نیست» می‌آید.

**یادآور:** هیچ پلنی هنوز `norolink.seo` ندارد، پس هیچ صفحه‌ای ایندکس نمی‌شود و دایرکتوری خالی است؛ برای فروش آن کلید را در `/admin/billing` روی پلن پولی روشن کنید. Search Console هم مانده است ([`launch-blueprint.md`](./launch-blueprint.md) §۱۰).

## ۶. برگشت به نسخه‌ی قبلی

فقط به ریلیزی که هنوز در `releases` هست. برگشت migration اجرا نمی‌کند و دیتابیس برنمی‌گردد. **روی ویندوز**:

```powershell
ssh deploy@193.138.77.251 /srv/noroset/current/deploy/ops/activate.sh <sha>
```

**قاعده‌ی migration:** چون دیتابیس برنمی‌گردد، هر migration باید با کد ریلیز قبلی کار کند.

1. ستون یا جدولی که کد فعال می‌خواند در همان ریلیز حذف یا تغییر نام داده نمی‌شود.
2. اول کدی منتشر می‌شود که دیگر از آن استفاده نمی‌کند.
3. حذف در ریلیز بعدی می‌آید.

**بدهی باز:** ستون‌های `norolink_pages.claim_token` و `claimed_at` به همین دلیل در `0020` مانده‌اند. ریلیز `2eea3dc6657b` هنوز آن‌ها را می‌خواند. وقتی `e97c0ec16e2c` پایدار ماند و دیگر برگشت به `2eea3dc6657b` لازم نبود، آن‌ها را با migration دستی حذف کنید و `DROP COLUMN IF EXISTS` به‌کار ببرید، چون در دیتابیس توسعه از قبل حذف شده‌اند.

**اگر داده خراب شد:** بازیابی از `pg_dump` در [`launch-blueprint.md`](./launch-blueprint.md) §۷ است. `activate.sh` پیش از هر migration یک بک‌آپ می‌گیرد.

## ۷. نگه‌داری و عیب‌یابی

| موضوع | چه باید کرد |
|---|---|
| گواهی `*.n8l.ir` | دستی است و ۱۴۰۵/۱۱/۱۱ (۲۰۲۷-01-31) منقضی می‌شود؛ از ۲۰۲۷-01-17 با فرمان زیر تمدید کنید |
| گواهی `noroset.com` | با certbot خودکار تمدید می‌شود |
| بک‌آپ روی ویندوز | Task با نام `NorosetBackup` هر ۴۸ ساعت `deploy/pull-backup.ps1` را اجرا می‌کند |
| هشدار پیامکی | `deploy/ops/watchdog.sh` هر ۵ دقیقه اجرا می‌شود. تأیید پترن `574542` را در کنسول ملی‌پیامک ببینید؛ ارسال واقعی هشدار هنوز آزموده نشده است |
| ریپو | remote ندارد، پس commitها فقط روی همین ماشین هستند |

تمدید گواهی `n8l.ir`، **روی سرور با root**. certbot یک رکورد TXT می‌خواهد که باید در DNS پارس‌پک ثبت شود:

```bash
certbot certonly --manual --preferred-challenges dns -d n8l.ir -d '*.n8l.ir' --agree-tos --register-unsafely-without-email
```

```bash
/etc/letsencrypt/renewal-hooks/deploy/noroset.sh
```

| نشانه | علت و راه‌حل |
|---|---|
| `release <sha> is unhealthy` | نسخه‌ی قبلی برگشته است. `pm2 logs --lines 100 --nostream` و `/srv/noroset/logs` را ببینید. |
| خطای ۵۰۰ روی `/form` یا صفحه‌ها و `EPROTO` در لاگ وب | Next باید با `-H localhost` اجرا شود، نه `127.0.0.1` (`deploy/ecosystem.config.cjs`) |
| تغییر صفحه‌ی لینک دیده نمی‌شود | کش nginx ده ثانیه است؛ کمی صبر کنید |
| بیلد شکست می‌خورد | روشن بودن Docker Desktop و خروجی همان فرمان را ببینید؛ `deploy.ps1` پیش از اتمام بیلد چیزی به سرور نمی‌فرستد |
| `scp` با `Connection reset` یا `Broken pipe` وسط کار قطع می‌شود | اتصال در آپلودهای بزرگ (بعد از ۳۰ تا ۶۰ مگابایت) قطع می‌شود؛ تکرار `deploy.ps1` کل ۳۴۰ مگابایت را از نو می‌فرستد. بسته را در تکه‌های ۵ مگابایتی با `-o ServerAliveInterval=10` بفرستید، روی سرور با `cat` به هم بچسبانید و sha256 دو طرف را مقایسه کنید؛ سپس فرمان فعال‌سازی `deploy.ps1` را با `nohup` و لاگ در `/srv/noroset/logs` اجرا کنید تا قطع SSH آن را نیمه‌کاره نگذارد |

در [`launch-blueprint.md`](./launch-blueprint.md) §۵.۵ روش `acme.sh` آمده است، ولی گواهی‌های این سرور با certbot گرفته شده‌اند.
