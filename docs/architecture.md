# Noroset — سند معماری و تصمیم‌های قطعی

> این سند خلاصه‌ی همه‌ی تصمیم‌های معماری است که تا اینجا به توافق رسیده.
> **قاعده:** هر جا کد با این سند فرق دارد، اول سؤال کن؛ حدس نزن.

---

## ۱. هویت و نام‌گذاری

| مورد | مقدار |
|---|---|
| پلتفرم | **noroset** (`noroset.com`) |
| محصولات لانچ | **norolink** (`noroset.com/link`)، **norofile** (`noroset.com/file`)؛ **noroform** بعد از لانچ (§۲) |
| اسکوپ پکیج‌ها | `@noroset/*` (مثلاً `@noroset/noroform`) |
| پیشوند جدول‌ها | `noroform_`، `norolink_` |
| زبان/جهت | فارسی، RTL (`lang="fa" dir="rtl"`)، فونت **IRANYekan** (+ Geist برای لاتین)، تقویم شمسی در UI |
| **نورولینک پیج** | نام رسمی صفحه‌ای که با نورولینک ساخته می‌شود؛ در مکالمه، کد و مستندات از این نام استفاده شود |

نام‌های اشتباه قدیمی (`nuro*`) استفاده نشود.

---

## ۲. دامنه‌ی لانچ (MVP)

**در لانچ هست:** ثبت‌نام/ورود با OTP پیامکی، ورود با رمز عبور (اختیاری، کنار OTP)، tenant و عضویت، norolink (صفحه عمومی روی `{slug}.n8l.ir`، شش نوع المان، تم، پیش‌نویس/انتشار، آمار ساده — بخش ۹)، norofile (مدیریت و میزبانی فایل؛ تنها سرویس S3 پلتفرم؛ تصاویر norolink هم از آن — بخش ۹.۹)، **مدیریت پلتفرم (admin)**: کاربران و tenantها، ورود پشتیبانی به حساب کاربر، ماژول‌ها، پلن/اشتراک/پرداخت آنلاین (زرین‌پال)، کمپین‌ها (کد تخفیف، اعلان درون پنل، UTM) — بخش ۹.۱۱، **بلاگ پلتفرم** (`noroset.com/blog`؛ نوشتن فقط superadmin، نظر با تأیید مدیر — بخش ۹.۱۲).

> دامنه‌ی لانچ با تصمیم مالک محصول (۱۴۰۵/۸/۵، ۲۰۲۶-10-27) برای مدیریت پلتفرم، billing و کمپین‌ها بزرگ شد؛ پیش از آن «billing/پرداخت کامل» خارج از لانچ بود.

> اسلایدر تصویر در norolink (المان تصویر تا ۱۰ تصویر) با تصمیم مالک محصول (۱۴۰۵/۸/۷، ۲۰۲۶-10-29) به لانچ اضافه شد (§۹.۲).

> صفحه‌ی اصلی محصولات به سبک گوگل فرم/درایو (قالب‌های آماده‌ی فرم و صفحه‌ی لینک به‌صورت داده‌ی ثابت در کد، گالری قالب‌ها، جست‌وجو، فیلتر مالک، نمای شبکه/فهرست) هم با تصمیم مالک محصول (۱۴۰۵/۸/۶، ۲۰۲۶-10-28) به لانچ اضافه شد؛ Solution Pack بیرون می‌ماند.

> قالب‌های مدیریت‌شده‌ی **صفحه‌ی لینک** از پنل ادمین (ساخت با ادیتور نورولینک، انتشار در گالری، حذف قالب‌های موجود) با تصمیم مالک محصول (۱۴۰۵/۸/۱۰، ۲۰۲۶-11-01) به لانچ اضافه شد (§۹.۸)؛ قالب‌های فرم همچنان داده‌ی ثابت در کدند.

> **noroform از لانچ بیرون رفت** (تصمیم مالک محصول ۱۴۰۵/۸/۱۰، ۲۰۲۶-11-01). کد آن می‌ماند: در production مگر با `NOROFORM_ENABLED=true`، مسیرهای `/form` صفحه‌ی «به‌زودی» (`/landing/form/soon`) را نشان می‌دهند و `/f/{id}` ۴۰۴ است؛ API با ماژول `off` (§۹.۱۱) بسته می‌شود.

> **صفحه‌ی اصلی سایت** تا لانچ محصولات بعدی فقط معرفی کوتاه نورولینک است؛ هدر و فوتر مارکتینگ هم به همین اندازه ساده شدند (تصمیم مالک محصول ۱۴۰۵/۸/۱۲). از ۱۴۰۵/۸/۱۹ (درخواست مالک محصول) پیش از بلوک CTA اسلایدر خودکار لوگوی استفاده‌کنندگان نورولینک (`_components/customer-logos.tsx`؛ لوگوهای ثابت در `public/images/customers`، تا رسیدن لوگوی واقعی نمونه‌اند) و پیش از فوتر چهار مطلب آخر بلاگ (§۹.۱۲) می‌آید؛ لینک «بلاگ» از هدر برداشته شد و فقط در فوتر است.

> **کنترل صفحه‌ها از سوی مدیریت پلتفرم و گزارش تخلف بازدیدکننده‌ها** (§۹.۱۳) با تصمیم مالک محصول (۱۴۰۵/۸/۲۰، ۲۰۲۶-11-11) به لانچ اضافه شد؛ همان روز دایرکتوری n8l.ir فقط صفحه‌های واقعی را نشان می‌دهد (نمونه‌های ساختگی، نشان «تأییدشده» و فیلتر دسته حذف شدند).

> **پلن رایگان حذف شد** (تصمیم مالک محصول ۱۴۰۵/۸/۱۰، ۲۰۲۶-11-01): هر کاربر یک بار و در اولین ورود ۱۴ روز پلن پایه‌ی نورولینک را رایگان می‌گیرد و پس از آن بدون پرداخت، صفحه‌های لینک غیرفعال می‌شوند (§۹.۱۱).

**عمداً در لانچ نیست:** noroform (تا تصمیم بعدی)، هوش مصنوعی و ایجنت، noroflow، nororeport، norodata (به‌عنوان محصول)، workspace، تمدید خودکار اشتراک، پیامک انبوه تبلیغاتی، فیلد آپلود فایل در noroform، custom domain، بلوک «لینک به فرم» در norolink، Solution Pack، اطلاع‌رسانی ثبت پاسخ (بعد از لانچ)، routing پیشرفته و محاسبات در فرم، کپچا (فقط اگر اسپم دیده شد).

ریپوی قدیمی (با field-engine، AI، flow و ...) فقط مرجع مطالعه است؛ کدی از آن منتقل نمی‌شود. ریپوی جدید از صفر ساخته شده است.

---

## ۳. اصول معماری

1. **Modular monolith**: یک کدبیس، ماژول‌های جدا برای هر محصول؛ تفکیک سرویس فقط با نیاز واقعی.
2. **وابستگی یک‌طرفه:** محصول ← core. محصولات به داخل یکدیگر وابسته نیستند؛ فقط از طریق `index.ts`/contract یا شناسه ساده.
3. **هر محصول یک پکیج کامل:** `api/` و `ui/` در یک پوشه (UI از محصول جدا نمی‌شود).
4. **FK فقط به لایه‌ی همیشه‌حاضر** (core). بین محصولات: ستون uuid ساده بدون FK؛ درستی با رویداد/بررسی در زمان استفاده.
5. **دسترسی به داده‌ی محصول دیگر فقط از طریق Port/سرویس**، هرگز JOIN یا SELECT مستقیم روی جدول‌های آن.
6. **محدودیت دسترسی فقط در UI کافی نیست:** هر endpoint باید در بک‌اند هم گارد داشته باشد.
7. **مرزها خودکار اعمال می‌شوند** (dependency-cruiser در CI)، نه فقط مکتوب.
8. **سادگی:** چیزی که برای لانچ لازم نیست ساخته نمی‌شود، ولی طراحی طوری باشد که اضافه‌کردنش بعداً گران نباشد.

---

## ۴. فناوری و نسخه‌ها (pin، بدون `^`)

- **ابزار:** pnpm workspaces، TypeScript strict (۶.۰.x)، ESLint 9 + Prettier
- **بک‌اند:** NestJS ۱۲ + Fastify، Drizzle ORM (۰.۴۵) + `pg`
- **فرانت:** Next.js ۱۶ (App Router) + React ۱۹ + Tailwind ۴؛ دیزاین سیستم **shadcn Nova با آبی مدرن و رنگ پایه‌ی قابل‌تغییر** در `@noroset/ui` — [`design-system.md`](./design-system.md)؛ ساختار و مرزهای فرانت — [`frontend-architecture.md`](./frontend-architecture.md)؛ آدرس صفحه‌ها — [`routes.md`](./routes.md)
- **تست:** vitest، علیه PostgreSQL واقعی (docker) در دیتابیس جدای `{POSTGRES_DB}_test` (مثلاً `noroset_test`؛ setup-env تست‌ها آدرس را عوض می‌کند و `dev.ps1` آن را می‌سازد) تا پاک‌سازی تست‌ها به داده‌ی توسعه نرسد
- **مرز:** dependency-cruiser ۱۸
- **DB:** PostgreSQL (docker روی پورت **۵۴۳۳** چون PostgreSQL بومی ویندوز روی ۵۴۳۲ است)
- **ذخیره‌ساز فایل:** S3-compatible با `@aws-sdk/client-s3` **فقط داخل `products/norofile`** (bucket خصوصی)؛ محصولات دیگر از Port `FILE_SERVICE` در core استفاده می‌کنند (بخش ۹.۹). SeaweedFS در docker روی پورت **۸۳۳۳** (ایمیج MinIO دیگر در Docker Hub منتشر نمی‌شود)؛ production هم روی همان سرور، با IAM و فقط روی loopback ([`launch-blueprint.md`](./launch-blueprint.md)).
- **پورت‌ها:** API=3001، Web=3000
- پکیج‌های داخلی برای مصرف برنامه‌ها از `dist` بیلد می‌شوند؛ اسکریپت‌های `dev`، `build`، `test` و `typecheck` ابتدا `build:packages` را اجرا می‌کنند تا برنامه‌ها schema یا قرارداد کهنه نخوانند.
- ویندوز: `.gitattributes` با `eol=lf` و `.editorconfig`.

---

## ۵. ساختار ریپو

```
noroset/
├── apps/
│   ├── api/            NestJS
│   └── web/            Next.js (route groups: (marketing)، (panel)؛ نقشه‌ی آدرس‌ها: docs/routes.md)
├── packages/
│   ├── core/           auth، tenancy، موبایل، OTP، SMS provider
│   ├── db/             schema، migrations، withTenant/withUser، roles.sql
│   ├── field-engine/   هسته‌ی فرم (بدون React/DB/Nest)؛ بخش React بعداً
│   └── ui/             کامپوننت‌های مشترک
├── products/
│   ├── noroform/{api,ui}
│   ├── norolink/{api,shared,ui}
│   ├── norofile/{api,ui}    مدیریت/میزبانی فایل؛ تنها سرویس S3
│   ├── admin/{api,ui}       مدیریت پلتفرم (سوپرادمین)، billing، کمپین‌ها (بخش ۹.۱۱)
│   └── blog/{api,shared,ui} بلاگ پلتفرم (بخش ۹.۱۲)
├── docker/initdb/      00-roles.sh
├── deploy/             فایل‌های استقرار production ([`launch-blueprint.md`](./launch-blueprint.md))
├── docs/               این سند، launch-blueprint.md، tech-debt.md
└── .github/workflows/ci.yml
```

### قوانین dependency-cruiser (فعلی و مصوب)
- `packages/core` به هیچ‌چیز در `products` وابسته نباشد؛ `core → db` فقط از index.
- `norolink` ↔ `noroform` به هم وابسته نباشند.
- `norofile` ↔ `noroform`/`norolink` به هم وابسته نباشند (محصولات فقط Port `FILE_SERVICE` در core را می‌شناسند).
- `admin` ↔ بقیه‌ی محصولات به هم وابسته نباشند (admin سقف پلن و وضعیت ماژول را از Portهای core به بقیه می‌دهد؛ §۹.۱۱).
- `blog` ↔ بقیه‌ی محصولات (از جمله admin) به هم وابسته نباشند (blog فقط Portهای `FILE_SERVICE` و `PLATFORM_ADMIN_CONTEXT` در core را می‌شناسد؛ §۹.۱۲).
- فقط `products/norofile` به `@aws-sdk/*` وابسته باشد.
- `packages/ui` به هیچ محصول و به `apps` وابسته نباشد (کارت آپلود فقط قرارداد `FileSource` را می‌شناسد؛ §۹.۱۰).
- import عمیق به داخل هر پکیج ممنوع (فقط `index.ts`).
- `norolink → field-engine` ممنوع؛ `noroform → field-engine` فقط از index مجاز.
- فقط `packages/db` به `drizzle-orm | drizzle-kit | pg` وابسته باشد.
- `apps/api → core` فقط از index.
- `field-engine` به هیچ پکیج داخلی و به react/nest/drizzle/pg وابسته نباشد.

---

## ۶. دیتابیس

### ۶.۱ اصول
- یک PostgreSQL، schema پیش‌فرض `public`، پیشوند نام جدول برای مرز مفهومی (schema جدا بعداً ارزان است).
- همه جدول‌های tenant-scoped: `tenant_id` + **RLS با ENABLE + FORCE** + ایندکس `(tenant_id, ...)` + `UNIQUE (id, tenant_id)` برای FK مرکب.
- `workspace_id` فعلاً ساخته نمی‌شود (نام‌گذاری طوری باشد که بعداً اضافه شود).
- enumها با pgEnum یا CHECK.

### ۶.۲ نقش‌های DB
- `noroset_migrator`: owner جدول‌ها، اجرای migration.
- `noroset_app`: بدون `BYPASSRLS`، بدون ownership، بدون CREATE در schema؛ فقط GRANTهای حداقلی؛ `ALTER DEFAULT PRIVILEGES` تا جدول‌های آینده خودکار دسترسی نگیرند.
- ساخت نقش‌ها: `packages/db/sql/roles.sql` (idempotent، رمز از env). docker-entrypoint آن را اجرا می‌کند؛ در production هم همین فایل یک‌بار اجرا می‌شود.
- با FORCE RLS، seed/migration که روی جدول tenant-scoped می‌نویسد باید tenant را ست کند (رفتار مطلوب).
- روی جدول‌های **سطح پلتفرم** با RLS ادمین (مثل `billing_plans`) هیچ policy برای نقش migrator نیست؛ پس migration‌ای که داده‌ی موجود را به‌روز می‌کند
  باید مثل `0013`/`0019`/`0027` در همان تراکنش اول `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` بگذارد و در پایان
  `... FORCE ROW LEVEL SECURITY` را برگرداند؛ وگرنه `UPDATE` بدون هیچ خطایی صفر ردیف را می‌گیرد.

### ۶.۳ الگوی RLS
- policy: `tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid` (برای using و with check). بدون ست‌شدن tenant هیچ ردیفی دیده نمی‌شود.
- helper: `withTenant(tenantId, fn)` در یک تراکنش با `set_config(..., true)`؛ `pool` export نمی‌شود.
- `withUser(userId, fn)` + policy کاربرمحور (`app.current_user`) برای فهرست membershipهای خود کاربر در همه tenantها.
- **تست عمومی RLS:** همه جدول‌های دارای `tenant_id` از catalog پیدا می‌شوند و `relrowsecurity` و `relforcerowsecurity` باید فعال باشند (جدول جدید بدون RLS = شکست CI).
- تست‌ها حتماً با نقش `noroset_app` اجرا می‌شوند (در setup: `current_user` و `rolbypassrls=false` بررسی می‌شود).

### ۶.۴ جدول‌های موجود
- سطح پلتفرم (بدون RLS tenant): `platform_users`، `tenants`، `reserved_slugs` (جدول + تریگر، `noroset_app` فقط SELECT)، `otp_codes`، `sessions`.
- tenant-scoped: `tenant_memberships` (`UNIQUE(tenant_id,user_id)`، `UNIQUE(id,tenant_id)`)؛ `noroform_forms`، `noroform_form_versions`، `noroform_submissions` (بخش ۸.۱)؛ `norolink_pages`، `norolink_elements`، `norolink_page_stats` (بخش ۹.۷)؛ `norofile_files`، `norofile_file_usages` (بخش ۹.۹).
- سازنده: `noroform_forms.created_by` و `norolink_pages.created_by` (migration `0012_creator`؛ FK به `platform_users` با `ON DELETE SET NULL`؛ ردیف‌های قدیمی‌تر null) و `norofile_files.uploaded_by` برای فیلتر «مالک» فهرست‌ها؛ نام سازنده از `platform_users.full_name` (لایه‌ی core) خوانده می‌شود. همان migration `templates` را به `reserved_slugs` افزود (مسیر `/link/templates`).
- همچنین tenant-scoped: `norolink_slug_redirects` (نشانی‌های قبلی صفحه، §۹.۱).
- کنترل مدیریتی صفحه (migration `0026_page_moderation`، §۹.۱۳): ستون‌های `norolink_pages.moderation_*` و `moderated_at` با trigger `guard_norolink_page_moderation`؛ policy ادمین فقط برای صفحه‌های دارای snapshot؛ جدول سطح پلتفرم `norolink_page_reports` (گزارش تخلف؛ `tenant_id` برای پیگیری، RLS + FORCE).
- سطح پلتفرم با RLS ادمین و دارنده‌ی توکن (migration `0023_claim_links`): `norolink_claim_links` (لینک‌های واگذاری صفحه به مشتری و قیف هر کدام، §۹.۸).
- سطح کاربر (RLS روی `app.current_user`، بدون tenant): `norofile_user_files` (فضای شخصی، بخش ۹.۹).
- سطح پلتفرم با RLS ادمین، خواندن عمومی محدود (migration `0016_norolink_templates`): `norolink_templates`، `norolink_removed_templates` (§۹.۸)، `norofile_platform_files` (§۹.۹).
- سطح پلتفرم با RLS ادمین (بدون tenant): `admin_audit_log`، `support_access_grants`، `platform_modules`، `billing_plans`، `billing_settings`، `billing_coupons`، `panel_announcements` (بخش ۹.۱۱)؛ سطح کاربر: `panel_announcement_dismissals`.
- سطح پلتفرم با RLS ادمین و خواندن عمومی محدود (migration `0022_blog`): `blog_posts`، `blog_categories`، `blog_tags`، `blog_post_tags`، `blog_slug_redirects`، `blog_comments` (بخش ۹.۱۲).
- billing tenant-scoped (RLS tenant + ادمین): `billing_subscriptions`، `billing_payments` (بخش ۹.۱۱).
- enumها: `user_status` (active/disabled/blocked)، `platform_role` (user/superadmin)، `tenant_status` (active/suspended)، `membership_role` (owner/admin/member)، `membership_status` (active/invited/suspended).
- `platform_users`: `mobile`/`email` یکتا و nullable، CHECK حداقل یکی؛ `full_name NOT NULL DEFAULT ''`؛ `password_hash` nullable (migration `0003_user_password`؛ null = فقط OTP)؛ `avatar_file_id` nullable (migration `0006_user_profile`؛ uuid ساده بدون FK به فایل شخصی norofile، §۹.۹)؛ `platform_role` و `status_reason` (migration `0007_platform_admin`، §۹.۱۱)؛ `signup_utm` jsonb (first-touch UTM؛ migration `0011_campaigns`).
- `tenants.slug`: `^[a-z0-9]+(-[a-z0-9]+)*$`، طول ۲ تا ۶۴، lowercase، با لیست رزرو (new, app, api, form, link, f, l, admin, dashboard, login, signup, settings, static, health و مشابه).
- تابع `cleanup_expired_auth()` برای پاک‌سازی (زمان‌بندی هنوز مشخص نیست).

---

## ۷. احراز هویت و چند مستاجری (پیاده‌شده)

- **کاربر مستقل از tenant** است و با `tenant_memberships` می‌تواند عضو چند tenant باشد.
- **ورود:** موبایل + OTP (ایمیل بعداً). کد ۶ رقمی، انقضا ۲ دقیقه، حداکثر ۵ تلاش، یک‌بار مصرف، فقط HMAC-SHA256 ذخیره می‌شود، مقایسه timing-safe، کد جدید قبلی‌ها را باطل می‌کند.
- موبایل ایران به E.164 نرمال می‌شود (09…، +98، 0098، ارقام فارسی/عربی).
- `SmsProvider` interface؛ توسعه: `ConsoleSmsProvider` (فقط در غیر production لاگ می‌کند)؛ production: `MelipayamakSmsProvider` (پترن تأییدشده از مسیر `send/shared` کنسول؛ مسیر `send/otp` به‌کار نمی‌رود چون کد را خود سیستم می‌سازد و فقط هش آن را نگه می‌دارد). انتخاب با `smsProviderFromEnv`؛ در production ارائه‌دهنده‌ی console یا ملی‌پیامک بدون تنظیمات = برنامه بالا نمی‌آید. تأیید قالب ممکن است روزها طول بکشد.
- **Session:** access JWT ۱۵ دقیقه + refresh تصادفی ۳۲ بایت (فقط hash در DB، ۳۰ روز، rotation؛ reuse کل زنجیره را باطل می‌کند). cookie: httpOnly، SameSite=Lax، Secure در production. logout و logout-all.
- **رمز عبور (اختیاری، پیاده‌شده):** OTP همیشه فعال می‌ماند؛ کاربر پس از ورود می‌تواند رمز تعیین کند. هش با scrypt کتابخانه‌ی استاندارد Node (`node:crypto`، N=2^17، r=8، p=1، salt ۱۶ بایت) در قالب `scrypt$N$r$p$salt$hash` تا پارامترها بعداً قابل افزایش باشند (`packages/core/src/password.ts`). طول ۸ تا ۱۲۸ کاراکتر. ورود ناموفق برای «کاربر ناموجود/بدون رمز/غیرفعال/رمز اشتباه» یک خطای یکسان (`401 invalid credentials`) با زمان مشابه (هش ساختگی) دارد. تغییر رمز (رمز فعلی لازم اگر رمز دارد) بقیه‌ی نشست‌ها را باطل می‌کند و نشست جاری می‌ماند؛ فراموشی رمز با OTP، رمز جدید و ابطال همه‌ی نشست‌ها. `GET /me` فقط `hasPassword` برمی‌گرداند، هرگز هش.
- **Endpointها:** `POST /auth/otp/request`، `/auth/otp/verify`، `/auth/password/login` (`{mobile, password}`)، `/auth/password` (نیازمند نشست؛ `{newPassword, currentPassword?}`)، `/auth/password/reset` (`{mobile, code, newPassword}`)، `/auth/refresh`، `/auth/logout`، `/auth/logout-all`، `GET /me`، `PATCH /me` (`{fullName}`، ۱ تا ۲۰۰ کاراکتر پس از trim)، `PUT /me/avatar` (بدنه‌ی خام تصویر)، `DELETE /me/avatar`، `POST /tenants` (tenant می‌سازد و کاربر owner می‌شود)، `POST /tenants/default` (اگر کاربر عضو هیچ tenant نیست یکی با نشانی تصادفی می‌سازد؛ تکرارپذیر).
- **پروفایل (پیاده‌شده):** نام و آواتار؛ موبایل فقط نمایش (تغییر موبایل/ایمیل با OTP بعداً). `GET /me` شامل `avatarUrl` (آدرس عمومی norofile یا null). آواتار از Port `FILE_SERVICE` در **فضای شخصی** norofile ذخیره می‌شود (§۹.۹)؛ تعویض ← فایل جدید و حذف فایل قبلی؛ حذف ← null و حذف فایل. پنل: `(panel)/account` — کارت‌های فقط‌خواندنی (سطرهای عنوان/مقدار) با دکمه‌ی «ویرایش» که دیالوگ ویرایش (وسط صفحه) باز می‌کند: «مشخصات» (نام؛ تصویر پروفایل جدا از سطرها و با کلیک مستقیم کارت آپلود با کراپ دایره‌ای را باز می‌کند) و «ورود و امنیت» (رمز عبور).
- پاسخ درخواست OTP نباید فاش کند موبایل ثبت‌نام شده یا نه.
- **وضعیت کاربر:** فقط `active` وارد می‌شود. `disabled` (تعلیق موقت/درخواست کاربر) و `blocked` (تخلف) را مدیر پلتفرم با دلیل اجباری می‌گذارد (§۹.۱۱)؛ هر دو همه‌ی نشست‌ها را باطل می‌کنند. `AuthGuard` و `refresh` کاربر غیرفعال را ۴۰۱ و ورود با OTP (پس از تأیید کد، یعنی مالکیت موبایل ثابت شده) را ۴۰۳ `account_disabled`/`account_blocked` می‌دهد؛ ورود با رمز برای حساب غیرفعال همان `invalid credentials` می‌ماند تا وجود حساب فاش نشود. صفحه/فرم عمومی tenantهای چنین کاربری بالا می‌ماند (تعلیق tenant جداست).
- **Rate limit:** OTP: ۳ بار/۱۰ دقیقه به‌ازای موبایل (شمارش از `otp_codes` تا با ری‌استارت صفر نشود) و ۱۰ بار/ساعت به‌ازای IP؛ تأیید: محدودیت به‌ازای IP؛ ورود با رمز: ۵ بار/۱۵ دقیقه به‌ازای موبایل و ۲۰ بار/۱۵ دقیقه به‌ازای IP؛ تغییر رمز: ۵ بار/۱۵ دقیقه به‌ازای کاربر. (بقیه درون‌حافظه؛ برای یک instance لانچ پذیرفته شد.)
- **Guardها:** `AuthGuard`، `TenantGuard` (tenant از هدر `X-Tenant-Id`/slug؛ عضویت فعال الزامی وگرنه ۴۰۳)، `RolesGuard` با `@Roles(...)`. context با `nestjs-cls` (userId، tenantId، role). سرویس/interceptor برای اجرای کار محصول داخل `withTenant` با tenant همان درخواست.
- **اتصال محصولات (پیاده‌شده):** هر سه گارد سراسری‌اند (`APP_GUARD` به ترتیب auth ← tenant ← role). `TenantGuard` فقط روی routeهای دارای `@TenantScoped()` یا `@Roles(...)` اجرا می‌شود. قرارداد در `@noroset/core` (بدون وابستگی به Nest): کلیدهای `TENANT_SCOPED_KEY`/`ROLES_KEY`، توکن DI `TENANT_CONTEXT` و interface `TenantContext` (`tenantId/userId/role/run`). apps/api پیاده‌سازی را فراهم می‌کند (`TenantContextService`)؛ ماژول Nest هر محصول در `products/<p>/api` است و apps/api فقط آن را import می‌کند. محصولات مثل core/db/field-engine به `dist` بیلد می‌شوند.
- امنیت: helmet، CORS محدود به origin وب، اعتبارسنجی ورودی، عدم لاگ OTP/توکن.
- **سخت‌سازی (پیاده‌شده):** secretهای جدا (`JWT_SECRET` برای access token، `OTP_PEPPER` برای HMAC کد OTP، `IP_HASH_SECRET` برای هش IP پاسخ‌های فرم عمومی)؛ در production مقدار پیش‌فرض، تنظیم‌نشده یا کوتاه‌تر از ۳۲ کاراکتر = برنامه بالا نمی‌آید (`apps/api/src/config/secrets.ts`).

---

## ۸. noroform — طراحی (تصمیم‌های قطعی)

### ۸.۱ مدل داده
| جدول | نقش |
|---|---|
| `noroform_forms` | هویت فرم: عنوان، slug عمومی، وضعیت (`draft/published/closed`)، اشاره به نسخه منتشرشده جاری، `draft_definition` (قابل ویرایش) |
| `noroform_form_versions` | `definition jsonb`، شماره نسخه، **immutable** (بدون UPDATE/trigger). هر «انتشار» یک ردیف جدید می‌سازد |
| `noroform_submissions` | `version_id`، `answers jsonb` با کلید `field_id`، `idempotency_key` یکتا، زمان، IP هش‌شده |

- همه با `tenant_id`، RLS، FORCE، FK مرکب `(id, tenant_id)`.
- `answers` تخت است: `{ "f_8k2m": "علی", "f_3xq1": ["a","b"] }`؛ مقدار با `serialize` همان نوع فیلد ذخیره می‌شود. صفحه در پاسخ نمی‌آید (جابه‌جایی فیلد بین صفحات پاسخ‌های قدیمی را خراب نکند).
- `field_id` پایدار و تولیدشده (مثل `f_xxxxxxxx`) و با تغییر عنوان عوض نمی‌شود؛ پایه‌ی سازگاری آینده با norodata.
- ذخیره‌ی پاسخ در جدول خود noroform است (بدهی آگاهانه). هدف بلندمدت: انتقال به Data Engine نورودیتا (بخش ۱۲).

