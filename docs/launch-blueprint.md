# نقشه‌ی استقرار لانچ (نورولینک + نوروفایل)

> به‌روزرسانی: ۱۴۰۵/۸/۱۰ (۲۰۲۶-11-01). تصمیم‌های معماری در [`architecture.md`](./architecture.md) است؛ این سند می‌گوید چطور مستقر کنیم.
> فایل‌های استقرار در [`deploy/`](../deploy) هستند. سرور راه‌اندازی شده است؛ وضعیت فعلی و انتشار ریلیز تازه در [`release.md`](./release.md) است.

## ۱. تصمیم‌ها

| موضوع | تصمیم |
|---|---|
| محصولات | نورولینک، نوروفایل و مدیریت پلتفرم. نوروفرم خاموش است و `noroset.com/form` صفحه‌ی «به‌زودی» را نشان می‌دهد |
| میزبانی | یک سرور ابری لینوکس پارس‌پک در ایران؛ هزینه‌ی کم اولویت اول است |
| فایل‌ها | SeaweedFS روی همان سرور، با IAM و بدون پورت عمومی |
| اجرا | Next و API با PM2 روی host؛ Postgres و SeaweedFS در Docker |
| بیلد | روی ماشین مالک، داخل کانتینر لینوکسی `node:22`؛ سرور بیلد نمی‌گیرد |
| DNS | پلن رایگان CDN/DNS پارس‌پک برای `noroset.com` و `n8l.ir`، همه‌ی رکوردها «فقط DNS» |
| بک‌آپ | بک‌آپ روزانه‌ی پارس‌پک + `pg_dump` روزانه + دریافت روی ماشین مالک هر ۴۸ ساعت |
| هشدار | پیامک ملی‌پیامک؛ هر مشکل حداکثر هر ۶ ساعت یک پیامک |
| فایل عمومی | فقط تصویر و PDF؛ Office و ZIP خصوصی می‌مانند |
| 2FA ادمین | بعد از لانچ (ریسک پذیرفته‌شده) |

## ۲. برآورد بار

برآورد ۱۰۰ کاربر و ۱۵۰ صفحه است و هنوز با تست بار تأیید نشده است.

| نوع صفحه | تعداد | بازدید روزانه هر صفحه | کل در روز | کل در ماه |
|---|---:|---:|---:|---:|
| شخصی | ۱۰۵ | ۱۵ | ۱٬۵۷۵ | ۴۷٬۲۵۰ |
| کسب‌وکار کوچک | ۴۵ | ۱۲۰ | ۵٬۴۰۰ | ۱۶۲٬۰۰۰ |
| **جمع** | **۱۵۰** | | **حدود ۷٬۰۰۰** | **حدود ۲۱۰٬۰۰۰** |

- **بازدید در ثانیه:** میانگین ۰.۰۸ و ساعت اوج حدود ۰.۳؛ موج کمپین ۵ تا ۱۵ بازدید در ثانیه.
- **هر بازدید چند درخواست است:** رندر صفحه، beacon آمار و چند تصویر. هر تصویر بدون کش از API و S3 رد می‌شود.
- **کش nginx:** صفحه‌ی لینک ۱۰ ثانیه، تصویر عمومی ۷ روز و `_next/static` ۳۰ روز. پس در موج بازدید، هر صفحه هر ۱۰ ثانیه یک بار رندر می‌شود.
- **دیسک:** سقف واقعی سهمیه‌ی پلن است (پایه ۱ گیگابایت، حرفه‌ای ۵ گیگابایت)، نه ۲۰ مگابایت برای هر صفحه. بدترین حالت ۱۰۰ کاربر پایه ۱۰۰ گیگابایت است، پس هشدار دیسک لازم است و سقف پایه را می‌توان از پنل کم کرد.
- **جدول آمار:** حدود ۱۰۰ مگابایت در ماه با فرض ۳۰٪ کلیک. سیاست نگه‌داری هنوز باز است (§۹.۵ معماری).
- **ترافیک:** ۶۳ تا ۴۲۰ گیگابایت در ماه؛ بازدید اول معمولاً کش مرورگر ندارد و حجم واقعی باید روی یک صفحه‌ی نمونه اندازه گرفته شود.

## ۳. سرور و هزینه

**پیکربندی انتخابی:** ۲ هسته، ۴ گیگابایت RAM، ۴۰ گیگابایت دیسک، Ubuntu، دیتاسنتر تهران.

