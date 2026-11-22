# دیزاین‌سیستم نوروست — نسخه ۲ (shadcn Nova + آبی مدرن)

> **وضعیت:** سند مرجع و جاری (۱۴۰۵/۰۸/۲۸). سند نسخه ۱ («ظاهر ویندوز ۱۱») و سند جداگانه‌ی طراحی فرم عمومی در همین سند ادغام و آن دو حذف شدند.
> **اسناد مرتبط:** ساختار فرانت و وضعیت مهاجرت — [`frontend-architecture.md`](./frontend-architecture.md) · فهرست اسناد — [`README.md`](./README.md)
> **پایه:** shadcn (سبک `base-nova`) روی Base UI + lucide + Tailwind v4 (CSS-first) + پریست Persian Lab UI `c1rc` (RTL).

---

## ۰. تصمیم هویت و گزینه‌های ردشده

**۱۴۰۵/۰۸/۲۸ — تصمیم مالک محصول:** اسکین Fluent 2 (ویندوز ۱۱) کنار گذاشته شد و هویت **shadcn Nova + آبی مدرن** با **base color قابل‌تغییر** انتخاب شد.

**دلیل (با شاهد):**
- ~۲۸۵ نقطه‌ی وابسته به توکن‌های اختصاصی Fluent در کد (`stroke-card` ۱۱۰، `shadow-card` ۴۹، `ease-fluent` ۳۸، …) و هر کامپوننت تازه باید دستی دوباره «فلونتی» می‌شد.
- کارت نیمه‌شفاف ۷۰٪ روی Mica/گرادیان در صفحات داده‌محور، حاشیه‌ی اطمینان AA را کم می‌کرد.
- Fluent زبان اپ دسکتاپ ویندوز است؛ محصول ۵۵ مسیر وب + مصرف موبایل دارد (`platform-adaptive`).
- رنگ تأکیدی Fluent به تنظیمات ویندوز گره خورده بود و white-label را گران می‌کرد.

**گزینه‌های ردشده:**
- نگه‌داشتن Fluent → هزینه‌ی نگهداری و کنتراست پایین.
- پالت پیشنهادی ابزار `ui-ux-pro-max` (teal + فونت Fira) → تعارض با برند و **بدون پوشش فارسی**.
- شادcn خنثی پیش‌فرض → بدون هویت برند و بدون base color.

> شواهد کامل بازنگری در تاریخچه‌ی git (گزارش موقت بازنگری، پیش از تثبیت اسناد) و وضعیت اجرا در [`frontend-architecture.md`](./frontend-architecture.md) §۱۲ است.

---

## ۱. اصول

1. **یک منبع حقیقت:** همه‌ی رنگ/فاصله/شعاع/حرکت از توکن‌های `packages/ui/src/styles/globals.css` می‌آید. hex یا پالت خام Tailwind در UI ممنوع است (گارد CI دارد).
2. **سه لایه:** Primitive → Semantic → Component. کامپوننت فقط L2 را می‌بیند؛ L1 فقط برای مشتق‌سازی است.
3. **white-label:** رنگ پایه (`data-base`) و رنگ برند (`--brand`) در زمان اجرا عوض می‌شوند، بدون بیلد.
4. **دسترسی‌پذیری AA:** هر جفت متن/پس‌زمینه ≥ ۴.۵:۱؛ فوکوس همیشه دیده می‌شود؛ حرکت با `prefers-reduced-motion` خاموش می‌شود.
5. **RTL-first:** ویژگی‌های منطقی (`ms/me/ps/pe/start/end`) و آزمون در هر دو جهت.
6. **سطح جامد:** سایه/خط برای سلسله‌مراتب، نه شیشه/بلور تزئینی.
7. **بودجه‌دار:** اندازه‌ی فایل و لایه‌های z سقف دارند (`pnpm check:size`).

---

## ۲. لایه‌ی ۱ — مقادیر خام (Primitive)

