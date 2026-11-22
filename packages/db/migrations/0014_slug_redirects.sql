CREATE TABLE "norolink_slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"old_slug" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "slug_changes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "norolink_slug_redirects" ADD CONSTRAINT "norolink_slug_redirects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_slug_redirects" ADD CONSTRAINT "norolink_slug_redirects_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_slug_redirects_old_slug_uniq" ON "norolink_slug_redirects" USING btree ("old_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_slug_redirects_id_tenant_uniq" ON "norolink_slug_redirects" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "norolink_slug_redirects_tenant_page_idx" ON "norolink_slug_redirects" USING btree ("tenant_id","page_id");--> statement-breakpoint
-- RLS مثل بقیه‌ی جدول‌های tenant-scoped (docs/architecture.md §6.3). ردیف‌ها تغییر نمی‌کنند: فقط درج و حذف.
ALTER TABLE "norolink_slug_redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_slug_redirects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "norolink_slug_redirects_select" ON "norolink_slug_redirects" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_slug_redirects_insert" ON "norolink_slug_redirects" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_slug_redirects_delete" ON "norolink_slug_redirects" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- مسیر عمومی: فقط همان یک نشانی قبلی که در تراکنش ست شده دیده می‌شود (فقط SELECT).
CREATE POLICY "norolink_slug_redirects_public_select" ON "norolink_slug_redirects" FOR SELECT USING (old_slug = NULLIF(current_setting('app.public_link_slug', true), ''));--> statement-breakpoint
-- بررسی رزرو از همه‌ی tenantها: فقط ردیف همان slug و فقط داخل trigger زیر.
CREATE POLICY "norolink_slug_redirects_reserved_select" ON "norolink_slug_redirects" FOR SELECT USING (old_slug = NULLIF(current_setting('app.slug_redirect_check', true), ''));--> statement-breakpoint
-- نشانی قبلی برای همان صفحه رزرو است؛ صفحه‌ی دیگر نمی‌تواند آن را بگیرد (همان خطای یکتایی slug: 23505).
CREATE FUNCTION "check_norolink_slug_redirect"() RETURNS trigger AS $$
DECLARE
  taken boolean;
BEGIN
  PERFORM set_config('app.slug_redirect_check', NEW.slug, true);
  SELECT EXISTS (SELECT 1 FROM "norolink_slug_redirects" r WHERE r.old_slug = NEW.slug AND r.page_id <> NEW.id) INTO taken;
  PERFORM set_config('app.slug_redirect_check', '', true);
  IF taken THEN
    RAISE EXCEPTION 'slug is reserved as a previous address' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_norolink_pages_slug_redirect" BEFORE INSERT OR UPDATE OF slug ON "norolink_pages" FOR EACH ROW EXECUTE FUNCTION "check_norolink_slug_redirect"();--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "norolink_slug_redirects" TO noroset_app;
