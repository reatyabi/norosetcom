CREATE TABLE "norolink_claim_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"token" varchar(64) NOT NULL,
	"slug" varchar(63),
	"business_name" varchar(200) NOT NULL,
	"note" varchar(500) DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by" uuid,
	"claimed_tenant_id" uuid,
	"claimed_page_id" uuid
);
--> statement-breakpoint
ALTER TABLE "norolink_claim_links" ADD CONSTRAINT "norolink_claim_links_template_id_norolink_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."norolink_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" ADD CONSTRAINT "norolink_claim_links_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" ADD CONSTRAINT "norolink_claim_links_claimed_by_platform_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" ADD CONSTRAINT "norolink_claim_links_claimed_tenant_id_tenants_id_fk" FOREIGN KEY ("claimed_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_claim_links_token_uniq" ON "norolink_claim_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_claim_links_active_slug_uniq" ON "norolink_claim_links" USING btree ("slug") WHERE "norolink_claim_links"."claimed_at" IS NULL AND "norolink_claim_links"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "norolink_claim_links_template_idx" ON "norolink_claim_links" USING btree ("template_id","created_at");--> statement-breakpoint
CREATE INDEX "norolink_claim_links_created_idx" ON "norolink_claim_links" USING btree ("created_at");--> statement-breakpoint
-- لینک‌های واگذاری از ستون‌های norolink_templates به جدول خودشان منتقل شدند تا سابقه‌ی هر لینک (نشانی رزروشده، نام کسب‌وکار،
-- یادداشت، بازدید، تحویل) بماند (docs/architecture.md §9.8). ستون‌های قدیمی برای برگشت به ریلیز قبلی می‌مانند (tech-debt).
ALTER TABLE "norolink_claim_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norolink_claim_links_platform_admin_select" ON "norolink_claim_links" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "norolink_claim_links_platform_admin_insert" ON "norolink_claim_links" FOR INSERT WITH CHECK (is_platform_admin() AND created_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_claim_links_platform_admin_update" ON "norolink_claim_links" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
-- دارنده‌ی توکن فقط همان لینک را می‌بیند (ردیف تحویل‌شده هم باید پس از UPDATE دیدنی بماند؛ کد فقط لینک فعال را می‌پذیرد) و فقط
-- تا پیش از تحویل یا ابطال آن را به‌روز می‌کند (شمار بازدید، تحویل).
CREATE POLICY "norolink_claim_links_claim_select" ON "norolink_claim_links" FOR SELECT USING (token = NULLIF(current_setting('app.claim_token', true), ''));--> statement-breakpoint
CREATE POLICY "norolink_claim_links_claim_update" ON "norolink_claim_links" FOR UPDATE USING (token = NULLIF(current_setting('app.claim_token', true), '') AND claimed_at IS NULL AND revoked_at IS NULL) WITH CHECK (token = NULLIF(current_setting('app.claim_token', true), ''));--> statement-breakpoint
-- بررسی رزرو نشانی از هر tenant: فقط لینک فعال با همان نشانی (داخل trigger زیر و checkNorolinkSlug).
CREATE POLICY "norolink_claim_links_slug_check_select" ON "norolink_claim_links" FOR SELECT USING (slug = NULLIF(current_setting('app.claim_slug_check', true), '') AND claimed_at IS NULL AND revoked_at IS NULL);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "norolink_claim_links" TO noroset_app;--> statement-breakpoint
-- قالب برای دارنده‌ی توکن از راه لینک فعالش خواندنی است؛ تحویل دیگر خود قالب را تغییر نمی‌دهد.
DROP POLICY "norolink_templates_claim_select" ON "norolink_templates";--> statement-breakpoint
DROP POLICY "norolink_templates_claim_update" ON "norolink_templates";--> statement-breakpoint
CREATE POLICY "norolink_templates_claim_link_select" ON "norolink_templates" FOR SELECT USING (EXISTS (SELECT 1 FROM "norolink_claim_links" l WHERE l.template_id = "norolink_templates".id AND l.token = NULLIF(current_setting('app.claim_token', true), '') AND l.claimed_at IS NULL AND l.revoked_at IS NULL));--> statement-breakpoint
-- انتقال لینک‌های موجود (migrator مالک است ولی FORCE RLS پیش‌نویس‌ها را از او پنهان می‌کند).
ALTER TABLE "norolink_templates" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "norolink_claim_links" ("template_id", "token", "business_name", "created_by", "created_at", "claimed_at")
  SELECT "id", "claim_token", "title", "created_by", "updated_at", "claimed_at" FROM "norolink_templates" WHERE "claim_token" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "norolink_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_claim_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- نشانی رزروشده‌ی لینک فعال را صفحه‌ی دیگری نمی‌گیرد (همان خطای یکتایی slug: 23505)؛ تحویل همان لینک (app.claim_token) مستثناست.
CREATE FUNCTION "check_norolink_slug_claim"() RETURNS trigger AS $$
DECLARE
  taken boolean;
BEGIN
  PERFORM set_config('app.claim_slug_check', NEW.slug, true);
  SELECT EXISTS (
    SELECT 1 FROM "norolink_claim_links" l
    WHERE l.slug = NEW.slug AND l.claimed_at IS NULL AND l.revoked_at IS NULL
      AND l.token IS DISTINCT FROM NULLIF(current_setting('app.claim_token', true), '')
  ) INTO taken;
  PERFORM set_config('app.claim_slug_check', '', true);
  IF taken THEN
    RAISE EXCEPTION 'slug is reserved for a claim link' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_norolink_pages_slug_claim" BEFORE INSERT OR UPDATE OF slug ON "norolink_pages" FOR EACH ROW EXECUTE FUNCTION "check_norolink_slug_claim"();
