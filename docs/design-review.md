# بازنگری تخصصی UI/UX فرانت‌اند نوروست — گزارش نقادانه

> **وضعیت:** گزارش بازنگری (مبنای مهاجرت). **تاریخ:** ۱۴۰۵/۰۸/۲۸ (2026-11-19)
> **دامنه:** `apps/web` (۱۸۵ فایل در `src/app`، ۵۵ صفحه)، `packages/ui` (۳۸ کامپوننت)، `products/*/ui`، و اسناد راهنما:
> [`architecture.md`](./architecture.md)، [`design-system.md`](./design-system.md)، [`noroform-public-design.md`](./noroform-public-design.md)
> **ابزار:** `.claude/skills/ui-ux-pro-max` (Quick Reference §۱–§۱۰، دامنه‌های `ux`/`product`/`style`، استک‌های `shadcn`/`nextjs`/`react`/`html-tailwind`، `--design-system`) + اسکن کد.
> **قاعده:** هر یافته با شاهد مسیر/خط یا عدد قابل بازتولید آمده است. توصیه‌ی بدون شاهد در این سند نیست.

---

## ۰. روش کار (قابل بازتولید)

```bash
# ۱) تولید دیزاین‌سیستم پیشنهادی مهارت برای ماهیت محصول
python .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS form builder link in bio dashboard productivity" \
  --design-system -f markdown -p "Noroset"

# ۲) قواعد UX برای مسائل یافته‌شده
python .../search.py "error summary validation" --domain ux
python .../search.py "focus not obscured sticky" --domain ux
python .../search.py "dark mode contrast surfaces" --domain ux
python .../search.py "design token consistency hardcoded colors" --domain ux

# ۳) قواعد استک
python .../search.py "css variables theming dark mode" --stack shadcn
python .../search.py "server components streaming suspense" --stack nextjs
python .../search.py "component composition props" --stack react

# ۴) اسکن کد (خروجی در بخش‌های بعد)
#    پالت خام Tailwind، hex خام، transition-all، z-index، فقدان skip-link/aria-sort/error.tsx، اندازه فایل‌ها
```

سنجه‌های عددی خام:

| سنجه | مقدار | مسیر اسکن |
|---|---|---|
| کلاس پالت خام Tailwind (`bg-emerald-500`, `text-amber-600`, …) | **۳۸۳** | `apps/web/src` |
| رنگ hex خام در TS/TSX وب | **۱۱۵** (۱۸ فایل؛ صدر: `form/templates.ts` ۱۸، `submissions-print.ts` ۱۳) | `apps/web/src` |
| `transition-all` | **۶۸** (صدر: `hero-slider.tsx` ۷، سه صفحه‌ی landing هرکدام ۵) | `apps/web/src` + `packages/ui/src` |
| مقدارهای z-index خارج از مقیاس (`z-[60]`, `z-[120]`, `z-[130]`) | **۳** + ۵۸ مقدار پراکنده | همان |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | **۴ / ۰ / ۱** برای ۵۳ صفحه | `apps/web/src/app` |
| `skip-link` (پرش به محتوا) | **۰** | `apps/web/src` |
| `aria-sort` (جدول مرتب‌شدنی) | **۰** | `apps/web/src` |
| `aria-label` | ۲۷۱ (خوب) | `apps/web/src` |
| `focus-visible` | ۱۲۸ وب + ۳۲ در `packages/ui` (خوب) | هر دو |
| `aria-live` | ۹ | `apps/web/src` |
| `tabular-nums` | ۳۶ (خوب) | هر دو |
| بزرگ‌ترین فایل UI | `form/[id]/results/page.tsx` = **۱۶۶KB** | `apps/web/src/app` |
| فایل‌های بزرگ بعدی | `billing/page.tsx` ۴۷KB، `link-editor` ۳۹KB، `board.tsx` ۴۴KB، `element-form.tsx` ۴۰KB | همان |

---

## ۱. خلاصه‌ی اجرایی (حکم)

فرانت‌اند از نظر **هسته‌ی دیزاین‌سیستم** بالاتر از میانگین است: توکن‌های معنایی shadcn روی Tailwind v4، سلسله‌مراتب سه‌سطحی `surface-1..3`، `focus-visible` سراسری، پشتیبانی RTL با ویژگی‌های منطقی، و کاهش حرکت سراسری. اما سه شکاف ساختاری دارد:

