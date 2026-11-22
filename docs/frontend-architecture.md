# ساختار فرانت‌اند نوروست (سند مرجع)

> **وضعیت:** جاری (۱۴۰۵/۰۸/۲۸). مکمل [`design-system.md`](./design-system.md) است: آن سند «ظاهر» را تعریف می‌کند، این سند «ساختار و مرزها» را.
> **مبنا:** `design-system.md` (ظاهر) · `architecture.md` (بک‌اند و مرزها) · وضعیت مهاجرت و باقیمانده‌ها در §۱۲ همین سند.
> **اعداد مبنا:** ۱۸۰ فایل TSX در `apps/web/src`، **۱۲۴ فایل `use client` (۶۹٪)**، ۱۱ فایل > ۳۰KB، بزرگ‌ترین ۱۶۶KB، ۹ پوشه‌ی `_components`.

---

## ۱. اصول

1. **سرور پیش‌فرض، کلاینت استثنا:** هر `use client` باید دلیل داشته باشد (state/event/browser API). هدف: ≤ ۵۰٪.
2. **یک مسئولیت در هر فایل:** صفحه ≤ ۲۵KB، کامپوننت ≤ ۳۰KB (`pnpm check:size`).
3. **مرز پکیج = مرز محصول:** محصولات به هم import نمی‌کنند؛ فقط `index.ts` و Portهای core.
4. **داده در سرور، تعامل در کلاینت:** داده‌ی اولیه در Server Component؛ کلاینت فقط mutate/prefetch.
5. **آدرس، منبع حقیقت وضعیت:** فیلتر/صفحه/تب در URL؛ `localStorage` فقط ترجیح نمایش.
6. **هر لیست سه حالت دارد:** خالی، بارگذاری، خطا.

---

## ۲. ساختار و جایگاه کامپوننت

```
apps/web/src/
├── app/
│   ├── (marketing)/           مارکتینگ + _components محلی
│   ├── (panel)/               پوسته‌ی پنل (layout، product-bar، shell-menus)
│   │   ├── form/ link/ file/ billing/ admin/ account/
│   │   └── <route>/_components/   قطعات مخصوص همان مسیر
│   ├── n8f/ n8l/ claim/ auth/     مسیرهای مستقل
│   └── layout.tsx, globals.css, error.tsx (هر گروه پوسته)
├── components/                مشترک بین چند مسیر
└── lib/                       api، fonts، support، shots
packages/ui/src/              Design System (بدون شناخت محصول)
products/<p>/ui/              UI مخصوص محصول
```

| چه چیزی | کجا | قاعده |
|---|---|---|
| دکمه/فیلد/کارت/دیالوگ، توکن | `packages/ui` | بدون import از `apps`/`products` |
| رندر صفحه‌ی عمومی محصول | `products/<p>/ui` | فقط `@noroset/ui` + `shared` همان محصول |
| قطعه‌ی مشترک ≥۲ مسیر پنل | `apps/web/src/components` | بدون وابستگی به مسیر |
| قطعه‌ی مخصوص یک مسیر | `<route>/_components` | با مصرف دوم ارتقا یابد |
| منطق خالص صفحه (بدون JSX) | `<route>/_components/*-model.ts` | تست‌پذیر |

**نام‌گذاری:** فایل `kebab-case`، کامپوننت `PascalCase`، هوک `use-*.ts`، مدل `*-model.ts`.

---

## ۳. مرز Server / Client

- **Server Component پیش‌فرض.** `'use client'` فقط در برگ تعاملی (فرم، ادیتور، دراور، جدول با state).
- **الگوی درست:** صفحه‌ی سرور داده را می‌گیرد و به کامپوننت کلاینت کوچک props سریالایزپذیر می‌دهد.
- **ممنوع:** `use client` روی صفحه‌ای که فقط داده نشان می‌دهد؛ import ماژول سرور در کلاینت؛ تابع در props سرور→کلاینت.
- **کاهش فعلی:** ۱۲۴ → هدف ≤ ۹۰. برش اول: صفحات فهرست (`admin/*`، `billing/receipts`).

