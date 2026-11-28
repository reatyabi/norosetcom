Ran list files in editor and field-engine
Ran list files in editor directory
Ran run git status, tests, and tsc · Exited with code 1
Ran check tooling and directories
Checked task Check tooling and directories
Ran check nodejs path and git
Canceled verify pnpm and search for git repo
Checked task Verify pnpm and search for git repo
Killed task Verify pnpm and search for git repo
Ran check git directory directly
Ran read root package.json
Ran check package.json in field-engine and web
Ran run field-engine typecheck and test
Checked task Run field-engine typecheck and test
Ran run web typecheck and test
Checked task Run web typecheck and test
Checked task Run web typecheck and test
Checked task Run web typecheck and test
Checked task Run web typecheck and test
Checked task Run web typecheck and test
Checked task Run web typecheck and test
Canceled search monorepo for legacy chrome element identifiers
Checked task Search monorepo for legacy chrome element identifiers
Killed task Search monorepo for legacy chrome element identifiers
Ran search for legacy chrome element terms in codebase
Ran search for chrome and deprecated in field-engine and web form
Ran find form related routes and components in apps/web
Ran find usages of public-form
Ran check duplicate form-editor.css files
Ran check usage of each editor file
Ran read data.tsx in editor
Ran find which editor components import data.tsx
Ran check usage of field-engine files · Exited with code 1
Ran check field-engine files usage with proper filter
Analyzed index.ts:L1-57
Analyzed page.tsx:L1-12
Analyzed public-form-page.tsx:L1-43
Analyzed public-form-runtime.tsx:L1-25
Ran find PublicFormClient definition
Analyzed public-form.tsx:L1-100
Analyzed public-form.tsx:L101-250
Analyzed public-form.tsx:L251-400
Analyzed public-form.tsx:L401-520
Analyzed public-form.tsx:L521-671
Analyzed schema.ts:L1-140
Analyzed schema.ts:L141-257
Analyzed editor-document.ts:L1-150
Analyzed editor-document.ts:L151-333
Ran find state and doc variables in page.tsx
Analyzed page.tsx:L140-195
Analyzed page.tsx:L585-635
Ran find header logo and layout handlers
Ran search globals.css for --nf- and @theme
Analyzed form-editor.css:L1-150
Analyzed form-editor.css:L151-282
Ran read beginning of theme.ts in field-engine
Ran read presets and default tokens in theme.ts
Analyzed editor-background.tsx:L1-32
Analyzed canvas.tsx:L1-150
Analyzed canvas.tsx:L151-311
Analyzed top-bar-editor.tsx:L1-120
Analyzed header-editor.tsx:L1-100
Analyzed bottom-bar-editor.tsx:L1-100
Analyzed bottom-bar-editor.tsx:L101-146
Analyzed sidebar-editor.tsx:L1-140
Analyzed sidebar-editor.tsx:L141-260
Analyzed top-bar-editor.tsx:L121-201
Ran check ScrollArea definition in packages/ui · Exited with code 1
Ran find scroll-area in packages/ui
Ran find ScrollArea export in packages/ui/src/index.ts
Ran search for ScrollArea in packages/ui
Analyzed scroll-area.tsx:L1-60
Ran find scroll-fade in globals.css
Ran search for scroll-fade in all css files
Analyzed field-card.tsx:L1-140
Analyzed field-inline.tsx:L1-140
Analyzed field-inline.tsx:L141-260
Analyzed field-inline.tsx:L261-400
Analyzed field-inline.tsx:L401-498
Analyzed settings-spec.ts:L1-140
Ran inspect controls in settings-drawer.tsx
Analyzed settings-drawer.tsx:L200-272
Ran search dialogs.tsx for preview and 6-zone terms
Analyzed dialogs.tsx:L35-160
Analyzed dialogs.tsx:L161-295
Ran find backgroundCss in theme.ts
Ran read imports in dialogs.tsx
Ran search for hardcoded colors in editor components
Analyzed theme-panel.tsx:L110-180
Analyzed theme-panel.tsx:L430-470
Ran search usage of form-editor.css selectors in web
Ran find where form-editor.css is imported
Analyzed data.tsx:L1-101
Analyzed types.ts:L1-140
Ran read rich-text.ts in editor components
Ran read editor-ops.ts
Ran read preview-run.ts
Ran read templates.ts in form directory
Ran read template definitions in templates.ts
Ran read buildDraftFromTemplate in templates.ts