1. **یکپارچگی:** دیزاین‌سیستم عملاً **دو تا** است — پنل با Fluent 11 و مارکتینگ با یک پالت/شعاع/فونت مستقل (`marketing.css`). سند می‌گوید «فقط توکن‌ها»، کد ۳۸۳ کلاس پالت خام دارد.
2. **دسترسی‌پذیری:** نبود `skip-link`، نبود `aria-sort`، نبود `error.tsx` در ۵۳ مسیر، و چرخش خودکار اسلایدر بدون احترام به `prefers-reduced-motion` (قاعده‌ی `auto-rotation-controls`).
3. **ساختار:** منطق UI درون فایل‌های مسیر انبار شده (یک صفحه ۱۶۶KB)، در حالی که سند معماری «ماژولار» را وعده می‌دهد؛ `packages/ui` فقط ۳۸ کامپوننت پایه دارد و UI محصولات (۳ فایل در `products/*/ui`) عملاً در `apps/web` است.

**امتیاز محورها (از ۱۰):**

| محور | امتیاز | دلیل کوتاه |
|---|---|---|
| معماری توکن | ۷ | سهلایه‌ی واقعی با `@theme inline`؛ اما بدون مقیاس حرکت/لایه‌بندی/سطح وضعیت (امروز اضافه شد) |
| یکپارچگی بصری | ۵ | دو سیستم موازی (پنل vs مارکتینگ) + ۳۸۳ کلاس خام |
| دسترسی‌پذیری (WCAG 2.2 AA) | ۵ | پایه‌ی خوب (focus/aria-label)، شکاف‌های ساختاری (skip/aria-sort/error/reduced-motion) |
| RTL و فارسی | ۸ | ویژگی‌های منطقی، `DirectionProvider`، ارقام `num-en/num-fa`؛ باگ فونت در فرم عمومی |
| فرم‌ها و بازخورد | ۶ | الگوی Field/Error خوب؛ نبود error summary متمرکز در برخی فرم‌ها |
| حرکت (Motion) | ۵ | `ease-fluent` و reduced-motion سراسری؛ ۶۸× `transition-all` و مدت‌های پراکنده |
| ساختار فرانت | ۴ | فایل‌های غول، نبود error boundary، `_components` من‌توزیع |
| دقت مستندات | ۴ | فونت/شعاع/«فقط توکن» با کد نمی‌خواند |
| عملکرد (Perceived) | ۶ | `next/font/local`، skeleton، `loading.tsx`؛ اما لایه‌های سنگین و `transition-all` |

**نتیجه:** بازنگری لازم نیست «از صفر»؛ نیاز به **تثبیت یک منبع حقیقت (single source of truth)**، **حذف سیستم موازی**، **بستن شکاف‌های a11y** و **شکستن فایل‌های غول** است. مسیر پیشنهادی در [`design-system-migration.md`](./design-system-migration.md).
## ۲. یافته‌ها به ترتیب شدت

### P0 — باید قبل از هر کار ظاهری بسته شود

| # | یافته | شاهد | قاعده‌ی مهارت | اثر کاربر |
|---|---|---|---|---|
| 1 | **فرم عمومی و بندانگشتی‌ها با فونت اشتباه رندر می‌شوند**: به `--font-vazirmatn` ارجاع می‌دهند که هیچ‌جا تعریف نشده (فونت واقعی `--font-fa` = IRANYekan) | `apps/web/src/app/n8f/n8f.css:16`، `apps/web/src/app/(panel)/form/form-thumb.tsx:40`؛ تعریف‌ها: `apps/web/src/lib/fonts.ts:47,56,65` | §۴ `consistency`، §۶ `font-pairing` | مشتری نهایی فرم را با Tahoma/فونت سیستم می‌بیند، نه هویت بصری پنل |
| 2 | **هیچ skip-link وجود ندارد** در حالی که هر صفحه نوار چسبان ۶۴px + منوی همبرگری دارد | جست‌وجوی `SkipToContent|skip-link|پرش به محتوا` = **۰** | §۱ `skip-links` (CRITICAL) | کاربر کیبورد در هر صفحه ۱۰–۲۰ تب اضافه می‌زند تا به محتوا برسد |
| 3 | **اسلایدر خودکار هیرو به `prefers-reduced-motion` احترام نمی‌گذارد و روی فوکوس متوقف نمی‌شود**؛ فقط hover و دکمه‌ی دستی | `hero-slider.tsx:143-147` (`setInterval` بدون شرط)، `:155-156` (فقط hover)، `:330` (دکمه) | §۱ `auto-rotation-controls`، `reduced-motion` | کاربران با حساسیت حرکتی محتوای متحرک تحمیلی می‌بینند (WCAG) |
| 4 | **هیچ `error.tsx` در ۵۳ مسیر نیست** (`loading.tsx`=۴، `error.tsx`=**۰**، `not-found.tsx`=۱) | شمارش `apps/web/src/app` | §۸ `error-recovery`، §۳ `network-fallback`؛ قرارداد Next App Router | خطای runtime یک صفحه = صفحه‌ی سفید بدون راه بازگشت |
| 5 | **سند دیزاین‌سیستم با کد نمی‌خواند** (فونت و شعاع) | `docs/design-system.md` می‌گوید «Vazirmatn» و «`--radius: 0.625rem`»؛ کد: IRANYekan و `--radius: 6px` (`globals.css:141`) | §۶ `color-semantic`/`text-styles-system` (اعتبار سند) | تیم جدید طبق سند کد می‌زند و ظاهر ناسازگار می‌سازد |

