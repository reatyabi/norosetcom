CREATE TYPE "public"."module_status" AS ENUM('active', 'maintenance', 'off');--> statement-breakpoint
CREATE TABLE "platform_modules" (
	"key" varchar(32) PRIMARY KEY NOT NULL,
	"status" "module_status" DEFAULT 'active' NOT NULL,
	"message" varchar(500),
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_modules_key_pattern" CHECK ("platform_modules"."key" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
ALTER TABLE "platform_modules" ADD CONSTRAINT "platform_modules_updated_by_platform_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- وضعیت ماژول‌ها (docs/architecture.md §9.11): خواندن برای همه (گارد هر درخواست، حتی مسیر عمومی ناشناس)،
-- نوشتن فقط superadmin فعال و فقط با هویت خودش در updated_by. حذف نداریم (بازگشت = active).
ALTER TABLE "platform_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_modules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "platform_modules_select" ON "platform_modules" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "platform_modules_platform_admin_insert" ON "platform_modules" FOR INSERT WITH CHECK (is_platform_admin() AND updated_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "platform_modules_platform_admin_update" ON "platform_modules" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin() AND updated_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "platform_modules" TO noroset_app;
