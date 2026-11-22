# ساختار صفحات وب (آدرس‌دهی فرانت)

> مرجع آدرس صفحه‌های `apps/web`. هر صفحه‌ی جدید اول اینجا و در `apps/web/src/lib/routes.ts` ثبت می‌شود.
> تست `apps/web/test/routes.test.ts` درخت `page.tsx`ها را با همین نقشه مقایسه می‌کند؛ صفحه‌ی ثبت‌نشده یا مسیر موازی = شکست تست.

## ۱. نقشه‌ی آدرس‌ها

### مارکتینگ — route group `(marketing)`
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/` | `(marketing)/page.tsx` | صفحه‌ی اصلی پلتفرم |
| `noroset.com/landing/form` | `(marketing)/landing/form/page.tsx` | لندینگ نوروفرم |
| `noroset.com/landing/form/soon` | `(marketing)/landing/form/soon/page.tsx` | صفحه‌ی «به‌زودی» نوروفرم؛ تا لانچ آن، `proxy.ts` همه‌ی مسیرهای `/form` را به اینجا بازنویسی می‌کند |
| `noroset.com/landing/link` | `(marketing)/landing/link/page.tsx` | لندینگ نورولینک |
| `noroset.com/landing/file` | `(marketing)/landing/file/page.tsx` | لندینگ نوروفایل |
| `noroset.com/privacy` | `(marketing)/privacy/page.tsx` | حریم خصوصی (پیش‌فرض) |
| `noroset.com/contact` | `(marketing)/contact/page.tsx` | پشتیبانی و راه‌های تماس (بله، واتس‌اپ، تلگرام و تلفن با دکمه‌ی کپی)؛ پیوند «پشتیبانی» در فوتر |
| `noroset.com/terms` | `(marketing)/terms/page.tsx` | قوانین (پیش‌فرض) |
| `noroset.com/c/{code}` | `c/[code]/route.ts` | لینک کوتاه واگذاری؛ ریدایرکت به `/claim?token=…` با UTM |
| `noroset.com/claim` | `claim/page.tsx` | تحویل صفحه‌ی آماده به مشتری با لینک یک‌بارمصرفی که superadmin از ادیتور قالب می‌سازد: خود صفحه تمام‌صفحه با برگه‌ی تأیید (بیرون از لایه‌ی مارکتینگ)؛ با ورود/ثبت‌نام صفحه‌ای تازه از روی قالب روی نشانی رزروشده در حساب مشتری منتشر می‌شود |
| `noroset.com/blog` | `(marketing)/blog/page.tsx` | وبلاگ پلتفرم: فهرست مقالات منتشرشده |
| `noroset.com/blog/{slug}` | `(marketing)/blog/[slug]/page.tsx` | مشاهده مقاله وبلاگ و ارسال نظرات |
| `noroset.com/blog/category/{slug}` | `(marketing)/blog/category/[slug]/page.tsx` | مقالات بر اساس دسته‌بندی |
| `noroset.com/blog/tag/{slug}` | `(marketing)/blog/tag/[slug]/page.tsx` | مقالات بر اساس برچسب |
| `noroset.com/blog/feed` | `(marketing)/blog/feed/route.ts` | خوراک RSS بیست مقاله‌ی آخر (§۹.۱۲ سند معماری) |

### پلتفرم
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/auth` | `auth/page.tsx` | ورود با OTP، ورود با رمز، فراموشی رمز (یک صفحه با چند حالت؛ ثبت‌نام همان ورود OTP اول است). `?next=` فقط مسیر داخلی |
| `noroset.com/support#{token}` | `support/page.tsx` | مصرف لینک ورود پشتیبانی (فقط مدیر صادرکننده با نشست خودش؛ توکن در fragment و همان لحظه از آدرس پاک می‌شود؛ [`architecture.md`](./architecture.md) §۹.۱۱). سپس `/ws` به نام کاربر با نوار «حالت پشتیبانی» |
| `noroset.com/ws` | `(panel)/ws/page.tsx` | **فعلاً در دسترس نیست و به `/link` ریدایرکت می‌شود (`next.config.mjs`).** «داشبورد» پلتفرم: فهرست فضاهای کاری کاربر (نقش، فضای جاری، ورود به `/link`) + «افزودن فضای کاری» با دیالوگ (`/ws?new=1` از منوی آواتار یا پیوندها آن را مستقیم باز می‌کند)؛ چیدمان مثل `/account` (`components/settings-ui.tsx`) |
| `noroset.com/account` | `(panel)/account/page.tsx` | حساب کاربری (رمز عبور و …) |
| `noroset.com/billing` | `(panel)/billing/page.tsx` | «اشتراک» فضای کاری جاری: پلن مؤثر و مصرف، پلن‌ها و دوره‌ها، خرید/ارتقا با پیش‌فاکتور، آزمایشی ۱۴ روزه، پرداخت‌ها (خرید فقط مالک/مدیر؛ [`architecture.md`](./architecture.md) §۹.۱۱) |
| `noroset.com/billing/result?status=ok\|failed&payment={id}` | `(panel)/billing/result/page.tsx` | نتیجه‌ی بازگشت از درگاه (API پرداخت را سمت سرور تأیید و به اینجا ریدایرکت می‌کند) |
| `noroset.com/billing/receipts/{id}` | `(panel)/billing/receipts/[id]/page.tsx` | رسید قابل چاپ |