---

## ۴. داده و کش

| نوع داده | الگو |
|---|---|
| داده‌ی اولیه‌ی صفحه | fetch در Server Component (`lib/api.ts`) + `Suspense`/`loading.tsx` |
| داده‌ی وابسته به تعامل | `fetch` کلاینت با `AbortController`؛ حالت `loading/error` صریح |
| Mutation | Server Action یا `fetch` + `router.refresh()` / به‌روزرسانی خوش‌بینانه |
| داده‌ی عمومی (صفحه‌ی لینک/فرم) | کش سرور/nginx (۱۰ ثانیه) |
| داده‌ی سنگین (پاسخ‌ها/جدول) | صفحه‌بندی سرور + سقف limit؛ virtualization برای >۵۰ ردیف |

**ممنوع:** `useEffect` برای fetch اولیه؛ آبشار fetch والد→فرزند→نوه؛ کامپوننت هم‌زمان fetch و mutate بدون تفکیک.

---

## ۵. حالت (State)

1. **URL** برای فیلتر/مرتب‌سازی/تب/صفحه (`searchParams`).
2. **`localStorage`** فقط ترجیح نمایش با کلید `noroset.*`.
3. **state محلی** برای UI موقت (باز/بسته، hover، drag).
4. **ممنوع:** store سراسری جدید بدون نیاز اثبات‌شده؛ دو منبع حقیقت برای یک فیلتر.

---

## ۶. خطا، بارگذاری، خالی

- **`error.tsx`** برای هر گروه پوسته (پنل، مارکتینگ، n8f، n8l) — موجود است؛ پیام فارسی + «تلاش دوباره».
- **`loading.tsx`** فقط جایی که داده کند است؛ اسکلت **هم‌اندازه** (بدون CLS).
- **`not-found.tsx`** با مسیر بازگشت.
- **توست** برای نتیجه‌ی عمل؛ `aria-live="polite"`؛ فوکوس را نمی‌دزدد.
- خطای شبکه: پیام + تلاش دوباره، نه صفحه‌ی سفید.

---

## ۷. استایل و import

- استایل فقط با کلاس‌های توکنی + `cn()`؛ `style` فقط برای مقدار داینامیک (رنگ تم کاربر، عرض ستون).
- variantها با `cva` در خود کامپوننت؛ استثنای صفحه‌ای ممنوع.
- import از `@noroset/ui` (index)؛ import عمیق ممنوع (dependency-cruiser).
- `packages/ui` نه API سرور-فقط دارد نه `next/*`.
- فایل CSS جدید فقط برای چیزی که Tailwind نمی‌تواند (کلیدفریم پیچیده، چاپ، اسکین برند) و باید توکنی باشد.

---

## ۸. بودجه‌ها

| بودجه | سقف | گارد |
|---|---|---|
| فایل صفحه | ۲۵KB | `check:size` |
| فایل کامپوننت | ۳۰KB | `check:size` |
| فایل‌های `use client` | ≤ ۵۰٪ | بازبینی PR |
| LCP (موبایل) | ≤ ۲.۵s | Lighthouse (فاز ۷) |
| CLS | ≤ ۰.۱ | اسکلت هم‌اندازه + ابعاد تصویر |
| INP | ≤ ۲۰۰ms | پرهیز از کار سنگین در render |
| JS اولیه‌ی مسیر | ≤ ۲۰۰KB gzip (هدف) | گزارش `next build` |

---

## ۹. تست و CI

