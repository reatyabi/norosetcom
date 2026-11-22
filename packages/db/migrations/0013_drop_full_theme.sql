-- همه‌ی تنظیمات ظاهری صفحه‌ی لینک در همه‌ی پلن‌ها آزاد شد (docs/architecture.md §9.3)؛ کلید سقف حذف می‌شود.
-- FORCE RLS مالک را هم محدود می‌کند و نوشتن پلن فقط با is_platform_admin() است؛ پس در همین تراکنش موقتاً برداشته می‌شود.
ALTER TABLE "billing_plans" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
UPDATE "billing_plans" SET "entitlements" = "entitlements" - 'norolink.full_theme' WHERE "entitlements" ? 'norolink.full_theme';--> statement-breakpoint
ALTER TABLE "billing_plans" FORCE ROW LEVEL SECURITY;