### برند (`--brand`)
یک مقدار: `#2563eb`. رمپ با `color-mix(in oklab, …)` مشتق می‌شود:

| توکن | مشتق | کاربرد |
|---|---|---|
| `--brand-50/100/200` | با سفید (۶/۱۲/۲۴٪) | پس‌زمینه‌ی ملایم، هاور، انتخاب |
| `--brand-300/400/500` | ۴۰/۶۲/۸۲٪ با سفید | متن روی تیره؛ `primary` در تم تیره |
| `--brand-600` | خودِ `--brand` | **`primary` در تم روشن** |
| `--brand-700…950` | با مشکی | حالت فشرده، رینگ تیره، سطح‌های تیره |

```ts
import { setBrandColor, BRAND_PRESETS } from '@noroset/ui';
setBrandColor('#4f46e5');   // --brand + --brand-on (متن AA روی دکمه) را می‌نشاند
```
`--brand-on` با `pickOnColor()` بین سفید و `#0b1220` انتخاب می‌شود تا دکمه‌ی اصلی در هر برندی AA بماند.

### رنگ پایه‌ی خنثی (`--base-50..950`)
پنج رامپ آماده: `slate` (پیش‌فرض)، `gray`، `zinc`، `neutral`، `stone`.

```html
<html data-base="zinc">   <!-- بدون بیلد، کل پوسته عوض می‌شود -->
```
```ts
import { setBaseColor, BASE_COLORS } from '@noroset/ui';
setBaseColor('stone');     // html.dataset.base + localStorage
```
فلش اولیه با `themeInitScript` (beforeInteractive در root layout) گرفته می‌شود؛ `applyStoredTheme()` در `ThemeProvider` برند را هم برمی‌گرداند.

### رنگ دسته‌ای (`--tone-*`)
برای تیِر اشتراک، دامنه‌ی محصول (نورولینک/نوروفرم/نوروفایل)، کانال پشتیبانی و گروه‌بندی جدول:
`--tone-sky`, `--tone-violet`, `--tone-emerald`, `--tone-amber`, `--tone-rose`, `--tone-teal`, `--tone-slate`.
در تم تیره روشن‌تر می‌شوند. **مقادیر تم روشن از پله‌ی ۷۰۰ انتخاب شده‌اند** تا متن `text-tone-*` روی کارت سفید AA بماند؛ `check:contrast` هر ۷ رنگ را در هر دو تم می‌سنجد. استفاده: `text-tone-sky`، `bg-tone-emerald/15`، `border-tone-rose/40`.

---

## ۳. لایه‌ی ۲ — توکن‌های معنایی

| توکن | روشن | تیره | کاربرد |
|---|---|---|---|
| `--background` | `#ffffff` | `color-mix(base-950 88%, brand-950)` | بوم صفحه |
| `--foreground` | `base-900` | `#e6edf7` | متن اصلی |
| `--card` / `--card-foreground` | `#ffffff` / `base-900` | `base-900`+برند / `#e6edf7` | سطح ۱ |
| `--popover` | `#ffffff` | `base-900`+برند | منو/دیالوگ/شیت |
| `--primary` / `--primary-foreground` | `brand-600` / `--brand-on` | `brand-400` / `#0b1220` | اقدام اصلی |
| `--secondary` | `base-100` | `base-900`+برند | کنترل ثانویه |
| `--muted` / `--muted-foreground` | `base-100` / `base-600` | … / `base-400` | متن ثانویه |
| `--accent` | `base-100` | `base-800`+برند | هاور/انتخاب |
| `--destructive` | `#dc2626` | `#f87171` | خطر |
| `--success` / `--warning` / `--info` | `#15803d` / `#b45309` / `brand-600` | `#4ade80` / `#fbbf24` / `brand-400` | وضعیت |
| `--border` / `--input` | `base-200` / `base-300` | `base-800`+برند | خط/کنترل |
| `--ring` | `brand-600` | `brand-400` | حلقه‌ی فوکوس (۳:۱ روی بوم) |
| `--surface-1/2/3` | `card` / `muted` / `base-200 55%` | `card` / `muted` / `base-800 70%` | سلسله‌مراتب سطح |
| `--sidebar*`، `--chart-1..5` | مشتق از بالا | مشتق از بالا | سایدبار و نمودار |

