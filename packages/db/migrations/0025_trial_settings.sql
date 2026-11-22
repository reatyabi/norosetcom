-- دوره‌ی رایگان قابل تنظیم (docs/architecture.md §9.11): پلن و تعداد روز از مدیریت پلتفرم، نه ثابت در کد.
-- trial_plan_id = null ← پلن پایه (basic)؛ trial_days = 0 ← بدون دوره‌ی رایگان. با کد ریلیز قبلی هم سازگار است
-- (فقط ستون اضافه می‌شود).
ALTER TABLE "billing_settings" ADD COLUMN "trial_plan_id" uuid;
--> statement-breakpoint
ALTER TABLE "billing_settings" ADD COLUMN "trial_days" integer DEFAULT 14 NOT NULL;
--> statement-breakpoint
ALTER TABLE "billing_settings" ADD CONSTRAINT "billing_settings_trial_plan_id_billing_plans_id_fk" FOREIGN KEY ("trial_plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "billing_settings" ADD CONSTRAINT "billing_settings_trial_days_range" CHECK ("billing_settings"."trial_days" BETWEEN 0 AND 90);