گزارش ممیزی دقیق و جامع از وضعیت ادیتور فرم، موتور قالب‌ها، اسکیما و بقایای کد قدیمی در منوریپو به شرح زیر تقدیم می‌شود (بدون هیچ‌گونه دستکاری، ایجاد یا حذف فایل):

---

### ۱. درخت فایل‌ها و تشخیص فایل‌های مرده/اضافی (Dead Code)

#### فهرست کامل فایل‌ها
* **در مسیر `apps/web/src/app/(panel)/form/[id]/editor/` (شامل ۲۸ فایل):**
  * `page.tsx`
  * `form-editor.css`
  * `_components/background-dialog.tsx`
  * `_components/bottom-bar-editor.tsx`
  * `_components/canvas.tsx`
  * `_components/confirm-dialog.tsx`
  * `_components/data.tsx`
  * `_components/dialogs.tsx`
  * `_components/editor-background.tsx`
  * `_components/editor-document.ts`
  * `_components/editor-header.tsx`
  * `_components/editor-ops.ts`
  * `_components/elements-panel.tsx`
  * `_components/field-card.tsx`
  * `_components/field-inline.tsx`
  * `_components/form-editor.css`
  * `_components/form-rich-text.tsx`
  * `_components/header-editor.tsx`
  * `_components/preview-run.ts`
  * `_components/publish-dialog.tsx`
  * `_components/publish-issues.tsx`
  * `_components/rich-text.ts`
  * `_components/settings-drawer.tsx`
  * `_components/settings-spec.ts`
  * `_components/sidebar-editor.tsx`
  * `_components/theme-panel.tsx`
  * `_components/top-bar-editor.tsx`
  * `_components/types.ts`

* **در مسیر `packages/field-engine/src/` (شامل ۴۰ فایل):**
  * فایل‌های ریشه: `index.ts`, `schema.ts`, `contract.ts`, `theme.ts`, `registry.ts`, `limits.ts`, `ids.ts`, `conditions.ts`, `layout.ts`, `preview.ts`, `rich-text.ts`, `text.ts`, `validate-definition.ts`, `validate-submission.ts`.
  * زیرپوشه `chrome/`: `nav-buttons.ts`, `simple.ts`.
  * زیرپوشه `content/`: `image.ts`, `text.ts`, `video.ts`.
  * زیرپوشه `fields/`: `date.ts`, `email.ts`, `long-text.ts`, `multi-choice.ts`, `number.ts`, `phone.ts`, `rating.ts`, `shared.ts`, `short-text.ts`, `single-choice.ts`.
  * زیرپوشه `values/`: `choice.ts`, `contract.ts`, `date.ts`, `digits.ts`, `email.ts`, `index.ts`, `number.ts`, `phone.ts`, `rating.ts`, `shared.ts`, `text.ts`.