### سطح‌های وضعیت (جای پالت خام)

| کلاس | معنا |
|---|---|
| `bg-success-surface` + `text-success-ink` | بنر/بج موفقیت |
| `bg-warning-surface` + `text-warning-ink` | هشدار |
| `bg-info-surface` + `text-info-ink` | اطلاع |
| `bg-destructive-surface` + `text-destructive-ink` | خطا/خطر (متن) |
| `bg-destructive text-destructive-foreground` | اقدام مخرب پر (حذف) |

`*-surface` از `popover` همان تم مشتق می‌شود و `*-ink` در روشن تیره‌تر از رنگ وضعیت است تا AA تضمین شود. **هر چهار جفت با `pnpm check:contrast` تست می‌شوند.**

---

## ۴. تایپوگرافی

- **فونت:** IRANYekan (`--font-fa`) برای فارسی/ارقام + Geist برای لاتین؛ `--font-mono` = Geist Mono + IRANYekan؛ بارگذاری با `next/font/local` در `apps/web/src/lib/fonts.ts`. **نام `--font-vazirmatn` منسوخ است و نباید استفاده شود.**
- **وزن‌ها یک پله سبک‌تر:** `font-medium`=۴۰۰، `font-semibold`=۵۰۰، `font-bold`=۶۰۰، `font-extrabold`=۷۰۰، `font-black`=۸۰۰؛ بدنه ۴۰۰. سلسله‌مراتب با **وزن + اندازه + فاصله**، نه رنگ تنها.
- **مقیاس:** بدنه ۱۴px در پنل و ۱۶px در فرم عمومی موبایل (`readable-font-size`)، تیتر صفحه `text-2xl font-bold tracking-tight`، زیرتیتر `text-sm text-muted-foreground`، ریز `text-xs`.
- **ارقام:** بدنه با `font-feature-settings: "ss01"` فارسی؛ `num-en` برای لاتین (موبایل، slug، رمز، کد، لینک) و `num-fa` برای فارسی صریح داخل محیط لاتین.
- **جداول/قیمت:** `tabular-nums` برای جلوگیری از پرش عرض.
- **طول خط:** متن بلند ۶۵–۷۵ نویسه (`max-w-prose`، `leading-7`).

---

## ۵. مقیاس‌ها

| مقیاس | مقادیر | قاعده |
|---|---|---|
| فاصله | شبکه‌ی ۴px (Tailwind) | `gap-1.5` (۶px) در کنترل فشرده، `gap-4` بین بخش‌ها |
| شعاع | `--radius: 0.625rem` (۱۰px) کنترل · `rounded-lg` · کارت `rounded-xl` (۱۴px) · منو `rounded-overlay` (۱۰px) | کارت و کارت تودرتو هم‌مرکز |
| سایه | `shadow-xs` کارت · `shadow-lg` پاپ‌اور/دیالوگ | حداکثر یک سطح سایه در هر لایه |
| حرکت | `duration-fast` ۱۲۰ · `duration-base` ۱۸۰ · `duration-slow` ۲۶۰ · `duration-slower` ۴۰۰ (ms) | خروج ≈ ۶۰–۷۰٪ ورود |
| منحنی | `ease-fluent` (۰,۰,۰,۱) · `-standard` · `-decel` (ورود) · `-accel` (خروج) | progress خطی |
| لایه‌بندی | `z-0/10/20/30/40/50` + `z-[100]` توست + `z-[110]` تولتیپ/پیش‌نمایش چاپ | z دلخواه ممنوع |
| نوار چسبان | `--app-header-height: 64px` | `scroll-padding-top` سراسری از آن مشتق می‌شود |
| آیکون | `size-3` ۱۲ · `size-4` ۱۶ · `size-5` ۲۰ · `size-6` ۲۴ · `size-10` ۴۰ | یک خانواده (lucide) و یک ضخامت خط در هر لایه |

