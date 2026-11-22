CREATE TYPE "public"."billing_payment_kind" AS ENUM('purchase', 'upgrade', 'queued');--> statement-breakpoint
CREATE TYPE "public"."billing_payment_status" AS ENUM('pending', 'paid', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."billing_subscription_source" AS ENUM('payment', 'manual', 'trial');--> statement-breakpoint
CREATE TABLE "billing_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"number" bigserial NOT NULL,
	"plan_id" uuid NOT NULL,
	"months" integer NOT NULL,
	"kind" "billing_payment_kind" NOT NULL,
	"subtotal_rial" bigint NOT NULL,
	"credit_rial" bigint DEFAULT 0 NOT NULL,
	"discount_rial" bigint DEFAULT 0 NOT NULL,
	"vat_percent" integer NOT NULL,
	"vat_rial" bigint NOT NULL,
	"total_rial" bigint NOT NULL,
	"status" "billing_payment_status" DEFAULT 'pending' NOT NULL,
	"gateway" varchar(16) NOT NULL,
	"authority" varchar(64),
	"ref_id" varchar(64),
	"card_pan" varchar(32),
	"note" varchar(500),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "billing_payments_number_unique" UNIQUE("number"),
	CONSTRAINT "billing_payments_authority_unique" UNIQUE("authority"),
	CONSTRAINT "billing_payments_months_positive" CHECK ("billing_payments"."months" > 0),
	CONSTRAINT "billing_payments_amounts" CHECK ("billing_payments"."subtotal_rial" >= 0 AND "billing_payments"."credit_rial" >= 0 AND "billing_payments"."discount_rial" >= 0 AND "billing_payments"."vat_rial" >= 0 AND "billing_payments"."total_rial" >= 0),
	CONSTRAINT "billing_payments_total" CHECK ("billing_payments"."total_rial" = "billing_payments"."subtotal_rial" - "billing_payments"."credit_rial" - "billing_payments"."discount_rial" + "billing_payments"."vat_rial"),
	CONSTRAINT "billing_payments_gateway" CHECK ("billing_payments"."gateway" IN ('zarinpal', 'fake', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"rank" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"entitlements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_code_unique" UNIQUE("code"),
	CONSTRAINT "billing_plans_code_pattern" CHECK ("billing_plans"."code" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "billing_plans_free_active" CHECK (NOT "billing_plans"."is_free" OR "billing_plans"."active"),
	CONSTRAINT "billing_plans_entitlements_object" CHECK (jsonb_typeof("billing_plans"."entitlements") = 'object'),
	CONSTRAINT "billing_plans_prices_array" CHECK (jsonb_typeof("billing_plans"."prices") = 'array')
);
--> statement-breakpoint
CREATE TABLE "billing_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"vat_percent" integer DEFAULT 10 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_settings_singleton" CHECK ("billing_settings"."id" = 1),
	CONSTRAINT "billing_settings_vat_range" CHECK ("billing_settings"."vat_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"source" "billing_subscription_source" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"payment_id" uuid,
	"note" varchar(500),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "billing_subscriptions_period" CHECK ("billing_subscriptions"."ends_at" > "billing_subscriptions"."starts_at"),
	CONSTRAINT "billing_subscriptions_payment_source" CHECK (("billing_subscriptions"."source" = 'payment') = ("billing_subscriptions"."payment_id" IS NOT NULL))
);
--> statement-breakpoint
-- FK مرکب اشتراک ← پرداخت به این ایندکس یکتا نیاز دارد، پس پیش از FKها.
CREATE UNIQUE INDEX "billing_payments_id_tenant_uniq" ON "billing_payments" USING btree ("id","tenant_id");--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_settings" ADD CONSTRAINT "billing_settings_updated_by_platform_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_payment_id_tenant_id_billing_payments_id_tenant_id_fk" FOREIGN KEY ("payment_id","tenant_id") REFERENCES "public"."billing_payments"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_payments_tenant_created_idx" ON "billing_payments" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plans_single_free" ON "billing_plans" USING btree ("is_free") WHERE "billing_plans"."is_free";--> statement-breakpoint
CREATE INDEX "billing_subscriptions_tenant_period_idx" ON "billing_subscriptions" USING btree ("tenant_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_id_tenant_uniq" ON "billing_subscriptions" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_payment_uniq" ON "billing_subscriptions" USING btree ("payment_id");--> statement-breakpoint
-- billing (docs/architecture.md §9.11، ۱۱.۶). seed پیش از فعال‌کردن RLS (FORCE روی owner هم اعمال می‌شود).
-- پلن‌های پولی پیش‌نویس و غیرفعال‌اند تا ادمین قیمت بگذارد.
INSERT INTO "billing_plans" ("code", "name", "description", "rank", "is_free", "active", "entitlements") VALUES
  ('free', 'رایگان', 'برای شروع و امتحان نوروست', 0, true, true, '{}'::jsonb),
  ('basic', 'پایه', 'برای کسب‌وکارهای کوچک', 10, false, false,
   '{"noroform.forms": 10, "noroform.submissions_monthly": 1000, "norolink.pages": 3, "norolink.elements_per_page": 50, "norofile.storage_mb": 1024, "branding.remove": true}'::jsonb),
  ('pro', 'حرفه‌ای', 'همه‌ی امکانات با سقف‌های بالا', 20, false, false,
   '{"noroform.forms": 50, "noroform.submissions_monthly": 10000, "norolink.pages": 10, "norolink.elements_per_page": 100, "norolink.full_theme": true, "norolink.detailed_stats": true, "norofile.storage_mb": 5120, "branding.remove": true}'::jsonb);--> statement-breakpoint
INSERT INTO "billing_settings" ("id", "vat_percent") VALUES (1, 10);--> statement-breakpoint
-- پلن‌ها و تنظیمات: خواندن برای همه، نوشتن فقط superadmin فعال؛ حذف نداریم (غیرفعال‌سازی).
ALTER TABLE "billing_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_plans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_plans_select" ON "billing_plans" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "billing_plans_platform_admin_insert" ON "billing_plans" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_plans_platform_admin_update" ON "billing_plans" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "billing_plans" TO noroset_app;--> statement-breakpoint
ALTER TABLE "billing_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_settings_select" ON "billing_settings" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "billing_settings_platform_admin_update" ON "billing_settings" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin() AND updated_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_settings_platform_admin_insert" ON "billing_settings" FOR INSERT WITH CHECK (is_platform_admin() AND updated_by = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "billing_settings" TO noroset_app;--> statement-breakpoint
-- پرداخت‌ها و اشتراک‌ها: tenant-scoped + خواندن/نوشتن ادمین برای همه‌ی tenantها.
ALTER TABLE "billing_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_payments_select" ON "billing_payments" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_payments_insert" ON "billing_payments" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_payments_update" ON "billing_payments" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_payments_platform_admin_select" ON "billing_payments" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_payments_platform_admin_insert" ON "billing_payments" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_payments_platform_admin_update" ON "billing_payments" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
-- بازگشت از درگاه (ناشناس): فقط همان یک پرداخت با authority ست‌شده (فقط SELECT؛ بقیه با withTenant).
CREATE POLICY "billing_payments_callback_select" ON "billing_payments" FOR SELECT USING (authority = NULLIF(current_setting('app.billing_authority', true), ''));--> statement-breakpoint
GRANT SELECT, INSERT ON "billing_payments" TO noroset_app;--> statement-breakpoint
GRANT UPDATE ("status", "authority", "ref_id", "card_pan", "paid_at", "closed_at") ON "billing_payments" TO noroset_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "billing_payments_number_seq" TO noroset_app;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "billing_subscriptions_select" ON "billing_subscriptions" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_subscriptions_insert" ON "billing_subscriptions" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_subscriptions_update" ON "billing_subscriptions" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "billing_subscriptions_platform_admin_select" ON "billing_subscriptions" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_subscriptions_platform_admin_insert" ON "billing_subscriptions" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "billing_subscriptions_platform_admin_update" ON "billing_subscriptions" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT ON "billing_subscriptions" TO noroset_app;--> statement-breakpoint
GRANT UPDATE ("ends_at", "canceled_at") ON "billing_subscriptions" TO noroset_app;