- تست وب: vitest برای منطق خالص (`*-model.ts`) و تست رندر فرم عمومی.
- گیت‌ها: `lint` · `typecheck` · `check:boundaries` · `check:design --strict` · `check:contrast` · `check:size --strict`.
- اسکرین‌شات بصری: `pnpm --filter @noroset/web shots` (روشن/تیره). پیش‌نیاز: Chrome نصب‌شده و devDependency `sharp` در `apps/web` (هر دو در repo تنظیم شده‌اند). اثرانگشت هر تصویر شامل **`packages/ui/src/styles/globals.css`** هم هست؛ پس تغییر توکن‌ها هم تصویر را کهنه می‌کند و `test/marketing-shots.test.ts` شکست می‌خورد — یعنی تغییر UI/توکن بدون بازتولید تصویر مرج نشود.

---

## ۱۰. نقشه‌ی مهاجرت ساختاری

| # | کار | معیار |
|---|---|---|
| 1 | استخراج توابع خالص `results/page.tsx` به `_components/results-model.ts` | ✅ انجام شد (۳۷۹۸ → ۳۶۳۲ خط، ۱۶۶.۵ → ۱۵۵.۸KB) |
| 2 | شکستن `results/page.tsx` به جدول/دراور/کارت خلاصه/منوی خروجی | 🟡 فهرست موبایل، دسته‌ی resize، **کارت خلاصه + منوی فشرده** استخراج شد (`submission-list.tsx`، `resize-handle.tsx`، `summary-card.tsx`)؛ جدول و دراور باقی |
| 3 | شکستن `billing/page.tsx` به پلن‌کارت/پیش‌فاکتور/تاریخچه | ✅ اجزای `Payments`/`PlanStatusBadge`/`Row` + قالب‌بندی مشترک استخراج شد (۴۷.۳ → ۴۳KB)؛ `PlanCard`/`QuoteDialog` باقی |
| 4 | شکستن `board.tsx`/`element-form.tsx`/`inline.tsx` | ≤ ۳۰KB |
| 5 | حذف `use client` از صفحات فهرست ادمین | ۱۲۴ → ≤ ۹۰ |
| 6 | ارتقای قطعات مشترک از `_components` به `src/components` | یک نسخه از هر قطعه |

---

## ۱۱. ضدالگوها

- صفحه‌ای که هم fetch می‌کند هم ۱۰ کامپوننت را در خود تعریف می‌کند.
- کامپوننت مشترکی که `usePathname` می‌گیرد (یعنی به مسیر وابسته شده).
- `useEffect` برای همگام‌سازی state با props.
- دو منبع حقیقت برای یک فیلتر (URL + state).
- `any` برای رد کردن typecheck مرزها.
- استایل صفحه‌ای که توکن را با hex بازنویسی می‌کند.

---

## ۱۲. وضعیت مهاجرت دیزاین‌سیستم و گیت‌ها

**تصمیم هویت:** shadcn Nova + آبی مدرن + base color (دلیل و گزینه‌های ردشده در `design-system.md` §۰).

| فاز | وضعیت | خلاصه |
|---|---|---|
| ۱ — شالوده | ✅ | رامپ برند/base، L2 کامل روشن/تیره، `theme.ts` (setBaseColor/setBrandColor/pickOnColor)، `check:design`، `check:contrast` |
| ۲ — کامپوننت | ✅ | حذف کامل `stroke-*`/`shadow-card|flyout|dialog`/`acrylic`/`bg-control`/`bg-layer`/`rounded-overlay` از کد |
| ۳ — صفحه‌ها | ✅ | ۸۷ کلاس پالت خام → توکن (`tone-*`/وضعیت)، `transition-all` ۳۲→۰، z-index ۳→۰، مارکتینگ و n8f روی همان توکن‌ها |
| ۴ — دسترسی‌پذیری | ✅ | فونت، skip-link + `<main>`، reduced-motion اسلایدر، ۴ `error.tsx`، `aria-sort`، `ErrorSummary` |
| ۵ — ساختار | 🟡 | پوشه‌بندی و ۷ ماژول استخراج‌شده؛ جدول/دراور results، `PlanCard`/`QuoteDialog`، ادیتورهای نورولینک باقی |
| ۶ — اسناد | ✅ | همین مجموعه‌ی ۵ سندی (بدون سند موازی) |
| ۷ — CI | ✅ | ۴ گارد + تست + شات در `.github/workflows/ci.yml` |