---

## ۶. کامپوننت‌ها (`@noroset/ui`)

| کامپوننت | API | نکته |
|---|---|---|
| `Button` | `variant`: `default` `outline` `secondary` `ghost` `destructive` `link` `blue` `blue-subtle` · `size`: `xs` `sm` `default` `lg` `icon*` · `loading` | فوکوس **تکی** `ring-2 ring-ring ring-offset-2`؛ لینک دکمه‌نما: `<Link className={buttonVariants(...)}>` |
| `Card` (+Header/Title/Description/Action/Content/Footer) | `variant`: `default` (سطح ۱) `outline` `subtle` (سطح ۲) `inset` (سطح ۳) `ghost` · `size`: `default|sm` | بیش از سه سطح تودرتو ممنوع؛ سطح ۲/۳ بدون سایه |
| `Block` (+…) | `variant`: `default` `muted` `outline` `inset` `accent` `ghost` · `size`: `default|sm|lg` | گروه‌بندی سبک داخل `Card` |
| `Field` (+Label/Description/Error/Group) | `<Field invalid>` + `<FieldError match>` | خطا زیر همان فیلد + `aria-describedby` |
| `Input` / `PasswordInput` / `InputOTP` / `InputGroup` / `Textarea` / `NativeSelect` | `bg-card border-input` + فوکوس ring | فیلدهای لاتین `dir="ltr"` |
| `Alert` | `variant`: `default|destructive` + آیکون lucide | برای وضعیت از `*-surface` استفاده کنید |
| `Badge` | `default` `secondary` `outline` `destructive` `info` | متن کامل در `title` |
| `Table` | داخل `Card` با `py-0` | هدر مرتب‌شدنی: **`aria-sort` الزامی** |
| `Empty` / `Skeleton` / `Spinner` / `MotionArt` | — | خالی/بارگذاری/لحظه‌ی موفقیت؛ `MotionArt` یک‌بار و با reduced-motion ثابت |
| `Dialog` / `Sheet` / `Popover` / `DropdownMenu` / `Tooltip` | Base UI | دیالوگ: `rounded-xl bg-popover shadow-lg ring-border`، اسکریم `bg-foreground/40`، `dir="rtl"` روی Popup |
| `Sidebar` / `ScrollArea` / `Separator` / `Avatar` / `Switch` / `Checkbox` / `Segmented` | — | آیتم فعال = `bg-muted` + وزن ۵۰۰ |
| `FilePicker` / `ImagePickerField` | قرارداد تزریقی `FileSource` | کارت آپلود مشترک، بدون شناخت محصول |
| `FileTypeIcon` / `SystemIcon` | — | رنگ‌ها بخشی از artwork است (استثنای مستند گارد) |

**افزودن کامپوننت:** از ریشه‌ی `packages/ui`:
```bash
NODE_USE_ENV_PROXY=1 npx shadcn@4.22.1 add @persianlabs/<name>
```
سپس export در `src/index.ts` و **pin** کردن نسخه‌ی وابستگی‌ها (بدون `^`).

---

## ۷. الگوهای صفحه

