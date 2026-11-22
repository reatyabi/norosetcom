-- لینک مشاهده‌ی بیرونی پاسخ (docs/routes.md): هر پاسخ می‌تواند یک لینک یکتا و قابل ابطال داشته باشد.
-- فقط hash توکن ذخیره می‌شود؛ مسیر عمومی با policy «app.response_link_token» همان یک ردیف را می‌بیند.
CREATE TABLE "noroform_response_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "noroform_response_links_token_length" CHECK (char_length("noroform_response_links"."token_hash") = 64)
);
--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD CONSTRAINT "noroform_response_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD CONSTRAINT "noroform_response_links_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_response_links" ADD CONSTRAINT "noroform_response_links_submission_fk" FOREIGN KEY ("submission_id","tenant_id") REFERENCES "public"."noroform_submissions"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_response_links_token_uniq" ON "noroform_response_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "noroform_response_links_tenant_submission_idx" ON "noroform_response_links" USING btree ("tenant_id","submission_id");--> statement-breakpoint
ALTER TABLE "noroform_response_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_response_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "noroform_response_links_select" ON "noroform_response_links" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_links_insert" ON "noroform_response_links" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_links_update" ON "noroform_response_links" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_links_delete" ON "noroform_response_links" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- مسیر عمومی: فقط ردیف همان توکنِ در حال بررسی (توکن خام هرگز در DB نیست).
CREATE POLICY "noroform_response_links_public_select" ON "noroform_response_links" FOR SELECT USING (token_hash = NULLIF(current_setting('app.response_link_token', true), ''));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "noroform_response_links" TO noroset_app;