### P1 — یکپارچگی و ساختار

| # | یافته | شاهد | قاعده | اثر |
|---|---|---|---|---|
| 6 | **دیزاین‌سیستم موازی در مارکتینگ**: `.marketing-root` کل توکن‌های shadcn را با پالت دیگر بازتعریف می‌کند (`--primary:#3b82f6`، `--radius:1.5rem`) و کامنت بالای همان فایل می‌گوید شعاع ۶px و پس‌زمینه‌ی سفید | `apps/web/src/app/(marketing)/marketing.css:12,32`؛ تناقض داخلی با `:1-10` | §۴ `consistency`، `style-match`، §۶ `color-semantic` | دو هویت بصری؛ تغییر برند باید در دو جا انجام شود |
| 7 | **۳۸۳ کلاس پالت خام Tailwind** در UI واقعی (نه داده‌ی تم) | صدر: `billing/page.tsx` ۲۹، `n8l/_components/page-card.tsx` ۱۹، `shell-menus.tsx` ۱۵، `landing/*` هرکدام ۱۳ | §۶ `color-semantic`، §۴ `consistency`؛ داده‌ی `--stack shadcn`: «Hardcoded palette colors in components» = Bad | تم تیره/برند شکننده؛ هر تغییر پالت = جست‌وجوی دستی |
| 8 | **نبود `aria-sort`** در جدول‌هایی که مرتب‌سازی ستونی دارند | شمارش `aria-sort` = ۰؛ مرتب‌سازی در `docs/architecture.md` §۸.۷ مستند است | §۱۰ `sortable-table` (WCAG) | صفحه‌خوان جهت مرتب‌سازی را اعلام نمی‌کند |
| 9 | **صفحه‌ی پاسخ‌های فرم ۱۶۶KB** و ۴ فایل دیگر بالای ۴۰KB | `apps/web/src/app/(panel)/form/[id]/results/page.tsx` | §۴ `elevation-consistent` هم‌خانواده‌ی «یک مسئولیت»؛ `--stack react`: `composition` به‌جای prop drilling انبارشده | تست/بازبینی دشوار، ریسک رگرسیون بالا |
| 10 | **دکمه‌ی پیش‌فرض ۳۲px** (`h-8`)؛ هیچ سایز ۴۴px برای لمس ندارد | `packages/ui/src/components/button.tsx:30-33` | §۲ `touch-target-size` (44pt mobile)، §۱ `web-target-size` (۲۴px AA) | AA وب پاس است، اما CTAهای پنل در موبایل کوچک‌اند |
| 11 | **نبود سطح وضعیت در دیزاین‌سیستم** (موجب بند ۷) | `globals.css` قبل از این بازنگری فقط `--success/--warning/--info/--destructive` داشت، بدون سطح/متن AA | §۶ `color-accessible-pairs`، §۴ `state-clarity` | سازنده مجبور به `bg-emerald-500` می‌شد |

### P2 — کیفیت حرکت، لایه‌بندی و تمیزی

