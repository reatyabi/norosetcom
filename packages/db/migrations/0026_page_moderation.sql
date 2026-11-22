-- کنترل صفحه‌ها از سوی مدیریت پلتفرم و گزارش تخلف (docs/architecture.md §9.13).
-- ۱) وضعیت مدیریتی روی خود صفحه، جدا از وضعیت انتشار مالک؛ فقط superadmin از مسیر `app.page_moderation` عوضش می‌کند.
-- ۲) ادمین فقط صفحه‌هایی را می‌بیند که دست‌کم یک بار منتشر شده‌اند (snapshot دارند)؛ سرویس فقط snapshot را می‌خواند،
--    پیش‌نویس و المان‌ها همچنان فقط با ورود پشتیبانی.
-- ۳) گزارش‌های بازدیدکننده‌ها در جدول سطح پلتفرم؛ ثبت فقط برای صفحه‌ی منتشرشده‌ی همان نشانی، خواندن فقط ادمین.
-- با کد ریلیز قبلی سازگار است (ستون‌ها پیش‌فرض دارند).
CREATE TYPE "public"."norolink_moderation_status" AS ENUM('none', 'delisted', 'warning', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."norolink_moderation_reason" AS ENUM('legal_order', 'phishing', 'malware', 'scam', 'impersonation', 'intellectual_property', 'illegal_content', 'hate_violence', 'adult', 'privacy', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."norolink_report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "moderation_status" "norolink_moderation_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "moderation_reason" "norolink_moderation_reason";--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "moderation_notice" varchar(500);--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "moderation_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD CONSTRAINT "norolink_pages_moderation_reason" CHECK (("moderation_status" = 'none') = ("moderation_reason" IS NULL));--> statement-breakpoint
CREATE INDEX "norolink_pages_moderation_idx" ON "norolink_pages" USING btree ("moderation_status") WHERE "moderation_status" <> 'none';--> statement-breakpoint
CREATE TABLE "norolink_page_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"reason" "norolink_moderation_reason" NOT NULL,
	"details" varchar(2000) DEFAULT '' NOT NULL,
	"contact" varchar(200),
	"ip_hash" varchar(64),
	"status" "norolink_report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "norolink_page_reports_resolved" CHECK (("status" = 'open') = ("resolved_at" IS NULL)),
	CONSTRAINT "norolink_page_reports_not_legal" CHECK ("reason" <> 'legal_order')
);
--> statement-breakpoint
ALTER TABLE "norolink_page_reports" ADD CONSTRAINT "norolink_page_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_page_reports" ADD CONSTRAINT "norolink_page_reports_resolved_by_platform_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "norolink_page_reports_status_created_idx" ON "norolink_page_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "norolink_page_reports_tenant_page_idx" ON "norolink_page_reports" USING btree ("tenant_id","page_id");--> statement-breakpoint
-- ادمین: خواندن و تغییر وضعیت مدیریتی صفحه‌هایی که منتشر شده‌اند. trigger پایین ستون‌های دیگر را برای این مسیر قفل می‌کند.
CREATE POLICY "norolink_pages_platform_admin_select" ON "norolink_pages" FOR SELECT USING (is_platform_admin() AND published_snapshot IS NOT NULL);--> statement-breakpoint
CREATE POLICY "norolink_pages_platform_admin_update" ON "norolink_pages" FOR UPDATE USING (is_platform_admin() AND published_snapshot IS NOT NULL) WITH CHECK (is_platform_admin() AND published_snapshot IS NOT NULL);--> statement-breakpoint
-- دایرکتوری و sitemap: صفحه‌ی دارای محدودیت مؤثر (مهلت‌نگذشته) فهرست نمی‌شود.
DROP POLICY IF EXISTS "norolink_pages_directory_select" ON "norolink_pages";--> statement-breakpoint
CREATE POLICY "norolink_pages_directory_select" ON "norolink_pages" FOR SELECT USING (
  status = 'published'
  AND current_setting('app.public_directory', true) = 'on'
  AND (published_snapshot #>> '{content,seo,indexable}') = 'true'
  AND (moderation_status = 'none' OR (moderation_until IS NOT NULL AND moderation_until <= now()))
);--> statement-breakpoint
-- نگهبان: (الف) ستون‌های moderation_* فقط از مسیر ادمین و همان مسیر فقط همین ستون‌ها را عوض می‌کند؛ (ب) در هشدار یا
-- تعلیق مؤثر، مالک منتشر نمی‌کند، نشانی را عوض نمی‌کند و حذف نمی‌کند. cascade حذف tenant (عمق trigger > ۱) آزاد است.
CREATE FUNCTION "guard_norolink_page_moderation"() RETURNS trigger AS $$
DECLARE
  locked boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() = 1
      AND OLD.moderation_status IN ('warning', 'suspended')
      AND (OLD.moderation_until IS NULL OR OLD.moderation_until > now()) THEN
      RAISE EXCEPTION 'page_moderated' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF current_setting('app.page_moderation', true) = 'on' THEN
    IF NOT is_platform_admin() THEN
      RAISE EXCEPTION 'moderation_admin_only' USING ERRCODE = '42501';
    END IF;
    IF (NEW.id, NEW.tenant_id, NEW.slug, NEW.slug_changes, NEW.title, NEW.status, NEW.draft_content, NEW.published_snapshot,
        NEW.created_by, NEW.published_at, NEW.created_at, NEW.updated_at)
      IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.slug, OLD.slug_changes, OLD.title, OLD.status, OLD.draft_content,
        OLD.published_snapshot, OLD.created_by, OLD.published_at, OLD.created_at, OLD.updated_at) THEN
      RAISE EXCEPTION 'moderation_columns_only' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.moderation_status, NEW.moderation_reason, NEW.moderation_notice, NEW.moderation_until, NEW.moderated_at)
    IS DISTINCT FROM (OLD.moderation_status, OLD.moderation_reason, OLD.moderation_notice, OLD.moderation_until, OLD.moderated_at) THEN
    RAISE EXCEPTION 'moderation_admin_only' USING ERRCODE = '42501';
  END IF;

  locked := OLD.moderation_status IN ('warning', 'suspended') AND (OLD.moderation_until IS NULL OR OLD.moderation_until > now());
  IF locked AND (
    NEW.slug IS DISTINCT FROM OLD.slug
    OR (NEW.status = 'published' AND (OLD.status = 'draft' OR NEW.published_snapshot IS DISTINCT FROM OLD.published_snapshot))
  ) THEN
    RAISE EXCEPTION 'page_moderated' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_norolink_pages_moderation" BEFORE UPDATE OR DELETE ON "norolink_pages" FOR EACH ROW EXECUTE FUNCTION "guard_norolink_page_moderation"();--> statement-breakpoint
