CREATE TYPE "public"."norolink_template_category" AS ENUM('personal', 'business', 'creator');--> statement-breakpoint
CREATE TABLE "norolink_removed_templates" (
	"template_key" varchar(64) PRIMARY KEY NOT NULL,
	"removed_by" uuid NOT NULL,
	"removed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "norolink_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(300) DEFAULT '' NOT NULL,
	"category" "norolink_template_category" DEFAULT 'personal' NOT NULL,
	"status" "norolink_page_status" DEFAULT 'draft' NOT NULL,
	"draft_content" jsonb NOT NULL,
	"draft_elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_snapshot" jsonb,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norolink_templates_draft_is_object" CHECK (jsonb_typeof("norolink_templates"."draft_content") = 'object'),
	CONSTRAINT "norolink_templates_elements_is_array" CHECK (jsonb_typeof("norolink_templates"."draft_elements") = 'array'),
	CONSTRAINT "norolink_templates_published_has_snapshot" CHECK ("norolink_templates"."status" = 'draft' OR "norolink_templates"."published_snapshot" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "norofile_platform_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"extension" varchar(10) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"storage_key" varchar(200) NOT NULL,
	"source" varchar(32) NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norofile_platform_files_size_positive" CHECK ("norofile_platform_files"."size_bytes" > 0),
	CONSTRAINT "norofile_platform_files_name_not_empty" CHECK (char_length("norofile_platform_files"."name") > 0),
	CONSTRAINT "norofile_platform_files_extension_pattern" CHECK ("norofile_platform_files"."extension" ~ '^[a-z0-9]{1,10}$'),
	CONSTRAINT "norofile_platform_files_source_pattern" CHECK ("norofile_platform_files"."source" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "norofile_platform_files_dimensions" CHECK ("norofile_platform_files"."width" > 0 AND "norofile_platform_files"."height" > 0)
);
--> statement-breakpoint
ALTER TABLE "norolink_removed_templates" ADD CONSTRAINT "norolink_removed_templates_removed_by_platform_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_templates" ADD CONSTRAINT "norolink_templates_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norofile_platform_files" ADD CONSTRAINT "norofile_platform_files_uploaded_by_platform_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "norolink_templates_status_created_idx" ON "norolink_templates" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "norofile_platform_files_storage_key_uniq" ON "norofile_platform_files" USING btree ("storage_key");--> statement-breakpoint
-- قالب‌های آماده (docs/architecture.md §9.8): سطح پلتفرم؛ قالب منتشرشده برای همه خواندنی (گالری)، بقیه فقط superadmin فعال.
ALTER TABLE "norolink_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norolink_templates_select" ON "norolink_templates" FOR SELECT USING (status = 'published' OR is_platform_admin());--> statement-breakpoint
CREATE POLICY "norolink_templates_platform_admin_insert" ON "norolink_templates" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "norolink_templates_platform_admin_update" ON "norolink_templates" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "norolink_templates_platform_admin_delete" ON "norolink_templates" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "norolink_templates" TO noroset_app;--> statement-breakpoint
-- قالب‌های کدی برداشته‌شده: گالری برای همه می‌خواند، نوشتن فقط superadmin با هویت خودش.
ALTER TABLE "norolink_removed_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_removed_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norolink_removed_templates_select" ON "norolink_removed_templates" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "norolink_removed_templates_platform_admin_insert" ON "norolink_removed_templates" FOR INSERT WITH CHECK (is_platform_admin() AND removed_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_removed_templates_platform_admin_delete" ON "norolink_removed_templates" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "norolink_removed_templates" TO noroset_app;--> statement-breakpoint
-- فایل‌های پلتفرم (§9.9): همه public؛ ساخت فقط superadmin با هویت خودش؛ immutable و بدون حذف (صفحه‌های ساخته‌شده از قالب به آن‌ها اشاره می‌کنند).
ALTER TABLE "norofile_platform_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norofile_platform_files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norofile_platform_files_select" ON "norofile_platform_files" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "norofile_platform_files_platform_admin_insert" ON "norofile_platform_files" FOR INSERT WITH CHECK (is_platform_admin() AND uploaded_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT ON "norofile_platform_files" TO noroset_app;