**پیاده‌سازی DB (`packages/db/src/noroform.schema.ts`، migration `0002_noroform`):**
- `noroform_forms.slug` در کل پلتفرم یکتا، الگوی slug مثل tenants، با trigger لیست رزرو (`check_reserved_slug`).
- CHECK: `status = 'draft' OR current_version_id IS NOT NULL`؛ ستون‌های jsonb باید object باشند.
- FK مرکب: نسخه ← `(form_id, tenant_id)`؛ `current_version_id` ← `(id, form_id, tenant_id)` نسخه (یعنی نسخه‌ی همان فرم)؛ پاسخ ← فرم و ← `(version_id, form_id, tenant_id)` نسخه. حذف فرم نسخه‌ها و پاسخ‌ها را cascade می‌کند.
- نسخه‌ها immutable: `noroset_app` فقط SELECT/INSERT دارد، policy برای UPDATE نیست (حتی owner با FORCE RLS)، و trigger هر UPDATE را رد می‌کند (حتی برای نقش‌های دورزننده‌ی RLS).
- پاسخ‌ها: `noroset_app` فقط SELECT/INSERT؛ `UNIQUE(form_id, idempotency_key)`؛ `ip_hash` (نه IP).
- **مسیر فرم عمومی:** policy جدای `noroform_forms_public_select` فقط وقتی `app.public_form_slug` در تراکنش ست شده، همان یک فرم published/closed را نشان می‌دهد (فقط SELECT). توابع `findPublicForm(slug)` و `insertPublicSubmission(...)` در `@noroset/db` (`noroform-public.ts`): tenant را از همان ردیف پیدا و `app.current_tenant` را ست می‌کنند، هرگز `draft_definition` را نمی‌خوانند، فقط نسخه‌ی جاری را برمی‌گردانند و فقط INSERT پاسخ دارند. فرم tenant معلق پیدا نمی‌شود؛ فرم closed برای نمایش پیام بسته برمی‌گردد ولی پاسخ نمی‌پذیرد. اعتبارسنجی answers (field-engine) در API پیش از insert انجام می‌شود (مرحله ۸).
- نشانی اشتراک فرم در هر دو دامنه‌ی `noroset.com/f/{slug}` و `n8l.ir/f/{slug}` از همان slug تصادفی ۱۰ نویسه‌ای استفاده می‌کند؛ UUID داخلی فرم افشا نمی‌شود. `POST /noroform/forms/:id/publish` پیش‌نویس را کامل اعتبارسنجی و نسخه‌ی immutable جدید می‌سازد؛ تغییرات بعدی تا انتشار دوباره عمومی نیستند. اجرای عمومی نسخه‌ی بارگذاری‌شده را در تمام صفحه‌ها نگه می‌دارد، شرط‌ها و فیلدهای قابل‌نمایش را اعمال می‌کند و `POST /noroform/public/forms/:slug/submissions` پاسخ را با همان `versionId` می‌فرستد؛ سرور دوباره پاسخ‌ها و شرط‌ها را اعتبارسنجی می‌کند. بسته‌بودن فرم پیام `closed_message` را نشان می‌دهد و پاسخ نمی‌پذیرد.

**نوع فرم و دسترسی پاسخ (پیاده‌شده):** `noroform_forms.channel` (`internal|external`) محل اجرا را تعیین می‌کند؛ فرم داخلی فقط با `app.internal_form_id` و عضویت فعال همان workspace خوانده می‌شود و فرم خارجی فقط از مسیر عمومی slug. `response_access` پیش‌فرض `external` است و `response_auth` (`link|key|otp`) تا انتخاب مالک `NULL` می‌ماند؛ تا آن زمان ساخت لینک پاسخ با `409 response_auth_required` رد می‌شود. هر لینک `auth_mode` خودش را snapshot می‌کند و `access_count`/`key_hash` دارد. بازگردانی مهاجرت: فرم‌های منتشرشده/بسته‌شده external و پیش‌نویس‌ها internal. تغییر channel بعد از اولین انتشار `409 channel_locked` است. مسیر داخلی `GET/POST /noroform/internal/forms/:id` با نشست و بررسی عضویت فعال است و پاسخ داخلی `submitted_by` را ثبت می‌کند.

**ورود به پاسخ خارجی (پیاده‌شده):** لینک پاسخ `authMode` خودش را دارد. `link` مستقیم، `key` با کلید scrypt-hash و `otp` با کد ۶ رقمی/۲ دقیقه در جدول مستقل `noroform_response_otp_codes` (فقط hash کد، موبایل برای ممیزی). پس از تأیید، کوکی httpOnly `nf_response_session` با HMAC `RESPONSE_SESSION_SECRET` و عمر ۳۰ دقیقه صادر می‌شود. مسیرهای عمومی: `POST /noroform/public/responses/:token/unlock`، `/otp/request` و `/otp/verify`. ساخت لینک فقط برای فرم `response_access='external'` و با روش احراز انتخاب‌شده مجاز است. فرم داخلی `(panel)/f/[id]` و فرم خارجی `n8f.ir/{slug}` هستند؛ `n8l.ir/f` حذف شد.

### ۸.۲ فرم عمومی
- مخاطب ناشناس است؛ tenant از slug فرم پیدا می‌شود و با `withTenant` اجرا می‌شود. **مسیر ویژه، کوچک و جدا با تست دقیق:** فقط فرم‌های `published`، فقط خواندن نسخه منتشرشده (هرگز draft) و فقط INSERT پاسخ.
- ضد اسپم: rate limit به‌ازای IP، فیلد honeypot، idempotency key. کپچا فقط در صورت دیده‌شدن اسپم.
- پیام تشکر/ریدایرکت پس از ثبت (ریدایرکت فقط https با تأخیر قابل‌تنظیم).
- فرم بسته: `settings.closed_message`.
- slugها در کل پلتفرم نباید با مسیرهای رزروشده تداخل کنند.

### ۸.۳ ساختار تعریف فرم (`definition jsonb`)

```
definition
├── version_schema
├── theme                    قالب فرم: preset، رنگ‌ها، پس‌زمینه، دکمه، گوشه، اندازه و فونت (فقط سطح فرم)
├── layout                   header_sticky، bottom_bar_fixed، sidebar_collapsible
├── defaults
│    ├── header.elements[]   پیش‌فرض همه صفحات
│    ├── topBar.elements[]   نوار ابزار داخل هدر
│    ├── sidebar.elements[]  کنارصفحه (دسکتاپ collapse/expand؛ موبایل overlay)
│    ├── bottomBar.elements[] نوار پایین
│    └── footer.elements[]
├── pages[]  (حداکثر ۲۰)
│    ├── page_id, kind: welcome | main | ending
│    ├── header   { mode: inherit | custom | hidden, elements[]? }
│    ├── topBar   { mode: inherit | custom | hidden, elements[]? }
│    ├── body     { items[] }
│    ├── sidebar  { mode: inherit | custom | hidden, elements[]? }
│    ├── bottomBar { mode: inherit | custom | hidden, elements[]? }
│    └── footer   { mode: inherit | custom | hidden, elements[]? }
├── settings                 closed_message، سقف‌ها
└── ending.redirect          { url(https), delay_seconds } (تنظیم صفحه ending)
```

- **فرم** صفحات دارد؛ **سه نوع صفحه:** خوش‌آمد (welcome)، اصلی (main)، پایان (ending)؛ هر صفحه شش ناحیه: هدر، نوار بالا، بدنه، کنار، نوار پایین، فوتر.
- ساختار بخش‌بندی (sections) نداریم؛ جای آن **صفحات** است. UI فرم عمومی چندصفحه‌ای با دکمه‌های قبلی/بعدی.
- **خانواده‌های المان:**

| خانواده | کجا | نمونه‌ها | مقدار پاسخ؟ |
|---|---|---|---|
| **field** | بدنه‌ی `main` | short_text، long_text، number، email، phone، single_choice، multi_choice، date، rating | بله |
| **content** | بدنه‌ی همه‌ی صفحات (در welcome/ending فقط content) | text (متن غنی محدود)، image (URL بیرونی https)، video (embed) | خیر |
| **chrome** | هدر/فوتر | logo_title، page_number، progress_timeline، nav_buttons، form_name، elapsed_timer؛ فقط فوتر: license_badge | خیر |

- هر المان `item_id` پایدار دارد؛ فقط field در `answers` می‌آید.
- chrome «زنده» است (از وضعیت اجرا محاسبه می‌شود) و `allowedAreas` و `allowedPageKinds` دارد؛ schema چیدن غیرمجاز را رد می‌کند (مثلاً تایمر فقط در `main`). chrome شرطی نیست.
- تایمر: فقط نمایش زمان سپری‌شده (بدون محدودیت زمانی).
- ناوبری: متن دکمه‌ها قابل تنظیم، رفتار ثابت از اجرا. اگر هیچ `nav_buttons` نبود، نوار ناوبری پیش‌فرض اضافه می‌شود. در رندر عمومی، نوار ناوبری فوتر از بقیهٔ فوتر جدا می‌شود: در موبایل به پایین صفحه چسبیده است (`fixed`، با احتساب `safe-area-inset-bottom` و فضای خالی هم‌ارز زیر محتوا) و در دسکتاپ کارت پایانی محتوا؛ دکمهٔ اصلی (بعدی/ارسال) پهن و دکمهٔ قبلی کوچک است. دکمهٔ تکراری داخل بدنه حذف شده و تنها همین یک نوار، ناوبری را انجام می‌دهد.
- **branding (license_badge):** در رندر عمومی پلن رایگان **اجباری** است، حتی اگر در تعریف نباشد (اجبار در رندر، نه ذخیره‌سازی). صفحه نمی‌تواند آن را با `hidden` دور بزند. این نشان در فوتر به‌صورت لینک نشان داده نمی‌شود؛ به‌جای آن واترمارک کم‌رنگ **Powered by Noroset** (متن `LICENSE_BADGE`، `dir=ltr`، پیوند به `https://noroset.com/form`) در پایان خروجی فرم می‌آید و زیر آن تا نوار ناوبری موبایل فاصله می‌ماند.
- theme فقط سطح فرم.
- قالب فرم (`formThemeSchema`): ۱۲ preset، پس‌زمینه‌ی یک‌رنگ/گرادیان/چندرنگ محو، رنگ اصلی، سبک دکمه (پر/خطی/ملایم/رنگی ملایم/شیشه‌ای/سایه‌دار)، گوشه، اندازه‌ی متن و فونت. همه‌ی ویژگی‌ها در خود `definition.theme` ذخیره می‌شوند؛ مقدارهای پیش‌فرض باعث می‌شوند تعریف‌های قدیمی با سه مقدار رنگ/پس‌زمینه/فونت همچنان معتبر بمانند. پنل قالب و پیش‌نمایش ادیتور از همین قرارداد استفاده می‌کنند.
- متن غنی: **JSON ساختاریافته** (تصمیم قطعی؛ markdown نه) — پاراگراف، تیتر ۱ تا ۳، پررنگ، کج، لینک https، فهرست؛ **هرگز HTML خام**.
- **راهنمای پرسش (`description` فیلد)** متن ساده یا همین متن غنی است (تصمیم مالک محصول ۱۴۰۵/۸/۲۱): هر دو پذیرفته و همان‌طور ذخیره می‌شوند، پس فرم‌ها، نسخه‌ها و قالب‌های قبلی (رشته) معتبر می‌مانند و migration لازم نیست. ادیتور برای راهنما تیتر نمی‌سازد. متن ساده‌ی هر دو با `richTextPlain` (برای CSV و خلاصه‌ها). schema متن غنی در `packages/field-engine/src/rich-text.ts` است تا `schema.ts` و المان «متن» بدون import چرخه‌ای از آن استفاده کنند. عنوان پرسش (`label`) متن ساده می‌ماند.
- ویدیو: فقط آپارات، یوتیوب، ویمیو؛ ورودی لینک، ذخیره `{provider, video_id}` (snake_case مثل بقیه‌ی کلیدهای definition)، `buildEmbedUrl` از قالب ثابت؛ هرگز iframe/HTML کاربر. CSP صفحه عمومی فقط دامنه‌های فهرست سفید را برای frame اجازه دهد.
- همه URLها فقط `https` (بدون `javascript:`).
- نوار پیشرفت («صفحه ۲ از ۴») بر اساس صفحات `main` نمایش‌داده‌شده (غیرپرش‌شده).

### ۸.۴ منطق شرطی (نسخه ساده)
- یک شرط، عملگرهای `eq, neq, gt, lt, contains, is_empty`.
- می‌تواند **آیتم** یا **کل صفحه main** را مخفی/رد کند.
- شرط فقط به فیلدهای صفحات قبلی یا همان صفحه (قبل از آیتم) اشاره کند؛ چرخه و اشاره به آینده رد.
- فیلد پنهان‌شده: در پاسخ ذخیره و validate نمی‌شود (سرور شرط‌ها را دوباره ارزیابی می‌کند).
- routing پیشرفته و محاسبات: بعد از لانچ.

### ۸.۵ قواعد `validateDefinition` (سرور اعمال می‌کند)
1. حداقل یک صفحه main؛ حداکثر ۲۰ صفحه؛ welcome حداکثر یکی و اول؛ ending حداکثر یکی و آخر.
2. یکتایی `page_id`/`item_id`/`field_id` در کل تعریف.
3. در welcome و ending فقط content.
4. chrome فقط در ناحیه/نوع صفحه‌ی مجاز؛ سقف ۸ المان در هر ناحیه.
5. شرط‌ها طبق ۸.۴.
6. URLها https؛ ویدیو فقط ارائه‌دهندگان مجاز؛ HTML خام رد/پاک‌سازی.
7. سقف اندازه‌ی سریال‌شده ۵۰۰ کیلوبایت و سقف تعداد آیتم.
8. مقدارهای گزینه‌ها یکتا.

### ۸.۶ قرارداد field-engine
- هسته‌ی بدون React، هم در api (اعتبارسنجی سرور) هم در web؛ **سرور همیشه دوباره validate می‌کند**.
- قرارداد پایه هر المان: `type`، `settingsSchema` (zod)، `defaultSettings`.
- field: `validate(value, settings)`، `serialize/deserialize`، `format(value)`؛ کامپوننت‌های `Edit/View` در بخش React (بعداً).
- content: بدون validate؛ chrome: `allowedAreas` (شامل `header`، `topBar`، `sidebar`، `bottomBar`، `footer`)، `allowedPageKinds`، `View(runtimeState)`.
- سه رجیستری جدا؛ افزودن نوع جدید = یک ماژول + ثبت.
- توابع خالص و قطعی (بدون `Date.now`/random؛ زمان و تولید id تزریق می‌شود): `resolveHeader`، `resolveTopBar`، `resolveSidebar`، `resolveBottomBar`، `resolveFooter`، `ensureNavigation`، `applyBranding(resolvedFooter, {forceLicense})`، `evaluateConditions`، `computeVisiblePages`، `validateDefinition`، `validateSubmission` (شرط‌ها را خودش ارزیابی می‌کند، فیلدهای مخفی را حذف می‌کند، کلید ناشناس را رد می‌کند، serialize می‌کند، خروجی `answers` تخت).
- date: مقدار ذخیره‌شده میلادی ISO؛ تبدیل شمسی فقط در format/UI. phone: موبایل ایران با منطق نرمال‌سازی مشابه core بدون وابستگی به آن. فقط zod به‌عنوان وابستگی runtime.

**جزئیات پیاده‌سازی (`packages/field-engine`):**
- شناسه‌ها: `p_` / `i_` / `f_` + ۸ کاراکتر `[a-z0-9]`؛ `generateId(kind, randomInt)` با منبع تصادفی تزریقی.
- المان‌ها discriminator `kind` دارند (`field` / `content` / `chrome`)؛ field علاوه بر `item_id` دارای `field_id`، `label`، `description`، `required` است.
- شرط: `{ effect: 'show' | 'hide', field_id, op, value? }`؛ `validateDefinition` مقدار شرط را با همان نوع فیلد نرمال می‌کند (مثلاً موبایل ← E.164) تا با پاسخ serializeشده مقایسه شود.
- chrome به‌جای `View` در هسته یک `view(settings, runtimeState)` خالص دارد که مدل نمایش برمی‌گرداند؛ کامپوننت React بعداً همان را رندر می‌کند.
- پیش‌فرض‌های هدر/فوتر سطح فرم فقط از نظر ناحیه بررسی می‌شوند و در رندر، chrome نامجاز برای نوع صفحه کنار می‌رود.
- `validateDefinition` تعریف نرمال‌شده (پیش‌فرض‌ها + settings parseشده) برمی‌گرداند؛ کلید ناشناس در هر سطح رد می‌شود (strict).
- خطاها کد ماشینی دارند (مثل `required`، `forward_reference`) و متن فارسی در UI ترجمه می‌شود.
- **نوع مقدار جدا از فیلد فرم** (`src/values`، ۱۴۰۵/۸/۲۱): هر نوع مقدار (`ValueType`: متن، عدد، ایمیل، موبایل، تاریخ، انتخابی، امتیاز) قیدهای داده (`constraintsShape`/`constraintsSchema`؛ مثل `min`، `max`، `integer`، `options`) و `validate`/`serialize`/`deserialize`/`format` را دارد و از فرم چیزی نمی‌داند؛ این پوشه فقط به خودش و zod وابسته است (قانون dependency-cruiser `field-engine-values-must-be-self-contained`) تا بعداً بدون تغییر به پکیج مشترک برای norodata (§۱۲) برود. فیلد فرم با `defineField(value, {display, conditionOps})` ساخته می‌شود = نوع مقدار + تنظیمات نمایشی (`placeholder`، `display`) + رفتار شرطی. **قالب ذخیره‌شده عوض نشده:** `settings` همچنان تخت است، ولی هر کلید فقط قید داده یا فقط نمایشی است (`FieldType.value`، `FieldType.displayKeys`، `pickConstraints`؛ تست `values.test.ts`). نوع فیلد جدید = یک نوع مقدار در `values` + یک `defineField` + ثبت در رجیستری.
- dist مثل core/db بیلد می‌شود (`build:packages`).
- `formPreview(definition)` خلاصه‌ی سبک تصویر بندانگشتی (رنگ‌های تم و حداکثر ۴ آیتم اول صفحه‌های main: برچسب، نوع، چند گزینه، بیشینه‌ی امتیاز) از پیش‌نویس ناقص هم بدون خطا؛ مشترک بین API فهرست فرم‌ها و گالری قالب‌های وب.

### ۸.۶.۱ API فرم‌ها (پیاده‌شده، `products/noroform/api`)
همه tenant-scoped (هدر `X-Tenant-Id`):

| route | نقش | توضیح |
|---|---|---|
| `GET /noroform/forms` | هر عضو | فهرست با `createdBy`/`createdByName` و `preview` (`formPreview` روی پیش‌نویس؛ خود پیش‌نویس برنمی‌گردد) |
| `POST /noroform/forms` | هر عضو | `{title, slug?, draftDefinition?}`؛ بدون slug یک slug تصادفی ۱۰ کاراکتری؛ پیش‌نویس اولیه یک صفحه‌ی main خالی یا `draftDefinition` (قالب؛ مثل PATCH فقط object و ≤ ۵۰۰KB)؛ `created_by` = کاربر درخواست |
| `GET /noroform/forms/:id` | هر عضو | جزئیات + `issues` پیش‌نویس |
| `PATCH /noroform/forms/:id` | هر عضو | `{title?, slug?, draftDefinition?}`؛ پیش‌نویس ناقص ذخیره می‌شود (فقط object و ≤ ۵۰۰KB) و `issues` برمی‌گردد |
| `POST /noroform/forms/:id/publish` | owner/admin | `validateDefinition` کامل ← ۴۲۲ با `issues`، یا نسخه‌ی immutable جدید (تعریف نرمال‌شده) و status=published |
| `POST /noroform/forms/:id/close` · `/reopen` | owner/admin | published ↔ closed (بدون نسخه‌ی جدید)؛ وضعیت نادرست ← ۴۰۹ |
| `DELETE /noroform/forms/:id` | owner/admin | ۲۰۴؛ نسخه‌ها و پاسخ‌ها cascade |

- فرم tenant دیگر ← ۴۰۴ (RLS). slug تکراری/رزرو ← ۴۰۹. شماره‌ی نسخه با قفل ردیف فرم (`FOR UPDATE`) در انتشار هم‌زمان یکتا می‌ماند.

### ۸.۶.۲ API عمومی (پیاده‌شده، `products/noroform/api/public`)
بدون نشست و بدون هدر tenant (`@Public()`)؛ tenant از slug فرم پیدا می‌شود:

| route | توضیح |
|---|---|
| `GET /noroform/public/forms/:slug` | published ← `{status, slug, title, versionId, definition, branding: {forceLicense}}` (تعریف نرمال‌شده‌ی نسخه‌ی جاری، هرگز پیش‌نویس)؛ closed ← فقط `{status, slug, title, closedMessage}`؛ draft/ناموجود ← ۴۰۴ |
| `POST /noroform/public/forms/:slug/submissions` | `{versionId, answers, idempotencyKey, website?}` ← ۲۰۱ `{ok: true}` |

- ترتیب ثبت: rate limit ← honeypot ← خواندن همان نسخه‌ای که پاسخ‌دهنده بارگذاری کرده (حتی اگر فرم در این فاصله دوباره منتشر شده باشد؛ فقط نسخه‌های همان فرم) ← `validateSubmission` روی همان نسخه (۴۲۲ با `errors`) ← `insertPublicSubmission`.
- **ضد اسپم:** rate limit به‌ازای IP (خواندن ۱۲۰/دقیقه، ثبت ۱۰ در ۱۰ دقیقه)؛ honeypot `website` (پرشده ← همان `{ok: true}` بدون ذخیره)؛ `idempotencyKey` (`[A-Za-z0-9_-]{8,64}`، تکرار ← همان پاسخ قبلی، `{ok: true}`). کپچا نه.
- فرم بسته یا نسخه‌ی فرم دیگر ← ۴۰۹؛ IP فقط به‌صورت HMAC (`IP_HASH_SECRET`) ذخیره می‌شود.
- `branding.forceLicense` از پلن tenant است (`!branding.remove`؛ §۹.۱۱).
- پورت‌های جدید در `@noroset/core`: `PUBLIC_ROUTE_KEY`، `RATE_LIMITER` (`consume`)، `IP_HASHER` (`hash`)؛ پیاده‌سازی در apps/api.
- rate limit بر اساس `req.ip` است؛ پشت reverse proxy بدون تنظیم trustProxy همه‌ی کاربران یک IP دارند (tech-debt مورد ۲).

### ۸.۷ مشاهده‌ی پاسخ‌ها
جدول ساده با صفحه‌بندی (در موبایل: فهرست کارتی کم‌ارتفاع به‌جای جدول افقی)، نمایش پاسخ تکی، فیلتر بازه‌ی تاریخ، export CSV با UTF-8 BOM (Excel فارسی)، خروجی XLSX راست‌چین و استایل‌دار و خروجی PDF از طریق چاپ مرورگر (همان داده و همان ستون‌های جدول نمایشی). جدول/فهرست پاسخ‌ها حتی بدون رکورد تا پایین صفحه کشیده می‌شود و اسکرول داخل همان ناحیه انجام می‌شود؛ اسکرول‌بار فقط با هاور دیده می‌شود تا صفحه‌ی بیرونی اسکرول بی‌مورد نگیرد. دکمه‌ی بازگشت سرصفحه به صفحه‌ی اصلی نوروفرم (`/form`) می‌رود، همراه عنوان در یک سطر می‌نشیند تا ارتفاع سرصفحه کم‌تر شود و شفاف است (variant `ghost`، بدون زمینه و حاشیه؛ فقط آیکن بازگشت و نام «نوروفرم» با هاور ملایم). کارت‌های خلاصه‌ی نمای فعال (فیلدهای سنجاق‌شده و شاخص‌های مالی) در سرصفحه پیش از جدول قرار می‌گیرند؛ در دسکتاپ دو کارت کنار بازگشت و عنوان و کارت‌های بیشتر در ردیف بعد هستند و در موبایل حداکثر دو کارت در هر ردیف می‌آیند. چک‌باکس تک‌انتخابی جدول، پاسخ مبنای کارت‌ها را عوض می‌کند و همین چک‌باکس در فهرست کارتی موبایل هم در ابتدای هر کارت (با ناحیه‌ی لمس پهن‌تر و حالت انتخاب‌شده‌ی پس‌زمینه‌دار) تکرار شده است؛ کلیک خود ردیف/کارت همچنان دراور را باز می‌کند و چک‌باکس فقط انتخاب مبنای کارت‌های خلاصه را عوض می‌کند. دراور نیز کارت‌های خلاصه را زیر عنوان خود نشان می‌دهد و فیلدهای سنجاق‌شده در بدنه هم باقی می‌مانند. مقدار کارت‌ها در نبود انتخاب از نخستین پاسخ باز صفحه گرفته می‌شود. راه‌های تماس پاسخ انتخاب‌شده در فوتر صفحه و فوتر دراور به‌صورت لینک متنی (ایمیل، تماس و پیامک) نمایش می‌یابند، نه در کارت‌های سرصفحه. چاپ دراور کنترل‌های شخصی‌سازی و ناوبری را پنهان می‌کند و اطلاعات پاسخ را نگه می‌دارد. اطلاع‌رسانی ثبت پاسخ: بعد از لانچ.

**پیاده‌سازی (`products/noroform/api/submissions`)** — tenant-scoped، هر عضو فعال (فقط خواندن):

| route | توضیح |
|---|---|
| `GET /noroform/forms/:formId/submissions?from&to&limit&offset` | `{columns, items, total, limit, offset}`؛ جدیدترین اول؛ limit پیش‌فرض ۵۰، سقف ۲۰۰ |
| `GET /noroform/forms/:formId/submissions/:id` | پاسخ + `fields` همان نسخه با `value` خام و `display` (format نوع فیلد) |
| `GET /noroform/forms/:formId/submissions/export.csv?from&to&version&sort&dir&filters&columns` | `text/csv; charset=utf-8` با BOM، `Content-Disposition: attachment` |
| `GET /noroform/forms/:formId/submissions/export.xlsx?from&to&version&sort&dir&filters&columns` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX راست‌چین)، `Content-Disposition: attachment` |