#### فایل‌ها، کامپوننت‌ها، تایپ‌ها و کدهای مرده/اضافی
1. **فایل بیرونی [form-editor.css](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/form-editor.css#L1):** این فایل فقط حاوی `@import './_components/form-editor.css';` است اما در هیچ کجای پروژه import نشده (چون `globals.css` مستقیماً فایل داخلی `_components/form-editor.css` را لود می‌کند). این فایل کاملاً اضافی و مرده است.
2. **فایل [_components/data.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/data.tsx#L18):** در خط ۱۸ کامنت صریح دارد: `// TODO(10b): از fieldTypes / contentTypes رجیستری field-engine ساخته شود`. یک لایه هاردکد شده از انواع المان‌ها و آیکون‌هاست که مستقل از رجیستری مرکزی `field-engine` نوشته شده است.
3. **تایپ `HeaderLogo` در [_components/types.ts](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/types.ts#L76-L85):** فیلدهای `align`، `show_logo`، `show_title` و `show_subtitle` در اسکیمای `FormDefinition` وجود ندارند و هنگام ذخیره دور ریخته می‌شوند.
4. **پراپ `onTitleChange` در [sidebar-editor.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/sidebar-editor.tsx#L37):** تعریف شده ولی داخل کامپوننت هرگز فراخوانی نمی‌شود؛ عنوان سایدبار صرفاً در یک `<span>` غیرقابل ویرایش نمایش می‌یابد.
5. **پراپ‌های `_onDefaultsChange` و `_onFooterChange` در [canvas.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/canvas.tsx#L118-L122):** دریافت می‌شوند اما بلااستفاده رها شده‌اند.

#### بقایای ساختار قدیمی المان‌های کروم در منوریپو
* در کل کدهای اجرایی `apps/web` و `apps/api` هیچ استفاده‌ای از `ChromeAreas`، `topBarCount`، `bottomBarCount` یا `sidebarCount` وجود ندارد؛ این اسامی صرفاً در فایل‌های مستندات `docs/architecture.md` (خطوط ۳۸۴ و ۳۹۷) و `report.md` (خطوط ۴۵، ۱۴۹ و ۱۷۶) باقی مانده‌اند.
* در `packages/field-engine/src/chrome/simple.ts` و `nav-buttons.ts`، المان‌های قدیمی کروم (`logoTitleChrome`, `pageNumberChrome`, `progressTimelineChrome`, `elapsedTimerChrome`, `formNameChrome`) هنوز در رجیستری اکسپورت می‌شوند که در معماری جدید ۶ ناحیه‌ای ادیتور هیچ کاربردی ندارند و فقط `LICENSE_BADGE` و تایپ `NavButton` استفاده می‌شوند.

#### مسیر رندرر عمومی فرم (Public Form Renderer)
* **مسیر روت:** [apps/web/src/app/n8f/f/[slug]/page.tsx](file:///c:/norosetcom/apps/web/src/app/n8f/f/[slug]/page.tsx#L9)
* **کامپوننت کلاینت:** [apps/web/src/components/noroform/public-form-runtime.tsx](file:///c:/norosetcom/apps/web/src/components/noroform/public-form-runtime.tsx#L6)
* **موتور رندر هسته:** پکیج [products/noroform/ui/public-form.tsx](file:///c:/norosetcom/products/noroform/ui/public-form.tsx#L303) (`PublicFormClient`).
* **اتصال به تم و فیلد انجین:** از توابع `resolveZones`, `evaluateConditions`, `computeVisiblePages`, `fieldTypes`, `formatJalali`, `LICENSE_BADGE`, `richTextSchema` از `field-engine` استفاده می‌کند. برای تم از `FormBackground`، `fontCss`، `radiusCss` و `buttonStyle` بهره می‌برد اما از توکن‌های اسکوپ‌شده بوم ادیتور (`--nf-*`) استفاده **نمی‌کند** و عمدتاً متکی بر اینلاین استایل و کلاس‌های کلی Tailwind است.

---

### ۲. وضعیت اسکیما و لایه سند (`schema.ts` و `editor-document.ts`)

#### ساختار فعلی در [packages/field-engine/src/schema.ts](file:///c:/norosetcom/packages/field-engine/src/schema.ts#L194-L211)
* **`FormDefinition`:** نسخه اسکیمای ۱ (`version_schema: 1`)، شامل `theme`، `layout`، `defaults`، `pages` (آرایه‌ای از `pageSchema`)، `settings: { closed_message }` و `ending: { redirect?: { url, delay_seconds } }`.
* **`FormLayout` (خطوط ۱۸۱-۱۹۰):**
  * `header_sticky: boolean` (پیش‌فرض: `false`)
  * `bottom_bar_fixed: boolean` (پیش‌فرض: `true`)
  * `sidebar_collapsible: boolean` (پیش‌فرض: `true`)
  * `sidebar_collapsed: boolean` (پیش‌فرض: `false`)
  * `main_columns: 1 | 2` (پیش‌فرض: `1`)
  * `zones`: `{ header, top_bar, sidebar, bottom_bar, footer }` (همه با پیش‌فرض `true`).
* **`FormDefaults` (خطوط ۱۲۱-۱۶۷):**
  * `header`: `{ logo_url, brand_title, brand_subtitle }`
  * `top_bar`: `{ mode: 'progress' | 'notice' | 'none', description, notice_text }`
  * `sidebar`: `{ title }`
  * `bottom_bar`: `{ prev_label, next_label, submit_label }`
  * `footer`: `{ text, show_branding }`
* **`FormTheme` (خطوط ۹۵-۱۱۸):**
  * `preset` (۱۲ قالب)، `primary_color`، `background_color`، `background_style` ('solid' | 'gradient' | 'mesh' | 'image')، `background_secondary_color`، `background_angle`، فیلدهای پترن و اورلی تصویر، `button_style`، `radius`، `text_size`، `font`.
* **`Field.settings`:**
  * در اسکیما `rawSettings = z.record(z.string(), z.unknown()).default({})` است که قوانین نوعی آن در `validate-definition.ts` اعتبارسنجی می‌شود (شامل `col_span`, `text_align`, `placeholder`, `options`, `min_length`, `max_length`, `min`, `max`, `integer`, `display`, `min_selected`, `max_selected`, و غیره).

#### بررسی کدهای تبدیل، فیلدهای تکراری و Stateهای محلی
* در [apps/web/src/app/(panel)/form/[id]/editor/page.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/page.tsx#L89-L92):
  ```ts
  const [layout, setLayout] = useState<FormLayout>(() => formLayoutSchema.parse({}));
  const [defaults, setDefaults] = useState<FormDefaults>(() => formDefaultsSchema.parse({}));
  const [headerLogo, setHeaderLogo] = useState<HeaderLogo>({ ...EMPTY_HEADER_LOGO });
  const [headerSticky, setHeaderSticky] = useState(false);
  ```
  دو State مستقل `headerLogo` و `headerSticky` کاملاً تکراری و موازی با `defaults.header` و `layout.header_sticky` / `layout.zones.header` هستند.
* در [editor-document.ts](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/editor-document.ts#L213-L258): تابع `writeEditorDocument` یک امضای چندگانه (Overload) دارد که هم `layout/defaults` و هم `headerLogo/headerSticky` را جداگانه دریافت و با هم ادغام می‌کند.
* فیلدهای `align`, `show_logo`, `show_title`, `show_subtitle` در `HeaderLogo` به هیچ فیلدی در اسکیما نگاشت نمی‌شوند و هنگام ذخیره ناپدید می‌شوند.

---

### ۳. وضعیت توکن‌ها و موتور قالب‌ها (`globals.css`، `form-editor.css`، `theme-panel.tsx`، `editor-background.tsx`)

#### تعریف و اتصال `@theme inline` و توکن‌های `--nf-*`
* در [apps/web/src/app/globals.css](file:///c:/norosetcom/apps/web/src/app/globals.css#L5-L20):
  بلوک `@theme inline` تعریف شده و کلاس‌های کمکی Tailwind 4 مانند `bg-nf-canvas`, `bg-nf-card`, `border-nf-border`, `text-nf-card-foreground`, `rounded-nf-card` را به متغیرهای CSS مانند `var(--nf-canvas-bg)` و `var(--nf-card-bg)` متصل می‌کند.
* در [_components/form-editor.css](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/form-editor.css#L51-L68):
  دقیقاً همین بلوک `@theme inline` مجدداً به صورت تکراری تعریف شده است.
* در [_components/form-editor.css](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/form-editor.css#L71-L101):
  سلکتور `[data-nf-canvas]` متغیرهای پایه را از مقادیر عمومی (`var(--muted)`, `var(--card, #ffffff)`, و غیره) مقداردهی اولیه می‌کند.
* در رانتایم، [canvas.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/canvas.tsx#L126-L152) با فراخوانی `resolveFormThemeTokens(theme)` از `field-engine`، متغیرهای توکن را به شکل استایل مستقیم روی عنصر اصلی بوم اعمال می‌کند.

#### محل تعریف قالب‌ها (Presets) و علت تفکیک کم رنگ‌ها در تم پیش‌فرض
* قالب‌ها در [packages/field-engine/src/theme.ts](file:///c:/norosetcom/packages/field-engine/src/theme.ts#L77-L260) داخل آبجکت `FORM_THEME_PRESET_DEFINITIONS` تعریف شده‌اند.
* **علت تفکیک کم بوم از کارت در تم پیش‌فرض:**
  در `schema.ts` (خط ۹۹)، مقدار پیش‌فرض `background_color` برابر با `#ffffff` است. زمانی که تم پیش‌فرض فرم بدون تغییر باشد، تابع `resolveFormThemeTokens` رنگ بوم `--nf-canvas-bg` را برابر با `#ffffff` و رنگ کارت `--nf-card-bg` را نیز برابر با `#ffffff` تنظیم می‌کند. در نتیجه هر دو سطح، سفید خالص و یکدست می‌شوند و کارت روی بوم تمایز بصری ندارد.
* **رنگ‌های هاردکد شده در JSX:**
  در [theme-panel.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/theme-panel.tsx#L19-L26)، ۸ رنگ پالت هاردکد شده‌اند (`#111111`, `#005fb8`, `#0f7b0f`, `#9d5d00`, `#c42b1c`, `#e11d48`, `#7c3aed`, `#0891b2`). همچنین در خطوط ۱۱۷-۱۲۱ مقادیر `#ffffff`، `#e4e4e7` و `#000000`، و در خطوط ۴۵۰-۴۶۰ مقادیر `#222222` و `#111` به صورت ثابت نوشته شده‌اند.

---

### ۴. وضعیت ۶ ناحیه بوم (`canvas.tsx`، `header-editor.tsx`، `top-bar-editor.tsx`، `sidebar-editor.tsx`، `bottom-bar-editor.tsx`)

#### بررسی کلاس‌های `overflow-*` و `z-*` و علت بریده شدن میکرو-تولبار TopBar
1. **کانتینر اصلی بوم در [canvas.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/canvas.tsx#L153-L155):** دارای `overflow-hidden` و روی `ScrollArea` دارای `overflow-x-hidden` است. ویوپورت درونی `ScrollArea` دارای اسکرول عمودی است.
2. **ستون میانی (خط ۱۹۴):** دارای کلاس‌های `pt-4 overflow-visible` است.
3. **میکرو-تولبار بالای TopBar در [top-bar-editor.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/top-bar-editor.tsx#L93):**
   دارای موقعیت `absolute -top-3.5 end-4 z-10` است.
   * **علت بریده شدن:**
     * مقدار `-top-3.5` معادل ۱۴ پیکسل منفی است. اگر هدر چسبان نباشد و صفحه در بالاترین نقطه اسکرول قرار گیرد، لبه بالایی میکرو-تولبار با حاشیه بالای ویوپورت `ScrollArea` برخورد کرده و به علت ماهیت اسکرول کانتینر بریده می‌شود.
     * زمانی که `HeaderEditor` در حالت `sticky top-0 z-30` باشد، مقدار `z-30` هدر از `z-10` میکرو-تولبار بالاتر است و هنگام اسکرول، هدر روی میکرو-تولبار شناور افتاده و آن را مخفی می‌کند.

#### تیترها یا برچسب‌های ثابت در بدنه کارت‌ها
* **BottomBar:** عنوان قدیمی «نوار پایین (BottomBar)» کاملاً حذف شده است. تنها متن ثابت باقی‌مانده در میکرو-تولبار سنجاق است: `<span>{isFixed ? 'ثابت در پایین' : 'عادی'}</span>` (خط ۱۰۳).
* **Sidebar:** در هدر سایدبار، `{title}` (پیش‌فرض «مراحل فرم») در خط ۱۴۴ به صورت یک برچسب متنی ثابت رندر شده و اینپوتی برای ویرایش آن وجود ندارد.
* **TopBar:** عنوان و توضیحات فرم اینپوت مستقیم دارند؛ در نوار پیشرفت عبارت «مرحله X از Y» و در میکرو-تولبار برچسب‌های «پیشرفت»، «اطلاعیه» و «فقط عنوان» قرار دارند.

#### اتصال رفتارهای هاور/فوکوس و چیدمان به اسکیما
* **هاور/فوکوس میکرو-تولبارها:** با الگوی `opacity-90 md:opacity-0 group-hover/...:opacity-100 focus-within:opacity-100` روی موبایل همیشه نمایان و روی دسکتاپ هنگام هاور/فوکوس فعال می‌شوند.
* **`main_columns`:** دکمه تغییر ستون در بالای کارت بدنه با `toggleColumns` مستقیماً مقدار `layout.main_columns` (۱ یا ۲) را در اسکیما ذخیره می‌کند.
* **`col_span`:** فیلدها در صورت تنظیم `col_span: 2` کلاس `md:col-span-2` می‌گیرند.
* **`layout.zones`:** در رندر بوم هر ۵ ناحیه با شروط `zones.header`، `zones.top_bar`، `zones.sidebar`، `zones.bottom_bar` و `zones.footer` کنترل می‌شوند.

---

### ۵. وضعیت WYSIWYG کارت فیلد و دراور تنظیمات (`field-card.tsx`، `field-inline.tsx`، `settings-drawer.tsx`، `settings-spec.ts`)

#### لیست دقیق کنترل‌های رندرشده در [field-inline.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/field-inline.tsx#L109-L290)
1. **`label`:** در حالت فعال ورودی `<textarea>` و در حالت غیرفعال `<span>` متن عنوان + ستاره قرمز `*`.
2. **`description`:** در حالت فعال ادیتور `FormRichText` و در حالت غیرفعال کامپوننت رندر متن غنی `RichPreview`.
3. **`placeholder`:** هم در حالت فعال و هم غیرفعال صرفاً یک **کادر پیش‌نمایش ماکاپ استاتیک** با پس‌زمینه کم‌رنگ نمایش می‌دهد؛ ورودی تایپِ پلیس‌هولدر روی بوم نیست و به دراور منتقل شده است.
4. **`options`:** گزینه‌ها با مارکر رادیو (دایره) یا چک‌باکس (مربع). در حالت فعال اینپوت عنوان گزینه، دکمه حذف و دکمه «+ افزودن گزینه»؛ در حالت غیرفعال متن ثابت گزینه.
5. **`scale` (فیلد rating):** ردیف ستاره‌های شکیل بر اساس `max`. **کنترل ناخواسته روی بوم:** در حالت فعال، یک `<NativeSelect>` برای انتخاب تعداد ستاره‌ها (۳ تا ۱۰) مستقیماً روی بوم رندر می‌شود (خطوط ۲۲۶-۲۳۶).
6. **`select` (عرض ستون، چینش متن، شکل نمایش):** روی بوم رندر **نمی‌شوند** (`case 'select': return null;` در خط ۲۱۰).
7. **`switch` (اجباری بودن):** درون `field-inline.tsx` رندر نمی‌شود؛ در نوار ابزار بالای کارت فیلد در [field-card.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/field-card.tsx#L127-L136) قرار دارد.
8. **رسانه (`image`, `video`, `rich_text`):** در حالت فعال اینپوت‌های URL و در غیرفعال پیش‌نمایش رسانه.

#### علت حاشیه سیاه ضخیم در کارت فعال
* تم پیش‌فرض `paper` دارای رنگ اصلی `primary_color: '#18181b'` (مشکی کربنی/Zinc-900) است؛ بنابراین متغیر `--nf-primary` برابر با یک رنگ مشکی بسیار پررنگ است.
* کارت فیلد فعال دو لایه حاشیه همزمان دریافت می‌کند:
  1. در `field-card.tsx` (خط ۸۵): `border border-nf-primary ring-2 ring-nf-primary/15`
  2. در `form-editor.css` (خط ۲۰۵): `.nf-field-card.is-active { border-color: var(--nf-primary); box-shadow: 0 0 0 2px ... }`
  تلاقی این دو کلاس و رنگ مشکی تم پیش‌فرض، یک کادر سیاه ضخیم و تیره ایجاد می‌کند.

#### گزینه‌های `single_choice`/`multi_choice`
* گزینه‌ها با مارکرهای اختصاصی فرم رندر می‌شوند: دایره (`rounded-full`) برای تک‌انتخابی و مربع با گوشه‌های گرد (`rounded-[4px]`) برای چندانتخابی. شماره‌های ۱. و ۲. کاملاً حذف شده‌اند.

#### وضعیت تنظیمات در [settings-drawer.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/settings-drawer.tsx#L201-L267)
* **موجود در دراور:**
  * زبانه چیدمان (Layout): عرض فیلد (`col_span`: ۱ یا ۲ ستون)، تراز متن (`text_align`: راست/وسط/چپ)، شکل نمایش گزینه‌ها (`display`: رادیویی یا دراپ‌داون)، و متن نگهدارنده (`placeholder`).
  * زبانه اعتبارسنجی (Validation): طول رشته، بازه عددی، محدودیت تعداد انتخاب، بازه تاریخ.
  * زبانه منطق (Logic): شرط‌های نمایشی.
* **جا مانده از دراور:**
  * مقیاس امتیازدهی فیلد ریتینگ (`scale`/`max`): در دراور وجود ندارد و روی بوم جا مانده است.
  * برای فیلدهای ایمیل و موبایل هیچ کنترل اعتبارسنجی در دراور وجود ندارد.
  * فیلد `placeholder` برای المان `rating` در دراور نمایش داده می‌شود، در حالی که ریتینگ پلیس‌هولدر ندارد.

---

### ۶. وضعیت پیش‌نمایش (`dialogs.tsx`) و ریسپانسیو

#### میزان همگامی `FormPreview` با معماری جدید در [dialogs.tsx](file:///c:/norosetcom/apps/web/src/app/(panel)/form/[id]/editor/_components/dialogs.tsx#L37-L279)
* **بخش‌های همگام:**
  * توکن‌های تم: از `resolveFormThemeTokens(theme)` استفاده کرده و کلاس‌های `data-nf-canvas`, `data-canvas-contrast`, `data-button-style` و متغیرهای `cssVars` را اعمال می‌کند.
  * چیدمان ستون‌ها: شرط `(layout?.main_columns ?? 1) === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'` را رعایت می‌کند.
  * عرض المان‌ها: شرط `isColSpan2` با کلاس `md:col-span-2` هندل می‌شود.
  * نواحی هدر، نوار بالا، نوار پایین و فوتر از روی `layout.zones` و `defaults` خوانده می‌شوند.

#### بخش‌های جامانده یا وابسته به الگوی قدیمی
1. **غیبت کامل سایدبار (`zones.sidebar`):** متغیر `zones.sidebar` در خط ۶۵ خوانده می‌شود، اما در تمام خروجی JSX کامپوننت `FormPreview` هیچ قطعه کدی برای رندر سایدبار وجود ندارد و سایدبار در پیش‌نمایش کلاً حذف است.
2. **کارت‌های منفرد فیلدها:** در پیش‌نمایش هر فیلد یک کارت جداگانه با کادر و پس‌زمینه (`rounded-nf-card border border-nf-border bg-nf-card`) دارد، در حالی که بوم ادیتور همه فیلدها را در یک کارت واحد (`#zone-main`) نشان می‌دهد.
3. **عدم پشتیبانی از `bottom_bar_fixed`:** نوار پایین در پیش‌نمایش همیشه درون جریان صفحه رندر می‌شود و قابلیت سنجاق/شناور در پایین صفحه را ندارد.
4. **لایه پس‌زمینه فرم:** پیش‌نمایش پس‌زمینه را با استایل خطی ساده `background: backgroundCss(theme)` اعمال می‌کند و لایه کامل پس‌زمینه (`EditorBackground` / `FormBackground`) که در بوم و رندرر عمومی هست را رندر نمی‌کند.

---

### ۷. وضعیت فعلی بیلد و تست‌ها

* **خروجی `git status -s`:**
  پوشه ریشه `C:\norosetcom` فاقد دایرکتوری کنترل نسخه Git (`.git`) است:
  ```text
  fatal: not a git repository (or any of the parent directories): .git
  ```
* **نتیجه اجرای `tsc --noEmit` (بررسی تایپ‌ها):**
  * پکیج `@noroset/field-engine`: **بدون هیچ‌گونه خطا** با موفقیت اجرا شد (Exit Code: 0).
  * اپلیکیشن `@noroset/web`: **بدون هیچ‌گونه خطا** با موفقیت اجرا شد (Exit Code: 0).
* **نتیجه اجرای آزمون‌های Vitest:**
  * پکیج `@noroset/field-engine`:
    * **۷ فایل تست**، **۶۹ تست موفق** (۱۰۰٪ قبولی در ۳.۵۹ ثانیه).
    * شامل: `description.test.ts`, `runtime.test.ts`, `definition.test.ts`, `theme.test.ts`, `values.test.ts`, `fields.test.ts`, `preview.test.ts`.
  * اپلیکیشن `@noroset/web`:
    * **۱۶ فایل تست**، **۱۶۴ تست موفق** (۱۰۰٪ قبولی در ۱۲.۶۶ ثانیه).
    * شامل: `routes.test.ts`, `form-editor-document.test.ts`, `form-templates.test.ts`, `marketing-shots.test.ts`, `public-form-render.test.ts`, `new-link-page.test.ts`, `results-model.test.ts`, `form-editor-ops.test.ts`, `form-editor-settings.test.ts`, `error-summary.test.ts`, `form-rich-text.test.ts`, `submissions-print.test.ts`, `deploy-nginx.test.ts`, `support.test.ts`, `utm.test.ts`, `form-preview-run.test.ts`.
  * **مجموع کل:** ۲۳۳ تست فعال که همگی با موفقیت پاس شدند و پروژه از نظر تایپ‌چک و تست‌ها کاملاً پایدار و سبز است.