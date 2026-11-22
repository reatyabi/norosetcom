-- نوع فرم، دسترسی پاسخ و احراز لینک پاسخ (docs/architecture.md §۸).
-- فرم‌های منتشرشده/بسته‌شده‌ی فعلی عمومی می‌مانند؛ پیش‌نویس‌ها داخلی می‌شوند.
CREATE TYPE "public"."noroform_form_channel" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."noroform_response_access" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."noroform_response_auth" AS ENUM('link', 'key', 'otp');--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD COLUMN "channel" "noroform_form_channel" DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD COLUMN "response_access" "noroform_response_access" DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD COLUMN "response_auth" "noroform_response_auth";--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD COLUMN "response_access_ttl_days" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ADD COLUMN "submitted_by" uuid;--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD COLUMN "auth_mode" "noroform_response_auth" DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD COLUMN "key_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD COLUMN "access_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ADD CONSTRAINT "noroform_submissions_submitted_by_platform_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD CONSTRAINT "noroform_response_links_access_count" CHECK ("access_count" >= 0);--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD CONSTRAINT "noroform_response_links_key_mode" CHECK ("auth_mode" <> 'key' OR "key_hash" IS NOT NULL);--> statement-breakpoint
-- backfill: پیش‌نویس‌ها داخلی، منتشرشده/بسته‌شده‌ها خارجی؛ پاسخ‌ها خارجی.
UPDATE "noroform_forms" SET "channel" = 'internal' WHERE "status" = 'draft';--> statement-breakpoint
UPDATE "noroform_forms" SET "response_access" = 'external';--> statement-breakpoint
-- مسیر عمومی فقط فرم‌های خارجی را می‌بیند.
DROP POLICY IF EXISTS "noroform_forms_public_select" ON "noroform_forms";--> statement-breakpoint
CREATE POLICY "noroform_forms_public_select" ON "noroform_forms" FOR SELECT USING (channel = 'external' AND status IN ('published', 'closed') AND slug = NULLIF(current_setting('app.public_form_slug', true), ''));--> statement-breakpoint
-- مسیر داخلی فقط همان فرم داخلیِ در حال بررسی با شناسه‌ی فرم.
CREATE POLICY "noroform_forms_internal_select" ON "noroform_forms" FOR SELECT USING (channel = 'internal' AND status IN ('published', 'closed') AND id = NULLIF(current_setting('app.internal_form_id', true), '')::uuid);