**گیت‌ها (همه باید در PR سبز باشند):**

```powershell
pnpm lint
pnpm typecheck
pnpm check:boundaries
pnpm check:design --strict
pnpm check:contrast
pnpm check:size --strict
pnpm --filter @noroset/web test
```

**رچت اندازه (فقط کوچک‌شدن مجاز):** `results/page.tsx` ۱۴۴KB · `billing/page.tsx` ۴۳.۵KB · `public-form.tsx` ۳۳KB · بقیه‌ی فایل‌های بزرگ در `scripts/check-file-size.mjs` (BASELINE).

**استثناهای مستند گارد توکن:** داده‌ی تم محصول (`products/norolink/shared/theme.ts`، `products/noroform/ui/theme.ts`، `form/templates.ts`)، artwork (`motion-art`، `system-icon`، `brand-paths`)، پیش‌نمایش‌ها (`form-thumb`، `dialogs`، `template-preview-dialog`، `seo-panel`)، و رنگ‌های الزامی چاپ/متادیتا (`layout.tsx`، `qr-modal`، `submissions-print`، `norolink/ui/styles.ts`).

**راهبرد انتشار:** کار روی شاخه‌ی feature و مرج پس از سبزی گیت‌ها؛ مهاجرت توکن‌محور است، پس بازگشت = `git revert` بدون مهاجرت داده. برند هر فضای کاری فعلاً فقط `localStorage` است؛ ستون `tenants.theme` تصمیم آینده است.

**باقیمانده با دلیل توقف:**

| کار | دلیل |
|---|---|
| استخراج جدول و دراور `results` | ۲۰+ prop وابسته به state + درگ/چاپ؛ نیازمند بازبینی مرورگری |
| `PlanCard`/`QuoteDialog` | درهم‌تنیده با state خرید/پیش‌فاکتور |
| `board.tsx`/`element-form.tsx`/`inline.tsx` | نیازمند QA تعاملی ادیتور |
| کاهش `use client` (۱۲۴ → ≤۹۰) | نیازمند انتقال fetch اولیه به Server Component در هر صفحه |
| بودجه‌ی Lighthouse در CI | نیازمند اجرای مرورگر/سرور در CI |



## پیوست: بدهی اندازه‌ی فعلی (baseline گارد)

`pnpm check:size` این فایل‌ها را به‌عنوان بدهی ثبت‌شده می‌شناسد و **رشد** آن‌ها را بلاک می‌کند؛ فقط کوچک‌شدن مجاز است:
`results/page.tsx` (۱۴۳.۵KB، از ۱۶۶.۵ با استخراج `print-styles.ts`، `results-model.ts`، `submission-list.tsx`، `resize-handle.tsx`، `summary-card.tsx`) · `billing/page.tsx` (۴۳KB، از ۴۷.۳ با `billing-format.ts` + `billing-parts.tsx`) · `board.tsx` (۴۴.۵) · `element-form.tsx` (۴۰.۸) · `desktop-mockup-screen.tsx` (۴۰.۵) · `link-editor.tsx` (۳۹.۵) · `inline.tsx` (۳۷.۶) · `form/[id]/editor/page.tsx` (۳۳.۹) · `public-form.tsx` (۳۱.۸، از ۳۲.۷ با `public-form-parts.tsx`) · `publish-dialog.tsx` (۳۱.۲) · `admin/campaigns/page.tsx` (۳۰.۶) · `shell-menus.tsx` (۳۰.۲) · `admin/billing/page.tsx` (۲۶.۱) · `file/page.tsx` (۲۷).

