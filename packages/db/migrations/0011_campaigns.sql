CREATE TYPE "public"."announcement_audience" AS ENUM('all_members', 'managers');--> statement-breakpoint
CREATE TYPE "public"."announcement_target" AS ENUM('all', 'plans', 'tenants');--> statement-breakpoint
CREATE TYPE "public"."announcement_tone" AS ENUM('info', 'warning', 'success');--> statement-breakpoint
CREATE TYPE "public"."coupon_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "billing_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"description" varchar(300) DEFAULT '' NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"amount" bigint NOT NULL,
	"max_uses" integer,
	"max_uses_per_tenant" integer DEFAULT 1,
	"plan_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_coupons_code_unique" UNIQUE("code"),
	CONSTRAINT "billing_coupons_code_pattern" CHECK ("billing_coupons"."code" ~ '^[A-Z0-9_-]{3,32}$'),
	CONSTRAINT "billing_coupons_amount" CHECK ("billing_coupons"."amount" > 0 AND ("billing_coupons"."kind" = 'fixed' OR "billing_coupons"."amount" <= 100)),
	CONSTRAINT "billing_coupons_caps" CHECK (("billing_coupons"."max_uses" IS NULL OR "billing_coupons"."max_uses" > 0) AND ("billing_coupons"."max_uses_per_tenant" IS NULL OR "billing_coupons"."max_uses_per_tenant" > 0)),
	CONSTRAINT "billing_coupons_window" CHECK ("billing_coupons"."starts_at" IS NULL OR "billing_coupons"."ends_at" IS NULL OR "billing_coupons"."ends_at" > "billing_coupons"."starts_at"),
	CONSTRAINT "billing_coupons_plan_ids_array" CHECK (jsonb_typeof("billing_coupons"."plan_ids") = 'array'),
	CONSTRAINT "billing_coupons_used_count" CHECK ("billing_coupons"."used_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "panel_announcement_dismissals" (
	"user_id" uuid NOT NULL,
	"announcement_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "panel_announcement_dismissals_user_id_announcement_id_pk" PRIMARY KEY("user_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "panel_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" varchar(1000) DEFAULT '' NOT NULL,
	"link_url" varchar(500),
	"link_label" varchar(40),
	"tone" "announcement_tone" DEFAULT 'info' NOT NULL,
	"audience" "announcement_audience" DEFAULT 'all_members' NOT NULL,
	"target_type" "announcement_target" DEFAULT 'all' NOT NULL,
	"target_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "panel_announcements_title_not_empty" CHECK (char_length("panel_announcements"."title") > 0),
	CONSTRAINT "panel_announcements_window" CHECK ("panel_announcements"."ends_at" IS NULL OR "panel_announcements"."ends_at" > "panel_announcements"."starts_at"),
	CONSTRAINT "panel_announcements_target_ids_array" CHECK (jsonb_typeof("panel_announcements"."target_ids") = 'array'),
	CONSTRAINT "panel_announcements_link" CHECK ("panel_announcements"."link_url" IS NULL OR "panel_announcements"."link_url" ~ '^(https://|/[^/])')
);
--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "signup_utm" jsonb;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "billing_coupons" ADD CONSTRAINT "billing_coupons_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panel_announcement_dismissals" ADD CONSTRAINT "panel_announcement_dismissals_user_id_platform_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panel_announcement_dismissals" ADD CONSTRAINT "panel_announcement_dismissals_announcement_id_panel_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."panel_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panel_announcements" ADD CONSTRAINT "panel_announcements_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "panel_announcements_window_idx" ON "panel_announcements" USING btree ("active","starts_at");--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_coupon_id_billing_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."billing_coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷). همه RLS + FORCE.
-- کد تخفیف: ادمین همه؛ کاربر فقط همان کدی که وارد کرده (app.coupon_code)؛ افزایش شمار مصرف هنگام
-- فعال‌سازی پرداخت فقط همان یک ردیف (app.coupon_id). فهرست‌گیری کدها برای کاربر ممکن نیست.
ALTER TABLE "billing_coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_coupons" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_coupons_platform_admin_select" ON "billing_coupons" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_coupons_platform_admin_insert" ON "billing_coupons" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_coupons_platform_admin_update" ON "billing_coupons" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_coupons_lookup_select" ON "billing_coupons" FOR SELECT USING (code = NULLIF(current_setting('app.coupon_code', true), ''));--> statement-breakpoint
CREATE POLICY "billing_coupons_usage_select" ON "billing_coupons" FOR SELECT USING (id = NULLIF(current_setting('app.coupon_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_coupons_usage_update" ON "billing_coupons" FOR UPDATE USING (id = NULLIF(current_setting('app.coupon_id', true), '')::uuid) WITH CHECK (id = NULLIF(current_setting('app.coupon_id', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "billing_coupons" TO noroset_app;--> statement-breakpoint
-- اعلان‌ها: اعلان فعالِ در بازه برای همه خواندنی (هدف‌گیری در سرویس)؛ ادمین همه را می‌بیند و می‌نویسد.
ALTER TABLE "panel_announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "panel_announcements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "panel_announcements_live_select" ON "panel_announcements" FOR SELECT USING (active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));--> statement-breakpoint
CREATE POLICY "panel_announcements_platform_admin_select" ON "panel_announcements" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "panel_announcements_platform_admin_insert" ON "panel_announcements" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "panel_announcements_platform_admin_update" ON "panel_announcements" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "panel_announcements" TO noroset_app;--> statement-breakpoint
-- بستن اعلان: هر کاربر فقط برای خودش (withUser).
ALTER TABLE "panel_announcement_dismissals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "panel_announcement_dismissals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "panel_announcement_dismissals_own_select" ON "panel_announcement_dismissals" FOR SELECT USING (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "panel_announcement_dismissals_own_insert" ON "panel_announcement_dismissals" FOR INSERT WITH CHECK (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT ON "panel_announcement_dismissals" TO noroset_app;