| قلم | تومان در ماه | توضیح |
|---|---:|---|
| سرور ابری | ۱٬۸۶۸٬۷۰۰ | ۶۲٬۲۹۰ در روز × ۳۰؛ قیمت ماهانه‌ی واقعی را پیش از خرید در پنل ببینید |
| بک‌آپ روزانه | ۱۰۰٬۰۰۰ | ۴۰ گیگ × ۲٬۵۰۰؛ دوره‌ی این هزینه در مستندات مشخص نیست |
| CDN/DNS | ۰ | پلن رایگان برای هر دو دامنه |
| ترافیک، مالیات و IP | نامشخص | از پشتیبانی بپرسید (بخش ۹) |
| **جمع معلوم** | **حدود ۱٬۹۶۹٬۰۰۰** | |

قیمت‌ها در ۱۴۰۵/۸/۱۰ از سایت پارس‌پک خوانده شده‌اند. PaaS با همین منابع ۲٬۷۳۶٬۰۰۰ تومان است و wildcard، SSH و فضای پایدار آن روشن نیست.

| سرویس | سقف حافظه |
|---|---:|
| PostgreSQL | ۷۰۰ مگابایت (`mem_limit`) |
| SeaweedFS | ۵۰۰ مگابایت (`mem_limit`) |
| API | ۵۰۰ مگابایت (PM2) |
| Next | ۷۰۰ مگابایت (PM2) |
| سیستم‌عامل، nginx و کش | باقی‌مانده + ۲ گیگابایت swap |

مصرف واقعی را یک ماه پس از لانچ ببینید. اگر مجموع زیر ۱.۵ گیگابایت ماند، کاهش به ۲ گیگابایت ماهانه حدود ۴۵۵ هزار تومان صرفه‌جویی دارد.

## ۴. معماری

```
              کاربران
                 │  DNS پارس‌پک (فقط DNS)
                 ▼
         nginx روی ۸۰ و ۴۴۳
         کش تصویر، استاتیک و صفحه
          ┌──────┴──────┐
          ▼             ▼
   Next (PM2)      API (PM2)
   127.0.0.1:3000  127.0.0.1:3001
          └──────┬──────┘
          ┌──────┴──────┐
          ▼             ▼
    Postgres        SeaweedFS
   127.0.0.1:5433  127.0.0.1:8333
```

پورت‌های ۳۰۰۰، ۳۰۰۱، ۵۴۳۳ و ۸۳۳۳ فقط روی loopback هستند. `UFW` فقط پورت‌های ۲۲، ۸۰ و ۴۴۳ را باز می‌گذارد و پورت ۵۳ فقط برای acme-dns باز می‌شود.

| فایل | کار |
|---|---|
| [`deploy/deploy.ps1`](../deploy/deploy.ps1) | بیلد از commit و ارسال به سرور |
| [`deploy/ops/activate.sh`](../deploy/ops/activate.sh) | بک‌آپ، migration، تعویض نسخه، بررسی سلامت و برگشت خودکار |
| [`deploy/docker-compose.prod.yml`](../deploy/docker-compose.prod.yml) | Postgres و SeaweedFS |
| [`deploy/ecosystem.config.cjs`](../deploy/ecosystem.config.cjs) | PM2 |
| [`deploy/nginx/noroset.conf`](../deploy/nginx/noroset.conf) | nginx و کش |
| [`deploy/production.env.example`](../deploy/production.env.example) | قالب env |
| [`deploy/ops/setup-server.sh`](../deploy/ops/setup-server.sh) | آماده‌سازی یک‌باره‌ی سرور |
| [`deploy/ops/watchdog.sh`](../deploy/ops/watchdog.sh) | هشدار پیامکی |
| [`deploy/pull-backup.ps1`](../deploy/pull-backup.ps1) | بک‌آپ روی ماشین مالک |

## ۵. راه‌اندازی اولیه

### ۵.۱ پیش از خرید سرور

1. پترن OTP با کد `454153` تأیید شده است. پترن هشدار سرور («نوروست - هشدار سرور: {0}») با کد `574542` ثبت شده و در انتظار تأیید است؛ تا تأیید نشود هشدار ارسال نمی‌شود. شماره‌ی گیرنده را هنگام راه‌اندازی در `ALERT_MOBILE` بگذارید. توکن API فقط در `MELIPAYAMAK_TOKEN` فایل `shared/.env` قرار می‌گیرد.
2. اینماد و مرچنت زرین‌پال گرفته شده‌اند. نماد اینماد در فوتر سایت است و کد مرچنت فقط در `ZARINPAL_MERCHANT_ID` فایل `shared/.env` قرار می‌گیرد و وارد ریپو نمی‌شود.
3. سؤال‌های بخش ۹ را از پشتیبانی پارس‌پک بپرسید.