### نوروفرم — `(panel)/form`
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/form` | `(panel)/form/page.tsx` | صفحه‌ی اصلی محصول به سبک گوگل فرم: نوار «شروع فرم جدید» (فرم خالی + چند قالب)، «فرم‌های اخیر» با تصویر بندانگشتی، فیلتر مالک، نمای شبکه/فهرست، مرتب‌سازی و جست‌وجوی نوار بالا ([`design-system.md`](./design-system.md)) |
| `noroset.com/form/templates` | `(panel)/form/templates/page.tsx` | گالری قالب‌های فرم به تفکیک دسته؛ انتخاب ← فرم تازه در ادیتور |
| `noroset.com/form/{id}` | `(panel)/form/[id]/page.tsx` | فقط ریدایرکت به ادیتور |
| `noroset.com/form/{id}/editor` | `(panel)/form/[id]/editor/page.tsx` | ادیتور فرم: بوم صفحه‌ها و المان‌ها، تنظیمات درون‌خطی/پیشرفته، هدر و قالب، پیش‌نمایش اجرایی و انتشار ([`architecture.md` §۸.۸](./architecture.md)) |
| `noroset.com/form/{id}/results` | `(panel)/form/[id]/results/page.tsx` | پاسخ‌های فرم (پیش‌فرض): جدول/فهرست، جزئیات هر پاسخ در Sheet، خروجی CSV/XLSX/PDF و ساخت لینک مشاهده‌ی بیرونی همان پاسخ؛ همه‌ی پاسخ‌ها برای همه‌ی اعضای فضای کاری دیده می‌شوند |
| `noroset.com/f/{id}` | `(panel)/f/[id]/page.tsx` | اجرای فرم داخلی در پوسته‌ی پنل و با احراز هویت؛ `{id}` UUID فرم است |
| `n8f.ir/{slug}` | `n8f/f/[slug]/page.tsx` | فرم عمومی قابل‌اشتراک روی دامنه‌ی نوروفرم؛ `{slug}` همان نشانی تصادفی ۱۰ نویسه‌ای فرم است |
| `n8f.ir/` | `n8f/page.tsx` | صفحه‌ی برند/توضیح کوتاه خروجی عمومی نوروفرم |
| `n8f.ir/r/{token}` | `n8f/r/[token]/page.tsx` | مشاهده‌ی بیرونی یک پاسخ با لینک توکن‌دار (قابل ابطال/انقضا)؛ بدون لیست و بدون جست‌وجو |
| `n8l.ir/report/{slug}` | `n8l/report/[slug]/page.tsx` | گزارش تخلف یک صفحه‌ی لینک (پیوند پانویس هر صفحه؛ noindex؛ [`architecture.md`](./architecture.md) §۹.۱۳) |

«نتایج» و «پاسخ‌ها» یک مفهوم‌اند؛ آدرس `results` است و API همان `/noroform/forms/:id/submissions`.

نوروفرم در لانچ نیست ([`architecture.md`](./architecture.md) §۲): در production مگر با `NOROFORM_ENABLED=true`، `proxy.ts` مسیرهای `/form` را به صفحه‌ی «به‌زودی» می‌برد و `/f/{slug}` روی هر دو دامنه ۴۰۴ است. در development روشن است مگر با `NOROFORM_ENABLED=false`. API آن با ماژول `off` در `/admin/modules` بسته می‌شود. در حالت فعال، انتشار از ادیتور یک نسخه‌ی تغییرناپذیر می‌سازد و مسیرهای عمومی فرم را برای نمایش، ناوبری شرطی و ثبت پاسخ فعال می‌کند.

### نورولینک — `(panel)/link`
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/link` | `(panel)/link/page.tsx` | صفحه‌ی اصلی محصول (مثل `/form`): «شروع صفحه‌ی جدید» و «صفحه‌های اخیر» |
| `noroset.com/link/templates` | `(panel)/link/templates/page.tsx` | گالری قالب‌های صفحه‌ی لینک؛ `templates` در فهرست slugهای رزرو است تا با `/link/{slug}` تداخل نکند |
| `noroset.com/link/{slug}/editor` | `(panel)/link/[slug]/editor/page.tsx` | ادیتور صفحه‌ی لینک (تمام‌صفحه) |
| `noroset.com/link/{slug}/analytics` | `(panel)/link/[slug]/analytics/page.tsx` | آمار صفحه‌ی لینک |
| `{slug}.n8l.ir` | `nls/[slug]/page.tsx` | صفحه‌ی لینک عمومی (رندر سرور، CSP محدود frame). محدودیت مدیریت پلتفرم: هشدار ← صفحه‌ی هشدار پیش از محتوا و `?continue=1`؛ تعلیق ← ۴۵۱/۴۰۳ از proxy (§۹.۱۳) |
| `/shots` (فقط توسعه) | `shots/page.tsx` | منبع تصاویر ثابت موکاپ‌ها و بندانگشتی قالب‌ها برای `scripts/shots.mjs`؛ در production ۴۰۴ |
| `n8l.ir/` | `n8l/page.tsx` | دایرکتوری صفحات لینک منتشر شده (کاوش و جست‌وجوی صفحات فعال و عمومی) |

