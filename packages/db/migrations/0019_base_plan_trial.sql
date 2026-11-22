ALTER TABLE "billing_plans" DROP CONSTRAINT "billing_plans_free_active";--> statement-breakpoint
DROP INDEX "billing_plans_single_free";--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "trial_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_plans" DROP COLUMN "is_free";--> statement-breakpoint
-- پلن رایگان حذف می‌شود و پلن پایه‌ی نورولینک ۱۴ روز رایگان در اولین ورود است (docs/architecture.md §9.11).
-- پلن‌ها policy حذف ندارند و FORCE روی owner هم اعمال می‌شود، پس برای این seed موقتاً برداشته می‌شود.
ALTER TABLE "billing_plans" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DELETE FROM "billing_plans" WHERE "code" = 'free';--> statement-breakpoint
UPDATE "billing_plans" SET "name" = 'پایه نورولینک', "entitlements" = "entitlements" || '{"norolink.pages": 1}'::jsonb WHERE "code" = 'basic';--> statement-breakpoint
UPDATE "billing_plans" SET "name" = 'حرفه‌ای نورولینک' WHERE "code" = 'pro';--> statement-breakpoint
ALTER TABLE "billing_plans" FORCE ROW LEVEL SECURITY;