- `from`/`to`: تاریخ میلادی `YYYY-MM-DD` (UI شمسی را تبدیل می‌کند)، هر دو شامل، بر اساس روز **Asia/Tehran**.
- ستون‌ها اجتماع فیلدهای همه‌ی نسخه‌هاست (کلید `field_id` پایدار): ترتیب و عنوان از جدیدترین نسخه، سپس فیلدهای حذف‌شده با `removed: true`.
- `columns`: فهرست مرتب `field_id`ها جداشده با کاما، همان ستون‌های شخصی‌سازی‌شده‌ی جدول (پنهان‌شده‌ها نمی‌آیند و ترتیب حفظ می‌شود)؛ نبودنش یعنی همه‌ی فیلدها و رشته‌ی خالی یعنی فقط ستون‌های پایه. ترتیب ردیف‌ها همان `sort`/`dir` جدول است.
- CSV: ستون‌های «شناسه پاسخ»، «زمان ثبت (شمسی)» (تهران)، «زمان ثبت (UTC)»، «نسخه»، سپس فیلدها با مقدار نمایشی (تاریخ شمسی، عنوان گزینه‌ها). سلول‌هایی که با `= + - @` شروع می‌شوند با `'` خنثی می‌شوند (CSV injection)، جز عدد خالص. خروجی در حافظه و دسته‌های ۱۰۰۰تایی ساخته می‌شود (streaming بعداً اگر حجم لازم شد).
- XLSX: همان فیلتر/مرتب‌سازی و ستون‌ها، اما **مطابق جدول نمایشی**: ستون ثابت «زمان ثبت» + ستون‌های شخصی‌سازی‌شده با ترتیب کاربر؛ شناسه، UTC و نسخه نمی‌آیند (دادهٔ کامل در CSV است). سازندهٔ بستهٔ OOXML/ZIP بدون وابستگی بیرونی در `api/submissions/xlsx.ts`: شیت راست‌چین (`rightToLeft`)، عنوان و زیرعنوان ادغام‌شده (تعداد/بازه/نسخه/فیلتر فعال/تاریخ خروجی)، سرستون سبز پر با متن سفید، بدنهٔ راه‌راه با خط نازک، راست‌چین با `readingOrder=2`، عرض ستون‌ها، قفل ردیف سرستون، AutoFilter، و تنظیم چاپ A4 (افقی اگر بیشتر از ۵ ستون). همهٔ سلول‌ها `inlineStr` هستند تا مقدارها دست‌نخورده بمانند (صفر ابتدای شماره، متن‌های فرمول‌وار، تاریخ شمسی) و پاسخ‌های قفل‌شده همان متن ارتقای پلن را نشان می‌دهند.
- PDF: از همان CSV خوانده و پیش از چاپ به ستون‌های جدول نمایشی تبدیل می‌شود: ستون ثابت «زمان ثبت» + ستون‌های شخصی‌سازی‌شده با ترتیب کاربر؛ شناسهٔ پاسخ، UTC و شمارهٔ نسخه (متادیتا) چاپ نمی‌شوند. سند RTL با سربرگ عنوان، زیرنویس بازه/نسخه/فیلتر، جدول راه‌راه با تکرار `thead` در صفحات، A4 عمودی برای ≤۵ ستون و افقی برای بیشتر، و تاریخ چاپ در پانویس؛ «Save as PDF» در دیالوگ چاپ مرورگر.
- **دراور جزئیات (UI):** در دسکتاپ از لبهٔ راست باز می‌شود و با توجه به دادهٔ پاسخ عرض استاندارد/عریض می‌گیرد؛ در موبایل از پایین با ارتفاع ثابت ۸۰٪ صفحه باز می‌شود (سقف ۸۰٪ تا محتوا کمتر اسکرول بخورد و دراور تمام‌صفحه نباشد)؛ دستگیرهٔ بالای آن دکمه نیست و فقط برای کشیدن رو به پایین (بستن) است. پاسخ‌های صفحهٔ جاری با دکمه و میانبر `J`/`K` قابل مرورند؛ دکمه‌های چاپ و جابه‌جایی رکورد در سمت چپ هدر دراورند و ابزارهای تغییر نما (انتخاب نما، بازگشت به چیدمان خودکار و در حالت ویرایش نام/ذخیره/نمای تازه/لغو/حذف) هم در همان ردیف، کنار دکمهٔ پرینت نشسته‌اند؛ ردیف جداگانهٔ نما زیر خلاصه حذف شده است تا بدنهٔ پاسخ جای بیشتری بگیرد. این خوشه در موبایل آیکن‌محور و پیچیدنی است (`flex-wrap`) و عنوان فرم با `min-w-0` کوتاه می‌شود؛ خطای ذخیرهٔ نما در نواری نازک زیر هدر نشان داده می‌شود. دراور چهار بخش دارد: سرصفحه (عنوان فرم، نام فضای کاری، تاریخ شمسی، ساعت تهران، شمارهٔ نسخه و شمارندهٔ رکورد)، خلاصه (کارت‌های کلیدی)، بدنه (همهٔ فیلدهای پاسخ با گروه‌بندی نوع داده) و فوتر (راه‌های تماس و نشان). کارت‌های خلاصه پیش از بدنه می‌آیند و فیلدهای سنجاق‌شده در بدنه نیز باقی می‌مانند؛ در موبایل هر ردیف حداکثر دو کارت دارد. کارت‌ها از گرادیان‌های روشن و نیمه‌شفاف با رنگ‌های ملایم هماهنگ با تم ساخته می‌شوند. جابه‌جایی با درگِ اشاره‌گری (Pointer Events) انجام می‌شود، نه DnD بومی مرورگر: با گرفتن دستهٔ گوشه و پس از آستانهٔ ۵ پیکسل، کارتِ شناورِ برچسب‌دار زیر نشانگر می‌آید (موس، لمس و قلم یکسان)، مقصد با `elementFromPoint` از `data-detail-card`/`data-detail-zone` خوانده می‌شود و نزدیک لبه‌ها اسکرول خودکار انجام می‌شود؛ بنابراین درگ در موبایل هم کار می‌کند. کشیدن کارت خلاصه روی کارت دیگر ترتیب خلاصه را عوض می‌کند، کشیدن فیلد بدنه و رها کردن روی بخش خلاصه همان فیلد را به خلاصه سنجاق می‌کند (روی کارت مشخص، جای همان کارت)، کشیدن کارت خلاصه روی بدنه فقط آن را از خلاصه برمی‌دارد و کشیدن فیلد بدنه روی فیلد دیگر ترتیب بدنه را عوض می‌کند. گوشهٔ کارت با هاور/فوکوس و همچنین با لمسِ کارت دو خوشهٔ ابزار نشان می‌دهد: دستهٔ درگ در بالا-شروع و در بالا-پایان سنجاق/لغوسنجاق خلاصه، نوع نمایش، منوی تنظیمات (نیم‌عرض/تمام‌عرض، انتقال به بالا/پایین، پنهان‌کردن) و حذف. حذف کارت خلاصه فقط `pinned: false` می‌کند و فیلد در بدنه می‌ماند؛ حذف فیلد بدنه `hidden: true` می‌کند و از بخش «فیلدهای پنهان» قابل بازگردانی است. ترتیب خلاصه جدا از ترتیب بدنه در `summaryOrder` همان `DetailLayout` (و در نتیجه در نماهای نام‌دار) ذخیره می‌شود. حذف پیش‌فرض فیلدهای خالی، شبکهٔ دو ستونه، گروه‌بندی بر اساس نوع داده، نمایش عدد/امتیاز/انتخابی/آرایه و تب متادیتا از `fields` همان endpoint ساخته می‌شوند. ویرایش چیدمان حالت جداگانه ندارد: ویرایش همان تعامل مستقیم روی کارت‌هاست و همهٔ اقدامات ویرایش (نوع نمایش، عرض، سنجاق، ترتیب و پنهان‌کردن) در ابزارهای همان کارت جمع شده‌اند. به‌محض تفاوت چیدمان با نمای ذخیره‌شده (یا حالت خودکار) نوار ذخیره کنار همان انتخاب نما در هدر ظاهر می‌شود: نام نما، «ذخیرهٔ چیدمان»، «ذخیره به‌عنوان نمای تازه»، «لغو تغییرها» و «حذف این نما»؛ تا ذخیره نشود تغییرها موقت‌اند. نماهای نام‌دار فقط در `localStorage` مرورگر و به‌ازای tenant/form ذخیره می‌شوند؛ نمای فعال به‌خاطر سپرده می‌شود و نخستین فیلد سنجاق‌شده، عنوان اصلی فهرست موبایل و نخستین ستون پاسخ‌هاست. نوار انتخاب نما/ذخیرهٔ چیدمان در موبایل یک ردیف فشرده در همان هدر است: انتخاب نما، بازگشت به خودکار، ذخیره، ذخیره به‌عنوان نمای تازه، لغو و حذف نما فقط آیکن‌اند (هر کدام `aria-label` و `title` دارند) و برچسب متنی از `sm` به بالا می‌آید؛ متادیتای کم‌اهمیت سرصفحه (نام فضای کاری، ساعت، شمارهٔ نسخه) در موبایل پنهان می‌شود تا سرصفحه یک ردیف کنترل (ناوبری، نما، چاپ) + یک ردیف عنوان/متا بماند. این تنظیمات دادهٔ پاسخ یا schema فرم را تغییر نمی‌دهند. چاپ دراور از منوی چاپ بین A4 و A5 انتخاب می‌شود؛ پنل تمام‌صفحهٔ پیش‌نمایش روی همان صفحه (portal بیرون از دراور) باز می‌شود، اندازهٔ کاغذ با `@page` همان پنل تعیین می‌شود و «چاپ / ذخیرهٔ PDF» دیالوگ چاپ مرورگر را باز می‌کند؛ تب/پنجرهٔ جدید لازم نیست. تا پنل باز است فقط محتوای همان پنل چاپ می‌شود (`body[data-print-preview='on']`) و صفحهٔ زیر آن قفل اسکرول است. خروجی چندصفحه‌ای با حاشیه و شکست کارت‌ها سازگار است و در A5 محتوا تک‌ستونه و فشرده‌تر می‌شود. در چاپ، کنترل‌های تنظیم/ناوبری حذف و عنوان، کارت‌ها، پاسخ‌ها، راه‌های ارتباطی و نشان Powered by Noroset حفظ می‌شوند. فوتر دراور دو ردیف دارد: ردیف اول لینک‌های تماس (ایمیل، تماس، پیامک) و ردیف دوم «Powered by Noroset» کنار عنوان فرم. تراکم دراور یک گام پایین‌تر و یکدست با utilityهای توکن‌شدهٔ Tailwind برای متن، فاصله، وزن و آیکون است. تاریخچهٔ تغییر وضعیت، یادداشت/منشن، ارجاع و IP/دستگاه/مدت تکمیل تا زمان وجود API و دادهٔ پشتیبان ارائه نمی‌شوند؛ پیوست/امضا نیز در مدل فعلی فیلدهای noroform نیست.
- **فهرست موبایل (UI):** زیر `md` جدول افقی جایش را به فهرست کارتی می‌دهد: هر پاسخ یک کارت مستقل است که مقدار فیلد عنوانِ نمای فعال را برجسته می‌کند، زمان ثبت و خلاصهٔ کوتاهی از سایر مقادیر را نشان می‌دهد و انتخاب آن همان دراور جزئیات را باز می‌کند (همان میانبرهای `J`/`K`). هدر کنترل‌ها فشرده است: بازه، نسخه، ستون‌ها و خروجی‌ها در موبایل آیکون‌محورند و با منوهای سفارشی هم‌سبک (به‌جای منوی بومی مرورگر) باز می‌شوند؛ برچسب‌های گزینه‌ها و نام دسترس‌پذیر کنترل حفظ می‌شوند. منوهای انتخاب نما و نوع نمایش جزئیات نیز همین الگو و اندازهٔ متن/آیکون فشرده را دارند. کادر کنترل‌ها و خروجی‌ها (ستون‌ها، Excel/CSV، PDF) بالای فهرست می‌ماند؛ چون هدر ستون‌ها دیده نمی‌شود، فیلتر/مرتب‌سازی ستونی از شیت پایینی «فیلتر و مرتب‌سازی» با همان `ColumnFilterCard` در دسترس است. جدول دسکتاپ فقط در صورت سرریز واقعی ستون‌ها اسکرول افقی می‌گیرد؛ ظرف‌های flex/scroll حداقل‌عرض صفر دارند تا از اسکرول ناشی از اندازه‌گیری ذاتیِ ظرف جلوگیری شود. فضای خالی زیر ردیف‌ها، ارتفاع باقی‌ماندهٔ پنل برای اسکرول عمودی داخل جدول است، نه نشانهٔ نیاز به اسکرول افقی.

**لینک مشاهده‌ی بیرونی پاسخ (پیاده‌شده):** پاسخ‌ها همیشه در پنل و برای همه‌ی اعضای فضای کاری (`/form/{id}/results`) دیده می‌شوند. هر پاسخ می‌تواند یک لینک مستقل و قابل ابطال برای مخاطب بیرونی داشته باشد (`POST /noroform/forms/:formId/submissions/:submissionId/response-link`): توکن ۳۲ بایتی تصادفی یک‌بار برگردانده می‌شود و در DB فقط SHA-256 آن در `noroform_response_links` می‌ماند؛ لینک `n8f.ir/r/{token}` پس از انقضا/ابطال ۴۱۰/۴۰۴ می‌شود. مسیر عمومی فقط همان یک پاسخ را با `app.response_link_token` و سپس `withTenant` می‌خواند و هیچ لیست/جست‌وجویی ندارد. این مسیر جایگزین پنل نیست و `GET /noroform/forms/:formId/submissions` بدون فیلتر دسترسی پاسخ، همه‌ی پاسخ‌ها را برمی‌گرداند.

### ۸.۸ ادیتور فرم: محل تنظیمات هر المان (تصمیم مالک محصول ۱۴۰۵/۸/۲۱)
هر المان پایه دو محل تنظیم دارد و هر تنظیم فقط در یکی از آن‌هاست: **کارت درون‌خطی** = گروه «عمومی» و «ظاهر»؛ **دیالوگ تنظیمات پیشرفته** = گروه «اعتبارسنجی» و «منطق شرطی». منبع واحد: `apps/web/src/app/(panel)/form/[id]/editor/_components/settings-spec.ts`؛ تست `apps/web/test/form-editor-settings.test.ts` بررسی می‌کند هر کلید settings هر نوع field-engine دقیقاً یک بار جا گرفته، تنظیمات اعتبارسنجی فقط قید داده‌اند (`value.constraintsShape`، §۸.۶) و تنظیم نمایشی هرگز به دیالوگ نمی‌رود.

| المان | کارت درون‌خطی (عمومی، ظاهر) | دیالوگ پیشرفته (اعتبارسنجی، منطق) |
|---|---|---|
| همه‌ی فیلدها | عنوان پرسش، متن راهنما، اجباری | نمایش شرطی |
| متن کوتاه / بلند | جای‌نگهدار | حداقل و حداکثر طول |
| عدد | جای‌نگهدار | کمترین و بیشترین مقدار، فقط عدد صحیح |
| ایمیل / موبایل | جای‌نگهدار | — (قالب همیشه بررسی می‌شود) |
| تک‌انتخابی | گزینه‌ها، شکل نمایش (رادیویی/کشویی) | — |
| چندانتخابی | گزینه‌ها | حداقل و حداکثر انتخاب |
| تاریخ | — | زودترین و دیرترین تاریخ |
| امتیاز | مقیاس (۳ تا ۱۰) | — |
| متن (محتوا) | متن | نمایش شرطی |
| تصویر | نشانی https، متن جایگزین | نمایش شرطی |
| ویدیو | لینک (فقط `{provider, video_id}` ذخیره می‌شود) | نمایش شرطی |

- «اجباری» با این‌که به درستی پاسخ مربوط است در کارت ماند (پرکاربردترین کلید هر پرسش، روی خود المان و نه در settings).
- گزینه‌های انتخابی و مقیاس امتیاز در field-engine قید داده‌اند ولی محتوای پرسش‌اند، پس «عمومی» و درون‌خطی‌اند.
- دیالوگ پیشرفته برای المان محتوا فقط تب «منطق شرطی» دارد؛ شرط فقط فیلدهای قبل از المان را فهرست می‌کند (§۸.۴) و عملگرها از `conditionOps` نوع فیلد مرجع می‌آیند. خطای قیدها (مثلاً `min_gt_max`) با `settingsSchema` همان نوع در دیالوگ نشان داده می‌شود.
- **حالت‌های بدنه‌ی کارت به سبک گوگل فرم** (۱۴۰۵/۸/۲۱؛ قاب کارت دست نخورد): جمع‌شده = عنوان و راهنما به‌صورت متن، پیش‌نمای پاسخ روی خط نقطه‌چین (خالی ← «پاسخ کوتاه»، «پاسخ بلند»، …)، رادیو/چک‌باکس یا شماره‌ی گزینه در کشویی، و نشان قاعده‌های پیشرفته («نمایش شرطی»، «n قاعده‌ی اعتبارسنجی»، «تنظیمات نامعتبر»). باز = هر بخش نوشتاری بدون زمینه با خط زیرین ۱px؛ فوکوس ← خط ۲px به رنگ اصلی؛ خط گزینه‌ها فقط با اشاره/فوکوس؛ Enter در گزینه گزینه‌ی بعدی می‌سازد. المان «متن» ویرایشگر TipTap دارد (`form-rich-text.tsx`) با نوار قالب‌بندی زیر بخش فوکوس‌شده: پررنگ، کج، لینک https، فهرست شماره‌دار و نقطه‌ای، حذف قالب‌بندی؛ تبدیل سند فرم ↔ TipTap در `rich-text.ts` (تست `form-rich-text.test.ts`). راهنمای پرسش هم همین ویرایشگر و نوار را دارد، بدون تیتر و با رنگ کم‌رنگ راهنما؛ راهنمای متن‌ساده‌ی قبلی با اولین ویرایش به متن غنی تبدیل می‌شود و راهنمای خالی رشته‌ی خالی ذخیره می‌شود. زیرخط نوار ندارد چون schema متن غنی فرم آن را نگه نمی‌دارد؛ عنوان پرسش متن ساده است و نوار ندارد.
- **دیالوگ پیشرفته:** Esc می‌بندد، کارت در حال ویرایش بالای دیالوگ نگه داشته می‌شود، شمار قاعده‌ها روی تب‌ها، «بازگشت به پیش‌فرض» برای قیدها، پرسش‌های مرجع شرط با شماره‌ی پرسش، و هشدار شرط ناقص (پرسش مرجع حذف‌شده، مقدار خالی).
- **پیش‌نمایش فرم** (`dialogs.tsx`، `preview-run.ts`): اجرای واقعی همه‌ی صفحه‌ها از صفحه‌ی باز ادیتور، با منطق شرطی و اعتبارسنجی field-engine (همان کدهای خطا با متن فارسی؛ «بعدی/ارسال» با پاسخ نامعتبر جلو نمی‌رود و فوکوس به اولین خطا می‌رود)، نوار پیشرفت، سربرگ با نوار رنگ اصلی، صفحه‌ی پایان و «شروع دوباره»؛ هیچ پاسخی ذخیره نمی‌شود (تست `form-preview-run.test.ts`). **پیش‌نمایش المان** پیش از افزودن: کاربرد، یک نمونه‌ی قابل‌امتحان (`ELEMENT_INFO` در `data.tsx`) و فهرست تنظیمات «روی کارت» و «تنظیمات پیشرفته» از `settings-spec.ts`. هر دو دیالوگ عنوان قابل‌خواندن برای صفحه‌خوان دارند، فوکوس را می‌گیرند و پس از بستن به دکمه‌ی بازکننده برمی‌گردانند (`Overlay` در `editor-ui.tsx`).
- باقی‌مانده‌ی مرحله‌ی ۱۰: انتشار از رابط ادیتور و نمایش issueهای API؛ انتخابگر تاریخ شمسی (فعلاً ورودی میلادی مرورگر با نمایش شمسی)؛ شرط روی کل صفحه. ادیتور، `draftDefinition` را از API بارگذاری و با debounce ذخیره می‌کند؛ نگاشت رفت‌وبرگشت در `apps/web/src/app/(panel)/form/[id]/editor/_components/editor-document.ts` است و ساختارهای دست‌نخورده را حفظ می‌کند.
- **بازبینی تجربه‌ی ادیتور (۱۴۰۵/۸/۲۸): حذف کنترل‌های بی‌اثر و جایگزینی با تعامل واقعی.**
  - **واگرد/ازنو حذف شد.** دکمه‌های هدر و آیتم‌های منوی موبایل هیچ handlerی نداشتند. مسیر بازیابی، ذخیره‌ی خودکار + «تلاش دوباره» در نوار وضعیت است؛ واگرد واقعی باید روی تاریخچه‌ی `draftDefinition` ساخته شود، نه با دکمه‌ی تزئینی.
  - **جابه‌جایی المان واقعی شد.** دسته‌ی درگ تزئینی (`cursor-grab` بدون DnD) برداشته شد و دکمه‌های «انتقال به بالا/پایین» در هدر کارت باز و نوار ابزار کارت جمع‌شده اضافه شدند (در ابتدا/انتهای فهرست `disabled`). جابه‌جایی شرط‌ها را بازنویسی نمی‌کند؛ شرطی که به المان بعدی اشاره کند در «انتشار» به‌صورت `forward_reference` گزارش می‌شود (§۸.۴).
  - **نام صفحه ویرایش‌شدنی شد.** آیتم «تغییر نام» منوی صفحه (بی‌handler) یک ورودی درون‌خطی در همان چیپ باز می‌کند: Enter/بلور ذخیره، Esc لغو، نام خالی نادیده. نام صفحه در فرم عمومی زیر عنوان فرم دیده می‌شود (`products/noroform/ui/public-form.tsx`). آیتم «تنظیمات صفحه» حذف شد چون در تعریف فرم چیزی جز عنوان/نوع/شرط صفحه برای تنظیم وجود ندارد.
  - **جست‌وجوی فهرست المان‌ها کار می‌کند** (پیش‌تر ورودی بدون `value`/`onChange` بود)، «ی/ك» عربی و نیم‌فاصله را تطبیق می‌دهد و حالت «نتیجه‌ای نیست» دارد.
  - **تب «المان‌های آماده» حذف شد.** چهار آیتم یکسانِ placeholder بودند و کلیکشان بی‌صدا یک «متن کوتاه» اضافه می‌کرد؛ وقتی فهرست المان‌های آماده از API بیاید برمی‌گردد (`data.tsx`، TODO مرحله‌ی ۱۰).
  - **«المان را اینجا رها کنید» حذف شد** (drag & drop پیاده نشده بود). جای آن، ناحیه‌ی خالی صفحه یک حالت واقعی «هنوز المانی در این صفحه نیست» با راهنمای افزودن دارد؛ موبایل دکمه‌ی شناور «افزودن المان» را نگه می‌دارد.
  - **ناحیه‌های chrome (نوار بالا/کنار/پایین/فوتر) از سه کادر خالی با کلیدهای چیدمان بی‌اثر به یک ردیف خلاصه‌ی خواندنی تبدیل شدند** (`ChromeAreas`): شمار المان هر ناحیه از تعریف خام خوانده می‌شود و متن صریح می‌گوید ویرایش این ناحیه‌ها در قالب انجام می‌شود. دکمه‌های تزئینی «قبلی/بعدی» بوم هم حذف شدند؛ ناوبری واقعی در دیالوگ پیش‌نمایش است.
  - **بستن کارت باز:** دکمه‌ی «بستن کارت» در هدر کارت فعال، نمای جمع‌شده را برمی‌گرداند (پیش‌تر تنها راه، ناحیه‌ی حذف‌شده‌ی «رها کنید» بود).
  - **حذف بدون تأیید نماند:** چون واگردی نیست، «حذف صفحه» و «حذف المان» یک دیالوگ تأیید دارند (`confirm-dialog.tsx`) که نام صفحه/پرسش را در متن می‌آورد؛ دکمه‌ی تأیید `variant="destructive"` است و Esc/انصراف چیزی را تغییر نمی‌دهد.
  - **دسترسی‌پذیری:** `IconAction` (در `apps/web/src/components/editor-ui.tsx`) حالا `disabled` می‌گیرد تا دکمه‌های جابه‌جایی در جایگاه نامعتبر با صفحه‌خوان هم غیرفعال اعلام شوند.
  - **منطق خالص و تست:** جابه‌جایی المان، نام صفحه و فیلتر جست‌وجوی فهرست المان‌ها در `_components/editor-ops.ts` جدا شدند و `apps/web/test/form-editor-ops.test.ts` لبه‌ها (اول/آخر فهرست، نام خالی، «ی/ك» عربی و نیم‌فاصله، نتیجه‌ی خالی) را می‌سنجد؛ `page.tsx` فقط وضعیت را نگه می‌دارد.
- **بازبینی دوم (۱۴۰۵/۸/۲۸): بازیابی خطا، فوکوس و خوانایی.** بر اساس راهنمای UX (Error Recovery/Placement، Focus States، Confirmation Dialogs):
  - **خطاهای «انتشار» قابل‌رفتن شدند** (`_components/publish-issues.tsx`): هر مورد که مسیرش به صفحه/المان اشاره کند دکمه است؛ کلیک، صفحه را عوض می‌کند، کارت همان المان را باز می‌کند، به آن اسکرول می‌کند و فوکوس را روی دکمه‌ی «تنظیمات پیشرفته» همان کارت می‌گذارد — یعنی خطا همیشه یک مسیر اصلاح دارد، نه فقط متن. خطاهای سطح قالب/تم/ریشه (مثل `no_main_page`) خواندنی می‌مانند. نگاشت مسیر در `issueTarget()` (`editor-ops.ts`) است و تست دارد.
  - **دلیل غیرفعال‌بودن «انتشار»** در `title` دکمه نوشته می‌شود («در حال ذخیره‌ی پیش‌نویس…»، «ذخیره ناموفق بود؛ تلاش دوباره»، …) تا دکمه‌ی غیرفعال بی‌دلیل نماند.
  - **`main` تودرتو حذف شد:** پوسته‌ی پنل `<main id="main-content">` دارد؛ بوم ادیتور حالا `<section aria-label="بوم فرم">` است (یک landmark اصلی در صفحه).
  - **فوکوس:** `SettingsDrawer` با بستن، فوکوس را به همان دکمه‌ای برمی‌گرداند که بازش کرد (`isConnected` بررسی می‌شود تا با پرش بین المان‌ها فوکوس به گره‌ی حذف‌شده نرود). دکمه‌ی «تنظیمات پیشرفته» حالا `aria-expanded`/`aria-controls="advanced-settings"` دارد و ریشه‌ی دیالوگ همان `id` را می‌گیرد.
  - **ناوبری صفحه‌ها:** `nav` برچسب «صفحه‌های فرم» دارد، صفحه‌ی فعال `aria-current="page"` و صفحه‌های دیگر نام دسترس‌پذیر «صفحه ۲: عنوان» دارند. تعویض صفحه، کارت باز و دیالوگ صفحه‌ی قبلی را می‌بندد تا حالت کهنه نماند.
  - **پس از افزودن المان** بوم به کارت تازه اسکرول می‌کند (با احترام به `prefers-reduced-motion` از طریق `scrollBehavior()`).
  - **گروه‌های ابزار** با `role="group"` و `aria-label="ابزارهای المان"` مشخص شدند؛ کلید «پیش‌نمایش/ویرایش لوگو» در هدر `aria-pressed` دارد.
  - **خوانایی:** ورودی‌های درون‌خطی روی موبایل ۱۶px شدند (`text-base md:text-sm`) تا iOS هنگام فوکوس زوم نکند؛ نوار وضعیت ذخیره و ردیف `ChromeAreas` از ۱۱px به `text-xs` رسیدند و دکمه‌ی پیش‌نمایش موبایل هم ۴۰px شد (هم‌اندازه با «قالب»).
  - **تفکیک فایل:** هدر ادیتور به `_components/editor-header.tsx` و فهرست خطاها به `_components/publish-issues.tsx` رفت؛ `page.tsx` از ۳۴٫۷KB به ۳۱KB رسید (سقف baseline دست‌نخورده).
- **دیالوگ انتشار (۱۴۰۵/۸/۲۸): ساختار دیالوگ و اعتبارسنجی درون‌خطی.** این دیالوگ تنها دیالوگ پنل بود که `DialogHeader` نداشت؛ عنوان با `leading-none` به لبه‌ی بالای پاپ‌آپ می‌چسبید و بریده می‌شد. اکنون:
  - **ساختار استاندارد:** `DialogHeader` (با `pe-14` برای دکمه‌ی بستن) + بدنه‌ی `overflow-y-auto` با `hoverNativeScroll` + `DialogFooter` (نوار خاکستری با خط بالا) — همان الگوی دیالوگ انتشار نورولینک. `DialogPanel` استفاده نشد چون `ScrollArea` عرض محتوا را به `fit-content` می‌برد.
  - **هم‌ترازی:** انتخاب‌های بومی (`w-fit`) با `[&_[data-slot=native-select-wrapper]]:w-full` تمام‌عرض می‌شدند؛ با حذف آن‌ها به‌نفع کارت‌ها، ورودی‌ها و کارت‌ها هم‌تراز و هم‌ارتفاع‌اند.
  - **انتخاب کارتی (۱۴۰۵/۸/۲۸):** «دسترسی پاسخ‌ها» دو کارت و «روش احراز لینک پاسخ» سه کارت در یک سطر (از `sm` به بالا؛ زیر آن زیر هم تا متن خوانا بماند) با رادیوی بومی داخل هر کارت (`name` مشترک، `sr-only`) تا کلیدهای جهت‌دار و «۱ از ۳» برای صفحه‌خوان درست کار کند. کارت انتخاب‌شده با `border-primary` + پس‌زمینه‌ی ملایم **و** آیکن تیک مشخص می‌شود (نه فقط رنگ)، و فوکوس با `has-[:focus-visible]:ring-2` روی خود کارت دیده می‌شود. راهنمای هر گروه با `aria-describedby` به رادیوها وصل است.
  - **مدت اعتبار لینک پاسخ فقط نمایش داده می‌شود:** ورودی عددی حذف شد؛ مقدار ذخیره‌شده‌ی فرم (`responseAccessTtlDays`) در یک ردیف خواندنی با آیکن ساعت نشان داده می‌شود و فقط در حالت مرتبط (لینک بیرونی + روش احراز انتخاب‌شده) دیده می‌شود. انتشار همان مقدار را دست‌نخورده می‌فرستد؛ اعتبارسنجی ۱ تا ۳۶۵۰ در API (`dto.ts`) هم‌چنان حاکم است.
  - **بازخورد:** راهنمای هر فیلد زیر آن آمده، خطای انتشار با آیکن در بدنه نشان داده می‌شود، و شمار issueها داخل دیالوگ می‌گوید فهرست قابل‌کلیک بالای بوم کجاست. تا پایان انتشار، دیالوگ با Esc/کلیک بیرون بسته نمی‌شود.
  - `channel-dialog` (انتخاب نوع فرم) و `confirm-dialog` هم به همین ساختار header/footer منتقل شدند تا در کل جریان ادیتور یک الگو باشد.

---

## ۹. norolink — طراحی (تصمیم‌های قطعی)

صفحه‌ای که با نورولینک ساخته می‌شود **نورولینک پیج** نام دارد (§۱)؛ در همه‌ی مستندات، کد و ارتباطات داخلی از همین نام استفاده شود.

صفحه‌ی لینک به سبک «link in bio».