### ۵.۲ DNS

هر دو دامنه را در CDN پارس‌پک با پلن رایگان اضافه کنید و NS را تغییر دهید. تغییر NS دامنه‌ی `.ir` از طریق ایرنیک ممکن است چند ساعت طول بکشد.

| دامنه | رکورد | مقدار | حالت |
|---|---|---|---|
| `noroset.com` | A `@` و A `www` | IP سرور | فقط DNS |
| `n8l.ir` | A `@` و A `*` | IP سرور | فقط DNS |

اگر رکورد `*` قابل افزودن نبود، پیش از ادامه با پشتیبانی روشن کنید؛ بدون آن صفحه‌های لینک باز نمی‌شوند.

### ۵.۳ نصب سرور

با root روی Ubuntu:

```bash
apt update && apt install -y nginx docker.io docker-compose-v2 curl openssl ufw
```

Node 22 و PM2 را نصب کنید و نسخه را بررسی کنید:

```bash
node --version
```

```bash
npm install -g pm2
```

اگر Docker Hub از داخل ایران پاسخ نداد، ایمیج‌ها را روی ماشین خود بگیرید و بفرستید:

```bash
docker pull postgres:16-alpine
```

```bash
docker pull chrislusf/seaweedfs:4.48
```

```bash
docker save postgres:16-alpine chrislusf/seaweedfs:4.48 -o images.tar
```

روی سرور بعد از `scp`:

```bash
docker load -i images.tar
```

### ۵.۴ آماده‌سازی

1. روی ماشین خود release را بسازید:

   ```bash
   .\deploy\deploy.ps1 -Server root@IP -Ref main -BuildOnly
   ```

2. فایل `.release/noroset-<sha>.tar.gz` را به سرور بفرستید و در `/tmp/noroset-first` باز کنید.
3. `/srv/noroset/shared/.env` را از `production.env.example` بسازید. هر مقدار `CHANGE` را با `openssl rand -hex 32` پر کنید.
4. با root اجرا کنید:

   ```bash
   bash /tmp/noroset-first/deploy/ops/setup-server.sh
   ```

5. کلید SSH خود را به کاربر `deploy` بدهید.
6. سرویس‌های داده را بالا بیاورید:

   ```bash
   docker compose --env-file /srv/noroset/shared/.env -f /tmp/noroset-first/deploy/docker-compose.prod.yml up -d
   ```