| # | یافته | شاهد | قاعده |
|---|---|---|---|
| 12 | **۶۸ مورد `transition-all`** (انیمیت همه‌ی خصوصیات، از جمله layout) | صدر: `hero-slider.tsx` ۷، `landing/file|form|link` هرکدام ۵، `element-form.tsx` ۵ | §۷ `transform-performance`، `duration-timing` |
| 13 | **z-index بی‌مقیاس**: `z-[60]`، `z-[120]`، `z-[130]` کنار `z-10..z-50` | اسکن z-index (۶۱ مقدار) | §۵ `z-index-management` |
| 14 | **۶ `div` با `onClick`** و ۶ `role="button"` — نیازمند بازبینی دستی کیبورد (`onKeyDown` مجموعاً ۳۹ مورد است) | `board.tsx:311,839,923`، `inline.tsx:443`، `link-editor.tsx:747`، `rich-editor.tsx:420`، `product-home.tsx:191,421`، `shell-menus.tsx:104,279`، `editor-ui.tsx:154` | §۱ `keyboard-nav`، §۴ `system-controls` |
| 15 | **لایه‌ی واسط `--n8f-*`** (۲۳۱ خط CSS) که صرفاً توکن‌های پلتفرم را نام‌گذاری مجدد می‌کند | `apps/web/src/app/n8f/n8f.css` | §۴ `consistency` (لایه‌ی ترجمه = منبع drift) |
| 16 | **`--font-weight` یک پله سبک‌تر** از استاندارد؛ سند این را توضیح داده ولی در هیچ‌جا «قاعده‌ی انتخاب وزن» ندارد | `globals.css:28-32` | §۶ `weight-hierarchy` |

### نقاط قوت (که نباید در مهاجرت از دست برود)

- `focus-visible` در ۱۲۸ نقطه‌ی وب + ۳۲ نقطه‌ی `packages/ui`؛ حلقه‌ی فوکوس دوتایی Fluent در Button.
- `aria-label` ۲۷۱ مورد؛ `<img>` بدون `alt` = **۰**؛ `aria-live` ۹ مورد.
- `tabular-nums` ۳۶ مورد (قاعده‌ی `number-tabular` رعایت شده).
- `prefers-reduced-motion` سراسری در `globals.css` (اگرچه در JS اسلایدر استفاده نشده).
- `min-h-dvh` بدون هیچ `100vh` (قاعده‌ی `viewport-units` سبز است).
- تطابق کامل `Card`/`Block` با سند: `variant`های `default/outline/subtle/inset/ghost` و `default/muted/outline/inset/accent/ghost` واقعاً وجود دارند (`card.tsx:20-24`، `block.tsx:23-28`).
- `DirectionProvider` + ویژگی‌های منطقی (`ms-`/`me-`/`ps-`/`pe-`) + ارقام `num-en`/`num-fa` + `next/font/local`.
- کامپوننت‌های `Empty`، `MotionArt`، `Skeleton`، `Spinner` و الگوی loading وجود دارد.
<!-- PART-3 -->

## ۳. تناقض‌های سند راهنما با کد (Drift)

| ادعای سند | واقعیت کد | حکم |
|---|---|---|
| `design-system.md`: فونت **Vazirmatn** (برش محلی) + Geist | `fonts.ts:5-47` فونت **IRANYekan** را با متغیر `--font-fa` بارگذاری می‌کند؛ Vazirmatn فقط در fallback دو فایل یتیم مانده | ❌ سند کهنه — علت باگ P0-1 |
| `design-system.md`: `--radius: 0.625rem` (از پریست `c1rc`) | `globals.css:141` → `--radius: 6px` | ❌ عدد سند غلط |
| `design-system.md`: «رنگ‌های خام Tailwind (`indigo-*`, `neutral-*` …) در صفحه‌ها استفاده نشود؛ فقط توکن‌ها» | ۳۸۳ کلاس پالت خام + ۱۱۵ hex | ❌ قاعده نوشته شده، اعمال نشده |
| `noroform-public-design.md`: «هیچ دیزاین‌سیستم موازی در محصول وجود ندارد» | برای **محصولات** درست است؛ اما `(marketing)/marketing.css` یک سیستم موازی کامل برای مارکتینگ است | ⚠️ دامنه‌ی ادعا باید دقیق شود |
| `design-system.md`: «ظاهر ویندوز ۱۱ (Fluent 2)» برای پلتفرم | درست برای پنل؛ مارکتینگ `--primary:#3b82f6` و شعاع `1.5rem` (سبک Linear/Vercel) دارد | ⚠️ نیازمند تفکیک صریح «اسکین پلتفرم» و «اسکین مارکتینگ» |
| `design-system.md`: `Card variant="ghost"` و `Block variant="muted/outline/accent/ghost"` | ✅ دقیقاً پیاده شده (`card.tsx:20-24`، `block.tsx:23-28`) | ✅ |
| `architecture.md` §۸.۷: جدول پاسخ‌ها مرتب‌شدنی است | درست، اما `aria-sort` در کل وب = ۰ | ⚠️ رفتار هست، اعلام وضعیت به assistive tech نیست |
| `architecture.md`: «UI محصول از محصول جدا نمی‌شود» | `products/*/ui` فقط ۳+۳+۱ فایل دارد؛ عمده‌ی UI محصول در `apps/web/src/app/(panel)` است | ❌ مرز وعده‌داده‌شده اجرا نشده |

