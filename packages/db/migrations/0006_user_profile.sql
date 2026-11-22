CREATE TABLE "norofile_user_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" "norofile_file_kind" NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"extension" varchar(10) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"storage_key" varchar(200) NOT NULL,
	"visibility" "norofile_visibility" DEFAULT 'public' NOT NULL,
	"source" varchar(32) DEFAULT 'account' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norofile_user_files_size_positive" CHECK ("norofile_user_files"."size_bytes" > 0),
	CONSTRAINT "norofile_user_files_name_not_empty" CHECK (char_length("norofile_user_files"."name") > 0),
	CONSTRAINT "norofile_user_files_extension_pattern" CHECK ("norofile_user_files"."extension" ~ '^[a-z0-9]{1,10}$'),
	CONSTRAINT "norofile_user_files_source_pattern" CHECK ("norofile_user_files"."source" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "norofile_user_files_dimensions" CHECK (("norofile_user_files"."width" IS NULL AND "norofile_user_files"."height" IS NULL) OR ("norofile_user_files"."width" > 0 AND "norofile_user_files"."height" > 0))
);
--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "avatar_file_id" uuid;--> statement-breakpoint
ALTER TABLE "norofile_user_files" ADD CONSTRAINT "norofile_user_files_user_id_platform_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "norofile_user_files_storage_key_uniq" ON "norofile_user_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "norofile_user_files_user_created_idx" ON "norofile_user_files" USING btree ("user_id","created_at");--> statement-breakpoint
-- فضای شخصی (docs/architecture.md §9.9): بدون tenant؛ RLS + FORCE روی کاربر جاری (withUser).
ALTER TABLE "norofile_user_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norofile_user_files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norofile_user_files_select" ON "norofile_user_files" FOR SELECT USING (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_user_files_insert" ON "norofile_user_files" FOR INSERT WITH CHECK (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norofile_user_files_delete" ON "norofile_user_files" FOR DELETE USING (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
-- مسیر فایل عمومی: فقط همان یک فایل public که شناسه‌اش در تراکنش ست شده (فقط SELECT).
CREATE POLICY "norofile_user_files_public_select" ON "norofile_user_files" FOR SELECT USING (visibility = 'public' AND id = NULLIF(current_setting('app.public_file_id', true), '')::uuid);--> statement-breakpoint
-- immutable: بدون UPDATE.
GRANT SELECT, INSERT, DELETE ON "norofile_user_files" TO noroset_app;