- **پوسته‌ی پنل** (`(panel)/_components/panel-client-layout.tsx`): نوار چسبان ۶۴px (`z-20`) با منوی همبرگری در شروع، جست‌وجوی کپسولی در میانه، اقدام‌های صفحه در پایان. محتوا روی **کارت جزیره‌ای** (`rounded-xl border border-border bg-background shadow-xs`) و `<main id="main-content">` برای skip-link.
- **سرصفحه‌ی صفحه:** `PageHead`/`PageHeader` — تیتر `text-2xl font-bold tracking-tight` + توضیح `text-sm text-muted-foreground` + حداکثر یک CTA اصلی (`primary-action`).
- **صفحه‌ی محصول (خانه):** نوار «شروع …» روی بوم، کارت‌های ۴:۳، جدول در نمای فهرستی، فیلتر مالک و مرتب‌سازی؛ انتخاب‌ها در `localStorage` (`noroset.home.{product}`).
- **ادیتورها:** تمام‌صفحه، بدون سایدبار؛ ریل افزودن المان در دسکتاپ شناور کنار بوم و در موبایل نوار پایین؛ ذخیره‌ی خودکار با debounce.
- **ورود/تک‌کارتی:** `Card` با `max-w-sm bg-popover shadow-lg` وسط صفحه.
- **حالت‌های اجباری هر لیست:** خالی (`Empty` + اقدام)، بارگذاری (`Skeleton` هم‌اندازه)، خطا (`error.tsx` مسیر + تلاش دوباره).

---

## ۸. فرم‌ها و بازخورد

- **برچسب همیشه دیده می‌شود** (placeholder تنها ممنوع) + متن راهنما پایدار برای فیلدهای پیچیده.
- **اعتبارسنجی در blur**؛ خطا زیر همان فیلد، متصل با `aria-describedby`، متن «علت + راه رفع» (نه «نامعتبر است»).
- **ارسال:** دکمه‌ی `loading` (غیرفعال + اسپینر) → موفقیت (توست/`MotionArt`) یا خطا با مسیر بازیابی.
- **خطاهای چندگانه:** خلاصه‌ی خطای قابل‌فوکوس در بالای فرم + لینک به هر فیلد؛ خطاهای درون‌خطی حفظ می‌شوند. **پیاده‌سازی:** `ErrorSummary` در `@noroset/ui` و استفاده در فرم عمومی نوروفرم (چند خطا → فوکوس خلاصه، تک‌خطا → فوکوس همان فیلد).
- **جلوگیری از گم‌شدن داده:** فرم بلند auto-save؛ دیالوگ/شیت با تغییر ذخیره‌نشده تأیید می‌خواهد.
- **اقدام مخرب:** رنگ `destructive`، جدا از اقدام اصلی، با تأیید؛ در صورت امکان «بازگردانی» (undo) به‌جای تأیید.
- **لمس:** ارتفاع فیلد موبایل ≥۴۴px؛ فاصله‌ی اهداف ≥۸px (`touch-spacing`).

---

## ۹. داده، جدول و نمودار

- **جدول:** `Table` داخل `Card`؛ هدر چسبان با `bg-muted/40`؛ مرتب‌سازی ستونی با **`aria-sort`**؛ اعداد `tabular-nums`؛ در موبایل جای جدول افقی، **فهرست کارتی** (الگوی `SubmissionList`).
- **ستون‌های زیاد:** اسکرول افقی فقط در صورت سرریز واقعی؛ ظرف‌های flex/scroll `min-w-0` داشته باشند (`horizontal-scroll`).
- **نمودار:** نوع نمودار متناسب با داده (روند=خط، مقایسه=ستون، سهم=دونات ≤۵ دسته)؛ راهنما همیشه دیده شود؛ رنگ تنها حامل معنا نباشد (الگو/برچسب)؛ داده‌ی خالی پیام + راهنما داشته باشد؛ نمودار در reduced-motion ثابت رندر شود.
- **قالب‌بندی اعداد:** `Intl.NumberFormat('fa-IR')` + `toEnDigits` برای URL؛ واحدها در محور/برچسب.

---

## ۱۰. حرکت