---

## ۴. ارزیابی نقادانه‌ی خودِ مهارت `ui-ux-pro-max` (چه چیزی پذیرفته و چه چیزی رد شد)

این بخش مهم است: مهارت یک **کتابخانه‌ی قاعده و چک‌لیست** است، نه مرجع برند برای محصول فارسی. خروجی `--design-system` برای «SaaS form builder / link in bio» این بود:

| پیشنهاد مهارت | تصمیم | دلیل مستند |
|---|---|---|
| پالت **teal** (`#0D9488` primary، `#F0FDFA` background) | **رد** | با هویت Fluent 11 و `--primary:#005fb8` پنل و برند موجود تعارض دارد؛ `On Primary: #000000` روی teal، دکمه‌ی اصلی را با متن مشکی می‌کند که در RTL و کنار کنترل‌های Fluent ناهمگون است؛ قاعده‌ی `style-match` می‌گوید سبک باید با ماهیت محصول بخواند. |
| فونت **Fira Code / Fira Sans** | **رد قطعی** | این دو خانواده **پوشش فارسی ندارند**؛ انتخاب آن برای UI فارسی نقض `font-pairing` است. تصمیم IRANYekan + Geist درست است. |
| الگوی **Product Demo + Features** | **پذیرش جزئی** | برای لندینگ منطقی است (همین الگو در `(marketing)/landing/*` هست)، اما ویدیوی autoplay باید کنترل `auto-rotation-controls` داشته باشد. |
| `--stack shadcn`: «برای هر توکن سفارشی نسخه‌ی `.dark` تعریف کن؛ پالت را هاردکد نکن» | **پذیرش کامل** | `.dark` فعلی کامل است (نقطه‌ی قوت)؛ هاردکد پالت نه (P1-7). |
| `--stack nextjs`: «Server Component پیش‌فرض؛ `use client` بی‌دلیل نگذار» | **پذیرش + یافته‌ی جدید** | **۱۲۴ از ۱۸۰ فایل TSX (۶۹٪) `use client` دارند**. |
| `error summary validation` (High) | **پذیرش** | الگوی Field/Error هست، اما «خلاصه‌ی خطای قابل‌فوکوس با لینک به فیلدها» در فرم‌های چندخطایی دیده نشد. |
| `focus not obscured` (High) | **پذیرش و اعمال شد** | `scroll-padding-top` و `:target { scroll-margin-top }` به `globals.css` اضافه شد. |
| `auto-rotation-controls` (WAI) | **پذیرش** | دکمه‌ی pause/play و توقف روی hover هست (نقطه‌قوت)، اما reduced-motion و توقف روی فوکوس نیست → P0-3. |
| `sortable-table` (WCAG) | **پذیرش** | `aria-sort` = ۰ → P1-8. |
| جست‌وجوی `html-tailwind` با «rtl logical properties dir» | **۰ نتیجه (گپ مهارت)** | دیتاست مهارت برای RTL چیزی ندارد؛ مرجع RTL باید سند خود پروژه باشد. |
| جست‌وجوی `ux` با «design token consistency hardcoded colors» | **نتیجه‌ی بی‌ربط** | جست‌وجو keyword-fuzzy است؛ طبق قرارداد خود مهارت باید دسته و هویت نتیجه وارسی شود. |

**جمع‌بندی:** از مهارت برای **قاعده/چک‌لیست/الگوی تعامل** استفاده می‌کنیم؛ برای **پالت، فونت و هویت بصری** مرجع خودِ محصول است.

---

## ۵. ارزیابی ساختار فرانت‌اند

