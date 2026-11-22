CREATE TYPE "public"."norolink_device_type" AS ENUM('mobile', 'tablet', 'desktop', 'other');--> statement-breakpoint
CREATE TYPE "public"."norolink_element_kind" AS ENUM('link_button', 'social_icons', 'rich_text', 'image', 'video_embed', 'map_embed');--> statement-breakpoint
CREATE TYPE "public"."norolink_event_kind" AS ENUM('page_view', 'element_click');--> statement-breakpoint
CREATE TYPE "public"."norolink_page_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "norolink_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"kind" "norolink_element_kind" NOT NULL,
	"sort_key" varchar(64) NOT NULL,
	"settings" jsonb NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norolink_elements_sort_key_pattern" CHECK ("norolink_elements"."sort_key" ~ '^[0-9A-Za-z]+$'),
	CONSTRAINT "norolink_elements_settings_is_object" CHECK (jsonb_typeof("norolink_elements"."settings") = 'object')
);
--> statement-breakpoint
CREATE TABLE "norolink_page_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"element_id" uuid,
	"kind" "norolink_event_kind" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visitor_hash" varchar(64),
	"device_type" "norolink_device_type",
	"os" varchar(32),
	"browser" varchar(32),
	"referrer_domain" varchar(253),
	CONSTRAINT "norolink_page_stats_element_matches_kind" CHECK (("norolink_page_stats"."kind" = 'page_view' AND "norolink_page_stats"."element_id" IS NULL) OR ("norolink_page_stats"."kind" = 'element_click' AND "norolink_page_stats"."element_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "norolink_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" "norolink_page_status" DEFAULT 'draft' NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_snapshot" jsonb,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norolink_pages_slug_pattern" CHECK ("norolink_pages"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "norolink_pages_slug_length" CHECK (char_length("norolink_pages"."slug") BETWEEN 2 AND 63),
	CONSTRAINT "norolink_pages_draft_is_object" CHECK (jsonb_typeof("norolink_pages"."draft_content") = 'object'),
	CONSTRAINT "norolink_pages_snapshot_is_object" CHECK ("norolink_pages"."published_snapshot" IS NULL OR jsonb_typeof("norolink_pages"."published_snapshot") = 'object'),
	CONSTRAINT "norolink_pages_published_has_snapshot" CHECK ("norolink_pages"."status" = 'draft' OR "norolink_pages"."published_snapshot" IS NOT NULL)
);
--> statement-breakpoint
-- ایندکس‌های یکتا پیش از FK مرکبی که به آن‌ها اشاره می‌کند.
CREATE UNIQUE INDEX "norolink_elements_page_sort_uniq" ON "norolink_elements" USING btree ("page_id","sort_key");--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_elements_id_tenant_uniq" ON "norolink_elements" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "norolink_elements_tenant_page_idx" ON "norolink_elements" USING btree ("tenant_id","page_id");--> statement-breakpoint
CREATE INDEX "norolink_page_stats_tenant_page_occurred_idx" ON "norolink_page_stats" USING btree ("tenant_id","page_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_pages_slug_uniq" ON "norolink_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_pages_id_tenant_uniq" ON "norolink_pages" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "norolink_pages_tenant_created_idx" ON "norolink_pages" USING btree ("tenant_id","created_at");--> statement-breakpoint
ALTER TABLE "norolink_elements" ADD CONSTRAINT "norolink_elements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_elements" ADD CONSTRAINT "norolink_elements_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_page_stats" ADD CONSTRAINT "norolink_page_stats_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_page_stats" ADD CONSTRAINT "norolink_page_stats_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD CONSTRAINT "norolink_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS: ENABLE + FORCE روی هر سه جدول norolink (docs/architecture.md §6.3).
ALTER TABLE "norolink_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_elements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_elements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_page_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_page_stats" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norolink_pages_select" ON "norolink_pages" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_pages_insert" ON "norolink_pages" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_pages_update" ON "norolink_pages" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_pages_delete" ON "norolink_pages" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- مسیر صفحه‌ی عمومی: فقط همان یک صفحه‌ی published که slugش در تراکنش ست شده دیده می‌شود (فقط SELECT).
CREATE POLICY "norolink_pages_public_select" ON "norolink_pages" FOR SELECT USING (status = 'published' AND slug = NULLIF(current_setting('app.public_link_slug', true), ''));--> statement-breakpoint
CREATE POLICY "norolink_elements_select" ON "norolink_elements" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_elements_insert" ON "norolink_elements" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_elements_update" ON "norolink_elements" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_elements_delete" ON "norolink_elements" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- آمار append-only برای noroset_app (پاک‌سازی/retention با migrator).
CREATE POLICY "norolink_page_stats_select" ON "norolink_page_stats" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_page_stats_insert" ON "norolink_page_stats" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- slug صفحه (زیردامنه) نباید رزرو باشد؛ زیردامنه‌های زیرساختی به لیست رزرو اضافه می‌شوند.
CREATE TRIGGER "trg_norolink_pages_reserved_slug" BEFORE INSERT OR UPDATE OF slug ON "norolink_pages" FOR EACH ROW EXECUTE FUNCTION "check_reserved_slug"();--> statement-breakpoint
INSERT INTO "reserved_slugs" ("slug") VALUES ('www'), ('mail'), ('cdn'), ('assets'), ('status'), ('docs'), ('help'), ('support'), ('blog') ON CONFLICT DO NOTHING;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "norolink_pages" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "norolink_elements" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "norolink_page_stats" TO noroset_app;