### ۹.۱ آدرس و صفحه
- پنل: `noroset.com/link`، ادیتور `noroset.com/link/{slug}/editor`، آمار `noroset.com/link/{slug}/analytics` ([`routes.md`](./routes.md)).
- صفحه‌ی عمومی: **`{slug}.n8l.ir`** (wildcard DNS/SSL)؛ صفحه از host در `apps/web/src/proxy.ts` پیدا می‌شود.
- هر tenant **چند صفحه** با سقف پلن (پایه: ۱)؛ `slug` صفحه در کل پلتفرم یکتا، الگوی slug مثل tenants، با لیست رزرو.
- **پیش‌نویس + انتشار:** ویرایش روی پیش‌نویس؛ «انتشار» آن را زنده می‌کند (بدون نسخه‌های immutable).
- **پروفایل** (آواتار، نام، بیو) بخش ثابت بالای صفحه است، نه المان؛ در تنظیمات صفحه. چیدمان آماده (`profile.layout`): `stacked` (عمودی، پیش‌فرض)، `side_right` و `side_left` (کنار هم، آواتار در راست/چپ)؛ انتخاب از ابزار کارت پروفایل در ادیتور.
- **SEO:** عنوان، توضیح، تصویر OG؛ **QR کد** صفحه. **پیش‌فرض noindex** (`seo.indexable`، تصمیم مالک محصول ۱۴۰۵/۸/۹؛ snapshotهای قدیمی بدون این فیلد هم noindex‌اند). با روشن‌کردن از تب «جستجو و اشتراک‌گذاری» دیالوگ انتشار، پس از انتشار index می‌شود. روشن کردن فقط با پلن دارای سقف `norolink.seo` (پیش‌فرض خاموش؛ ادمین روی پلن روشن می‌کند)، **نه در دوره‌ی رایگان ۱۴ روزه** حتی اگر پلن آن را داشته باشد (تصمیم مالک محصول ۱۴۰۵/۸/۲۰: فقط پرداخت‌کننده ایندکس می‌شود، سد اصلی اسپم دامنه‌ی مشترک؛ `seoAllowed` در `api/access.ts`)، و با **توضیح موتور جستجو (`seo.description`) دست‌کم ۵۰ نویسه** پس از trim (`SEO_DESCRIPTION_MIN`، `shared/seo.ts`). هر دو در **سرور** هم بررسی می‌شوند، فقط هنگام روشن کردن (۴۰۳ `plan_limit` با `limit: 'seo'`؛ ۴۲۲ `seo_description_too_short`)؛ مقدار روشن‌شده در پلن قبلی یا توضیحی که بعداً کوتاه شده ذخیره می‌ماند (ذخیره‌ی خودکار نمی‌شکند) ولی صفحه‌ی عمومی، sitemap و دایرکتوری با یک قاعده (`isSearchIndexable`) آن را noindex می‌دانند. دیالوگ انتشار به‌جای کلید کارت ترغیب نشان می‌دهد (فقط مالک/مدیر دکمه دارد؛ `limits.seoUpsell` از `seoUpsellFor`): `trial` (دوره‌ی رایگان روی پلنی که سئو دارد) ← «خرید اشتراک»، `buy` (اشتراکی نیست) ← «خرید اشتراک»، `upgrade` (پلن فعلی یا پلن دوره‌ی رایگان سئو ندارد) ← «ارتقای پلن»؛ صفحه‌ی اشتراک (`/billing`) و ویرایشگر پلن ادمین همین قاعده را با `ENTITLEMENT_META[].paidOnly` («در دوره‌ی رایگان بسته است و با خرید اشتراک فعال می‌شود») زیر همان امکان نشان می‌دهند و متن دوره‌ی رایگان فقط وقتی از گوگل حرف می‌زند که پلن سئو داشته باشد؛ با پلن دارای سئو، نمای گوگل پیش از روشن کردن هم هست تا توضیح نوشته شود و کلید تا رسیدن به ۵۰ نویسه غیرفعال است. **داده‌ی ساختاریافته:** کاربر در همان تب «این صفحه متعلق است به: شخص / کسب‌وکار» (`seo.entity`، پیش‌فرض null) را انتخاب می‌کند؛ فقط صفحه‌ی ایندکس‌شونده با entity انتخاب‌شده JSON-LD `ProfilePage` می‌گیرد (`profileJsonLd`: mainEntity `Person`/`Organization` با نام، بیو، آواتار، شبکه‌ها در `sameAs` بدون واتس‌اپ/ایمیل/تلفن، `telephone`، و برای کسب‌وکار مکان از المان نقشه)؛ متن کاربر با `jsonLdScript` escape می‌شود. **دایرکتوری عمومی** (`n8l.ir`، `GET /norolink/public/pages`) فقط صفحه‌های **واقعی** منتشرشده‌ای را فهرست می‌کند که در snapshot `seo.indexable` روشن، پلنشان سئو و هیچ محدودیت مدیریتی مؤثری ندارند (§۹.۱۳؛ شرط هم در کوئری و هم در policy `norolink_pages_directory_select`، migration `0024` و `0026`)؛ نمونه‌ی ساختگی، نشان «تأییدشده» یا دسته‌بندی ندارد (تصمیم مالک محصول ۱۴۰۵/۸/۲۰)؛ صفحه‌ی noindex از هیچ مسیر عمومی فهرست نمی‌شود. **کشف و وضعیت HTTP:** `n8l.ir/sitemap.xml` دایرکتوری و همه‌ی صفحه‌های قابل ایندکس (همان قاعده؛ `GET /norolink/public/sitemap`، `lastmod` = زمان آخرین انتشار؛ خطای API ← ۵۰۳ نه sitemap خالی) را دارد و robots.txt دامنه‌ی کوتاه و هر زیردامنه (`Disallow: /api/`) به آن ارجاع می‌دهد تا sitemap بین‌میزبانی پذیرفته شود (در production: Domain property دامنه‌ی n8l.ir در Search Console). صفحه canonical و `og:url` مطلق خودش (بدون query) و `og:locale=fa_IR` دارد. چون صفحه‌ها پشت `app/loading.tsx` ریشه stream می‌شوند و پس از آن وضعیت HTTP عوض نمی‌شود، proxy پیش از رندر وضعیت را از API می‌گیرد (`src/lib/link-gate.ts`): ناموجود ← ۴۰۴، نشانی قبلی ← ۳۰۸، تعلیق مدیریت پلتفرم ← ۴۵۱/۴۰۳ (§۹.۱۳)، ماژول خاموش یا سقف درخواست ← ۵۰۳ با `Retry-After` (نه ۲۰۰ با noindex که صفحه را از ایندکس بیرون می‌کرد؛ nginx برای این ۵۰۳ نسخه‌ی کهنه نمی‌دهد)؛ پلن تمام‌شده همان ۲۰۰ با noindex و پیام «در دسترس نیست» است.
- **تغییر نشانی:** هر صفحه حداکثر ۳ بار (`MAX_SLUG_CHANGES`؛ `409 slug_change_limit`؛ نشانی هنگام ساخت حساب نمی‌شود). نشانی قبلی در `norolink_slug_redirects` (migration `0014`) می‌ماند: صفحه‌ی منتشرشده از آن با ریدایرکت دائمی ۳۰۸ به نشانی فعلی می‌رود (`findPublicLinkRedirect`؛ بدون زنجیره) و نشانی برای همان صفحه رزرو است؛ trigger در DB جلوی گرفتن آن را از هر tenant می‌گیرد (خطای `slug_taken`). برگشت به نشانی قبلی همان صفحه ممکن است و یک تغییر حساب می‌شود. حذف صفحه نشانی‌ها را آزاد می‌کند.
- **واگذاری صفحه به مشتری (Claim):** فقط از ادیتور قالب در مدیریت پلتفرم (superadmin): صفحه از روی پیش‌نویس قالب با توکن یک‌بارمصرف در مسیر عمومی `/claim?token=...` در فضای کاری مشتری، روی نشانی‌ای که ادمین رزرو کرده (یا مشتری پیش از تحویل عوض کرده)، ساخته و منتشر می‌شود؛ جزئیات در ۹.۸.
- چیدمان فاز اول: فقط `single_column`.
- صفحه‌ی عمومی سبک و قابل کش (SSR، JS حداقلی، invalidate هنگام انتشار؛ جداسازی `apps/public` بعداً). لودر تمام‌صفحه‌ای که تا بارگذاری تصویرها و فونت‌ها روی محتوا می‌ماند به خاطر LCP و رتبه‌ی جستجو حذف شد (تصمیم مالک محصول ۱۴۰۵/۸/۲۰)؛ فقط آواتار پروفایل preload می‌شود.

### ۹.۲ المان‌ها
هر المان چهار دسته ویژگی دارد: **محتوا**، **رفتار**، **استایل** (override تم)، **دسترسی‌پذیری** (`visible` ستون مستقل).

| kind | محتوا |
|---|---|
| `link_button` | label، url (http/https)، آیکون (preset خودی، **هر آیکون Lucide** یا آپلودی)؛ رفتار: `open_in_new_tab`، `track_clicks`؛ استایل: `bg_color` (رنگ متن/آیکون خودکار با کنتراست بالا، ذخیره نمی‌شود) |
| `social_icons` | ردیف آیکون شبکه‌های اجتماعی (platform + url)؛ شامل شبکه‌های ایرانی آپارات، ایتا، روبیکا، بله، سروش پلاس (`splus.ir/{name}`) و آی‌گپ (`igap.net/{name}`) |
| `rich_text` | JSON ساختاریافته مثل noroform؛ هرگز HTML |
| `image` | یک تصویر آپلودی، `alt` اجباری، لینک اختیاری؛ یا **اسلایدر** تا ۱۰ تصویر (هر تصویر alt و لینک اختیاری و کادر خودش؛ نسبت ابعاد مشترک)؛ نسبت ابعاد (اصلی/۱:۱/۴:۳/۱۶:۹) و برای نسبت ثابت کادر **غیرمخرب** `crop: {x, y, zoom}` (نقطه‌ی کانونی درصدی + بزرگ‌نمایی ۱ تا ۳؛ رندر با object-position/scale، فایل اصلی دست نمی‌خورد؛ تنظیم با کشیدن، کلیدهای جهت و اسلایدر در ادیتور) |
| `video_embed` | کاربر لینک می‌دهد؛ `{provider, video_id}`؛ آپارات، یوتیوب، ویمیو |
| `map_embed` | کاربر لینک یا کد iframe می‌دهد؛ provider + شناسه/مختصات؛ گوگل‌مپ، نشان، بلد |

- **آیکون Lucide** (`{kind: 'lucide', value}`): نام به شکل کلید مجموعه‌ی `icons` در lucide-react (PascalCase، مثل `Coffee`؛ سرور فقط قالب نام را بررسی می‌کند، `LUCIDE_NAME`). norolink به lucide وابسته نیست: `LinkPage` resolver اختیاری `lucideIcon` می‌گیرد؛ صفحه‌ی عمومی آن را در سرور می‌دهد (`lib/lucide-icons.server.tsx`، بدون JS در مرورگر) و ادیتور/پیش‌نمایش/بندانگشتی فهرست مجموعه را فقط وقتی لازم است تنبل بارگذاری می‌کنند (`lib/lucide-icons.tsx`). نسخه‌ی lucide pin است؛ نام حذف‌شده در ارتقای بعدی ← جای خالی هم‌اندازه. انتخابگر آیکون: دو تب «شبکه‌ها» و «عمومی» (آیکون‌های عمومی خودی و پس از آن همه‌ی ~۲۰۰۰ آیکون Lucide) در یک شبکه‌ی فشرده‌ی ۸تایی مثل صفحه‌ی ایموجی با نمایش تدریجی ۱۶۰تایی هنگام اسکرول؛ دکمه‌ی هر آیکون بدون زمینه و آیکون انتخاب‌شده با قاب، زمینه‌ی کم‌رنگ و کمی بزرگ‌تر (`.nl-icon-grid`) و در فهرست جلو می‌آید؛ جستجو با برچسب فارسی آیکون‌های خودی و نام انگلیسی Lucide. پاپ‌اوورهای درجای بوم اگر پایین جا نداشته باشند سمتی باز می‌شوند که جای بیشتری دارد و ارتفاعشان به همان جا محدود می‌شود؛ اگر از لبه‌ی بوم بیرون بزنند به داخل جابه‌جا می‌شوند. در موبایل نوار افزودن المان هنگام تایپ پنهان می‌شود.
- **نشان شبکه‌های ایرانی** (`ui/icons.tsx`، `SOCIAL_COLORS`): ایتا و سروش پلاس از SVG رسمی سایتشان، آپارات از Simple Icons؛ بله، آی‌گپ و روبیکا فایل برداری قابل‌استفاده نداشتند و از آیکون رسمی اپ بازترسیم شدند. رنگ‌ها از همان آیکون‌ها (ایتا `#ff7634`، بله `#00b894`، سروش پلاس `#196ff0`)؛ `SOCIAL_COLORS` مقدار CSS `background` است و روبیکا (چندرنگ) و آی‌گپ گرادیان دارند. ویراستی و گپ اضافه نشدند (نشان برداری و قالب نشانی تأیید نشد؛ `gap.im` هنگام بررسی خطا داد).
- iframe همیشه از **قالب ثابت سرور** ساخته می‌شود، هرگز HTML/iframe کاربر؛ CSP صفحه‌ی عمومی فقط دامنه‌های فهرست سفید را برای frame اجازه می‌دهد.
- ترتیب المان‌ها با کلید مرتب‌پذیر کسری (جابه‌جایی فقط یک ردیف را عوض می‌کند).
- لینک‌ها: `rel="noopener nofollow ugc"`؛ فهرست سیاه فیشینگ با قاعده (`isBlockedUrl`؛ نشانی IP خام و دامنه‌ی جعلی با نام شاپرک یا زرین‌پال) مانع انتشار دکمه و لینک تصویر است (`blocked_url`).
- حذف‌شده‌ها از فاز اول: «لینک به فرم».
- **اسلایدر تصویر** (تصمیم مالک محصول ۱۴۰۵/۸/۷؛ داخل همان المان `image`، بدون migration): فیلدهای بالایی تنظیمات اسلاید اول‌اند و `slides` اسلایدهای بعدی (تا `MAX_IMAGE_SLIDES` = ۱۰ روی هم)؛ `imageSlides`/`withImageSlides` در `shared/elements.ts`. با بیش از یک تصویر alt اختیاری است (تصویر تکی همچنان alt اجباری) و لینک نامعتبر هر اسلاید مانع انتشار؛ همه‌ی تصاویر در `syncUsage` می‌آیند. رندر (`ui/slider.tsx`، تنها جزء کلاینتی صفحه): کشیدن بومی با CSS scroll-snap، شمارنده، نقطه‌ها (هدف لمسی ۲۴px)، فلش فقط روی دستگاه اشاره‌گر و هنگام hover، کلیدهای جهت (در RTL «چپ» = بعدی)، بدون چرخش خودکار، `aria-roledescription` carousel/slide؛ نسبت «اصلی» در اسلایدر = نسبت تصویر اول برای همه تا ارتفاع نپرد؛ تصویر اول eager و بقیه lazy. ادیتور: نوار بندانگشتی زیر تصویر برای انتخاب، افزودن تا ۱۰ و جابه‌جایی؛ تعویض/حذف/کادر/alt/لینک روی تصویر انتخاب‌شده.