-- گزارش‌ها: سطح پلتفرم با tenant_id برای پیگیری؛ RLS + FORCE.
ALTER TABLE "norolink_page_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "norolink_page_reports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- ثبت عمومی: فقط وضعیت باز و فقط برای صفحه‌ی منتشرشده‌ی همان نشانی (policy عمومی `app.public_link_slug` آن را نشان می‌دهد).
CREATE POLICY "norolink_page_reports_public_insert" ON "norolink_page_reports" FOR INSERT WITH CHECK (
  status = 'open'
  AND resolved_by IS NULL
  AND slug = NULLIF(current_setting('app.public_link_slug', true), '')
  AND EXISTS (
    SELECT 1 FROM "norolink_pages" p
    WHERE p.id = page_id AND p.tenant_id = norolink_page_reports.tenant_id AND p.slug = norolink_page_reports.slug
  )
);--> statement-breakpoint
-- جلوگیری از گزارش تکراری همان IP: مسیر عمومی فقط گزارش‌های باز همان صفحه و همان هش را می‌بیند.
CREATE POLICY "norolink_page_reports_public_select" ON "norolink_page_reports" FOR SELECT USING (
  status = 'open'
  AND slug = NULLIF(current_setting('app.public_link_slug', true), '')
  AND ip_hash = NULLIF(current_setting('app.report_ip_hash', true), '')
);--> statement-breakpoint
CREATE POLICY "norolink_page_reports_platform_admin_select" ON "norolink_page_reports" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "norolink_page_reports_platform_admin_update" ON "norolink_page_reports" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin() AND (resolved_by IS NULL OR resolved_by = NULLIF(current_setting('app.current_admin', true), '')::uuid));--> statement-breakpoint
GRANT SELECT, INSERT ON "norolink_page_reports" TO noroset_app;--> statement-breakpoint
GRANT UPDATE ("status", "resolved_by", "resolved_at", "resolution_note") ON "norolink_page_reports" TO noroset_app;