7. درستی IAM را بررسی کنید. این دستور باید `403` چاپ کند:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8333/
   ```

### ۵.۵ گواهی‌ها

برای اینکه nginx بالا بیاید، اول گواهی موقت بسازید:

```bash
for d in noroset.com n8l.ir; do openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=$d" -keyout /etc/nginx/ssl/$d/key.pem -out /etc/nginx/ssl/$d/fullchain.pem; done
```

```bash
nginx -t && systemctl reload nginx
```

acme.sh را نصب کنید و گواهی `noroset.com` را با HTTP-01 بگیرید:

```bash
acme.sh --issue -d noroset.com -d www.noroset.com -w /var/www/acme
```

```bash
acme.sh --install-cert -d noroset.com --key-file /etc/nginx/ssl/noroset.com/key.pem --fullchain-file /etc/nginx/ssl/noroset.com/fullchain.pem --reloadcmd "systemctl reload nginx"
```

**گواهی وایلدکارت `n8l.ir`:** مستندات پارس‌پک API رکورد DNS را ذکر نکرده‌اند. اگر پشتیبانی API داد، از همان استفاده کنید. در غیر این صورت:

1. [acme-dns](https://github.com/joohoi/acme-dns) را روی همین سرور اجرا کنید: DNS روی `IP سرور:53` و API فقط روی `127.0.0.1:8053` با `domain = auth.noroset.com`.
2. پورت ۵۳ را باز کنید:

   ```bash
   ufw allow 53
   ```

3. در DNS `noroset.com` این رکوردها را بسازید: A `ns-auth` به IP سرور و NS `auth` به `ns-auth.noroset.com`.
4. روی acme-dns یک حساب ثبت کنید و در DNS `n8l.ir` رکورد CNAME `_acme-challenge` را به `<subdomain>.auth.noroset.com` بدهید.
5. با `ACMEDNS_BASE_URL`، `ACMEDNS_USERNAME`، `ACMEDNS_PASSWORD` و `ACMEDNS_SUBDOMAIN` گواهی بگیرید:

   ```bash
   acme.sh --issue --dns dns_acmedns -d n8l.ir -d '*.n8l.ir'
   ```

   ```bash
   acme.sh --install-cert -d n8l.ir --key-file /etc/nginx/ssl/n8l.ir/key.pem --fullchain-file /etc/nginx/ssl/n8l.ir/fullchain.pem --reloadcmd "systemctl reload nginx"
   ```

6. تمدید را با `acme.sh --cron --force` روی نسخه‌ی staging یا `--renew` آزمایش کنید.

### ۵.۶ اولین انتشار

از ماشین خود:

```bash
.\deploy\deploy.ps1 -Server deploy@IP -Ref main
```

روی سرور با کاربر `deploy`، سپس فرمانی را که چاپ می‌شود با root اجرا کنید:

```bash
pm2 startup
```

اولین مدیر پلتفرم:

```bash
cd /srv/noroset/current/packages/db && DATABASE_URL_MIGRATOR="$(grep ^DATABASE_URL_MIGRATOR /srv/noroset/shared/.env | cut -d= -f2-)" node scripts/grant-superadmin.mjs 09120000000
```

سپس در پنل:

1. در `/admin/modules` نوروفرم را روی **خاموش** بگذارید تا API آن هم بسته شود.
2. در `/admin/billing` قیمت پلن‌های «پایه نورولینک» و «حرفه‌ای نورولینک» را بگذارید و آن‌ها را فعال کنید. بدون این کار، کاربر پس از ۱۴ روز رایگان نمی‌تواند پلن بخرد.

## ۶. انتشار و برگشت

```bash
.\deploy\deploy.ps1 -Server deploy@IP -Ref main
```

- پیش از آن `pnpm lint`، `pnpm typecheck`، `pnpm check:boundaries` و `pnpm test` باید سبز باشند. CI فعلی تست‌ها را اجرا نمی‌کند.
- ری‌استارت PM2 چند ثانیه قطعی دارد؛ در ساعت کم‌بار منتشر کنید.
- اگر بررسی سلامت شکست بخورد، نسخه‌ی قبلی خودکار برمی‌گردد، ولی migration برنمی‌گردد. پس هر migration باید با نسخه‌ی قبلی کد سازگار باشد.

برگشت دستی به یکی از سه نسخه‌ی آخر:

```bash
ssh deploy@IP /srv/noroset/current/deploy/ops/activate.sh <sha>
```

## ۷. بک‌آپ و بازیابی

| لایه | تناوب | جا | نگه‌داری |
|---|---|---|---|
| بک‌آپ خودکار پارس‌پک | روزانه | پارس‌پک | حداکثر ۵ نسخه |
| `pg_dump` | روزانه ساعت ۳ و پیش از هر migration | `/srv/noroset/backups/db` | ۷ نسخه |
| دیتابیس و فایل‌ها | هر ۴۸ ساعت | ماشین مالک | ۳ نسخه |

بک‌آپ خودکار را در پنل پارس‌پک روی «روزانه» بگذارید. در بدترین حالت داده‌ی حدود یک روز از دست می‌رود.

زمان‌بندی روی ویندوز:

```bash
schtasks /Create /TN NorosetBackup /SC DAILY /MO 2 /ST 04:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\norosetcom\deploy\pull-backup.ps1 -Server deploy@IP -Destination D:\noroset-backups"
```

در Task Scheduler گزینه‌ی «Run task as soon as possible after a scheduled start is missed» را فعال کنید. پوشه‌ی مقصد شماره‌ی موبایل کاربران را دارد، پس دیسک آن را رمز کنید.

**بازیابی دیتابیس:**

```bash
docker exec -i noroset-postgres pg_restore -U noroset -d noroset --clean --if-exists < db-XXXX.dump
```

**بازیابی فایل‌ها:** کانتینر `noroset-storage` را متوقف کنید، آرشیو را در volume `noroset_storage_data` باز کنید و کانتینر را بالا بیاورید.

**بازیابی کامل از پارس‌پک:** از بک‌آپ سرور جدید بسازید و رکوردهای A را به IP جدید تغییر دهید.

یک بار پیش از لانچ بازیابی کامل را روی سرور آزمایشی تمرین کنید. آزمایش ۲۴ ساعته‌ی پارس‌پک برای این کار مناسب است.

## ۸. عملیات

- **هشدار:** API، وب، دیتابیس، ذخیره‌ساز، دیسک بالای ۸۰٪، بک‌آپ قدیمی‌تر از ۲۶ ساعت و گواهی زیر ۱۴ روز. خاموشی کامل سرور را این بررسی نمی‌بیند.
- **حذف فوری فایل متخلف از کش:** فایل در پنل حذف شود و سپس با root:

  ```bash
  rm -rf /var/cache/nginx/noroset_static/* && systemctl reload nginx
  ```

- **لاگ‌ها:** `/srv/noroset/logs` با چرخش روزانه و لاگ Docker با سقف ۳۰ مگابایت.
- **لینک‌های کوتاه پیامک:** `noroset.com/b` به صفحه‌ی اشتراک و `noroset.com/a` به حساب کاربری می‌رود (`deploy/nginx/noroset.conf`). پترن‌های پیامک لینک را فقط در متن ثابت می‌پذیرند، نه در متغیر.

## ۹. سؤال‌های باز از پارس‌پک

1. ترافیک سرور ابری ایران: سهمیه و قیمت هر گیگابایت داخلی و خارجی چقدر است؟
2. IPv4 و مالیات در قیمت هستند؟ پلن ماهانه یا سالانه چقدر تخفیف دارد؟ هزینه‌ی بک‌آپ برای چه دوره‌ای است؟
3. API برای ساخت رکورد TXT وجود دارد؟ هر دو دامنه می‌توانند پلن رایگان بگیرند؟
4. رکورد `*` را می‌شود به‌صورت «فقط DNS» ثبت کرد؟
5. CDN رایگان بعد از ۵۰ گیگابایت چه می‌شود و کدام هدر IP واقعی را منتقل می‌کند؟ تا پیش از پاسخ، پراکسی CDN روشن نمی‌شود.

## ۱۰. چک‌لیست پیش از لانچ

- [ ] یک OTP از روی سرور production ارسال و دریافت شده است. اگر کنسول ملی‌پیامک «به تنظیمات کنسول مراجعه کنید» برگرداند، دسترسی توکن و IP سرور را در تنظیمات کنسول بررسی کنید.
- [ ] یک خرید واقعی با مرچنت زرین‌پال انجام شده است.
- [ ] نماد اینماد روی `noroset.com` نمایش داده می‌شود و صفحه‌ی تأیید آن باز می‌شود.
- [ ] همه‌ی secretها مقدار تازه دارند و `shared/.env` دسترسی 600 دارد.
- [ ] از بیرون سرور فقط پورت‌های مجاز باز است (`nmap`).
- [ ] تمدید خودکار هر دو گواهی آزمایش شده است.
- [ ] بازیابی کامل تمرین شده است.
- [ ] هشدار پیامکی با متوقف کردن عمدی API آزمایش شده است.
- [ ] تست بار با k6 روی پیکربندی نهایی اجرا شده است.
- [ ] نوروفرم در `/admin/modules` خاموش است.
- [ ] دامنه‌ی `n8l.ir` به‌صورت Domain property (رکورد TXT در DNS) در Google Search Console تأیید و `https://n8l.ir/sitemap.xml` ثبت شده است؛ `curl -I` یک زیردامنه‌ی ناموجود ۴۰۴ و نشانی قبلی یک صفحه ۳۰۸ می‌دهد (docs/architecture.md §9.1).
- [ ] اگر «نمایش در نتایج گوگل» قرار است فروخته شود، کلید `norolink.seo` روی پلن مربوط در `/admin/billing` روشن است.

## ۱۱. ریسک‌های پذیرفته‌شده

- همه‌ی داده روی یک سرور است و بک‌آپ بیرونی فقط روی ماشین مالک است.
- 2FA ادمین نداریم؛ نشست دزدیده‌شده‌ی superadmin کل پلتفرم را در اختیار می‌گذارد.
- rate limit، به‌جز سقف OTP هر موبایل، درون‌حافظه است و با ری‌استارت صفر می‌شود.
- آرشیو فایل‌ها از SeaweedFS در حال کار گرفته می‌شود؛ درستی آن را تمرین بازیابی نشان می‌دهد.
- بدون CDN، همه‌ی ترافیک از همین سرور می‌گذرد.
