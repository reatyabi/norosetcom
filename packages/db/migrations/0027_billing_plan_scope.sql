-- اشتراک محصول‌محور و افزایشی (docs/architecture.md §9.11): هر پلن مال یک محصول است و خریدهای محصولات
-- مختلف کنار هم می‌مانند (union سقف‌ها)؛ فقط خرید/ارتقا/تمدید داخل همان دامنه جایگزین می‌کند.
-- ۱) دامنه‌ی پلن به‌صورت enum روی خود پلن؛ پیش‌فرض `bundle` (سازگار با کد ریلیز قبلی: پلن قدیمی همه‌چیز را می‌دهد
--    و رفتاری عوض نمی‌شود تا ادمین از پنل دامنه را انتخاب کند).
-- ۲) backfill: نام/کد پلنی که صریحاً یک محصول را می‌گوید همان دامنه؛ وگرنه از کلیدهای سقف استنتاج می‌شود
--    (یک ماژول ← همان محصول، چند ماژول/هیچ ← bundle).
-- ۳) نوع پرداخت `addon`: خرید هم‌زمان برای محصولی که پلن فعالش آن را پوشش نمی‌دهد (نه ارتقا، نه صف، نه جایگزین).
CREATE TYPE "public"."billing_plan_scope" AS ENUM('norolink', 'noroform', 'norofile', 'bundle');--> statement-breakpoint
ALTER TABLE "billing_plans" ADD COLUMN "scope" "billing_plan_scope" DEFAULT 'bundle' NOT NULL;--> statement-breakpoint
ALTER TYPE "billing_payment_kind" ADD VALUE IF NOT EXISTS 'addon';--> statement-breakpoint
-- FORCE RLS مالک را هم محدود می‌کند و نوشتن پلن فقط با is_platform_admin() است؛ پس مثل 0013/0019 در همین
-- تراکنش موقتاً برداشته می‌شود (وگرنه backfill بی‌صدا صفر ردیف را می‌گیرد).
ALTER TABLE "billing_plans" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- نام‌های فارسی/لاتین محصول در نام یا کد پلن، اولویت دارد؛ بعد از آن ماژول کلیدهای سقف.
WITH "signals" AS (
  SELECT
    p."id",
    (
      lower(p."code") LIKE '%norolink%' OR p."name" LIKE '%نورولینک%'
    ) AS "norolink",
    (
      lower(p."code") LIKE '%noroform%' OR p."name" LIKE '%نوروفورم%'
    ) AS "noroform",
    (
      lower(p."code") LIKE '%norofile%' OR p."name" LIKE '%نوروفایل%'
    ) AS "norofile",
    (
      COALESCE((p."entitlements" ->> 'norolink.pages')::numeric, 0) > 0
      OR COALESCE((p."entitlements" ->> 'norolink.elements_per_page')::numeric, 0) > 0
      OR COALESCE((p."entitlements" ->> 'norolink.seo')::boolean, false)
      OR COALESCE((p."entitlements" ->> 'norolink.detailed_stats')::boolean, false)
    ) AS "key_norolink",
    (
      COALESCE((p."entitlements" ->> 'noroform.forms')::numeric, 0) > 0
      OR COALESCE((p."entitlements" ->> 'noroform.submissions_monthly')::numeric, 0) > 0
    ) AS "key_noroform",
    (COALESCE((p."entitlements" ->> 'norofile.storage_mb')::numeric, 0) > 0) AS "key_norofile"
  FROM "billing_plans" p
)
UPDATE "billing_plans" p
SET "scope" = CASE
  WHEN (s."norolink"::int + s."noroform"::int + s."norofile"::int) = 1 AND s."norolink" THEN 'norolink'::"public"."billing_plan_scope"
  WHEN (s."norolink"::int + s."noroform"::int + s."norofile"::int) = 1 AND s."noroform" THEN 'noroform'::"public"."billing_plan_scope"
  WHEN (s."norolink"::int + s."noroform"::int + s."norofile"::int) = 1 AND s."norofile" THEN 'norofile'::"public"."billing_plan_scope"
  WHEN (s."norolink"::int + s."noroform"::int + s."norofile"::int) > 1 THEN 'bundle'::"public"."billing_plan_scope"
  WHEN (s."key_norolink"::int + s."key_noroform"::int + s."key_norofile"::int) = 1 AND s."key_norolink" THEN 'norolink'::"public"."billing_plan_scope"
  WHEN (s."key_norolink"::int + s."key_noroform"::int + s."key_norofile"::int) = 1 AND s."key_noroform" THEN 'noroform'::"public"."billing_plan_scope"
  WHEN (s."key_norolink"::int + s."key_noroform"::int + s."key_norofile"::int) = 1 AND s."key_norofile" THEN 'norofile'::"public"."billing_plan_scope"
  ELSE 'bundle'::"public"."billing_plan_scope"
END
FROM "signals" s
WHERE s."id" = p."id";--> statement-breakpoint
ALTER TABLE "billing_plans" FORCE ROW LEVEL SECURITY;
