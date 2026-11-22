CREATE TYPE "public"."noroform_form_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TABLE "noroform_form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "noroform_form_versions_number_positive" CHECK ("noroform_form_versions"."version_number" > 0),
	CONSTRAINT "noroform_form_versions_definition_is_object" CHECK (jsonb_typeof("noroform_form_versions"."definition") = 'object')
);--> statement-breakpoint
CREATE TABLE "noroform_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"status" "noroform_form_status" DEFAULT 'draft' NOT NULL,
	"draft_definition" jsonb NOT NULL,
	"current_version_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "noroform_forms_slug_pattern" CHECK ("noroform_forms"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "noroform_forms_slug_length" CHECK (char_length("noroform_forms"."slug") BETWEEN 2 AND 64),
	CONSTRAINT "noroform_forms_draft_is_object" CHECK (jsonb_typeof("noroform_forms"."draft_definition") = 'object'),
	CONSTRAINT "noroform_forms_published_has_version" CHECK ("noroform_forms"."status" = 'draft' OR "noroform_forms"."current_version_id" IS NOT NULL)
);--> statement-breakpoint
CREATE TABLE "noroform_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "noroform_submissions_answers_is_object" CHECK (jsonb_typeof("noroform_submissions"."answers") = 'object'),
	CONSTRAINT "noroform_submissions_idempotency_length" CHECK (char_length("noroform_submissions"."idempotency_key") BETWEEN 8 AND 64)
);--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_form_versions_form_number_uniq" ON "noroform_form_versions" USING btree ("form_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_form_versions_id_tenant_uniq" ON "noroform_form_versions" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_form_versions_id_form_tenant_uniq" ON "noroform_form_versions" USING btree ("id","form_id","tenant_id");--> statement-breakpoint
CREATE INDEX "noroform_form_versions_tenant_idx" ON "noroform_form_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_forms_slug_uniq" ON "noroform_forms" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_forms_id_tenant_uniq" ON "noroform_forms" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "noroform_forms_tenant_created_idx" ON "noroform_forms" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_submissions_form_idempotency_uniq" ON "noroform_submissions" USING btree ("form_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "noroform_submissions_id_tenant_uniq" ON "noroform_submissions" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "noroform_submissions_tenant_form_created_idx" ON "noroform_submissions" USING btree ("tenant_id","form_id","created_at");--> statement-breakpoint
ALTER TABLE "noroform_form_versions" ADD CONSTRAINT "noroform_form_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_form_versions" ADD CONSTRAINT "noroform_form_versions_form_fk" FOREIGN KEY ("form_id","tenant_id") REFERENCES "public"."noroform_forms"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD CONSTRAINT "noroform_forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD CONSTRAINT "noroform_forms_current_version_fk" FOREIGN KEY ("current_version_id","id","tenant_id") REFERENCES "public"."noroform_form_versions"("id","form_id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ADD CONSTRAINT "noroform_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ADD CONSTRAINT "noroform_submissions_form_fk" FOREIGN KEY ("form_id","tenant_id") REFERENCES "public"."noroform_forms"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ADD CONSTRAINT "noroform_submissions_version_fk" FOREIGN KEY ("version_id","form_id","tenant_id") REFERENCES "public"."noroform_form_versions"("id","form_id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS: ENABLE + FORCE روی هر سه جدول (docs/architecture.md §6.3).
ALTER TABLE "noroform_forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_forms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_form_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_form_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_submissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "noroform_forms_select" ON "noroform_forms" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_forms_insert" ON "noroform_forms" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_forms_update" ON "noroform_forms" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_forms_delete" ON "noroform_forms" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- مسیر فرم عمومی: فقط همان یک فرم published/closed که slugش در تراکنش ست شده دیده می‌شود
-- (فقط SELECT؛ tenant از همین ردیف پیدا و سپس app.current_tenant ست می‌شود).
CREATE POLICY "noroform_forms_public_select" ON "noroform_forms" FOR SELECT USING (status IN ('published', 'closed') AND slug = NULLIF(current_setting('app.public_form_slug', true), ''));--> statement-breakpoint
CREATE POLICY "noroform_form_versions_select" ON "noroform_form_versions" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_form_versions_insert" ON "noroform_form_versions" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_submissions_select" ON "noroform_submissions" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_submissions_insert" ON "noroform_submissions" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- نسخه‌ها immutable: هر UPDATE رد می‌شود (حتی برای owner).
CREATE FUNCTION "noroform_form_versions_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'noroform_form_versions is immutable';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_noroform_form_versions_immutable" BEFORE UPDATE ON "noroform_form_versions" FOR EACH ROW EXECUTE FUNCTION "noroform_form_versions_immutable"();--> statement-breakpoint
-- slug فرم نباید با مسیرهای رزروشده‌ی پلتفرم تداخل کند.
CREATE TRIGGER "trg_noroform_forms_reserved_slug" BEFORE INSERT OR UPDATE OF slug ON "noroform_forms" FOR EACH ROW EXECUTE FUNCTION "check_reserved_slug"();--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "noroform_forms" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "noroform_form_versions" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "noroform_submissions" TO noroset_app;
