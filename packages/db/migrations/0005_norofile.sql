CREATE TYPE "public"."norofile_file_kind" AS ENUM('image', 'document', 'archive');--> statement-breakpoint
CREATE TYPE "public"."norofile_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "norofile_file_usages" (
	"tenant_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norofile_file_usages_pk" PRIMARY KEY("file_id","owner_type","owner_id"),
	CONSTRAINT "norofile_file_usages_owner_type_pattern" CHECK ("norofile_file_usages"."owner_type" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "norofile_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" "norofile_file_kind" NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"extension" varchar(10) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"storage_key" varchar(200) NOT NULL,
	"visibility" "norofile_visibility" DEFAULT 'private' NOT NULL,
	"source" varchar(32) DEFAULT 'norofile' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norofile_files_size_positive" CHECK ("norofile_files"."size_bytes" > 0),
	CONSTRAINT "norofile_files_name_not_empty" CHECK (char_length("norofile_files"."name") > 0),
	CONSTRAINT "norofile_files_extension_pattern" CHECK ("norofile_files"."extension" ~ '^[a-z0-9]{1,10}$'),
	CONSTRAINT "norofile_files_source_pattern" CHECK ("norofile_files"."source" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "norofile_files_dimensions" CHECK (("norofile_files"."width" IS NULL AND "norofile_files"."height" IS NULL) OR ("norofile_files"."width" > 0 AND "norofile_files"."height" > 0))
);
--> statement-breakpoint
-- ایندکس‌های یکتا پیش از FK مرکبی که به آن‌ها اشاره می‌کند.
CREATE UNIQUE INDEX "norofile_files_id_tenant_uniq" ON "norofile_files" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "norofile_files_storage_key_uniq" ON "norofile_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "norofile_files_tenant_created_idx" ON "norofile_files" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "norofile_file_usages_tenant_owner_idx" ON "norofile_file_usages" USING btree ("tenant_id","owner_type","owner_id");--> statement-breakpoint
ALTER TABLE "norofile_file_usages" ADD CONSTRAINT "norofile_file_usages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- فایل در حال استفاده حذف نمی‌شود (NO ACTION: حذف tenant هر دو را cascade می‌کند، بررسی در پایان دستور).
ALTER TABLE "norofile_file_usages" ADD CONSTRAINT "norofile_file_usages_file_fk" FOREIGN KEY ("file_id","tenant_id") REFERENCES "public"."norofile_files"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norofile_files" ADD CONSTRAINT "norofile_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norofile_files" ADD CONSTRAINT "norofile_files_uploaded_by_platform_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- RLS: ENABLE + FORCE روی هر دو جدول norofile (docs/architecture.md §6.3).
ALTER TABLE "norofile_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norofile_files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norofile_file_usages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norofile_file_usages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norofile_files_select" ON "norofile_files" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_files_insert" ON "norofile_files" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_files_update" ON "norofile_files" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_files_delete" ON "norofile_files" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- مسیر فایل عمومی: فقط همان یک فایل public که شناسه‌اش در تراکنش ست شده دیده می‌شود (فقط SELECT).
CREATE POLICY "norofile_files_public_select" ON "norofile_files" FOR SELECT USING (visibility = 'public' AND id = NULLIF(current_setting('app.public_file_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_file_usages_select" ON "norofile_file_usages" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_file_usages_insert" ON "norofile_file_usages" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_file_usages_delete" ON "norofile_file_usages" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "norofile_files" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "norofile_file_usages" TO noroset_app;