- فقط **transform/opacity** (و رنگ/سایه) انیمیت شود؛ `width/height/top/left` ممنوع (`transform-performance`). به‌جای `transition-all` فهرست خصوصیات بنویسید.
- مدت از توکن: `duration-fast` (هاور/فشردن) · `duration-base` (ورود لایه) · `duration-slow` (شیت/صفحه)؛ خروج کوتاه‌تر.
- هر انیمیشن باید **معنا** داشته باشد (بازخورد علت‑معلول)، حداکثر ۱–۲ عنصر کلیدی در هر نما.
- `prefers-reduced-motion`: هم در CSS (سراسری) و هم در JS (اسلایدر/کرول) رعایت شود.
- محتوای خودکارگردان: دکمه‌ی توقف + توقف روی فوکوس + توقف با reduced-motion (`auto-rotation-controls`).
- انیمیشن باید قابل‌قطع باشد و هرگز ورودی کاربر را بلاک نکند.

---

## ۱۱. چک‌لیست دسترسی‌پذیری (AA)

- [ ] کنتراست متن ≥۴.۵:۱ در هر دو تم (`pnpm check:contrast`).
- [ ] فوکوس دیده می‌شود و زیر نوار چسبان پنهان نمی‌شود (`scroll-padding-top`).
- [ ] `skip-link` → `#main-content` در هر پوسته.
- [ ] ترتیب تب = ترتیب بصری؛ همه‌ی کنترل‌ها با کیبورد.
- [ ] آیکون‌تنها = `aria-label`؛ آیکون تزئینی = `aria-hidden`.
- [ ] جدول مرتب‌شدنی `aria-sort`؛ سلول‌های داده `scope`/هدر درست.
- [ ] خطای فرم: `role="alert"`/`aria-live` + `aria-describedby` + خلاصه‌ی قابل‌فوکوس.
- [ ] وضعیت‌ها فقط با رنگ بیان نشوند (آیکون/متن).
- [ ] هدف لمسی ≥۲۴px (AA) و ترجیحاً ۴۴px در موبایل.
- [ ] `prefers-reduced-motion` و بزرگ‌نمایی متن بدون شکستن چیدمان.
- [ ] toast فوکوس را نمی‌دزدد؛ `aria-live="polite"`.

---

## ۱۲. RTL و فارسی

- `<html lang="fa" dir="rtl">` + `DirectionProvider` (Base UI) در root layout.
- فقط ویژگی منطقی: `ms/me/ps/pe/start/end`؛ هرگز `ml/mr/left/right` برای فاصله‌های وابسته به جهت.
- آیکون‌های جهت‌دار (فلش بازگشت، chevron) در RTL قرینه شوند؛ آیکون‌های بی‌جهت (چرخ‌دنده، کاربر) نه.
- فیلدهای لاتین (موبایل، slug، رمز، کد، URL) `dir="ltr"` + `text-start`.
- ارقام: پیش‌فرض فارسی؛ لینک/شناسه/کد با `num-en` و `toEnDigits` در href.
- اعداد در جدول و قیمت: `tabular-nums` + تراز شروع.
- متن ترکیبی فارسی/لاتین: `unicode-bidi: plaintext` یا `dir="auto"` برای ورودی کاربر.
- نیم‌فاصله در نام محصولات (`نورولینک`، `نوروفرم`) حفظ شود.

---

## ۱۳. خروجی عمومی فرم نوروفرم (ادغام‌شده)

این بخش، قرارداد طراحی فرم عمومی نوروفرم را در خود دارد (سند جداگانه حذف و همین‌جا ادغام شد).