### نوروفایل — `(panel)/file`
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/file` | `(panel)/file/page.tsx` | مدیر فایل (مثل `/form`): نوار «بارگذاری فایل» با مصرف فضا، «فایل‌های اخیر» با فیلتر نوع و مالک، نمای شبکه/فهرست، مرتب‌سازی، باز کردن، دانلود، لینک عمومی، تغییر نام، حذف |

### مدیریت پلتفرم — `(panel)/admin` (فقط superadmin؛ [`architecture.md`](./architecture.md) §۹.۱۱)
| آدرس | فایل | محتوا |
|---|---|---|
| `noroset.com/admin` | `(panel)/admin/page.tsx` | نمای کلی: شمار کاربران/فضاهای کاری و آخرین کارهای مدیران |
| `noroset.com/admin/users` | `(panel)/admin/users/page.tsx` | فهرست کاربران (جست‌وجو، فیلتر وضعیت/نقش) و افزودن کاربر. `?status=` و `?role=superadmin` فیلتر اولیه |
| `noroset.com/admin/users/{id}` | `(panel)/admin/users/[id]/page.tsx` | جزئیات کاربر: وضعیت با دلیل، نقش پلتفرم، تعیین رمز، خروج از همه‌ی دستگاه‌ها، فضاهای کاری، سابقه‌ی ممیزی |
| `noroset.com/admin/tenants` | `(panel)/admin/tenants/page.tsx` | فهرست فضاهای کاری |
| `noroset.com/admin/tenants/{id}` | `(panel)/admin/tenants/[id]/page.tsx` | جزئیات فضای کاری: اعضا، تعلیق/فعال‌سازی با دلیل، سابقه‌ی ممیزی |
| `noroset.com/admin/billing` | `(panel)/admin/billing/page.tsx` | «اشتراک‌ها»: پلن‌ها (سقف‌ها، دوره‌ها و قیمت)، مالیات، پرداخت‌های همه‌ی فضاهای کاری. اشتراک هر فضای کاری (دستی، آفلاین، لغو) در صفحه‌ی همان فضای کاری |
| `noroset.com/admin/campaigns` | `(panel)/admin/campaigns/page.tsx` | «کمپین‌ها»: کدهای تخفیف، اعلان‌های درون پنل (نمایش در بالای پنل فضای کاری، `(panel)/announcements.tsx`)، گزارش ثبت‌نام بر اساس UTM و دانلود فایل متنی لینک‌های واگذاری |
| `noroset.com/admin/templates` | `(panel)/admin/templates/page.tsx` | «قالب‌ها»: قالب‌های آماده‌ی صفحه‌ی لینک؛ ساخت قالب جدید، حذف قالب‌های ساخته‌شده و برداشتن/بازگردانی قالب‌های پیش‌فرض ([`architecture.md`](./architecture.md) §۹.۸) |
| `noroset.com/admin/templates/{id}/editor` | `(panel)/admin/templates/[id]/editor/page.tsx` | ادیتور قالب (همان ادیتور صفحه‌ی لینک، تمام‌صفحه و بدون فضای کاری)؛ انتشار قالب را به گالری `/link/templates` می‌برد |
| `noroset.com/admin/link-pages` | `(panel)/admin/link-pages/page.tsx` | «صفحه‌های لینک»: جست‌وجوی صفحه‌های منتشرشده در همه‌ی فضاهای کاری و فیلتر وضعیت مدیریتی؛ `?tab=reports` صف گزارش‌های تخلف ([`architecture.md`](./architecture.md) §۹.۱۳) |
| `noroset.com/admin/link-pages/{id}` | `(panel)/admin/link-pages/[id]/page.tsx` | جزئیات صفحه: نسخه‌ی منتشرشده، تغییر وضعیت مدیریتی (حذف از فهرست / هشدار / تعلیق) با دلیل، مدت و یادداشت، گزارش‌ها و سابقه‌ی ممیزی |
| `noroset.com/admin/blog` | `(panel)/admin/blog/page.tsx` | «وبلاگ»: مدیریت و فهرست مقالات |
| `noroset.com/admin/blog/{id}` | `(panel)/admin/blog/[id]/page.tsx` | ادیتور مقاله وبلاگ با تنظیمات سئو و متادیتا |
| `noroset.com/admin/blog/categories` | `(panel)/admin/blog/categories/page.tsx` | مدیریت دسته‌بندی‌های وبلاگ |
| `noroset.com/admin/blog/comments` | `(panel)/admin/blog/comments/page.tsx` | مدیریت و تأیید نظرات وبلاگ |
| `noroset.com/admin/modules` | `(panel)/admin/modules/page.tsx` | وضعیت سراسری هر محصول (فعال / در حال تعمیر / خاموش) با پیام به کاربران |
| `noroset.com/admin/audit` | `(panel)/admin/audit/page.tsx` | لاگ ممیزی |

ماژول خاموش از سوئیچ محصولات منوی همبرگری حذف و ماژول در حال تعمیر با برچسب نشان داده می‌شود؛ صفحه‌های آن (از جمله ادیتورها) به‌جای محتوا پیام وضعیت را نشان می‌دهند (`(panel)/modules.tsx`؛ وضعیت از `GET /api/modules`). پیوند «مدیریت پلتفرم» در منوی آواتار فقط برای superadmin است؛ صفحه‌ها بدون فضای کاری جاری باز می‌شوند و کاربر غیرادمین پیام «دسترسی ندارید» می‌بیند (گارد واقعی در بک‌اند).

فایل‌های public صفحه‌ی وب ندارند؛ از API سرو می‌شوند: `/api/norofile/public/files/{id}` و برای فایل‌های پلتفرم `/api/norofile/public/files/platform/{id}` (روی هر دو دامنه).

«پیش‌فرض» = صفحه‌ی خالی `PagePlaceholder`/`FullPagePlaceholder` (`apps/web/src/components/page-placeholder.tsx`) تا محتوای آن ساخته شود.

## ۲. لایه‌ها (route group)

| group | layout | توضیح |
|---|---|---|
| `(marketing)` | ریشه | عمومی، بدون نشست |
| `(panel)` | `(panel)/layout.tsx` | `SessionProvider` (`(panel)/session.tsx`) + پوسته یکپارچه بدون سایدبار: نوار بالای `PlatformBar` در صفحه‌های هسته و `ProductBar` در صفحه‌های محصولات همراه با منوی همبرگری سوئیچ ۳ محصول در راست و آواتار کاربر با لاین ترند انواع اشتراک در چپ ([`design-system.md`](./design-system.md)). ادیتورها تمام‌صفحه‌اند. بدون نشست ← `/auth?next=…`؛ بدون فضای کاری ← ساخت خودکار با `POST /tenants/default`. `/ws`، `/account` و `/admin/*` بدون فضای کاری جاری هم باز می‌شوند (`isTenantFree`) |
| `auth`، `support`، `n8l`، `n8f` | ریشه | تمام‌صفحه، بدون پوسته‌ی پنل |

- tenant در آدرس پنل نمی‌آید: فضای کاری جاری در مرورگر نگه داشته می‌شود و با انتخاب‌گر هدر یا `/ws` عوض می‌شود. هر درخواست API آن را با هدر `X-Tenant-Id` می‌فرستد.
- گارد واقعی در بک‌اند است (اصل ۶ سند معماری)؛ ریدایرکت‌های پنل فقط راحتی کاربرند.

## ۳. دامنه‌ی کوتاه (`n8l.ir`)

- `apps/web/src/proxy.ts` (Next ۱۶) host را با `PUBLIC_HOST` مقایسه می‌کند؛ منطق خالص در `apps/web/src/lib/host-routing.ts`.
- روی دامنه‌ی کوتاه هر مسیر به `/n8l{path}` بازنویسی می‌شود؛ فقط صفحه‌های زیر `n8l/` وجود دارند و بقیه ۴۰۴ است (پنل و مارکتینگ روی این دامنه نیستند).
- روی دامنه‌ی اصلی، مسیر داخلی `/n8l…` مستقیماً ۴۰۴ است.
- `/api/*`، `/_next/*` و فایل‌های دارای پسوند از proxy رد نمی‌شوند؛ rewrite `/api` در `next.config.mjs` روی هر دو دامنه کار می‌کند.
- در production، nginx روی دامنه‌ی کوتاه `/api/` را بسته است (`return 404`) جز پیشوند عمومی `/api/norolink/public/` (آمار صفحه و گزارش تخلف)؛ API نوروفرم روی دامنه‌ی جداگانه‌ی `n8f.ir` باز است. هر endpoint عمومی جدیدی که از مرورگر روی دامنه‌ی کوتاه صدا زده می‌شود باید در `deploy/nginx/noroset.conf` باز شود؛ وگرنه ۴۰۴ به «پیدا نشد.» تبدیل می‌شود (`apps/web/test/deploy-nginx.test.ts` نگهبان همین قاعده است).
- development: `PUBLIC_HOST` پیش‌فرض `n8l.localhost`؛ فرم‌های عمومی روی `NOROFORM_PUBLIC_HOST` (`n8f.localhost`) در `http://n8f.localhost:3000/{slug}` هستند.
- زیردامنه (`{slug}.n8l.ir`) صفحه‌ی لینک همان slug است: فقط مسیر `/` به `/nls/{slug}` بازنویسی می‌شود (بقیه ۴۰۴) و proxy هدر CSP با فهرست سفید frame (`FRAME_SOURCES` نورولینک) را ست می‌کند. مسیر داخلی `/nls` از هیچ دامنه‌ای مستقیم باز نمی‌شود. development: `http://{slug}.n8l.localhost:3000`.

### ۳.۱. دامنه‌ی خروجی عمومی نوروفرم (`n8f.ir`)

- `NOROFORM_PUBLIC_HOST` (development: `n8f.localhost`).
- فرم‌های عمومی: `n8f.ir/{slug}` → rewrite به `/n8f/f/[slug]`.
- مشاهده‌ی بیرونی پاسخ: `n8f.ir/r/{token}` → rewrite به `/n8f/r/[token]`.
- ریشه: `n8f.ir/` → `/n8f` (صفحه‌ی برند).
- توکن ۳۲ بایتی base64url است؛ در DB فقط SHA-256 آن ذخیره می‌شود.
- لینک هر پاسخ از پنل ساخته می‌شود (`POST /noroform/forms/:formId/submissions/:submissionId/response-link`) و قابل ابطال است.
- پاسخ‌ها همچنان در `/form/{id}/results` برای همه‌ی اعضای فضای کاری دیده می‌شوند؛ لینک بیرونی فقط یک دریچه‌ی اضافه برای همان یک پاسخ است.
- مسیرهای `/n8f` و `/n8f/*` روی دامنه‌ی اصلی و n8l ۴۰۴ هستند؛ robots این دامنه `Disallow: /` و sitemap آن ۴۰۴ است.

## ۴. قواعد

1. لینک و ریدایرکت فقط با `routes` از `@/lib/routes` ساخته می‌شود، نه رشته‌ی دستی.
2. پارامترهای پویا با `encodeURIComponent` ساخته می‌شوند.
3. `next` در `/auth` فقط مسیر نسبی همان origin است (`safeNext`)؛ پیش‌فرض `/link`. کاربر واردشده در `/auth` فرم را نمی‌بیند و به `next` می‌رود.
4. ساختار موازی ساخته نمی‌شود: هر آدرس دقیقاً یک `page.tsx` دارد و فهرست `ROUTE_MAP` تست با این سند یکی است.
5. آدرس‌های عمومی (`n8l.ir/f/…`) دائمی‌اند (روی QR و چاپ می‌آیند)؛ آدرس‌های پنل قابل تغییرند.