### ۹.۳ تم (در UI: قالب)
- سطح صفحه، در تنظیمات صفحه (`theme jsonb`)، مستقل از field-engine.
- تم‌های پیش‌فرض در **کد** (نه DB)؛ کاربر preset انتخاب و سپس تغییر می‌دهد.
- ویژگی‌ها: پس‌زمینه (solid/gradient/image/**mesh** — ۲ تا ۴ لکه‌ی رنگی محو روی رنگ پایه)، کارت، دکمه (style: filled/outline/soft/**tonal** پس‌زمینه‌ی کم‌رنگ از رنگ دکمه با متن هم‌رنگ/**glass** نیمه‌شفاف با blur/**shadow** حاشیه و سایه‌ی تخت؛ radius، color)، تایپوگرافی.
- **پس‌زمینه‌ی عکس** (`shared/image-tone.ts`): عکس در لایه‌ی جدا (`.nl-bg`) زیر صفحه، **محوشدنش هم‌پای شدت لایه** (`amount` = شدت؛ لایه‌ی ۰ ← عکس واضح، تا حدود ۱۰/۲۳px در ۹۵٪، سیال)، بیرون از محاسبه‌ی ارتفاع صفحه (`.nl-bg` با `position: absolute` روی قاب، تا نسبت عکس صفحه را کش ندهد) و چسبان به بالای صفحه هنگام اسکرول (`position: sticky` داخل همان لایه؛ نه `fixed` تا در بوم ادیتور هم درست باشد) و برش با نقطه‌ی کانونی `focal`. روی آن لایه‌ی شیشه‌ای **روشن** (سفید، متن تیره) یا **تیره** (سیاه، متن روشن) با شدت `overlay`. ادیتور هنگام انتخاب عکس در مرورگر صدک ۵ و ۹۵ روشنایی آن (`luma`) را می‌گیرد؛ `minOverlay` کمترین شدتی است که متن کم‌رنگ (بیو) را روی بدترین نقطه‌ی عکس ≥ ۴.۵ نگه می‌دارد؛ **حداقل اجباری نیست** (تصمیم مالک محصول ۱۴۰۵/۸/۷): کاربر شدت را آزادانه تغییر می‌دهد و رندر همان شدت ذخیره‌شده را می‌گیرد. عکس تازه با شدت ۱۵٪ شروع می‌کند تا تا جای ممکن دیده شود (کانتینر خودکار خوانایی را تأمین می‌کند). لایه‌ی خودکار (`autoTone`) همان است که پوشش کمتری لازم دارد؛ کاربر می‌تواند روشن/تیره را دستی عوض کند. `backdrop-filter` روی کل صفحه نداریم (هزینه روی گوشی ضعیف). عکس‌های بدون `luma` (snapshotهای قبلی) همان شدت ذخیره‌شده با لایه‌ی تیره را می‌گیرند.
- **کانتینر خودکار** (تصمیم مالک محصول ۱۴۰۵/۸/۷): کارت شیشه‌ای زیر المان‌ها **فقط روی عکس** و **خودکار در شدت لایه‌ی ≤ ۱۵٪** (`CARD_MAX_OVERLAY`)، در موبایل و دسکتاپ؛ انتخاب دستی حذف شد و `theme.container` ذخیره‌شده‌ی قبلی پذیرفته ولی نادیده گرفته می‌شود (بدون عکس هرگز کانتینر نیست). پوشش شیشه فقط به اندازه‌ای است که با لایه‌ی صفحه روی هم به حد خوانایی (`readableOverlay` = `minOverlay` از `luma`، برای عکس بدون آمار ۰.۴۵) برسد: 1 − (1 − لایه)(1 − کانتینر) ≥ حد خوانایی (کمینه ۰.۱۵)، تا عکس بیرون از کانتینر تا جای ممکن دیده شود. بالای ۱۵٪ و زیر حد خوانایی، ادیتور هشدار خوانایی می‌دهد. داخل کانتینر دکمه‌ی glass بدون backdrop-filter و دکمه‌ی soft کمی تیره‌تر از سطح است.
- **رنگ متن هم‌رنگ (`--nl-accent-ink`):** متن و حاشیه‌ی outline و متن tonal همان رنگ اصلی (یا رنگ دلخواه دکمه، `--nl-btn-ink`) است، فقط اگر روی پس‌زمینه کنتراست < ۴.۵ داشته باشد به سمت رنگ متن صفحه (سیاه/سفید) برده می‌شود. پس‌زمینه‌ها: رنگ(های) پس‌زمینه‌ی قالب، بدترین نقطه‌ی عکس پس از لایه، کارت تخت، و نسخه‌ی tonal هر کدام. اگر حتی سیاه/سفید روی tonal کافی نباشد، سهم رنگ در tonal از ۱۶٪ پایین می‌آید (`--nl-tonal-mix`/`--nl-btn-mix`). تست برای همه‌ی presetها با چند رنگ اصلی. Neumorphic عمداً ساخته نشد (روی عکس و زمینه‌ی تیره خراب می‌شود و لبه‌اش کنتراست کافی ندارد).
- **اندازه‌ی متن** (`theme.text_size`: `sm`/`md`/`lg`، نبودن = md؛ ضریب ۰.۹ / ۱ / ۱.۱۵ روی همه‌ی توکن‌های تایپ با `--nl-type-scale`): از پنل قالب؛ متن بدنه هرگز زیر ۱۶px و متن دکمه زیر ۱۵px نمی‌رود (کف در `ui/styles.ts`). انتخاب کاربر است و با انتخاب قالب دیگر می‌ماند.
- در UI نام «**قالب**» است (کد و schema همان `theme`/`preset`). ۱۲ قالب آماده بر اساس روندهای رایج: کاغذی، موکا، گلبهی، اسطوخودوس، فیروزه‌ای، غروب، جنگل، نیمه‌شب، شفق، نئون، تک‌رنگ، بروتال. شناسه‌های قبلی (minimal، midnight، sand، forest، sunset، ocean، rose، mono) حفظ شده‌اند چون در صفحه‌ها ذخیره‌اند؛ کنتراست همه‌ی قالب‌ها با تست WCAG (متن ≥ ۴.۵، متن کم‌رنگ و دکمه‌ی خطی ≥ ۳) بررسی می‌شود. پنل قالب هر قالب را با کارت افقی و فشرده به سبک کارت‌های تم ویندوز نشان می‌دهد (پس‌زمینه، آواتار، نام و دو دکمه با سبک و گوشه‌ی همان قالب؛ نام در tooltip و کنار عنوان بخش). انتخاب قالب ظاهر آن را کامل می‌آورد (رنگ اصلی، سبک دکمه، گوشه و فونت به پیش‌فرض قالب برمی‌گردند)؛ عکس پس‌زمینه می‌ماند. گوشه‌ها چهار گزینه با آیکون شکل گوشه دارند (تیز، متوسط، زیاد، گرد؛ `sm` در هیچ قالبی نیست و در پنل نمی‌آید ولی مقدار ذخیره‌شده‌ی قبلی رندر می‌شود). هر گزینه‌ی «سبک دکمه» خودش به همان سبک کشیده می‌شود، روی پس‌زمینه‌ی واقعی صفحه (عکس با لایه‌اش، یا رنگ/گرادیان قالب) و با رنگ اصلی، گوشه و فونت همین صفحه.
- **تصاویر پس‌زمینه قالب‌های پیش‌فرض:** همه‌ی ۱۲ قالب آماده دارای تصویر پس‌زمینه پیش‌فرض مرتبط با تم خود هستند. قالب‌های دارای کانتینر با لایه شیشه‌ای و پوشش ملایم ۱۵٪ (`overlay: 0.15`) پیکربندی شده‌اند؛ در قالب‌های بدون کانتینر برای حفظ خوانایی متن و آیکون‌ها بر روی عکس، شدت لایه تیره بین ۶۰٪ تا ۷۰٪ (`overlay: 0.60-0.70`) تنظیم شده است.
- **ویرایش تصویر بندانگشتی و استایل‌های سفارشی:** در پنل قالب، تصویر بندانگشتی دارای دکمه‌های ویرایش درون‌خطی (تعویض مستقیم و حذف روی خود تصویر بندانگشتی) است. برای خلوت ماندن رابط کاربری، بخش استایل‌های سفارشی (رنگ اصلی، سبک دکمه، گوشه‌ها، فونت و اندازه متن) به صورت آکاردئونی جمع‌شونده (collapsible) پیاده‌سازی شده است.
- همه‌ی تنظیمات ظاهری (preset، رنگ اصلی، پس‌زمینه، سبک دکمه، گوشه، فونت) در **همه‌ی پلن‌ها** آزاد است (تصمیم مالک محصول ۱۴۰۵/۸/۷)؛ تفاوت پلن‌ها فقط در تعداد صفحه و امکانات محتوایی است. کلید `norolink.full_theme` با migration `0013_drop_full_theme` حذف شد.

### ۹.۴ آپلود
- فقط تصویر (آواتار، آیکون، تصویر المان، OG)؛ از طریق norofile (Port `FILE_SERVICE`) به‌صورت فایل **public**؛ png/jpeg/webp/gif (SVG نه)، حداکثر ۵MB، حذف متادیتا — اعتبارسنجی در norofile هنگام آپلود.
- norolink جدول فایل ندارد: `{file_id, width, height}` در `settings` المان یا `draft_content` صفحه (uuid ساده، بدون FK) و استفاده با `syncUsage(owner = norolink_page)` در همان تراکنش ثبت می‌شود.
- استثنا: تصاویر ثابت قالب‌ها (`apps/web/public/images/templates`) با `file_id` = مسیر `/images/templates/{name}.(jpg|png|webp)` و تصاویر قالب‌های مدیریت پلتفرم با `file_id` = `platform/{uuid}` (فایل پلتفرم norofile، §۹.۹)؛ فقط همین دو الگو یا uuid پذیرفته می‌شود (هرگز آدرس بیرونی) و این دو در norofile همگام نمی‌شوند.

### ۹.۵ آمار
- رویدادها: `page_view`، `element_click`؛ ثبت با `sendBeacon` (لینک مستقیم، بدون redirect).
- داده: زمان، دستگاه، OS، مرورگر، دامنه‌ی referrer، هش بازدیدکننده‌ی یکتا با salt روزانه‌ی چرخشی (بدون IP خام). GeoIP بعد از لانچ.
- فقط رویداد خام ذخیره می‌شود و گزارش‌ها با query ساخته می‌شوند؛ جدول تجمیعی فقط اگر حجم لازم کرد (بعداً). سیاست نگه‌داری (retention) هنوز باز است.
- جدول رویداد هم `tenant_id` + RLS دارد.

### ۹.۶ محدودیت پلن (از مرحله‌ی ۱۱.۶ داده؛ §۹.۱۱)
- پایه: ۱ صفحه، ۵۰ المان در هر صفحه، آمار پایه؛ ۱۴ روز اول رایگان.
- حرفه‌ای: صفحات بیشتر، آمار کامل (ظاهر در همه‌ی پلن‌ها آزاد است؛ §۹.۳).
- پلن فعال نیست ← صفحه‌ها غیرفعال و انتشار بسته (§۹.۱۱).
- نشان «Powered by Noroset» در انتهای صفحه‌ی لینک و بدون جایگاه ثابت (با اسکرول جابه‌جا می‌شود؛ صفحه‌ی کم‌المان تمام ارتفاع نمایشگر را می‌گیرد و نشان پایین آن است) در **همه‌ی پلن‌ها** نمایش داده می‌شود (تصمیم مالک محصول ۱۴۰۵/۸/۷؛ `limitsFor().forceBranding` همیشه true)؛ `branding.remove` فقط فرم‌ها را از نشان معاف می‌کند.
- اعمال در سرویس بک‌اند (نه فقط UI) از طریق Port entitlements در `@noroset/core`.

### ۹.۷ پیاده‌سازی DB (`packages/db/src/norolink.schema.ts`، migration `0004_norolink`)
| جدول | نقش | دسترسی `noroset_app` |
|---|---|---|
| `norolink_pages` | slug (زیردامنه؛ یکتا در پلتفرم، ≤ ۶۳، trigger رزرو)، `status` (draft/published)، `draft_content` (`{profile, theme, seo, layout}`)، `published_snapshot` | SELECT/INSERT/UPDATE/DELETE |
| `norolink_elements` | المان‌های **پیش‌نویس**: `kind`، `sort_key` (کلید کسری `[0-9A-Za-z]`، یکتا در صفحه؛ مرتب‌سازی با `COLLATE "C"`)، `settings`، `visible` | SELECT/INSERT/UPDATE/DELETE |
| `norolink_page_stats` | آمار صفحه، هر رویداد یک ردیف (`page_view` بدون المان / `element_click` با المان)، `visitor_hash`، دستگاه، OS، مرورگر، دامنه‌ی referrer؛ بدون IP | SELECT/INSERT (append-only) |

- همه با `tenant_id`، RLS + FORCE، FK مرکب `(page_id, tenant_id)` با cascade. `element_id` رویداد/آمار عمداً FK ندارد (snapshot زنده ممکن است المانی را داشته باشد که از پیش‌نویس حذف شده).
- **انتشار:** سرویس، `draft_content` و المان‌های visible (به ترتیب `sort_key`) را در `published_snapshot` = `{content, elements[]}` کپی و `status=published` می‌کند. CHECK: published ⇒ snapshot موجود.
- **مسیر عمومی** (`norolink-public.ts`): policy جدای `norolink_pages_public_select` با `app.public_link_slug` فقط همان صفحه‌ی published را نشان می‌دهد؛ `findPublicLinkPage(slug)` فقط snapshot را برمی‌گرداند (هرگز `draft_content` یا `norolink_elements`)، tenant معلق ← null؛ `insertPublicLinkEvent(...)` فقط رویداد INSERT می‌کند و `element_id` کلیک باید در snapshot باشد.
- زیردامنه‌های زیرساختی (www، mail، cdn، assets، status، docs، help، support، blog) به `reserved_slugs` اضافه شدند؛ `templates` در migration `0012`.
- فقط سه جدول (صفحه، المان، آمار صفحه)؛ تصویر آپلودی جدول ندارد (بخش ۹.۴).
- باز: retention آمار (پاک‌سازی با نقش migrator، مثل `cleanup_expired_auth`). فایل‌های بی‌استفاده (تعویض تصویر/حذف صفحه) در مدیر فایل norofile می‌مانند و کاربر حذفشان می‌کند.

### ۹.۸ پیاده‌سازی API و UI
- **پکیج `products/norolink`:** `shared/` موتور خالص (zod؛ بدون React/Nest/DB): schema المان‌ها و محتوا، تم و presetها، رنگ کنتراست خودکار، متن غنی، تحلیل لینک ویدیو/نقشه، کلید مرتب‌سازی کسری، سقف پلن‌ها. `api/` ماژول Nest؛ `ui/` دیزاین سیستم و رندر صفحه (`@noroset/norolink/ui`).
- **API پنل** (tenant-scoped): `GET/POST /norolink/pages`، `GET /norolink/pages/by-slug/:slug`، `GET/PATCH/DELETE /norolink/pages/:id`، `POST …/:id/publish|unpublish` (owner/admin، حذف هم)، `POST …/:id/elements` (`{kind, afterId?}`)، `PATCH|DELETE …/elements/:elementId`، `POST …/elements/:elementId/move` (`up|down`)، `POST …/:id/uploads` (بدنه‌ی خام تصویر)، `GET …/:id/stats?from&to`.
- **فهرست و ساخت:** `GET /norolink/pages` هر ردیف `createdBy`/`createdByName` و `preview: {content, elements, assetBaseUrl}` (پیش‌نویس و حداکثر ۶ المان قابل‌نمایش اول؛ تصویر بندانگشتی همان `LinkPage`) دارد. `POST /norolink/pages` `{title, slug?, content?, elements?: [{kind, settings?}]}`: محتوا و المان‌های آغازین (قالب) با همان قواعد ویرایش (schema محتوا، تنظیمات هر نوع با پیش‌فرض‌ها ادغام و parse، سقف و نوع المان پلن، تم کامل، تصاویر فقط فایل public همین فضای کاری یا تصویر قالب) در یک تراکنش؛ داده‌ی مشتق ویدیو/نقشه از همان لینک‌ها در سرور ساخته می‌شود.
- **عنوان صفحه = نام پروفایل:** یک مقدارند: ویرایش در هدر ادیتور یا روی بوم هر دو را همان لحظه عوض می‌کند و سرور هم `title` و `profile.name` را با هم نگه می‌دارد (`pages.service`). صفحه‌های قدیمی که این دو در آن‌ها فرق داشت با نام پروفایل نمایش داده می‌شوند؛ نام خالی در پیش‌نویس آخرین عنوان را نگه می‌دارد.
- **دیالوگ صفحه‌ی جدید** (`(panel)/link/create-link.tsx`؛ «صفحه‌ی خالی»، دکمه‌ی شناور و هر قالب گالری): سه مرحله: عنوان (اجباری؛ عنوان صفحه و نام پروفایل) و توضیحات اختیاری (`profile.bio`)؛ نشانی صفحه (`slug`؛ رد کردن ← نشانی تصادفی؛ یکتایی هنگام ساخت سنجیده می‌شود و خطا کاربر را به همین مرحله برمی‌گرداند)؛ عکس صفحه (`profile.avatar`). توضیحات و عکس ردشده در صفحه‌ی خالی خالی می‌مانند و در قالب نمونه‌ی خودش را نگه می‌دارند (`new-link-page.ts`). «نمایش در جستجو و اشتراک‌گذاری» (`seo`) در صفحه‌ی تازه خالی است، حتی اگر قالب مقدار نمونه داشته باشد؛ خالی یعنی همان عنوان، توضیحات و عکس صفحه، پس با ویرایش بعدی آن‌ها هم به‌روز می‌ماند. صفحه تا پایان مرحله‌ی سوم ساخته نمی‌شود، پس عکس مستقیم در norofile (public) بارگذاری می‌شود و انصراف، فایل را در کتابخانه باقی می‌گذارد. هنگام باز شدن، مصرف از `GET /billing` خوانده می‌شود و اگر سقف صفحه‌ها پر باشد به‌جای فرم پیام ارتقا می‌آید؛ بررسی اصلی همچنان در سرور است.
- **پیش‌نمایش قالب قبل از ساخت (`TemplatePreviewDialog`):** کلیک روی کارت هر قالب آماده (چه در گالری قالب‌ها `/link/templates` و چه در نوار شروع `/link`)، ابتدا دیالوگ پیش‌نمایش تمام‌صفحه و واکنش‌گرا با فریم موبایل و سوئیچ دسکتاپ/موبایل را باز می‌کند؛ کاربر با کلیک روی «استفاده از این قالب» وارد فرایند سه مرحله‌ای ساخت صفحه می‌شود. هر دو قاب نسبت ثابت دارند: موبایل ۳۹۰×۸۴۴ (با حاشیه‌ی ۸px) و دسکتاپ ۱۰۲۴×۶۴۰ (۱۶:۱۰، با نوار مرورگر در همان ارتفاع)؛ صفحه در عرض واقعی همان قاب (۳۹۰px موبایل، ستون دسکتاپ تا ۷۲۰px) رندر می‌شود و کل قاب با `zoom` در صحنه جا می‌شود (تا اندازه‌ی واقعی و بدون بزرگ‌نمایی). به این ترتیب ارتفاع پنجره اندازه‌ها و نسبت قاب را به‌هم نمی‌زند و توکن‌های سیال همان اندازه‌ی واقعی موبایل/دسکتاپ را می‌دهند. اسکرول‌های داخل موکاپ (صفحه‌ی لینک و صحنه) بدون نوار اسکرول‌اند تا شبیه صفحه‌ی واقعی دیده شوند.
- **تصاویر ثابت به‌جای رندر زنده** (تصمیم مالک محصول ۱۴۰۵/۸/۱۶): موکاپ‌های مارکتینگ و بندانگشتی گالری قالب‌ها دیگر `LinkPage` یا UI ساختگی را در مرورگر رندر نمی‌کنند. سه دسته: (۱) **قالب‌های کد و صفحه‌ی داخل موکاپ‌ها** (`public/images/template-thumbs`، `public/images/mockups`؛ روشن/تیره): با `pnpm --filter @noroset/web shots` از روی همان کد با Chrome بدون رابط ساخته می‌شوند (`/shots` فقط در توسعه؛ `scripts/shots.mjs` اگر سرور توسعه بالا نباشد خودش اجرا می‌کند). نام فایل اثر انگشت ورودی‌ها را دارد (`src/lib/shots.generated.json`) و فقط تصویرهای تغییرکرده ساخته و نسخه‌ی قبلی پاک می‌شود، پس کش immutable همیشه آخرین تصویر را می‌دهد؛ تغییر کد قالب یا موکاپ بدون اجرای اسکریپت تست `marketing-shots` را می‌شکند. ابعاد (۲x): بندانگشتی ۷۲۰×۱۲۸۰، صفحه‌ی موبایل ۴۹۰×۹۰۰، بدنه‌ی دسکتاپ ۱۹۲۰×۸۸۰. (۲) **قالب‌های مدیریت پلتفرم:** هنگام «انتشار» مرورگر superadmin بندانگشتی ۳۶۰×۶۴۰ (۲x، WebP، `html-to-image`) می‌سازد، در فضای پلتفرم norofile بارگذاری و `file_id` آن را با `POST …/publish` `{thumb}` در `published_snapshot.thumb` می‌گذارد (بدون migration)؛ گالری `thumb` را برمی‌گرداند و شکست ساخت تصویر مانع انتشار نیست (رندر زنده). (۳) **بخش امکانات صفحه‌ی اصلی:** تصاویر دستی و ثابت در `public/images/features/{kind}.webp` (۷۲۰×۱۳۶۰)؛ جایگزینی فایل با همان نام، بدون اسکریپت. فهرست صفحه‌های کاربر و ادیتورها همچنان زنده رندر می‌شوند.
- **نمایش قالب‌ها در فضای کاری خالی:** در صفحه‌ی اصلی `/link`، چنانچه هیچ صفحه‌ای در فضای کاری ایجاد نشده باشد (`hasNoPages`)، ارتفاع کارت‌های نوار شروع قالب‌ها دو برابر می‌شود (`aspect-[2/3]` به جای `aspect-[4/3]`) تا کاربر بلافاصله ترغیب به انتخاب و آغاز کار با یک قالب آماده شود.
- **قالب‌های پیش‌فرض** (`shared/templates.ts`؛ `LINK_TEMPLATES` به تفکیک دسته‌ی شخصی/کسب‌وکار/تولید محتوا و رویداد): محتوا (پروفایل و preset قالب ظاهری) و المان‌ها فقط با تفاوت از پیش‌فرض. تست: هر قالب در پلن رایگان ساخته می‌شود.
- **قالب‌های مدیریت پلتفرم** (تصمیم مالک محصول ۱۴۰۵/۸/۱۰؛ `api/templates`، فقط superadmin): `/admin/templates` قالب‌ها را نشان می‌دهد و قالب جدید با **همان ادیتور صفحه‌ی لینک** ساخته می‌شود (`_components/link-editor.tsx` با `EditorTarget`؛ مسیرهای `/norolink/admin/templates/:id…` هم‌شکل `/norolink/pages/:id…` و بدون tenant و نشانی). داده در `norolink_templates` (`draft_content`، `draft_elements` jsonb با قفل ردیف، `published_snapshot`): مثل صفحه پیش‌نویس و انتشار دارد و گالری فقط snapshot را می‌خواند، پس ویرایش تا انتشار دوباره به کاربران نمی‌رسد؛ عنوان، توضیح و دسته همان لحظه اعمال می‌شوند. عنوان قالب مستقل از نام پروفایل نمونه است. سقف المان‌ها = سقف پلن رایگان تا قالب در هر پلنی صفحه بسازد. تصویر: فقط فایل پلتفرم یا تصویر ثابت (فایل یک فضای کاری ← ۴۲۲ `invalid_asset`). **حذف:** قالب ساخته‌شده برای همیشه حذف می‌شود؛ قالب پیش‌فرض در `norolink_removed_templates` علامت می‌خورد و از گالری می‌رود، داده در کد می‌ماند و قابل بازگردانی است. صفحه‌های ساخته‌شده از قالب کپی خودشان را دارند و با حذف قالب دست نمی‌خورند. لاگ ممیزی (`link_template.*`، target `link_template`) فقط برای آنچه گالری را تغییر می‌دهد؛ ذخیره‌های خودکار پیش‌نویس لاگ نمی‌شوند. گالری کاربران: `GET /norolink/templates` (هر کاربر واردشده؛ منتشرشده‌ها، جدیدترین اول، و پیش‌فرض‌های برداشته‌نشده)؛ نوار «شروع» صفحه‌ی `/link` قالب‌های تازه را اول نشان می‌دهد.
- **واگذاری صفحه به مشتری** (`noroset.com/claim?token=…`؛ تصمیم مالک محصول ۱۴۰۵/۸/۱۰: لینک مختص شماره موبایل نیست، و فقط از ادیتور قالب‌های مدیریت پلتفرم؛ بازطراحی ۱۴۰۵/۸/۱۷ پس از تست زنده‌ی قیف): superadmin از تب «واگذاری به مشتری» دیالوگ انتشار قالب، با **نام کسب‌وکار**، **نشانی صفحه** (پیشنهاد از شناسه‌ی اینستاگرام صفحه) و **یادداشت** اختیاری (مثلاً کانال و فروشنده) لینک می‌سازد (`POST /norolink/admin/templates/:id/claim-token` `{slug, businessName, note?}`، `DELETE` همان مسیر برای ابطال؛ بررسی نشانی `GET /norolink/admin/claim-links/check-slug`؛ لاگ ممیزی `link_template.claim_link|claim_revoke`)، متن آماده‌ی پیام را کپی و از هر راهی برای کسب‌وکار می‌فرستد (متن پیام نشانی صفحه و ۱۴ روز رایگان را نمی‌گوید: پیام‌رسان‌ها نشانی را لینک می‌کنند و صفحه هنوز منتشر نشده)؛ **لینک کوتاه** `noroset.com/c/{code}` (کد ۱۲ نویسه‌ی `[A-Za-z0-9]`، حدود ۷۱ بیت؛ لینک‌های قدیمی ۳۲ نویسه‌ی hex هم کار می‌کنند) که وب (`app/c/[code]/route.ts`) به `/claim?token=…` با UTM ریدایرکت می‌کند؛ هر کس زودتر با لینک تحویل بگیرد صاحب صفحه می‌شود، پس لینک حکم کلید دارد. **داده:** هر لینک یک ردیف در `norolink_claim_links` (migration `0023`؛ سطح پلتفرم، RLS ادمین و دارنده‌ی توکن با `app.claim_token`) و سابقه‌اش می‌ماند؛ ستون‌های `claim_token`/`claimed_at` روی `norolink_templates` منسوخ‌اند (§۱۱). لینک فعال با درخواست دوباره عوض نمی‌شود و فقط با ابطال یا تحویل از کار می‌افتد؛ قالب ناقص لینک نمی‌گیرد (۴۲۲ `not_publishable`) و انتشار در گالری لازم نیست. **نشانی رزروشده:** تا تحویل یا ابطال هیچ صفحه‌ای در هیچ tenant آن را نمی‌گیرد (trigger `check_norolink_slug_claim` روی `norolink_pages`، همان خطای یکتایی؛ `checkNorolinkSlug` هم آن را گرفته‌شده می‌داند) و دو لینک فعال نشانی یکسان ندارند. مشتری روی صفحه‌ی تحویل می‌تواند پیش از تحویل نشانی دیگری بخواهد (`GET /norolink/public/pages/claim/:token/check-slug`، `POST /norolink/pages/claim/:token` `{slug?}`؛ نشانی گرفته‌شده ← ۴۰۹ `slug_taken`)؛ نشانی هنگام ساخت جزو سقف ۳ تغییر نیست. لینک‌های منتقل‌شده از قبل نشانی ندارند و تصادفی می‌گیرند. **صفحه‌ی تحویل** (`apps/web/src/app/claim`، بیرون از لایه‌ی مارکتینگ): خود صفحه تمام‌صفحه همان‌طور که منتشر می‌شود، و یک برگه‌ی کوچک جمع‌شدنی روی آن (موبایل: چسبیده به پایین با دکمه‌ی همیشه در دسترس؛ دسکتاپ: کارت پایین وسط) با نام کسب‌وکار، نشانی و دکمه‌ی «تغییر»، و دکمه‌ی «ورود با موبایل و تحویل صفحه» یا «تأیید و تحویل صفحه»؛ ارتفاع برگه به پایین صفحه اضافه می‌شود تا انتهای صفحه زیر آن نماند. **تحویل:** ورود با OTP (کارت ورود با `for` می‌گوید «ورود برای تحویل صفحه‌ی …» و کد ۶رقمی خودکار ارسال می‌شود؛ نشانی انتخاب‌شده در آدرس بازگشت می‌ماند)، سپس یک کلیک تأیید (رضایت صریح برای انتشار به نام مشتری)؛ در یک تراکنش صفحه‌ی تازه از روی **آخرین پیش‌نویس** قالب در فضای کاری مشتری ساخته و لینک با کاربر، tenant، صفحه و نشانی نهایی علامت می‌خورد (`claimNorolinkTemplate`، قفل ردیف لینک؛ دو تحویل هم‌زمان ممکن نیست)، انتشار و شروع ۱۴ روز رایگان اگر مصرف نشده باشد؛ سقف تعداد صفحه‌ی پلن جلوی تحویل را نمی‌گیرد. اگر پیش‌نویس بعد از ساخت لینک ناقص شده باشد صفحه پیش‌نویس می‌ماند و مشتری کاملش می‌کند. پس از تحویل (و فقط آن‌جا) «۱۴ روز رایگان فعال شد» با قیمت کوتاه‌ترین دوره‌ی پلن پایه (`GET /billing/plans`) و دکمه‌ی «خرید پلن» کنارش می‌آید؛ اقدام اصلی «کپی لینک برای بیوی اینستاگرام» با راهنمای یک‌خطی است و «ویرایش صفحه» زیر آن. **پیش‌نمایش ادیتور** (`?preview=1`): شمرده نمی‌شود و دکمه‌ی تحویل غیرفعال است تا صفحه به حساب خود ادمین نرود. **قیف:** هر باز شدن صفحه‌ی تحویل (جز ربات‌ها و پیش‌نمایش لینک پیام‌رسان‌ها، `isBot`) در `open_count` ثبت می‌شود؛ ریدایرکت لینک کوتاه UTM ثابت `utm_source=norolink&utm_medium=claim-link` می‌گذارد تا ثبت‌نام‌ها در گزارش UTM هم جدا دیده شوند. `/admin/campaigns` قیف «ساخته‌شده ← باز شده ← تحویل‌گرفته ← پرداخت‌کرده» و جدول ۲۰۰ لینک آخر را نشان می‌دهد (`GET /norolink/admin/claim-links`: نام کسب‌وکار، نشانی، یادداشت، سازنده، باز شدن، تحویل‌گیرنده، پلن جاری و جمع پرداخت‌ها)؛ پلن و پرداخت از Port `PLAN_RESOLVER` (`paidRial`) می‌آید و norolink جدول‌های billing را نمی‌خواند. **قالب می‌ماند:** صفحه‌ی مشتری کپی مستقل است و برای مشتری بعدی می‌توان لینک تازه ساخت. **تصویرها:** تصویر قالب فقط فایل پلتفرم یا ایستاست، پس کپی فایلی لازم نیست. **فایل لینک‌ها:** همان بخش لینک‌های فعال را در `claim-links.txt` می‌دهد (`GET /norolink/admin/claim-links/export.txt`، فقط superadmin؛ برای هر لینک نام کسب‌وکار و زیرش نشانی). فایل هر بار از DB ساخته می‌شود، پس همیشه به‌روز است؛ چون لینک‌ها کلیدند، هر دانلود در لاگ ممیزی می‌آید (`link_claim.export`).
- **داده‌ی مشتق هنگام ساخت از قالب:** مثل ویرایش فقط در سرور از `source_url` ساخته می‌شود (`embeds/derive.ts`)، پس ویدیو و نقشه‌ی قالب در صفحه‌ی تازه کار می‌کنند و مقدار فرستاده‌شده از کلاینت پذیرفته نمی‌شود. قالب‌های فرم در وب‌اند (`apps/web/src/app/(panel)/form/templates.ts`) و پیش‌نویس را با `draftDefinition` می‌سازند؛ همه با `validateDefinition` قابل انتشارند (تست وب).
- **API عمومی:** `GET /norolink/public/pages/:slug` (فقط snapshot)، `POST …/:slug/events` (`page_view|element_click`؛ ربات‌ها نادیده؛ ۱۲۰/دقیقه به‌ازای IP).
- پیش‌نویس ناقص ذخیره می‌شود؛ انتشار با `publishIssues` (۴۲۲ `not_publishable`). داده‌ی مشتق ویدیو (`{provider, video_id}`) و نقشه (مختصات؛ لینک کوتاه با دنبال‌کردن redirect فقط روی دامنه‌های گوگل/نشان/بلد) فقط در سرور از `source_url` ساخته می‌شود؛ نقشه از قالب ثابت (`mapEmbedUrl`؛ تصمیم مالک محصول ۱۴۰۵/۸/۹): iframe رسمی بلد برای مکان (`place_token`) و گوگل برای `pb`، و بقیه (نشان، بلد بدون مکان) گوگل‌مپ از مختصات و دکمه‌ی «مسیریابی» به لینک اصلی (`mapLinkUrl`). **کد iframe:** کاربر می‌تواند کد iframe را بچسباند؛ `normalizeEmbedSource` (در schema سرور و ادیتور) فقط `src` را برمی‌دارد و HTML هرگز ذخیره نمی‌شود؛ از آن فقط داده‌ی اعتبارسنجی‌شده می‌ماند (`place_token` بلد، `pb` گوگل با `!2d!3d`، و فقط مختصات از src نشان) و دامنه‌ها در `FRAME_SOURCES` (CSP صفحه‌ی عمومی). مسیر iframe نشان قابل استفاده نیست: `/maps/iframe/{lat}/{lng}` به مکانی ثابت در مرکز ایران می‌رود و با شناسه‌ی مکان خالی می‌ماند، پس نشان در `FRAME_SOURCES` نیست. **بلد:** لینک اشتراک `balad.ir/p/{token}` مختصات ندارد؛ سرور صفحه‌ی مکان را (فقط روی خود بلد) می‌خواند و سنجاق را از `GeoCoordinates` برمی‌دارد؛ هش نوار آدرس (`#zoom/lat/lng`) مرکز نقشه است و فقط اگر صفحه خوانده نشد به کار می‌رود. **نشان:** `/maps/@…`، هش نوار آدرس `#c{lat}-{lng}-{zoom}z` (مرکز نقشه، دقت سه رقم اعشار)، `/maps/share/{lat},{lng}` و `nshn.ir/?lat&lng` پذیرفته می‌شوند؛ `/maps/places/{id}` بدون هش مختصات ندارد (صفحه با JS ساخته می‌شود و API عمومی بدون کلید نیست) و ادیتور راهنمای نوار آدرس را نشان می‌دهد.
- **ورودی هوشمند لینک** (`shared/links.ts`، مشترک ادیتور و schema سرور): لینک بدون https نرمال می‌شود (`example.com` ← `https://example.com`)؛ شبکه‌ها `@شناسه`، لینک ناقص، شماره‌ی موبایل یا تلفن ثابت ایران با ارقام لاتین/فارسی/عربی (واتس‌اپ ← `wa.me`، تلفن ← E.164) و ایمیل را می‌پذیرند؛ شبکه‌ی آیتم از روی لینک عوض می‌شود، جز شماره در آیتم واتس‌اپ که واتس‌اپ می‌ماند (`socialPlatformFor`). لینک نامعتبر/ناشناخته **ذخیره می‌شود** (تا بقیه‌ی تغییرات المان از دست نرود) و فقط مانع انتشار است (`invalid_url`، `invalid_social`، `missing_video`، `missing_location`)؛ رندر عمومی فقط لینک http(s) معتبر را href می‌کند. ادیتور: نرمال‌سازی هنگام چسباندن/خروج از فیلد؛ در آیتم شبکه‌های اجتماعی شبکه و لینک هنگام تایپ همان لحظه روی بوم اعمال می‌شوند (`applySocialInput`؛ ورودی همان متن خام می‌ماند، لینک نهایی زیرش نشان داده می‌شود و شبکه‌ای که کاربر دستی انتخاب کرده عوض نمی‌شود)؛ دکمه‌ی «چسباندن»، تشخیص شبکه و آیکون/عنوان پیشنهادی دکمه از لینک، چسباندن روی بوم برای ساخت المان مناسب (ویدیو/نقشه/دکمه/متن/تصویر)، حذف با مهلت ۵ ثانیه‌ای بازگردانی. کارت ویرایش: وضعیت ذخیره‌ی هر المان در سرتیتر، میانبرها (Alt+↑/↓، Ctrl+D، Delete، Esc)، هدف لمسی ۴۴px روی صفحه‌ی لمسی، دکمه‌ی آزمایش لینک، ویرایشگر متن غنی WYSIWYG (`rich-editor.tsx`؛ contentEditable که خروجی‌اش همیشه JSON ساختاریافته است و چسباندن فقط متن ساده؛ نوار ابزار: منوی بازشوی اندازه‌ی متن و تیترها، گروه پررنگ/کج/لینک و گروه فهرست‌ها؛ Ctrl+B/I)، alt پیشنهادی از نام فایل، لینک تصویر فقط با «افزودن لینک»، جستجوی آیکون، جابه‌جایی شبکه‌ها با کشیدن و نشانگر مقدار ناقص.
- **آپلود:** `POST …/:id/uploads` مالکیت صفحه را بررسی و فایل را به norofile می‌دهد (`accept: image`، ≤ ۵MB، public، `source: norolink`)؛ پاسخ `{file_id, width, height, url}`. اشاره به فایل tenant دیگر، خصوصی یا غیرتصویر ← ۴۲۲ `invalid_asset`. `assetBaseUrl` = مسیر عمومی norofile.
- **سقف پلن** (Port `PLAN_RESOLVER` در core؛ مقدارها از پلن tenant، `limitsFor` در `api/access.ts`): خطای ۴۰۳ `{message: 'plan_limit', limit}`.
- **دیزاین سیستم صفحه‌ی لینک** (`products/norolink/ui`): مستقل از `@noroset/ui`/Tailwind؛ CSS درون‌خطی زیر `.nl-root` که همه‌ی رنگ/گوشه/فونت را از متغیرهای `--nl-*` می‌گیرد (`resolveTheme`). تم جدید = یک preset جدید در `shared/theme.ts` (پس‌زمینه solid/gradient/image، رنگ متن، muted، accent، surface، سبک دکمه filled/outline/soft، گوشه، فونت). آیکون‌ها SVG خطی خودی. رندر بدون hook تا در Server Component صفحه‌ی عمومی و پیش‌نمایش ادیتور یکی باشد.
- **اندازه‌های سیال** (`ui/styles.ts`): همه‌ی اندازه‌ها (تایپ، فاصله، اجزا، گوشه‌های تم کم/متوسط/زیاد) توکن‌های `--nl-*` روی `.nl-root` با `fluid(min, max)` هستند: یک بازه‌ی مشترک عرض صفحه (۳۶۰ ← ۷۲۰px، با `cqi` روی قاب container `.nl-frame` نه viewport؛ بوم ادیتور، پیش‌نمایش و صفحه‌ی عمومی یکسان‌اند) تا همه با هم و هم‌نسبت تغییر کنند؛ دسکتاپ (ستون ۷۲۰px) حداکثر ۱.۴ برابر موبایل. **ستون دسکتاپ ۷۲۰px** (تصمیم مالک محصول ۱۴۰۵/۸/۹) و همه‌ی المان‌ها، از جمله دکمه‌ی لینک، تمام‌عرض ستون. آیکون‌های شبکه دایره‌ای به رنگ برند هر شبکه (`SOCIAL_COLORS`، آیکون سفید ۴۰/۵۰ در دایره‌ی ۶۴/۸۰) با زیرنویس نام شبکه. فاصله‌ی دو المان از دو نوع متفاوت دو برابر فاصله‌ی دو المان هم‌نوع است (`.nl-el--break`). تایپ Minor Third (۱.۲) با بدنه‌ی ۱۶/۱۸ و نام ۲۴/۳۳، فاصله روی شبکه‌ی ۴px، هدف لمسی ≥ ۴۴px (دکمه ۴۸/۶۰ با متن ۱۵/۱۷)، آواتار ۱۰۴/۱۴۴ (کنار هم ۹۶/۱۳۲). ابزارهای کارت ویرایش ادیتور ثابت‌اند (رابط پنل).
- **نمای بوم ادیتور:** سوئیچ «موبایل/دسکتاپ» در هدر ادیتور (انتخاب در localStorage): موبایل = قاب ۴۳۰px، دسکتاپ = فضای باقی‌مانده تا ۱۱۰۰px با عکس پس‌زمینه دور ستون. پنل قالب در کنار بوم جا می‌گیرد (روی آن شناور نیست) و بوم با فضای باقی‌مانده پس از پنل و جای ریل (۱۶۰px) اندازه می‌شود؛ اگر این فضا به عرض دسکتاپ صفحه (۶۴۰px، `DESKTOP_MIN_WIDTH`) نرسد، یا در موبایل، سوئیچ پنهان و بوم موبایل است (انتخاب ذخیره‌شده می‌ماند و با باز شدن جا برمی‌گردد). ریل افزودن المان با `--canvas-half` کنار لبه‌ی بوم می‌ماند.
- **انتشار و تنظیمات صفحه:** دکمه‌ی «انتشار» هدر ادیتور یک دیالوگ یکپارچه باز می‌کند و تنظیمات صفحه دیگر در منوی «⋯» نیست. دو تب دارد: «انتشار» (موارد مانع و نشانی) و «جستجو و اشتراک‌گذاری» (کلید نمایش در موتورهای جستجو، نمای نتیجه‌ی گوگل که عنوان و توضیح متا روی خودش ویرایش می‌شوند با شمارنده‌ی ۶۰/۱۶۰ نویسه، و کارت اشتراک برای تصویر). سرتیتر یک خط وضعیت دارد (منتشرشده + زمان آخرین انتشار / تغییر منتشرنشده / هنوز منتشر نشده). بدنه: موارد مانع انتشار (`publishIssues`) با نام المان که با کلیک دیالوگ را می‌بندند و همان المان/پروفایل را انتخاب و فیلد اصلی‌اش را فوکوس می‌کنند؛ **کادر نشانی** یکی است: زیردامنه در جا ویرایش می‌شود و بدون تغییر «کپی» و «مشاهده» دارد، با تغییر «ذخیره‌ی نشانی» و «انصراف» (Enter/Esc؛ چون لینک قبلی از کار می‌افتد؛ نشانی مرورگر با `history.replaceState` عوض می‌شود تا ویرایشگر و دیالوگ باز بمانند)؛ **کارت اشتراک‌گذاری**: تصویرش با کلیک عوض می‌شود و عنوان و توضیحش همان متای نمای گوگل است (خالی = نام، بیو و تصویر پروفایل؛ ذخیره‌ی خودکار). **پاورقی:** آمار، لغو انتشار و حذف (تأیید هر دو جای همان پاورقی می‌آید؛ در موبایل فقط آیکون) و «بستن» + اقدام اصلی (پیش‌نویس ← «انتشار»، تغییر منتشرنشده ← «انتشار تغییرات»، به‌روز ← «مشاهده‌ی صفحه»)؛ فوکوس اولیه روی «بستن». انتشار/لغو موفق دیالوگ را می‌بندد و **اعلان ثابت در مرکز صفحه** نشان می‌دهد که خودکار بسته نمی‌شود (فقط با «بستن» کاربر) و پس از انتشار دکمه‌ی «اشتراک‌گذاری» (اشتراک سیستم‌عامل، وگرنه کپی نشانی) و «مشاهده» دارد (نشانی‌ها و لینک‌ها با ارقام لاتین/انگلیسی `toEnDigits` و برچسب‌های متنی با ارقام فارسی رندر می‌شوند)؛ خطا در خود دیالوگ می‌ماند. انتشار، لغو و حذف فقط برای مالک و مدیر؛ عضو عادی توضیح آن را می‌بیند.
- **فضای طراحی:** پیش‌نمایش (دکمه‌ی «پیش‌نمایش» هدر) **تمام‌صفحه** است: دسکتاپ تمام عرض، موبایل در قاب گوشی. روی پس‌زمینه‌ی عکس، زیر کارت ویرایش درجای هر المان یک لایه‌ی هم‌رنگ لایه‌ی عکس با **دو برابر شدت** آن (حداکثر ۹۵٪) و blur ۱۲px می‌آید تا فیلدها خوانا بمانند؛ فقط CSS ادیتور است و روی صفحه‌ی منتشرشده اثری ندارد. اسکرول‌های فضای طراحی (بوم، پنل قالب، دیالوگ انتشار، پیش‌نمایش) خنثی و باریک‌اند و فقط هنگام اشاره دیده می‌شوند (`hoverScroll`، `hoverNativeScroll` در `editor-ui.tsx`).
- **هدر و ناوبری پنل (تصمیم‌های محصول):**
  - **منوی همبرگری (`ProductNavMenu`):** در سمت راست هدر (`PlatformBar` و `ProductBar`)، قبل از لوگو، تنها منوی پوسته است (تصمیم مالک محصول ۱۴۰۵/۸/۱۲: هدر آواتار ندارد) با ساختار بهینه و کم‌حجم UX: کارت هویت و نشان اشتراک کاربر (کلیک بازکننده حساب کاربری)، فضاهای کاری (در صورت عضویت در بیش از یک فضا)، سوئیچ محصولات نوروست (نورولینک، نوروفایل، نوروفرم)، پنل بازشوی پشتیبانی با راه‌های ارتباطی و شماره تماس فارسی راست‌چین، و خروج.
  - **پشتیبانی:** دکمه‌ی شناور پشتیبانی (`components/floating-support.tsx`) فقط در صفحه‌های مارکتینگ (و ورود) است؛ در پنل و ادیتورها کاربر از پنل پشتیبانی همین منوی همبرگری اقدام می‌کند (درخواست مالک محصول ۱۴۰۵/۸/۲۰).
  - **طراحی بدون سایدبار:** کل محیط پنل فاقد سایدبار ستونی سنتی است (`PlatformBar` و `ProductBar`) و تمام ناوبری بین محصولات از هدر یکپارچه و منوی همبرگری عمودی انجام می‌شود.
  - منوی سه‌نقطه در ادیتور: «گالری تم‌ها» پنل قالب را باز می‌کند و «آموزش ویدیویی» تا آماده‌شدن ویدیو غیرفعال است.
- **پنل:** ساختار مثل ادیتور فرم (هدر، ریل افزودن المان — دکمه‌های آیکونی مربعی با رنگ ملایم هر المان؛ دسکتاپ: دکمه‌ی ۵۶px با tooltip (نام و توضیح)، absolute کنار لبه‌ی بوم، وسط عمودی، زمینه‌ی شفاف و بدون اثر بر جای بوم؛ موبایل: نوار ناوبری شیشه‌ای پایین با نام کوتاه زیر هر آیکون و بوم بی‌کادر لبه‌به‌لبه؛ بدون سایدبار، بوم = پیش‌نمایش زنده در قاب موبایل، پنل تم، دراور تنظیمات هر المان/پروفایل/صفحه؛ ذخیره‌ی خودکار با تأخیر). ابزارهای مشترک ادیتورها در `apps/web/src/components/editor-ui.tsx`.
- **صفحه‌ی عمومی:** Server Component با fetch بدون کش؛ کش ۱۰ ثانیه‌ای سمت nginx (`deploy/nginx/noroset.conf`) و بدون invalidate، پس انتشار حداکثر ۱۰ ثانیه بعد دیده می‌شود. metadata و OG از SEO/پروفایل، اسکریپت کوچک آمار با `sendBeacon` (لینک‌ها مستقیم، بدون redirect).

### ۹.۹ norofile — مدیریت و میزبانی فایل (تصمیم‌های قطعی)
- **محصول هم‌ارز** noroform/norolink با همان ساختار (`products/norofile/{api,ui}`، ماژول Nest، `dist`، پنل `noroset.com/file`). **تنها سرویس فایل S3 پلتفرم**: `@aws-sdk/client-s3` فقط اینجا (قانون dependency-cruiser)؛ apps/api دیگر S3 ندارد.
- **اتصال محصولات:** Port `FILE_SERVICE` در `@noroset/core` (`upload`، `syncUsage(tx, owner, fileIds, require?)`، `publicBaseUrl`). `NorofileModule` سراسری است و آن را فراهم می‌کند؛ محصولات دیگر فقط توکن core را inject می‌کنند و به norofile وابسته نیستند (و برعکس). محصول فقط `file_id` (uuid بدون FK) نگه می‌دارد.
- **میزبانی همه از API:** bucket خصوصی؛ مرورگر هرگز مستقیم از S3 نمی‌خواند. فایل public: `GET /norofile/public/files/:id` (بدون نشست؛ `Cache-Control: public, immutable`، `CORP: cross-origin` برای `n8l.ir`). فایل private فقط برای اعضای tenant: `GET /norofile/files/:id/content`. همه با CSP بسته + sandbox و `nosniff`؛ غیرتصویر همیشه `attachment`. **لینک عمومی فقط برای تصویر و PDF** (تصمیم مالک محصول ۱۴۰۵/۸/۱۰؛ `canBePublic`؛ Office و ZIP ← ۴۲۲ `public_not_allowed`). پیشوند آدرس عمومی `{WEB_ORIGIN}{API_BASE_PATH}/norofile/public/files` (یا `NOROFILE_PUBLIC_URL`).
- **انواع مجاز (فقط از محتوا/magic bytes):** تصویر png/jpg/webp/gif (متادیتا حذف، ≤ ۲۰۰۰۰px)، pdf، docx/xlsx/pptx (zip با `[Content_Types].xml` و پوشه‌ی مربوط)، zip. SVG/HTML/بقیه ← ۴۲۲ `invalid_file`. سقف هر فایل **۲۰MB** (`413 file_too_large`؛ محصول می‌تواند کوچک‌تر بخواهد)، سهمیه‌ی هر tenant از پلن (`norofile.storage_mb`؛ رایگان ۱۰۰MB؛ `403 storage_quota`؛ بررسی با advisory lock هم‌زمان). نام فایل پاک‌سازی و پسوند واقعی تضمین می‌شود.
- **استفاده (usage):** `norofile_file_usages(file_id, owner_type, owner_id)`؛ فایل در حال استفاده حذف و تغییر دسترسی نمی‌شود (`409 file_in_use`، FK بدون cascade). محصول مجموعه‌ی کامل فایل‌های هر مالک را در **همان تراکنش** خودش همگام می‌کند (norolink: `norolink_page` = تصاویر پیش‌نویس + المان‌ها + snapshot).
- **DB** (`packages/db/src/norofile.schema.ts`، migration `0005_norofile`): `norofile_files` (`name`، `kind` image/document/archive، `mime_type`، `extension`، `size_bytes`، ابعاد، `storage_key = {tenant_id}/{id}`، `visibility` private/public، `source`، `uploaded_by`) و `norofile_file_usages`؛ هر دو `tenant_id` + RLS + FORCE؛ `noroset_app` روی usages فقط SELECT/INSERT/DELETE. مسیر عمومی `findPublicFile(id)` (`norofile-public.ts`) با policy `norofile_files_public_select` و `app.public_file_id`: فقط همان یک فایل public از tenant فعال.
- **API پنل** (tenant-scoped): `GET /norofile/files?kind&q&owner&sort&limit&offset` (`owner`: `me`/`others` بر اساس `uploaded_by`؛ `sort`: `created` پیش‌فرض، `updated`، `name`؛ هر ردیف `uploadedBy`/`uploadedByName`)، `GET …/usage`، `POST /norofile/files?visibility` (بدنه‌ی خام، نام در `X-File-Name` URI-encoded)، `GET|PATCH …/:id` (`{name?, visibility?}`)، `DELETE …/:id` (owner/admin)، `GET …/:id/content?download=1`. rate limit: آپلود ۶۰ در ۱۰ دقیقه به‌ازای کاربر، خواندن عمومی ۶۰۰/دقیقه به‌ازای IP.
- **فضای شخصی کاربر** (migration `0006_user_profile`): جدول `norofile_user_files` بدون `tenant_id`، با `user_id` (FK به `platform_users`، cascade) و RLS + FORCE روی `user_id = app.current_user` (`withUser`)؛ `noroset_app` فقط SELECT/INSERT/DELETE (immutable). فعلاً فقط **آواتار**: فقط تصویر، همیشه **public** (کاربران دیگر می‌بینند؛ مثل آواتار گوگل)، ≤ ۲MB، `storage_key = users/{user_id}/{id}`. آدرس عمومی همان `GET /norofile/public/files/:id` است: `findPublicFile` اول فایل tenant و سپس فایل شخصی را با policy `norofile_user_files_public_select` (همان `app.public_file_id`) و فقط برای کاربر `active` پیدا می‌کند. آدرس فقط uuid تصادفی دارد (نه شناسه‌ی کاربر)، فهرست‌گیری عمومی ندارد و متادیتا حذف می‌شود؛ چون کش immutable است، تعویض همیشه شناسه‌ی جدید می‌سازد (نسخه‌ی قدیم ممکن است تا مدتی در کش بماند). Port: `uploadPersonal(userId, input)` و `removePersonal(userId, fileId)`. کتابخانه‌ی فایل شخصی در پنل فعلاً نیست.
- **فضای پلتفرم** (migration `0016_norolink_templates`): جدول `norofile_platform_files` بدون `tenant_id` برای تصویر قالب‌های نورولینک؛ فقط تصویر، همیشه public، ≤ سقف همان کاربرد (۵MB)، `storage_key = platform/{id}`، خارج از سهمیه‌ی فضاهای کاری و کتابخانه‌ی فایل‌ها. RLS: خواندن آزاد، INSERT فقط `is_platform_admin()` با `uploaded_by` همان ادمین. Port: `uploadPlatform(adminUserId, input)`. سرو از مسیر جدای `GET /norofile/public/files/platform/:id` که فقط به همین جدول می‌رسد، تا `platform/{uuid}` در محتوای کاربر راهی برای اشاره به فایل فضای کاری دیگر نباشد. فایل‌ها حذف نمی‌شوند چون صفحه‌های ساخته‌شده از قالب حتی پس از حذف قالب به آن‌ها اشاره می‌کنند (تعدادشان کم و مصرف فقط از سوی superadmin است).
- **پنل** (`(panel)/file`): مصرف فضا، رهاکردن/انتخاب چندفایلی (با گزینه‌ی عمومی)، فیلتر نوع، جست‌وجو، پیش‌نمایش (تصویر خصوصی با درخواست نشست‌دار)، کپی لینک عمومی، دانلود، تغییر نام، عمومی/خصوصی، حذف با نمایش محل استفاده.
  - **اعلان آپلود موفق:** پس از بارگذاری فایل، یک توست افقی در مرکز صفحه (`fixed inset-0 pointer-events-none`) با پیام موفقیت و فقط برای فایل عمومی دکمه‌ی «کپی لینک عمومی» نمایش داده می‌شود (فایل خصوصی از این اعلان عمومی نمی‌شود) که خودکار بسته نمی‌شود و کاربر با کلیک دکمه یا بستن دستی آن را می‌بندد.
  - **ایزوله‌سازی رویداد و دیالوگ تایید حذف:** نام فایل‌های بسیار طولانی در دیالوگ تایید حذف بدون سرریز کادر شکسته می‌شوند (`break-all` و `[overflow-wrap:anywhere]`). برای جلوگیری از باز شدن هم‌زمان پیش‌نمایش فایل هنگام باز کردن دیالوگ حذف، دکمه و منوی سه‌نقطه کارت فایل در لایه‌ی بالاتر (`relative z-10`) قرار گرفته، انتشار رویداد با `stopPropagation` متوقف شده و از گارد زمانی (timestamp guard) استفاده می‌شود.

### ۹.۱۰ کارت آپلود مشترک (`FilePicker`) — «شعبه‌ی norofile در محصولات»
- مثل Google Drive Picker: هر محصول یک کارت یکسان باز می‌کند و `file_id` (و آدرس/ابعاد) پس می‌گیرد؛ کتابخانه‌ی فایل همان norofile است.
- **جای کد (مرزها):** کامپوننت عمومی و بدون شناخت محصول در `@noroset/ui` (`FilePicker`، `ImagePickerField`)؛ ارتباط با سرور فقط از قرارداد تزریقی `FileSource` (`list?`، `upload`). پیاده‌سازی‌ها در `apps/web/src/lib/file-sources.ts` (فهرست از `/norofile/files`، آپلود از endpoint همان کاربرد: `/norolink/pages/:id/uploads`، `/me/avatar`).
- **تب‌ها:** «بارگذاری» (رهاکردن، انتخاب، چسباندن با Ctrl+V، خطای هر فایل) و «فایل‌های من» (همه‌ی فایل‌های tenant، جست‌وجو؛ فایل ناسازگار با کاربرد — نوع، حجم، خصوصی‌بودن — غیرفعال با دلیل). در فضای شخصی فقط «بارگذاری».
- **پردازش بسته به نوع (در مرورگر، فقط برای UX؛ سرور همیشه از محتوا دوباره تشخیص می‌دهد):** تصویر ← کراپ با نسبت ثابت یا آزاد (`react-easy-crop`، pin)، شکل دایره/مستطیل، زوم، چرخش؛ سپس کوچک‌سازی به `maxSize` و تبدیل به webp طبق تنظیم هر کاربرد (آواتار ۵۱۲px، تصویر نورولینک ≤ ۲۰۰۰px؛ GIF بدون کراپ و دست‌نخورده تا متحرک بماند). سند/فشرده ← آیکون نوع، حجم و نام.
- **تنظیمات هر کاربرد:** `accept` (نوع‌ها)، `maxBytes`، `requirePublic`، `image: {aspect?, shape, maxSize, quality}`.
- بعداً: تب «اخیر»، چندفایلی، دریافت از لینک (در سرور)، آپلود از سر گرفتنی؛ noroform در لانچ فیلد فایل ندارد.

### ۹.۱۱ admin — مدیریت پلتفرم (تصمیم‌های قطعی)
- **محصول هم‌ارز** با همان ساختار (`products/admin/{api,ui}`، ماژول Nest، `dist`)؛ برچسب UI «**مدیریت پلتفرم**»، پنل `noroset.com/admin` (بدون tenant در آدرس). مسئول پشتیبانی و مدیریت کل پلتفرم و **همه‌ی billing** (پلن، اشتراک، پرداخت، کد تخفیف، صفحه‌ی خرید کاربر، درگاه). محصولات دیگر admin را نمی‌شناسند: سقف پلن از Port `PLAN_RESOLVER` و وضعیت ماژول از Port مربوط در core می‌آید (مثل `FILE_SERVICE` که norofile فراهم می‌کند).
- **نقش پلتفرم:** ستون `platform_users.platform_role` (enum `platform_role`: `user` پیش‌فرض، `superadmin`)؛ نقش‌های بعدی با دسترسی محدودتر (مثلاً پشتیبانی) مقدار جدید همین enum و نگاشت نقش ← مجوز در کد admin‌اند. فقط `superadmin` به ماژول دسترسی دارد. اولین superadmin با اسکریپت CLI (`pnpm --filter @noroset/db admin:grant <mobile>`) ساخته می‌شود؛ بعد از آن superadmin از UI نقش می‌دهد/می‌گیرد. ادمین نقش، وضعیت و رمز خودش را از مدیریت پلتفرم عوض نمی‌کند (`409 cannot_modify_self`)؛ پس هر تغییر را superadmin فعال دیگری انجام می‌دهد و همیشه دست‌کم یک superadmin فعال می‌ماند.
- **احراز:** همان نشست معمولی؛ گارد بک‌اند (`PLATFORM_ROLES_KEY` در core، اعمال در `AuthGuard` سراسری) نقش را از DB در هر درخواست می‌خواند (۴۰۳ `platform_role_required`). step-up/2FA ندارد (ریسک پذیرفته‌شده؛ §۱۱ مورد ۱۰).
- **دسترسی DB:** نقش جدا یا BYPASSRLS ساخته نمی‌شود. `withPlatformAdmin(adminUserId, fn)` در `@noroset/db` مقدار `app.current_admin` را ست می‌کند و تابع `is_platform_admin()` در DB بررسی می‌کند همان کاربر واقعاً `superadmin` و `active` است؛ policyهای جدای `*_platform_admin_*` فقط روی جدول‌هایی که ادمین لازم دارد (فعلاً `tenant_memberships` خواندن، `admin_audit_log`؛ بعداً جدول‌های billing) بر همین تابع تکیه می‌کنند. داده‌ی محتوایی محصولات (پاسخ فرم‌ها، فایل‌ها، صفحه‌ها) policy ادمین ندارد؛ پشتیبانی آن‌ها فقط از مسیر ورود پشتیبانی است.
- **لاگ ممیزی** (`admin_audit_log`): هر کار تغییردهنده‌ی ادمین (و شروع/پایان ورود پشتیبانی) در **همان تراکنش** با `actor_user_id`، `action`، `target_type/target_id`، `reason`، `details jsonb`، IP ثبت می‌شود. append-only: `noroset_app` فقط SELECT/INSERT و هر دو فقط با `is_platform_admin()`؛ خواندن فهرست‌ها لاگ نمی‌شود.
- **مدیریت کاربران:** فهرست با جست‌وجو (موبایل/نام/ایمیل) و فیلتر وضعیت/نقش، جزئیات (عضویت‌ها، نشست‌های فعال)، افزودن کاربر (موبایل اجباری، نام و رمز اختیاری؛ با «ساخت tenant» یک tenant با slug مشخص که کاربر owner آن است)، ویرایش نام، تغییر وضعیت با دلیل اجباری (`status_reason`)، تعیین رمز (همه‌ی نشست‌ها باطل)، خروج از همه‌ی دستگاه‌ها، تغییر نقش پلتفرم. حذف کاربر نداریم.
- **مدیریت tenantها:** فهرست/جزئیات با اعضا، تعلیق/فعال‌سازی با دلیل (در لاگ). tenant معلق در پنل ۴۰۳ و صفحه/فرم/فایل عمومی‌اش پیدا نمی‌شود (رفتار موجود).
- **ورود پشتیبانی (impersonation):** superadmin برای یک کاربر با **دلیل اجباری** و مدت (حداکثر ۶۰ دقیقه) یک لینک یک‌بارمصرف می‌سازد؛ توکن فقط hash ذخیره می‌شود و **فقط با نشست همان ادمین صادرکننده** قابل استفاده است (لو رفتن لینک بی‌اثر است). مصرف لینک توکن را از URL پاک و به cookie نشست پشتیبانی جدا (JWT با `act` = ادمین) تبدیل می‌کند. داخل حساب همه‌کار مجاز است **جز امنیت حساب**: تغییر رمز/موبایل، `logout-all`، نقش/وضعیت و حذف حساب ← ۴۰۳ `impersonation_forbidden`. بنر ثابت «حالت پشتیبانی» با دکمه‌ی پایان. هر درخواست تغییردهنده با هویت ادمین در لاگ ممیزی. کاربر در کارت «دسترسی‌های پشتیبانی» حساب (زمان، مدت، دلیل) سابقه را می‌بیند و دسترسی فعال را باطل می‌کند. (مرحله ۱۱.۴)
- **ماژول‌ها:** رجیستری ماژول‌ها در کد (noroform، norolink، norofile)؛ هر ماژول سراسری یکی از `active` / `maintenance` (پنل و API مدیریت ۵۰۳ با پیام قابل‌تنظیم، مسیر عمومی باز) / `off` (همه‌چیز، از جمله مسیر عمومی، ۵۰۳). admin و core/auth خاموش‌شدنی نیستند. اعمال در گارد سراسری بک‌اند با metadata ماژول route؛ منوی پنل از همان وضعیت می‌خواند. (مرحله ۱۱.۵)
- **پلن، اشتراک و پرداخت:** پلن‌ها **داده‌اند** (جدول، نه کد) و **دامنه‌محور**: هر پلن مال یک محصول است (`billing_plans.scope` = `norolink`/`noroform`/`norofile`/`bundle`، `bundle` = هر سه) و خریدهای محصولات مختلف کنار هم می‌مانند؛ entitlementها (سقف‌هایی که محصولات تعریف می‌کنند، مثل `norolink.pages`، `norofile.storage_mb`، `branding.remove`) و **دوره‌های آزاد** (۱، ۳، ۶، ۱۲ ماه یا هر مقدار) هر کدام با قیمت خودش؛ مبلغ‌ها bigint **ریال**، نمایش تومان؛ درصد مالیات بر ارزش افزوده قابل تنظیم. اشتراک در سطح tenant؛ ارتقا وسط دوره روزهای باقی‌مانده را به اعتبار تبدیل می‌کند؛ تمدید خودکار ندارد (درگاه‌های ایرانی کسر خودکار ندارند). خرید آنلاین کامل: صفحه‌ی خرید کاربر، Port `PAYMENT_GATEWAY` با پیاده‌سازی **زرین‌پال** (sandbox) و `FakeGateway` در development/تست، callback و verify سمت سرور، idempotent. پس از انقضای اشتراک پولی **۷ روز مهلت** با اعلان، سپس حالت **محدود**: همه‌ی صفحه‌های لینک غیرفعال می‌شوند (محتوا از API عمومی برنمی‌گردد، بازدیدکننده پیام «در دسترس نیست» می‌بیند)، انتشار ← ۴۰۳ `plan_expired` و سقف‌ها به مقدار پیش‌فرض برمی‌گردند؛ پیش‌نویس‌ها در پنل می‌مانند، هیچ داده‌ای پاک نمی‌شود و با خرید پلن صفحه‌ها فوراً برمی‌گردند. ادمین: تعریف پلن، تخصیص دستی اشتراک، ثبت پرداخت آفلاین، فهرست پرداخت‌ها. `PLAN_RESOLVER` سخت‌کد جای خود را به پیاده‌سازی admin می‌دهد. (مرحله ۱۱.۶)
- **کمپین‌ها:** کد تخفیف (درصدی/مبلغی، بازه‌ی اعتبار، سقف استفاده کل و هر tenant، پلن‌های مجاز، آمار)، اعلان درون پنل (همه / پلن / tenant مشخص، بازه‌ی نمایش، قابل بستن)، ردیابی UTM ثبت‌نام (first-touch روی کاربر هنگام اولین ورود OTP، گزارش ثبت‌نام و تبدیل به پرداخت به‌ازای کمپین). پیامک انبوه نه. (مرحله ۱۱.۷)

**تصمیم‌ها و پیاده‌سازی ۱۱.۷ (کمپین‌ها؛ ۱۴۰۵/۸/۶):**
- **کد تخفیف** (`billing_coupons`؛ migration `0011_campaigns`): کد حروف بزرگ `[A-Z0-9_-]{3,32}` (ورودی کاربر به حروف بزرگ تبدیل می‌شود)، درصدی (۱ تا ۱۰۰) یا مبلغ ثابت (ریال)، بازه‌ی اعتبار اختیاری، سقف کل و سقف هر فضای کاری (پیش‌فرض ۱؛ null = نامحدود)، پلن‌های مجاز (خالی = همه)، فعال/غیرفعال؛ کد و نوع پس از ساخت ثابت‌اند (`409 coupon_immutable`). تخفیف روی **(مبلغ پلن − اعتبار ارتقا)** و **پیش از مالیات**؛ مبلغ ثابت حداکثر همان مبلغ. روی خرید، ارتقا و تمدید کار می‌کند. **فقط پرداخت موفق مصرف است**: `billing_payments.coupon_id` و `used_count` هنگام `activatePayment` یک واحد بالا می‌رود؛ سقف‌ها هنگام پیش‌فاکتور/خرید بررسی می‌شوند و پرداختی که هم‌زمان با پر شدن سقف موفق شود پذیرفته می‌ماند. خطاها: `422 coupon_invalid` (ناموجود/غیرفعال/خارج از بازه)، `422 coupon_not_for_plan`، `409 coupon_exhausted`، `409 coupon_used`. RLS: کاربر فهرست کدها را نمی‌بیند؛ فقط همان کدی که وارد کرده (`app.coupon_code`) و افزایش مصرف همان یک ردیف (`app.coupon_id`). `POST /billing/quote|checkout` حالا `couponCode?` می‌گیرد.
- **اعلان درون پنل** (`panel_announcements` + `panel_announcement_dismissals`): عنوان، متن ساده، لینک اختیاری (فقط https یا مسیر داخلی پنل؛ نه `//` یا `javascript:`)، نوع (اطلاع/هشدار/موفقیت)، **هدف** (همه / پلن‌های مشخص با کد پلن / فضاهای کاری مشخص)، **مخاطب** (همه‌ی اعضا / فقط مالک و مدیر)، بازه‌ی نمایش، فعال. RLS: اعلان فعالِ در بازه برای همه خواندنی، هدف‌گیری در سرویس و اهداف هرگز به کاربر برنمی‌گردند؛ حداکثر ۳ اعلان هم‌زمان. بستن به‌ازای **کاربر** در DB (`withUser`). `GET /announcements` و `POST /announcements/:id/dismiss` (tenant-scoped). وب: نوار اعلان بالای پنل (`(panel)/announcements.tsx`).
- **UTM ثبت‌نام (first-touch):** proxy وب روی دامنه‌ی اصلی، اگر کوکی نباشد، `utm_source/medium/campaign/content/term` اولین ورود را در کوکی httpOnly `noroset_utm` (JSON، ۳۰ روز) نگه می‌دارد؛ `POST /auth/otp/verify` فقط وقتی کاربر **تازه ساخته می‌شود** آن را (پاک‌سازی‌شده با `parseUtmCookie` در core، هر مقدار ≤ ۱۰۰) روی `platform_users.signup_utm` می‌نویسد و کوکی را پاک می‌کند. گزارش `GET /admin/campaigns/utm?days`: به‌ازای منبع/رسانه/کمپین، ثبت‌نام، «پرداخت‌کننده» (مالک فضای کاری‌ای با پرداخت paid) و جمع آن پرداخت‌ها؛ بدون UTM = «مستقیم».
- **API ادمین** (`/admin/campaigns`): `GET|POST coupons`، `PATCH coupons/:id`، `GET|POST announcements`، `PATCH announcements/:id` (فهرست با `live` از ساعت سرور)، `GET utm`. حذف نداریم (غیرفعال‌سازی)؛ لاگ ممیزی `campaign.*`. وب: `/admin/campaigns` و فیلد کد تخفیف در پیش‌فاکتور `/billing` (رسید سطر تخفیف دارد).

**تصمیم‌های ۱۱.۶ (پلن، اشتراک، پرداخت؛ ۱۴۰۵/۸/۵):**
- **مدل سقف‌ها:** کلیدهای سقف هر محصول با نوع (عدد/بله‌خیر) و مقدار پلن رایگان در **کد** ثبت می‌شوند (رجیستری `ENTITLEMENTS` در core، گروه‌بندی‌شده به‌ازای ماژول، چون core محصولات را import نمی‌کند؛ مثل `noroform.forms`، `noroform.submissions_monthly`، `norolink.pages`، `norolink.elements_per_page`، `norolink.detailed_stats`، `norofile.storage_mb`، `branding.remove`). هر پلن در **DB** مقدار همین کلیدها را دارد و ادمین در فرمی با فیلدهای نوع‌دار ویرایششان می‌کند؛ کلید بی‌مقدار ← مقدار رایگان. `PLAN_RESOLVER` به‌جای `free/pro` سقف‌های مؤثر tenant را برمی‌گرداند و سقف‌های سخت‌کد (`NOROLINK_LIMITS`، `TENANT_QUOTA_BYTES`، `FORCE_LICENSE`) از آن خوانده می‌شوند.
- **سقف‌های حالت محدود** (مقدار پیش‌فرض کلیدها در کد): ۳ فرم، ۱۰۰ پاسخ در ماه، ۱ صفحه‌ی لینک با ۳۰ المان، ۱۰۰ مگابایت فایل، برندینگ اجباری، آمار پایه.
- **پلن‌های اولیه (seed در migration):** «پایه نورولینک» و «حرفه‌ای نورولینک» — هر دو **پیش‌نویس و غیرفعال** تا ادمین قیمت بگذارد و فعالشان کند؛ پلن رایگان در migration `0019` حذف شد. سقف‌های اولیه: پایه = ۱۰ فرم، ۱۰۰۰ پاسخ در ماه، ۱ صفحه با ۵۰ المان، ۱ گیگابایت، حذف برندینگ؛ حرفه‌ای = سقف‌های pro فعلی (۱۰ صفحه، ۱۰۰ المان، آمار کامل) + ۵۰ فرم، ۱۰۰۰۰ پاسخ در ماه، ۵ گیگابایت، حذف برندینگ. همه از UI قابل تغییر. ترتیب پلن‌ها با فیلد `rank` (برای تشخیص ارتقا/کاهش).
- **سقف پاسخ ماهانه (نرم، «قفل در نمایش»):** همه‌ی پاسخ‌ها ذخیره می‌شوند؛ در هر **ماه شمسی (وقت تهران)** پاسخ‌های بعد از سقف در فهرست، جزئیات و CSV «قفل»اند (زمان ثبت دیده می‌شود، محتوا نه) و با ارتقا همان لحظه باز می‌شوند. مالک/مدیر از ۸۰٪ مصرف هشدار می‌بیند. بقیه‌ی سقف‌ها سخت‌اند (ساخت/انتشار بالای سقف ← ۴۰۳ `plan_limit`).
- **خریدار:** owner و admin فضای کاری خرید، ارتقا و سابقه‌ی پرداخت را دارند؛ اعضای عادی فقط پلن فعلی را می‌بینند.
- **دامنه‌ی پلن و تغییر پلن (مدل محصول‌محور؛ بازنگری ۱۴۰۵/۸/۲۵):** هر پلن مال **یک محصول** است (`billing_plans.scope`: `norolink` | `noroform` | `norofile` | `bundle`) و اشتراک محصولات مختلف **کنار هم** می‌مانند: سقف‌هایشان اجتماع افزایشی است (عدد ← بیشترین، بولی ← OR) و خرید یکی هیچ سقف محصول دیگر را صفر/جایگزین نمی‌کند. **ارتقا** (rank بالاتر در همان دامنه) فوری است و ارزش روزهای باقی‌مانده‌ی همان دامنه از مبلغ کم می‌شود؛ **تمدید** همان پلن یا پلن پایین‌تر در همان دامنه از **پایان زنجیره‌ی همان دامنه** (پایان آخرین رزرو/دوره‌ی همان محصول) شروع می‌شود و هر دامنه می‌تواند رزرو خودش را داشته باشد؛ خرید **دامنه‌ی تازه** (`addon`) از الان فعال می‌شود و هیچ اشتراکی را دست نمی‌زند؛ `bundle` همه‌ی دامنه‌ها را پوشش می‌دهد و با هر پلنی هم‌پوشان است. بازپرداخت نداریم.
- **۱۴ روز رایگان:** هر **کاربر** یک بار (`platform_users.trial_used_at`) در اولین ورود به پنل ۱۴ روز پلن پایه را رایگان می‌گیرد. مسیر کاربر فضای کاری نمی‌پرسد (تصمیم مالک محصول ۱۴۰۵/۸/۱۱): پنل با `POST /tenants/default` آن را خودکار می‌سازد؛ موجودیت فضای کاری می‌ماند، ولی صفحه‌ی `/ws` و منوی آن فعلاً در دسترس نیست (فقط کسی که عضو چند فضاست در منوی آواتار جابه‌جا می‌شود). نوار بالای پنل زمان باقی‌مانده را نشان می‌دهد. دکمه‌ی دستی ندارد. پایان آن بدون مهلت ۷ روزه به حالت محدود می‌رود و فضای کاری دوم همان کاربر از ابتدا محدود است. دامنه‌ی رایگان همان دامنه‌ی پلنِ trial است: داشتن پلن محصول دیگر مانع شروع آن نیست، ولی اشتراک فعال/queued همان دامنه (و مصرف قبلی کاربر) مانع است. در پیامک فقط لفظ «رایگان» به‌کار می‌رود. ادمین هم می‌تواند اشتراک دستی بدهد. **دوره‌ی رایگان «وضعیت» یک پلن است، نه پلن جدا** (تصمیم مالک محصول ۱۴۰۵/۸/۲۰): اشتراک با `source = 'trial'` و PlanStatus `trial`؛ سقف‌ها همان سقف‌های پلن‌اند و فقط امکاناتی که محصول در trial می‌بندد (ایندکس گوگل نورولینک، §۹.۱) تا خرید بسته است. پلن و طول آن از مدیریت پلتفرم قابل انتخاب است (`billing_settings.trial_plan_id`/`trial_days`، migration `0025_trial_settings`؛ null ← پلن پایه، ۰ روز ← خاموش و `trial_disabled` بدون مصرف؛ `trialSettings` در `billing.core.ts`؛ کارت «دوره‌ی رایگان» در `/admin/billing`؛ `PUT /admin/billing/settings` `{vatPercent?, trialPlanId?, trialDays?}`) و فقط روی کاربرهای تازه اثر دارد. **خرید در دوره‌ی رایگان** (هر پلنی، همان یا بالاتر) دیگر رزرو بعد از آن نیست: همان لحظه فعال می‌شود، دوره‌ی رایگان را تمام می‌کند و روزهای باقی‌مانده‌اش به انتهای اشتراک اضافه می‌شود (`quote.trialCarryDays`)، تا امکانات پولی مثل ایندکس گوگل فوراً باز شوند.
- **رسید:** برای هر پرداخت رسید قابل چاپ در پنل (شماره، پلن، دوره، مبلغ، اعتبار کسرشده، مالیات، کد پیگیری زرین‌پال). فاکتور رسمی (سامانه‌ی مؤدیان) بعداً. مالیات بر ارزش افزوده پیش‌فرض ۱۰٪، قابل تنظیم.
- کد تخفیف در صفحه‌ی خرید از مرحله‌ی ۱۱.۷ وصل شد (همین بخش، «تصمیم‌ها و پیاده‌سازی ۱۱.۷»).

**پیاده‌سازی ۱۱.۶ — بخش ۱ (داده، سقف‌ها، API ادمین):**
- core: `ENTITLEMENTS` / `FREE_ENTITLEMENTS` / `resolveEntitlements` / `entitlementIssues` و `tehranMonthRange` (ماه شمسی تهران با Intl؛ اختلاف ثابت +۰۳:۳۰). Port `PLAN_RESOLVER` حالا `resolve(tenantId) → {planId, code, name, status: free|active|trial|grace, endsAt, entitlements}` است (`PlanTier`/`planOf` حذف شد)؛ `fixedPlan()` برای تست‌ها. Port `PLAN_USAGE` (ثبت تابع مصرف هر کلید؛ پیاده‌سازی در apps/api) و Port `PAYMENT_GATEWAY` (بخش ۲). مدل دامنه‌محور هم در core است: `PLAN_SCOPES`/`PRODUCT_SCOPES`/`PlanScope`/`planCovers`/`planScopesOverlap`/`mergeEntitlements`/`inferPlanScope` و helper `productPlan(plan, product)` که محصولات با آن نمای همان دامنه را می‌گیرند (پلن بدون `scopes` ← کل پلن؛ برای سازگاری، تست و fixtureهای قدیمی).
- DB (migration `0010_billing`): `billing_plans` (code، rank، is_free یکتا، active، `entitlements` jsonb، `prices` jsonb `[{months, priceRial}]`)، `billing_settings` (تک‌ردیف، `vat_percent`)، `billing_subscriptions` (source: payment/manual/trial، بازه، `payment_id` با FK مرکب)، `billing_payments` (شماره‌ی رسید bigserial، kind: purchase/upgrade/queued، subtotal/credit/discount/vat/total با CHECK جمع، status، gateway zarinpal/fake/manual، authority، ref_id). پلن‌ها/تنظیمات: خواندن همه، نوشتن ادمین؛ اشتراک/پرداخت: RLS tenant + ادمین + مسیر بازگشت درگاه (`app.billing_authority`، `findPaymentByAuthority`)؛ UPDATE فقط ستون‌های وضعیت. seed: رایگان (فعال)، پایه و حرفه‌ای (غیرفعال، بدون قیمت). migration `0027_billing_plan_scope`: enum `billing_plan_scope`، ستون `billing_plans.scope` (پیش‌فرض `bundle`)، مقدار `addon` در enum `billing_payment_kind`، و backfill دامنه‌ی پلن‌های موجود از نام/کد («نورولینک»/«نوروفورم»/«نوروفایل») و بعد از کلیدهای سقف (یک ماژول ← همان محصول، چند ماژول/هیچ ← `bundle`)؛ پس پلن‌های seed که `0019` نامشان را «… نورولینک» کرده بود دامنه‌ی `norolink` می‌گیرند و کلیدهای نوروفورم/نوروفایلِ باقی‌مانده از seed اولیه دیگر اعمال نمی‌شوند (پلنی که واقعاً چند محصول می‌فروشد `bundle` است).
- منطق (`products/admin/api/billing/billing.core.ts`): هر «ماه» اشتراک **۳۰ روز**؛ **وضعیت، مهلت و دوره‌ی رایگان دامنه‌محورند**: برای هر محصول (`PRODUCT_SCOPES`) پلن مؤثر جدا از اشتراک‌هایی که همان محصول را می‌پوشانند (`planCovers`) محاسبه می‌شود ← `scopes.<product>` (اجتماع سقف‌های همان دامنه) و `activePlans` (دامنه‌های فعال/مهلت) در `ResolvedPlan`؛ فیلدهای سطح بالا برای عنوان/سازگاری «پلن برتر» را می‌دهند و `expired` فقط وقتی `true` است که هیچ دامنه‌ای فعال/مهلت نباشد. مهلت ۷ روزه‌ی هر دامنه از پایان آخرین اشتراک همان دامنه شروع می‌شود. `quote`: ارتقا (rank بالاتر **در همان دامنه**) از الان با اعتبار = (subtotal − discount) × سهم باقی‌مانده‌ی همان دامنه؛ همان پلن/پایین‌تر در همان دامنه ← `queued` از پایان زنجیره‌ی همان دامنه؛ دامنه‌ی تازه وقتی جای دیگری اشتراک فعال است ← `addon` (هم‌زمان، بدون اعتبار و بدون صف)؛ مالیات روی (subtotal − credit − discount). `activatePayment` بازه را با زمان فعال‌سازی دوباره می‌سازد، در ارتقا فقط اشتراک‌های **هم‌دامنه** را کوتاه می‌کند و `addon` هیچ اشتراکی را دست نمی‌زند. ۱۴ روز رایگان: یک‌بار برای هر کاربر، و فقط اگر **دامنه‌ی همان پلن** اشتراک جاری/queued نداشته باشد (اشتراک محصول دیگر مانع نیست)؛ `trialCarryDays` مثل قبل روزهای باقی‌مانده‌ی دوره‌ی رایگان همان دامنه را به انتهای خرید اضافه می‌کند.
- محصولات: norolink سقف‌ها را از `limitsFor` (نگاشت entitlement) می‌خواند و `NOROLINK_LIMITS` حذف شد؛ noroform سقف تعداد فرم (`403 plan_limit`، با advisory lock)، برندینگ فرم عمومی از `branding.remove` و **قفل پاسخ‌های بالای سقف ماهانه** (شماره‌ی ردیف در ماه شمسی با SQL؛ فهرست/جزئیات/CSV؛ `quota: {limit, used}` در فهرست)؛ norofile سهمیه از `norofile.storage_mb` (`TENANT_QUOTA_BYTES` حذف شد). هر سه مصرف خود را در `PLAN_USAGE` ثبت می‌کنند. هر محصول فقط سقف‌های **دامنه‌ی خودش** را می‌فرستد (`productPlan(plan, 'norolink' | 'noroform' | 'norofile')` ← `plan.scopes.<product>`)، پس پلن یک محصول سقف محصول دیگر را بالا نمی‌برد و `branding.remove` (کلید مشترک) از اجتماع همه‌ی دامنه‌ها می‌آید.
- API ادمین (`/admin/billing`): `GET` (پلن‌ها با `scope` + مالیات)، `POST plans`، `PATCH plans/:id` (کد immutable، پلن رایگان همیشه فعال، `scope` با `@IsIn(PLAN_SCOPES)` و پیش‌فرض استنتاج از سقف‌ها با `inferPlanScope`)، `PUT settings` (`{vatPercent, trialPlanId, trialDays}`)، `GET payments?status`، `GET tenants/:id` (پلن مؤثر، مصرف، اشتراک‌ها، پرداخت‌ها)، `POST tenants/:id/subscriptions` (دستی: `{planId, days, note}`)، `POST tenants/:id/payments` (آفلاین: `{planId, months, totalRial, note}`)، `POST subscriptions/:id/cancel` (`{reason}`). همه با لاگ ممیزی (`billing.*`، target plan/tenant/billing). `AdminModule` سراسری شد و `PLAN_RESOLVER` را می‌دهد.

**پیاده‌سازی ۱۱.۶ — بخش ۲ (خرید آنلاین، صفحه‌ها):**
- درگاه‌ها (`products/admin/api/billing/gateways.ts`، Port `PAYMENT_GATEWAY`): `ZarinpalGateway` (API نسخه‌ی ۴، `currency: IRR`، sandbox با `ZARINPAL_SANDBOX=true`؛ verify کد ۱۰۰ و ۱۰۱ = موفق) و `FakeGateway` (بدون پول؛ مستقیم به آدرس بازگشت با `Status=OK`). انتخاب با `PAYMENT_GATEWAY=zarinpal|fake` (پیش‌فرض fake خارج از production)؛ در production درگاه ساختگی یا زرین‌پال بدون `ZARINPAL_MERCHANT_ID` ← برنامه بالا نمی‌آید.
- API کاربر (`/billing`، tenant-scoped): `GET` (پلن مؤثر، مصرف از `PLAN_USAGE`، پلن‌های فعال با `scope`، مالیات، خرید زمان‌بندی‌شده با `paid`، امکان آزمایشی، `canManage`)، `GET status` (برای نوار مهلت؛ `ResolvedPlan` با `scopes` هر محصول و `activePlans`)؛ owner/admin: `POST quote` (پاسخ `kind`: `purchase|upgrade|queued|addon` + `scope`)، `POST checkout` (`{planId, months}` ← `{paymentId, redirectUrl}`)، `GET payments`، `GET payments/:id` (رسید)، `DELETE queued/:id` (فقط رزرو پرداخت‌نشده؛ رزرو پرداخت‌شده ← ۴۰۹ `paid_reservation`، چون بازپرداخت نداریم؛ لغو آن فقط از مدیریت پلتفرم). عمومی: `GET /billing/plans` (پلن‌های فعال با `scope` و قیمت، بدون سقف‌ها؛ مثلاً برای «بعد از ۱۴ روز از … تومان» در صفحه‌ی تحویل نورولینک).
- پیام‌های پس از خرید: صفحه‌ی نتیجه پلن، مدت و برای خرید رزروی تاریخ شروع را می‌گوید («روزهای باقی‌مانده‌ی شما حفظ شد»)، و برای خرید فوری تاریخ پایان را (که در دوره‌ی رایگان روزهای باقی‌مانده‌ی آن را هم دارد)؛ پیش‌فاکتور در دوره‌ی رایگان تعداد روزهای منتقل‌شده را می‌گوید و دکمه‌ی پلن جاری «خرید اشتراک» است. رزرو پرداخت‌شده‌ای که پیش از ۱۴۰۵/۸/۲۰ در دوره‌ی رایگان ساخته شده همان رفتار قبلی را دارد (از پایان دوره‌ی رایگان).
- خرید: پرداخت `pending` در تراکنش ثبت می‌شود و درگاه **بیرون از تراکنش** صدا زده می‌شود (شکست ← پرداخت `failed` و `502 gateway_unavailable`)؛ مبلغ صفر (اعتبار کامل) همان لحظه `paid` و فعال می‌شود. بازگشت: `GET /billing/callback?Authority&Status` (`@Public`) پرداخت را با `findPaymentByAuthority` پیدا، **سمت سرور** با مبلغ ثبت‌شده verify (بیرون از قفل)، سپس زیر قفل ردیف دوباره وضعیت را بررسی و `paid` + `activatePayment` می‌کند؛ تکرار بازگشت بی‌اثر است. همیشه ریدایرکت ۳۰۲ به `{WEB_ORIGIN}/billing/result?status=ok|failed&payment=…`. آدرس بازگشت درگاه `{WEB_ORIGIN}{API_BASE_PATH}/billing/callback`.
- وب: `/billing` (پلن و مصرف با هشدار ۸۰٪، کارت پلن‌ها با برچسب دامنه/محصول و دوره و قیمت تومان + مالیات، دکمه‌ی خرید/ارتقا/تمدید/تغییر از پایان دوره و برچسب «افزودنی» برای محصول بدون اشتراک، پیش‌فاکتور با اعتبار و مالیات، آزمایشی ۱۴ روزه، فهرست پرداخت‌ها)، `/billing/result`، `/billing/receipts/{id}` (قابل چاپ)، آیتم «اشتراک» در سایدبار، نوار هشدار مهلت تمدید (`plan-banner.tsx` با دامنه‌ی نورولینک). ادمین: `/admin/billing` (ویرایشگر پلن با انتخاب دامنه‌ی محصول و فیلدهای نوع‌دار سقف‌ها و دوره/قیمت به تومان، مالیات، فهرست پرداخت‌ها) و بخش «اشتراک» در صفحه‌ی فضای کاری (پلن مؤثر و مصرف، اشتراک دستی، پرداخت آفلاین، لغو).
- قراردادهای نمایشی در `@noroset/admin/ui` (`ENTITLEMENT_META` با برچسب/واحد همان کلیدهای core، `PLAN_SCOPE_LABEL`/`ScopedPlan`، `formatToman`، برچسب وضعیت‌ها و نوع پرداخت‌ها (`addon`)). نمایش «پاسخ قفل‌شده» در صفحه‌ی نتایج فرم با UI مرحله‌ی ۱۰ می‌آید (API آماده است: `locked` و `quota`).

**پیاده‌سازی ۱۱.۵ (ماژول‌ها):**
- core: رجیستری `PLATFORM_MODULE_KEYS` (`noroform`، `norolink`، `norofile`)، کلید metadata `MODULE_KEY` و Port `MODULE_STATE` (`all/get/invalidate`). هر محصول در `access.ts` دکوراتور `@ProductModule()` دارد و روی **همه‌ی** controllerهایش (پنل و عمومی) می‌گذارد (تنها استثنا: کنترل صفحه‌های نورولینک، ابزار اضطراری superadmin که در حالت تعمیر هم باید کار کند؛ §۹.۱۳)؛ محصول جدید = یک کلید + همین علامت.
- DB (migration `0009_platform_modules`): `platform_modules` (`key`، enum `module_status` active/maintenance/off، `message`، `updated_by`، `updated_at`)؛ ردیف ناموجود = active. RLS + FORCE: خواندن برای همه (گارد هر درخواست حتی ناشناس، `readModuleStates`)، INSERT/UPDATE فقط `is_platform_admin()` با `updated_by` = همان ادمین؛ DELETE نه.
- apps/api: `ModuleGuard` **اولین** گارد سراسری (پیش از احراز هویت): route بدون ماژول آزاد؛ maintenance فقط route `@Public` را باز می‌گذارد؛ off همه را می‌بندد ← `503 {message: module_maintenance|module_off, module, notice}`. `CachedModuleStateService` وضعیت را ۱۰ ثانیه کش می‌کند (تغییر در همان نمونه فوراً invalidate؛ نمونه‌های دیگر حداکثر ۱۰ ثانیه بعد). `GET /modules` (عمومی) برای منوی پنل.
- مسیرهای غیرمحصولی (حساب، آواتار، `FILE_SERVICE` از داخل محصولات دیگر) ماژول ندارند و بسته نمی‌شوند؛ ولی خاموشی norofile مسیر عمومی فایل‌ها را می‌بندد، پس تصاویر نورولینک و آواتارها هم نمایش داده نمی‌شوند (هشدار در UI).
- API ادمین: `GET /admin/modules`، `PUT /admin/modules/:key` (`{status, message?}`؛ کلید ناشناس ← ۴۰۰ `unknown_module`)؛ لاگ `module.status` با `target_type = module` و `{module, from, to, message}`.
- وب: `/admin/modules` (هر محصول: وضعیت، اثر هر حالت، پیام اختیاری، آخرین تغییر)؛ منوی پنل ماژول خاموش را حذف و در حال تعمیر را با برچسب نشان می‌دهد و صفحه‌های آن (با ادیتورها) پیام وضعیت را به‌جای محتوا نشان می‌دهند؛ صفحه‌ی لینک عمومی در حالت off پیام ادمین را نشان می‌دهد؛ خطاهای ۵۰۳ در پنل همان پیام ادمین را نمایش می‌دهند.

**پیاده‌سازی ۱۱.۴ (ورود پشتیبانی):**
- DB (migration `0008_support_access`): جدول `support_access_grants` (`user_id`، `admin_user_id`، `reason`، `token_hash` sha256، `expires_at`، `redeemed_at/ended_at/revoked_at`، `revoked_by` admin/user) با RLS + FORCE و سه مسیر: ادمین (`is_platform_admin()`؛ ساخت فقط با هویت خودش)، خود کاربر (`app.current_user`؛ دیدن و ابطال) و بررسی نشست (`app.support_grant_id`، فقط همان یک ردیف؛ `findSupportGrant` در `@noroset/db`). `noroset_app`: SELECT/INSERT و UPDATE فقط روی ستون‌های وضعیت (مهلت، کاربر، دلیل و توکن immutable)؛ DELETE نه.
- مدت ۵ تا ۶۰ دقیقه (UI: ۱۵/۳۰/۶۰)؛ همان `expires_at` هم مهلت مصرف لینک است و هم پایان نشست. ورود به حساب superadmin (`409 cannot_impersonate_admin`)، کاربر غیرفعال (`409 user_inactive`) و خود ادمین ممنوع.
- لینک `noroset.com/support#{token}`: توکن در fragment است (به سرور/لاگ/Referer نمی‌رسد)؛ صفحه همان لحظه آن را از آدرس پاک می‌کند و `POST /auth/support/redeem` می‌زند. مصرف: فقط superadmin صادرکننده با نشست خودش (`403 support_link_not_yours`)، یک‌بار (`410 support_link_used`)، پیش از انقضا (`410 support_link_expired`).
- نشست: کوکی httpOnly `support_token` (JWT با `sub` کاربر، `act` ادمین، `sg` دسترسی، `typ: support`) کنار نشست خود ادمین. `AuthGuard` در هر درخواست هر دو را می‌خواهد: access token معتبر همان ادمین (منقضی ← ۴۰۱ ساده و وب refresh می‌کند) و دسترسی زنده در DB + ادمین هنوز superadmin فعال + کاربر فعال؛ وگرنه `401 support_session_ended` (وب کوکی را با `/auth/support/end` پاک و به `/admin` برمی‌گردد). توکن پشتیبانی جای access token پذیرفته نمی‌شود.
- ممنوع در نشست پشتیبانی (`403 impersonation_forbidden`): routeهای `@NotInSupport()` (`SUPPORT_FORBIDDEN_KEY` در core: تعیین رمز، مصرف لینک دیگر، ابطال دسترسی پشتیبانی)، هر route نقش پلتفرمی، و `/auth/logout-all`. `/auth/logout` در این نشست فقط همان نشست پشتیبانی را می‌بندد.
- `SupportAuditInterceptor` (سراسری) هر درخواست تغییردهنده را **پیش از اجرا** با `support.request` و `{method, route, tenantId, grantId}` به نام ادمین ثبت می‌کند (بدون query/بدنه)؛ اگر ثبت نشود درخواست اجرا نمی‌شود. بقیه: `support.grant`، `support.redeem`، `support.end`، `support.revoke`.
- API ادمین: `POST /admin/users/:id/support-grants` (`{reason, minutes}` ← `{grant, token}`؛ توکن فقط همین یک‌بار)، `GET /admin/users/:id/support-grants`، `POST /admin/support-grants/:id/revoke`. کاربر: `GET /me/support-access` (زمان، مدت، دلیل، وضعیت؛ بدون نام ادمین)، `POST /me/support-access/:id/revoke`. `GET /me` شامل `support: {grantId, expiresAt} | null`.
- وب: بخش «ورود پشتیبانی» در صفحه‌ی کاربر (ساخت، لینک با کپی و «ورود اکنون»، سابقه، ابطال)؛ نوار «حالت پشتیبانی» بالای همه‌ی صفحه‌های پنل و ادیتورها با «پایان پشتیبانی» (بازگشت به صفحه‌ی همان کاربر)؛ کارت «دسترسی‌های پشتیبانی» در `/account`؛ ویرایش رمز در این حالت پنهان.

**پیاده‌سازی ۱۱.۳ (هسته):**
- DB (migration `0007_platform_admin`): enum `platform_role` و ستون `platform_users.platform_role`، مقدار `blocked` در `user_status`، ستون‌های `status_reason`/`status_changed_at`؛ تابع `is_platform_admin()`؛ جدول `admin_audit_log` با RLS + FORCE؛ policy `tenant_memberships_platform_admin_select`.
- API (`products/admin/api`، همه `@PlatformRoles('superadmin')`):

| route | توضیح |
|---|---|
| `GET /admin/overview` | شمار کاربران (به تفکیک وضعیت) و tenantها |
| `GET /admin/users?q&status&role&limit&offset` | فهرست؛ جدیدترین اول |
| `POST /admin/users` | `{mobile, fullName?, password?, tenant?: {name, slug}}`؛ موبایل تکراری ← ۴۰۹ `mobile_taken` |
| `GET /admin/users/:id` | جزئیات + عضویت‌ها + شمار نشست‌های فعال |
| `PATCH /admin/users/:id` | `{fullName}` |
| `POST /admin/users/:id/status` | `{status, reason}` (دلیل برای disabled/blocked اجباری)؛ نشست‌ها باطل |
| `POST /admin/users/:id/role` | `{platformRole}` |
| `POST /admin/users/:id/password` | `{newPassword}`؛ نشست‌ها باطل |
| `POST /admin/users/:id/sessions/revoke` | خروج از همه‌ی دستگاه‌ها |
| `GET /admin/tenants?q&status&limit&offset` · `GET /admin/tenants/:id` | فهرست / جزئیات با اعضا |
| `POST /admin/tenants/:id/status` | `{status, reason}` |
| `GET /admin/audit?targetType&targetId&actorId&limit&offset` | لاگ ممیزی |

- `GET /me` شامل `platformRole`؛ سایدبار پنل برای superadmin آیتم «مدیریت پلتفرم» دارد. صفحه‌ها: [`routes.md`](./routes.md). قراردادهای نمایشی در `@noroset/admin/ui`.
- خطاها: موبایل نامعتبر ۴۲۲ `invalid_mobile`، رمز ضعیف ۴۲۲ `weak_password`، دلیل خالی ۴۲۲ `reason_required`، slug ۴۰۹ `slug_taken`/`slug_reserved`، تغییر خود ۴۰۹ `cannot_modify_self`، ناموجود ۴۰۴.
- core: `PLATFORM_ROLES_KEY`، `PlatformRole`، Port `PLATFORM_ADMIN_CONTEXT` (`adminId/ip/run`؛ پیاده‌سازی `PlatformAdminContextService` در apps/api). dependency-cruiser: admin ↔ noroform/norolink/norofile ممنوع.

### ۹.۱۲ بلاگ پلتفرم (پیاده‌سازی‌شده)
- **چیست:** بلاگ خود نوروست (آموزش، راهنما، تازه‌ها) برای سئو و جذب؛ محتوای پلتفرم است نه امکان کاربران: tenant ندارد، فقط superadmin می‌نویسد و خواننده ناشناس است. پکیج `products/blog` (`@noroset/blog`) با همان ساختار محصولات: `shared/` موتور خالص (نوع‌ها، سند محتوا، نشانی، متن فارسی، سئو، ویدیو)، `api/` ماژول Nest، `ui/` رندر سند (`BlogContent`؛ بدون hook، در Server Component). اضافه شد با commit `559c78d` (۱۴۰۵/۸/۱۶).
- **مرزها:** blog به هیچ محصولی وابسته نیست و هیچ محصولی به آن (dependency-cruiser، §۵)؛ فایل از Port `FILE_SERVICE` و هویت ادمین از Port `PLATFORM_ADMIN_CONTEXT` در core. در رجیستری ماژول‌ها (§۹.۱۱، `PLATFORM_MODULE_KEYS`) نیست، پس از مدیریت پلتفرم خاموش نمی‌شود.
- **DB** (`packages/db/src/blog.schema.ts`، migration `0022_blog`؛ همه سطح پلتفرم، بدون `tenant_id`، RLS + FORCE):

| جدول | نقش | RLS |
|---|---|---|
| `blog_posts` | `slug` یکتا، `status` (draft/published)، عنوان، خلاصه، `content` (سند JSON)، `search_text` (نرمال‌شده برای جست‌وجو)، `word_count`، `reading_minutes`، `cover`، دسته، `featured`، `allow_comments`، `seo` jsonb، `published_at`، `created_by/updated_by` | عموم: فقط published با `published_at <= now()`؛ ادمین: همه |
| `blog_categories` · `blog_tags` | نام، `slug` یکتا (دسته: توضیح، `seo`، ترتیب) | خواندن آزاد؛ نوشتن ادمین |
| `blog_post_tags` | رابطه‌ی مقاله ← برچسب | فقط برای مقاله‌ی قابل‌مشاهده |
| `blog_slug_redirects` | نشانی‌های قبلی مقاله ← مقاله | فقط برای مقاله‌ی قابل‌مشاهده |
| `blog_comments` | نظر و پاسخ یک‌سطحی (`parent_id`)، `status` (pending/approved/rejected)، `from_admin`، ایمیل اختیاری، `ip_hash` (HMAC، نه IP) | عموم: خواندن فقط approved، INSERT فقط pending روی مقاله‌ی باز؛ ادمین: همه |

  نوشتن همه با `is_platform_admin()` (تراکنش از Port `PLATFORM_ADMIN_CONTEXT`)؛ عموم بدون هیچ setting می‌خواند. CHECKها: published ⇒ `published_at`، jsonbها object، الگوی نشانی.
- **نشانی (`shared/slug.ts`):** حروف کوچک لاتین، ارقام لاتین و **حروف فارسی** جداشده با `-`، ≤ ۱۲۰ (همان CHECK جدول‌ها)؛ `category`، `tag`، `feed`، `page`، `search`، `author` برای مقاله رزرو. ساخت خودکار از عنوان (`slugify`) و در تکرار `-2`، `-3`، … (ارقام لاتین). **تغییر نشانی** مقاله‌ای که یک بار منتشر شده نشانی قبلی را در `blog_slug_redirects` نگه می‌دارد: ریدایرکت دائمی ۳۰۸ به نشانی فعلی (بدون زنجیره) و آن نشانی برای مقاله‌های دیگر گرفته‌شده است؛ برگشت به نشانی قبلی همان مقاله ریدایرکتش را برمی‌دارد.
- **محتوا (`shared/doc.ts`):** سند JSON ویرایشگر **TipTap** (`@tiptap/*` pin در وب)، فقط گره‌ها و نشانه‌های فهرست سفید: پاراگراف، تیتر ۲ تا ۴، فهرست‌ها، نقل‌قول، کد، خط افقی، تصویر، ویدیو، callout (info/tip/warning/danger)، جدول، details (پرسش‌وپاسخ)؛ نشانه‌ها: پررنگ، کج، زیرخط، خط‌خورده، کد، لینک. سرور هر سند را با `sanitizeDoc` بازسازی می‌کند (ویژگی ناشناس حذف، گره ناشناس ← ۴۲۲ `invalid_blog_content`، لینک ناامن حذف)، سقف ۸۰۰KB (`content_too_large`)؛ **هرگز HTML**. ویدیو فقط آپارات/یوتیوب/ویمیو، iframe از قالب ثابت (`videoEmbedUrl`). تصویرها (شاخص و داخل متن) فقط **فایل پلتفرم norofile** (`uploadPlatform`، `source: blog`، ≤ ۵MB، public؛ uuid، هرگز آدرس بیرونی ← `invalid_asset`) و حذف نمی‌شوند چون مقاله‌ها به آن‌ها اشاره می‌کنند.
- **انتشار:** ذخیره **صریح** است (بدون ذخیره‌ی خودکار)، پس ویرایش مقاله‌ی منتشرشده همان لحظه دیده می‌شود. انتشار به عنوان، نشانی معتبر و متن غیرخالی نیاز دارد (۴۲۲ `not_publishable` با `issues`: `missing_title`، `missing_slug`، `empty_content`). زمان‌بندی انتشار نداریم: `published_at` فقط می‌تواند تاریخ گذشته باشد (برای مقاله‌ی منتقل‌شده)، وگرنه زمان انتشار. لغو انتشار ← پیش‌نویس. حداکثر ۱۵ برچسب؛ برچسب تازه از خود ویرایش مقاله ساخته می‌شود؛ حذف دسته مقاله‌ها را بی‌دسته می‌کند. هر کار تغییردهنده در لاگ ممیزی (`blog_post.*`، `blog_category.*`، `blog_tag.*`، `blog_comment.*`).
- **سئو (`shared/seo.ts`):** هر مقاله `seo` (عنوان و توضیح متا، کلمه‌ی کلیدی، OG، canonical فقط https، noindex)؛ خالی ← عنوان و خلاصه. `analyzeSeo` خالص در ادیتور (کلمه‌ی کلیدی، طول‌ها، …) **فقط راهنماست** و مانع انتشار نیست. متن فارسی برای جست‌وجو و تحلیل با `normalizeFa` یکسان می‌شود (ي/ك عربی، اعراب، نیم‌فاصله، ارقام).
- **API ادمین** (`/blog/admin`، همه `@PlatformRoles('superadmin')`): `GET|POST posts`، `GET|PATCH|DELETE posts/:id`، `POST posts/:id/publish|unpublish`، `POST uploads` (بدنه‌ی خام تصویر)، `GET|POST categories`، `PATCH|DELETE categories/:id`، `GET tags`، `PATCH|DELETE tags/:id`، `GET comments`، `POST comments/:id/status`، `POST comments/:id/reply`، `DELETE comments/:id`. پاسخ ادمین با نام «تیم نوروست» همان لحظه تأییدشده است و نظر در انتظاری را که به آن پاسخ داده شده هم تأیید می‌کند.
- **API عمومی** (`/blog/public`، `@Public`): `GET posts?page&limit&category&tag&q&featured` (۱۲تایی)، `GET posts/:slug` (مقاله + ۳ مطلب مرتبط: هم‌دسته یا با برچسب مشترک، سپس جدیدترین‌ها + نظرهای تأییدشده؛ نشانی قبلی ← `{redirect}`)، `POST posts/:slug/comments` (`{name, email?, body, parentId?, website?}`)، `GET categories`، `GET tags/:slug`، `GET sitemap` (مقاله‌ی noindex یا با canonical دیگر نمی‌آید). **ضد اسپم نظر:** ۵ نظر در ۱۰ دقیقه به‌ازای IP، honeypot `website` (پرشده ← همان `{ok: true}` بدون ذخیره)، همه در انتظار تأیید؛ مقاله‌ی بسته ← ۴۰۹ `comments_closed`، پاسخ فقط به نظر تأییدشده‌ی همان مقاله. ایمیل نظر هرگز در API عمومی برنمی‌گردد. خواندن rate limit ندارد چون رندر سرور وب همه از یک IP می‌خواند.
- **وب عمومی** (`apps/web/src/app/(marketing)/blog`؛ آدرس‌ها در [`routes.md`](./routes.md)): رندر سرور بدون کش Next (`_lib/blog-api.ts`)؛ وضعیت HTTP را proxy پیش از stream تعیین می‌کند (مثل صفحه‌ی لینک، §۹.۱؛ `src/lib/blog-gate.ts`): مقاله، دسته یا برچسب ناموجود ← ۴۰۴ با صفحه‌ی not-found خود Next (بازنویسی به `/_gate/not-found` که هرگز route نیست) و نشانی قبلی مقاله ← ۳۰۸، چون notFound()/permanentRedirect() داخل صفحه‌ی stream‌شده ۲۰۰ می‌دادند؛ فهرست با مقاله‌ی ویژه، دسته‌ها، جست‌وجو (نتیجه noindex) و صفحه‌بندی قابل خزش؛ صفحه‌ی مقاله با فهرست مطالب، مطالب مرتبط، نظرها و JSON-LD (`BlogPosting`، `BreadcrumbList`، و `FAQPage` از گره‌های details)؛ صفحه‌ی دسته و برچسب؛ RSS ۲.۰ بیست مقاله‌ی آخر (`/blog/feed`)؛ `sitemap.xml` و `robots.txt` دامنه‌ی اصلی مقاله‌ها، دسته‌ها و برچسب‌ها را می‌آورند (روی دامنه‌ی کوتاه ۴۰۴). **صفحه‌ی اصلی سایت** چهار مطلب آخر را پیش از فوتر نشان می‌دهد (`_components/latest-posts.tsx`؛ دکمه‌ی «مطالب بیشتر» به `/blog`؛ داخل Suspense و خطای API یا نبودن مطلب فقط همین بخش را پنهان می‌کند).
- **پنل** (`(panel)/admin/blog`): فهرست مقاله‌ها، ادیتور WYSIWYG (TipTap، ظاهر همان `.blog-prose` صفحه‌ی عمومی) با پنل سئو (کلمه‌ی کلیدی، نمای نتیجه‌ی گوگل، کارت اشتراک، canonical، noindex)، دسته‌ها و برچسب‌ها، و تأیید نظرها با شمار نظرهای در انتظار.

---

### ۹.۱۳ کنترل صفحه‌های لینک و گزارش تخلف (پیاده‌سازی‌شده)
- **چیست** (تصمیم مالک محصول ۱۴۰۵/۸/۲۰): superadmin در شرایط خاص حقوقی، امنیتی یا تخلف وضعیت صفحه‌ی منتشرشده را محدود می‌کند و بازدیدکننده‌ها می‌توانند تخلف را گزارش کنند. الگو: رسیدگی به محتوای سرویس‌های link-in-bio و کوتاه‌کننده‌ی لینک، صفحه‌ی هشدار Safe Browsing، کد ۴۵۱ (RFC 7725) و «اعلام دلیل» (statement of reasons) در DSA. کد در `products/norolink` (`shared/moderation.ts`، `api/moderation`)؛ admin و norolink همچنان به هم وابسته نیستند.
- **وضعیت مدیریتی** (`norolink_pages.moderation_status`، جدا از `status` مالک): `none`؛ `delisted` (صفحه بالا، بیرون از دایرکتوری/sitemap و noindex)؛ `warning` (پیش از محتوا صفحه‌ی هشدار قرمز با «بازگشت به جای امن» برجسته و «ادامه» کم‌رنگ؛ `?continue=1` صفحه را با نوار هشدار باز می‌کند و کلید کش nginx `$arg_continue` را دارد)؛ `suspended` (هیچ محتوایی برنمی‌گردد؛ `legal_order` ← ۴۵۱ با هدر `Link: rel="blocked-by"`، بقیه ← ۴۰۳؛ هر دو از proxy پیش از رندر). هر وضعیت جز `none` **دسته‌ی دلیل** اجباری دارد (`legal_order`، `phishing`، `malware`، `scam`، `impersonation`، `intellectual_property`، `illegal_content`، `hate_violence`، `adult`، `privacy`، `spam`، `other`)، پیام عمومی اختیاری (خالی ← `defaultModerationNotice`)، شماره‌ی مرجع اختیاری و مدت اختیاری (۱ روز تا ۱ سال؛ مهلت گذشته ← بدون محدودیت مؤثر، بدون job، `effectiveModeration`). **یادداشت داخلی** همیشه اجباری است، حتی برای برداشتن محدودیت، و فقط در `admin_audit_log.reason` (`link_page.moderate`، target `link_page`) می‌ماند.
- **قفل مالک:** در `warning` و `suspended` مؤثر، انتشار، تغییر نشانی و حذف صفحه ← ۴۰۳ `page_moderated` (حذف ممنوع تا مدرک بماند)؛ ویرایش پیش‌نویس و لغو انتشار آزاد است. trigger `guard_norolink_page_moderation` همین را در DB هم می‌گیرد، ستون‌های `moderation_*` را فقط از مسیر ادمین (`app.page_moderation=on` + `is_platform_admin()`) می‌پذیرد و همان مسیر را از تغییر هر ستون دیگری بازمی‌دارد؛ cascade حذف tenant آزاد است.
- **دسترسی ادمین:** policy `norolink_pages_platform_admin_select|update` فقط برای صفحه‌های دارای `published_snapshot` (دست‌کم یک بار منتشرشده)؛ سرویس فقط snapshot را می‌خواند و پیش‌نویس و المان‌ها همچنان فقط با ورود پشتیبانی دیده می‌شوند (تصمیم مالک محصول ۱۴۰۵/۸/۲۰؛ استثنای محدود قاعده‌ی §۹.۱۱).
- **اطلاع مالک:** اعلان درون پنل (`(panel)/link/moderation-banner.tsx` در ویرایشگر و نشان در فهرست صفحه‌ها) با وضعیت، دسته‌ی دلیل، پیام عمومی، پایان محدودیت و راه اعتراض از پشتیبانی؛ و مورد مانع در دیالوگ انتشار. یادداشت داخلی و گزارش‌ها به مالک نمی‌رسند. پیامک نه.
- **گزارش تخلف:** پانویس هر صفحه‌ی عمومی پیوند «گزارش تخلف» به `n8l.ir/report/{slug}` دارد (`LinkPage.reportHref`؛ فرم: دلیل، توضیح، راه تماس اختیاری). `POST /norolink/public/pages/:slug/reports` (`@Public`): فقط برای صفحه‌ی منتشرشده‌ی همان نشانی (policy ثبت در DB)، ۵ گزارش در ۱۰ دقیقه به‌ازای IP، honeypot `website`، و گزارش تکراری همان IP برای همان صفحه در ۲۴ ساعت بی‌صدا نادیده (IP فقط HMAC)؛ `legal_order` فقط از سوی ادمین. `norolink_page_reports`: `noroset_app` فقط SELECT/INSERT و UPDATE ستون‌های رسیدگی؛ خواندن فقط ادمین (و مسیر عمومی فقط برای بررسی تکرار همان هش).
- **API ادمین** (`/norolink/admin`، `@SuperAdmin()` بدون `@ProductModule()` تا در حالت تعمیر هم کار کند): `GET pages?q&filter&limit&offset` (`q` نشانی، لینک کامل یا عنوان؛ `filter` یک وضعیت، `moderated` یا `reported`؛ گزارش‌دارها اول)، `GET pages/:id` (snapshot و گزارش‌ها)، `PUT pages/:id/moderation` (`{status, reason?, note, notice?, reference?, days?, resolveReports?}`؛ بدون دسته ← ۴۲۲ `moderation_reason_required`)، `GET reports?status`، `POST reports/:id/resolve` (`{status: actioned|dismissed, note?}`؛ دوباره ← ۴۰۹ `report_resolved`؛ لاگ `link_report.resolve`).
- **پنل:** `/admin/link-pages` (زبانه‌های «صفحه‌ها» و «گزارش‌ها») و `/admin/link-pages/{id}` (وضعیت، نسخه‌ی منتشرشده، گزارش‌ها، سابقه‌ی ممیزی، دیالوگ تغییر وضعیت).
- **اثر زمانی:** کش ۱۰ ثانیه‌ای nginx صفحه‌ی عمومی، پس محدودیت حداکثر ۱۰ ثانیه بعد دیده می‌شود (۴۵۱/۴۰۳ کش نمی‌شوند). بعداً: اقدام گروهی، اعلان ایمیل/پیامک به مالک، گزارش شفافیت.

## ۱۰. ترتیب ساخت و وضعیت

| # | مرحله | وضعیت |
|---|---|---|
| ۱ | اسکلت ریپو، CI، قوانین مرز | انجام شد (`f6fd286`) |
| ۲ | DB هسته + RLS + نقش‌ها + تست | انجام شد (`862a3fe`) |
| ۳ | auth (OTP، session، guard، tenant، تست RLS عمومی) | انجام شد (`316650a`) |
| ۴ | سخت‌سازی کوچک (دو secret، اعتبارسنجی env، `docs/tech-debt.md`) | انجام شد (`8e20297`) |
| ۵ | field-engine هسته (سه رجیستری، schema، توابع خالص، تست) | انجام شد |
| ۶ | DB noroform (سه جدول، RLS، تست، مسیر ویژه‌ی فرم عمومی) | انجام شد |
| ۷ | API فرم‌ها (CRUD پیش‌نویس، انتشار، اعتبارسنجی) | انجام شد |
| ۸ | API عمومی (خواندن فرم منتشرشده، ثبت پاسخ، ضد اسپم، idempotency) | انجام شد |
| ۹ | API پاسخ‌ها (فهرست، جزئیات، export CSV/XLSX) | انجام شد |
| ۱۰ | UI: فرم‌ساز، فرم عمومی، صفحه پاسخ‌ها (بخش React field-engine) | در حال انجام؛ انتشار نسخه و اجرای عمومی/ثبت پاسخ پیاده شد؛ صفحه‌ی پاسخ‌ها و انتخابگر تاریخ شمسی هنوز باز است (§۲) |
| ۱۱ | norolink (DB + API + UI) | انجام شد (بخش ۹.۷ و ۹.۸)؛ بلوک «لینک به فرم» به بعد از لانچ موکول شد |
| ۱۱.۱ | norofile (DB + API + UI؛ انتقال S3 از apps/api و norolink) | انجام شد (بخش ۹.۹) |
| ۱۱.۲ | حساب کاربری (نام، آواتار، رمز) + فضای شخصی norofile + کارت آپلود مشترک | انجام شد (بخش ۷، ۹.۹، ۹.۱۰) |
| ۱۱.۳ | admin هسته: نقش superadmin، گارد، لاگ ممیزی، مدیریت کاربران و tenantها (بخش ۹.۱۱) | انجام شد |
| ۱۱.۴ | admin: ورود پشتیبانی به حساب کاربر | انجام شد |
| ۱۱.۵ | admin: مدیریت ماژول‌ها | انجام شد |
| ۱۱.۶ | admin: پلن، اشتراک، پرداخت آنلاین (زرین‌پال)، جایگزینی `PLAN_RESOLVER` | انجام شد (`622ed1f`، `15e0bb7`) |
| ۱۱.۷ | admin: کمپین‌ها (کد تخفیف، اعلان، UTM) | انجام شد |
| ۱۱.۸ | norolink: ظاهر نسخه‌ی ۲ (ظاهر آزاد در همه‌ی پلن‌ها، پس‌زمینه‌ی عکس هوشمند، ستون دسکتاپ ۷۲۰، کانتینر خودکار، tonal؛ §۹.۳) | انجام شد |
| ۱۱.۹ | norolink/admin: قالب‌های آماده‌ی مدیریت پلتفرم (ساخت با ادیتور، انتشار در گالری، حذف قالب‌های موجود؛ §۹.۸) | انجام شد |
| ۱۱.۱۰ | norolink/admin: واگذاری بدون شماره موبایل، فقط از ادیتور قالب مدیریت پلتفرم، و دانلود لینک‌ها در کمپین‌ها (§۹.۸) | انجام شد |
| ۱۱.۱۱ | norolink/admin: بازطراحی قیف واگذاری پس از تست زنده (نشانی رزروشده، صفحه‌ی تحویل تمام‌صفحه، قیف لینک‌ها در کمپین‌ها، پیام‌های پس از خرید، قفل رزرو پرداخت‌شده؛ §۹.۸، §۹.۱۱) | انجام شد |
| ۱۱.۱۲ | بلاگ پلتفرم (DB + API + وب عمومی + مدیریت در پنل ادمین؛ §۹.۱۲) | انجام شد (`559c78d`)؛ چهار مطلب آخر در صفحه‌ی اصلی (۱۴۰۵/۸/۱۹) |
| ۱۱.۱۳ | کنترل صفحه‌های لینک از سوی مدیریت پلتفرم + گزارش تخلف؛ دایرکتوری فقط صفحه‌های واقعی (§۹.۱۳) | انجام شد |
| ۱۲ | subdomain، آماده‌سازی production (پشتیبان‌گیری، پیامک واقعی، مرچنت زرین‌پال؛ [`launch-blueprint.md`](./launch-blueprint.md)) | کد و فایل‌های استقرار آماده؛ اجرا روی سرور و چک‌لیست باز است |
| ۱۳ | بتای بسته | |

هر مرحله: یک پرامپت، یک commit، گزارش شامل فهرست فایل‌ها + خروجی تست + `lint/typecheck/check:boundaries`.

---

## ۱۱. بدهی فنی شناخته‌شده (قبل از لانچ بسته شود)

جزئیات موارد ۱ تا ۵ در [`tech-debt.md`](./tech-debt.md).

1. **Rate limit درون‌حافظه:** سقف OTP هر موبایل از DB است؛ بقیه برای یک instance لانچ پذیرفته شد. با چند instance باید مشترک شود.
2. ~~trustProxy و IP واقعی~~ (انجام شد: `TRUST_PROXY=loopback`).
3. ~~CSRF~~ (انجام شد: بررسی Origin در production، `apps/api/src/config/csrf.ts`).
4. ~~زمان‌بندی `cleanup_expired_auth()`~~ (انجام شد: `deploy/ops/cleanup-auth.sh` با cron).
5. رمز `roles.sql` با `sed`: در نبود رمز متوقف می‌شود و رمزهای production باید hex باشند.
6. seed آینده باید tenant را ست کند (FORCE RLS).
7. تست «tenant معلق ← ۴۰۳».
8. ~~Dockerfile برای production~~ (تصمیم: PM2 روی host و بیلد لینوکسی از ماشین مالک، [`launch-blueprint.md`](./launch-blueprint.md)). CI هنوز تست‌ها را اجرا نمی‌کند.
9. ذخیره‌ی فایل: production روی SeaweedFS همان سرور با کش nginx. باز: پاک‌سازی اشیای S3 یتیم (حذف شیء بعد از commit best-effort است) و CDN پس از روشن شدن سهمیه و هدر IP پارس‌پک.
10. **ورود ادمین بدون step-up/2FA** (تصمیم مالک محصول ۱۴۰۵/۸/۱۰: بعد از لانچ؛ §۹.۱۱): نشست دزدیده‌شده‌ی یک superadmin می‌تواند superadmin تازه بسازد؛ تنها مانع لاگ ممیزی است.
11. ستون‌های `norolink_pages.claim_token` و `claimed_at` دیگر استفاده نمی‌شوند و برای امکان برگشت به ریلیز قبلی در migration `0020` مانده‌اند؛ در ریلیز بعد از آن حذف شوند ([`release.md`](./release.md) §۶).
12. ستون‌های `norolink_templates.claim_token` و `claimed_at` هم از migration `0023` (انتقال لینک‌ها به `norolink_claim_links`) استفاده نمی‌شوند و به همان دلیل مانده‌اند؛ در ریلیز بعد از آن حذف شوند.

---

## ۱۲. نقشه‌ی راه بعد از لانچ (تصمیم‌های بلندمدت ثبت‌شده)

- **نورودیتا:** دو لایه: Data Engine (همیشه فعال، نامرئی؛ جدول/فیلد/رکورد با JSONB و `record_links`) و Studio (محصول قابل فروش). noroform پاسخ‌ها را از طریق Port در Data Engine ذخیره کند (جدول مخفی `managed_by='noroform'`)؛ ارتقا به Studio فقط تغییر entitlement است، بدون مهاجرت داده. ساختار جدول مخفی از Studio فقط‌خواندنی؛ `detach` بعداً. حالت mapped (اتصال فرم به جدول موجود) همراه Studio.
- **لایه‌بندی هدف:** لایه ۱ core (+ noroai به‌عنوان سرویس زیرساختی)، لایه ۲ norodata، لایه ۳ noroform/noroflow/nororeport/norolink. FK فقط به لایه‌ی پایین‌تر/همیشه‌حاضر. norofile محصول هم‌ارز لایه ۳ است و فقط از Port `FILE_SERVICE` در core در اختیار بقیه قرار می‌گیرد (§۹.۹).
- **Entitlements/Billing:** پلن‌ها داده‌اند نه کد و اشتراک در سطح tenant (در لانچ، مرحله ۱۱.۶، §۹.۱۱)؛ بعد از لانچ: `entitlements.check` عمومی در گارد بک‌اند، Usage metering، تمدید خودکار.
- **Registry Pattern** برای اتصال محصولات: Action/Trigger (noroflow)، Report Source (nororeport)، entitlement keyها، آیتم‌های منو.
- **noroflow:** state اصلی فرایند در خودش؛ انعکاس اختیاری به رکورد با Action.
- **nororeport:** فقط روی Data Source انتزاعی/Read Model، نه SQL مستقیم روی جدول‌های محصولات.
- **noroai (قابلیت زیرساختی، مثل Gemini در محصولات گوگل):** دو حالت: *دستیار* (هویت و مجوز همان کاربر) و *ایجنت* (هویت جدا؛ مجوز زیرمجموعه‌ی مجوز مالک). ایجنت‌های آماده با Blueprint ← Installation ← Run. محصولات ابزار و context خود را ثبت می‌کنند؛ noroai محصولی را مستقیم نمی‌شناسد. Actor مفهوم عام در core؛ ایجنت‌ها جدا از `tenant_memberships`. «هدف راهبردی» حذف شده است. سیاست تأیید انسانی برای کارهای پرخطر پیشنهاد: قابل‌تنظیم برای هر Action (باز، سطح‌بندی ریسک).
- **workspace:** اضافه‌شدن `workspace_id` زیرمجموعه‌ی tenant.
- **Solution Pack:** بسته‌ی آماده‌ی Table + Form + Flow + Report با نصب یک‌کلیکی.
- **استقلال استقرار جدا (on-premise)** تعهد نیست؛ فقط با رعایت مرزها بسته نمی‌شود.

---

## ۱۳. قراردادهای کار با ایجنت (Claude Code)

1. هر مرحله‌ی بزرگ: طرح کوتاه ← (در صورت ابهام واقعی سؤال) ← پیاده‌سازی ← تست ← commit جدا.
2. نسخه‌ی وابستگی‌ها pin (بدون `^`).
3. هیچ ادعایی بدون مسیر فایل/شاهد؛ حدس نزن.
4. تست‌ها علیه PostgreSQL واقعی و با نقش `noroset_app`.
5. رمزنگاری دستی ننویس؛ از کتابخانه‌های استاندارد.
6. هر جدول جدید: `tenant_id` + RLS + FORCE (تست عمومی catalog شکست می‌خورد اگر نباشد).
7. محصول به داخل محصول دیگر دست نمی‌زند؛ `check:boundaries` همیشه سبز.
8. دامنه‌ی لانچ را بزرگ نکن؛ موارد خارج از بخش ۲ فقط در بخش ۱۲ ثبت شوند.
9. در پایان هر مرحله: `pnpm lint`، `pnpm typecheck`، `pnpm check:boundaries`، `pnpm test`.

---

## ۱۴. تصمیم‌های باز

- ارائه‌دهنده‌ی پیامک واقعی: ملی‌پیامک (تصمیم گرفته شد).
- ~~مسیر فرم عمومی و پنل کاربر~~ (تصمیم گرفته شد، [`routes.md`](./routes.md)): پنل در `noroset.com` بدون پیشوند و بدون tenant در آدرس (`/form`، `/link`، `/ws`، `/account`)؛ فرم عمومی `n8l.ir/f/{slug}`؛ فرم داخلی `noroset.com/f/{slug}`. شناسه‌ی عمومی همان slug تصادفی ۱۰ نویسه‌ای است (تصمیم ۱۴۰۵/۸/۲۳، ۲۰۲۶-11-14). باز: لینک private و آدرس فرم/صفحه روی `yourcompany.n8l.ir`.
- ~~میزبانی production~~ (تصمیم گرفته شد: یک سرور ابری پارس‌پک در ایران، [`launch-blueprint.md`](./launch-blueprint.md)). درگاه پرداخت: زرین‌پال (تصمیم گرفته شد، پشت Port `PAYMENT_GATEWAY`)؛ مرچنت به اینماد و دامنه وابسته است.
- ~~ساختار تفصیلی norolink~~ (تصمیم گرفته شد، بخش ۹؛ صفحه‌ی عمومی `{slug}.n8l.ir`).
- ~~سقف‌های پلن رایگان/پولی~~ (تصمیم گرفته شد، §۹.۱۱ «تصمیم‌های ۱۱.۶»).