- **یک دیزاین‌سیستم، بدون استثنا:** فرم‌های داخلی و خارجی از `@noroset/ui` و همان توکن‌های پلتفرم استفاده می‌کنند؛ CSS محلی `apps/web/src/app/n8f/n8f.css` فقط توکن‌های پلتفرم را به نام‌های محلی نقشه می‌کند و **نباید** سیستم موازی بسازد. فونت آن `var(--font-sans)` است (باگ `--font-vazirmatn` رفع شد).
- **مرز مسیر:** `n8f.ir/{slug}` و `n8f.ir/r/{token}`؛ کامپوننت مشترک `products/noroform/ui/public-form.tsx`؛ ناحیه‌ها و تم در `@noroset/field-engine`.
- **ناحیه‌های صفحه:** `background`، `header`، `topBar`، `main`، `sidebar`، `bottomBar`، `footer`؛ لوگو با `LogoTitle` و پس‌زمینه با `FormBackground`.
- **تنظیمات ظاهری:** رنگ/گرادیان/پترن/تصویر + overlay مستقل؛ `layout` (`header_sticky`، `bottom_bar_fixed`، `sidebar_collapsible`) از `definition.layout`.
- **قواعد الزامی:** برچسب دیده شود، خطا زیر فیلد، `aria-describedby`، focus trap در دیالوگ‌ها، هدف لمسی ۴۴px، `prefers-reduced-motion`.
- **تم فرم (داده‌ی محصول):** رنگ اصلی/پس‌زمینه/دکمه/گوشه/فونت در `definition.theme`؛ این hexها **داده‌ی کاربر** هستند و از گارد توکن مستثنا (allowlist). پیش‌فرض رنگ اصلی از آبی قدیمی ویندوز به `#2563eb` تغییر کرد.
- **صفحه‌ی پاسخ** از همان توکن‌ها و کامپوننت‌ها استفاده می‌کند؛ CSS محلی فقط نقشه‌ی توکن است.

---

## ۱۴. بکن / نکن

| ✅ بکن | ❌ نکن |
|---|---|
| `bg-card`, `text-muted-foreground`, `border-border` | `bg-white`, `text-gray-500`, `bg-blue-600` |
| `bg-success-surface text-success-ink` | `bg-emerald-500 text-white` برای پیام وضعیت |
| `text-tone-sky` برای دسته‌بندی | `text-sky-600` |
| `transition-[color,box-shadow]` + `duration-fast` | `transition-all` |
| `focus-visible:ring-2 ring-ring ring-offset-2` | حذف outline بدون جایگزین |
| `aria-sort` روی `<th>` | مرتب‌سازی بدون اعلام وضعیت |
| `min-h-dvh` | `h-screen`/`100vh` در موبایل |
| `min-w-0` روی فرزند flex متن | `whitespace-nowrap` روی متن کاربر |
| `Skeleton` هم‌اندازه‌ی محتوا | اسپینر تمام‌صفحه برای بارگذاری کوتاه |
| `Empty` با اقدام | جدول خالی بی‌پیام |

---

## ۱۵. گاردها و فرایند تغییر

| گارد | فرمان | در CI |
|---|---|---|
| توکن/پالت/حرکت/z | `pnpm check:design --strict` | ✅ |
| کنتراست (۵ base × ۴ برند × ۲ تم) | `pnpm check:contrast` | ✅ |
| بودجه‌ی اندازه‌ی فایل | `pnpm check:size --strict` | ✅ |
| مرز پکیج‌ها | `pnpm check:boundaries` | ✅ |
| تایپ/لینت | `pnpm typecheck` / `pnpm lint` | ✅ |
| همه با هم | `pnpm check:all` | محلی |

**افزودن توکن/رنگ جدید:** ابتدا L1 (رامپ) → سپس L2 در `:root` **و** `.dark` → تست کنتراست → استفاده. رنگ جدید بدون جفت AA پذیرفته نمی‌شود.
**Deprecation:** توکن قدیمی حداقل یک ریلیز با alias زنده می‌ماند و در همین سند «منسوخ» علامت می‌خورد؛ حذف پس از `check:design` تمیز.
**تغییر هویت برند:** فقط `--brand` (و در صورت نیاز `--brand-on`)؛ هر تغییر دیگری یعنی نقض لایه‌بندی.