| محور | یافته | عدد/شاهد |
|---|---|---|
| Server/Client boundary | اپ کلاینت‌محور است | **۱۲۴ / ۱۸۰** فایل TSX دارای `use client` (۶۹٪) |
| اندازه‌ی واحد | فایل‌های غول با چند مسئولیت | **۱۱ فایل > ۳۰KB**؛ صدر ۱۶۶KB |
| هم‌مکانی | ۹ پوشه‌ی `_components` + `src/components` (۱۳ فایل) + `packages/ui` (۳۸ کامپوننت) | الگو هست، قاعده‌ی «کجا چه چیزی برود» نیست |
| مرز محصول | `products/*/ui` تقریباً خالی؛ UI در `apps/web` | ۳+۳+۱ فایل در برابر ۱۸۰ فایل وب |
| خطا/بارگذاری | `loading.tsx`=۴، `error.tsx`=۰، `not-found.tsx`=۱ برای ۵۳ مسیر | پوشش ناقص |
| استایلینگ | سه محل تعریف ظاهر | `globals.css` ۳۴۲ خط + `marketing.css` ۲۸۵ + `n8f.css` ۲۳۱ |
| حرکت | ۶۸ `transition-all`، مدت‌های `150/200/300/700/1000` | بدون مقیاس واحد (امروز توکن اضافه شد) |
| لایه‌بندی | `z-[60]`، `z-[120]`، `z-[130]` | مقیاس نداشت (امروز توکن اضافه شد) |

---

## ۶. اولویت‌بندی اجرایی

### P0 (۱–۲ روز، قبل از هر بازطراحی ظاهری)
1. رفع فونت فرم عمومی و بندانگشتی (`n8f.css:16`، `form-thumb.tsx:40` → `var(--font-sans)`).
2. `skip-link` سراسری در `(panel)/layout.tsx` و `(marketing)/layout.tsx` + `id="main-content"` روی `<main>`.
3. اسلایدر: احترام به `prefers-reduced-motion` + توقف روی `focus-within`.
4. `error.tsx` پایه برای `(panel)`، `(marketing)`، `n8f`، `n8l` (پیام فارسی + تلاش دوباره).
5. اصلاح سند `design-system.md` (فونت/شعاع) — در بازنویسی این مرحله انجام می‌شود.

### P1 (۱ هفته)
6. تثبیت یک منبع توکن: تبدیل `marketing.css` به **اسکین** روی همان توکن‌ها (بدون بازتعریف `--primary`/`--radius`) یا ثبت رسمی «اسکین برند» با نگاشت صریح.
7. مهاجرت ۳۸۳ کلاس پالت خام به توکن‌ها با `bg-*-surface + text-*-ink` (امروز اضافه شد) + allowlist رنگ‌های دسته‌ای (تیِر/آواتار/لوگوی برند).
8. `aria-sort` در جدول پاسخ‌ها و فهرست‌های ادمین.
9. شکستن `results/page.tsx` به `_components/results-table.tsx`، `detail-sheet.tsx`، `summary-cards.tsx`، `export-menu.tsx`، `layout-model.ts`.
10. سایز لمسی: افزودن `size="touch"` (۴۴px) یا استفاده‌ی `lg` در CTAهای موبایل.

### P2 (۲ هفته)
11. حذف `transition-all` (۶۸ مورد) با `transition-[transform,opacity,background-color,border-color,box-shadow]`.
12. یکسان‌سازی z-index روی مقیاس جدید.
13. بازبینی ۶ `div onClick` و ۶ `role="button"` برای کیبورد.
14. حذف لایه‌ی `--n8f-*` و اتصال مستقیم به توکن‌های پلتفرم.
15. کاهش `use client` با جدا کردن بخش‌های تعاملی به برگ‌های کوچک.

---

## ۷. آنچه در همین پاس تغییر کرد (شفاف)

| فایل | تغییر | ماهیت |
|---|---|---|
| `packages/ui/src/styles/globals.css` | افزودن `--success/warning/info/destructive-surface` + `-ink` (روشن/تیره، AA)، `--motion-*` + `duration-fast/base/slow/slower`، سه منحنی Fluent، مقیاس `--z-*`، `--app-header-height`، `scroll-padding-top` و `:target` | صرفاً افزایشی؛ هیچ مقدار موجودی عوض نشد |
| `docs/design-review.md` | همین گزارش | جدید |

> **هشدار:** این تغییرات هنوز با `pnpm typecheck`/بیلد بصری تأیید نشده‌اند. هیچ کلاس پالتی حذف نشد تا ریسک بصری صفر بماند.

---

## ۸. گام بعد

۱) تأیید این گزارش و اولویت‌ها. ۲) اجرای P0 (پنج مورد، کوچک و قابل‌تست). ۳) تدوین دو سند تجمیع‌شده (`design-system.md` نسخه‌ی ۲ و `frontend-architecture.md`) و شروع مهاجرت P1 با گارد `check:design` در CI.



