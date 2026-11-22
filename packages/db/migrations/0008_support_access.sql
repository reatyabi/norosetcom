CREATE TABLE "support_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"reason" varchar(500) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_access_grants_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "support_access_grants_reason_not_empty" CHECK (char_length("support_access_grants"."reason") > 0),
	CONSTRAINT "support_access_grants_revoked_by" CHECK (("support_access_grants"."revoked_at" IS NULL AND "support_access_grants"."revoked_by" IS NULL) OR ("support_access_grants"."revoked_at" IS NOT NULL AND "support_access_grants"."revoked_by" IN ('admin', 'user')))
);
--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_user_id_platform_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_admin_user_id_platform_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_access_grants_user_idx" ON "support_access_grants" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "support_access_grants_admin_idx" ON "support_access_grants" USING btree ("admin_user_id","created_at");--> statement-breakpoint
-- دسترسی پشتیبانی (docs/architecture.md §9.11): سه مسیر دسترسی، همه با RLS + FORCE.
ALTER TABLE "support_access_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_access_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- ادمین: ساخت (فقط با هویت خودش)، خواندن و پایان/ابطال.
CREATE POLICY "support_access_grants_platform_admin_select" ON "support_access_grants" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "support_access_grants_platform_admin_insert" ON "support_access_grants" FOR INSERT WITH CHECK (is_platform_admin() AND admin_user_id = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "support_access_grants_platform_admin_update" ON "support_access_grants" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
-- خود کاربر: دیدن سابقه و ابطال دسترسی فعال (withUser).
CREATE POLICY "support_access_grants_own_select" ON "support_access_grants" FOR SELECT USING (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "support_access_grants_own_update" ON "support_access_grants" FOR UPDATE USING (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid) WITH CHECK (user_id = NULLIF(current_setting('app.current_user', true), '')::uuid);--> statement-breakpoint
-- بررسی نشست پشتیبانی در هر درخواست: فقط همان یک ردیف (فقط SELECT).
CREATE POLICY "support_access_grants_session_select" ON "support_access_grants" FOR SELECT USING (id = NULLIF(current_setting('app.support_grant_id', true), '')::uuid);--> statement-breakpoint
-- فقط ستون‌های وضعیت قابل تغییرند؛ کاربر، ادمین، دلیل، توکن و مهلت immutable.
GRANT SELECT, INSERT ON "support_access_grants" TO noroset_app;--> statement-breakpoint
GRANT UPDATE ("redeemed_at", "ended_at", "revoked_at", "revoked_by") ON "support_access_grants" TO noroset_app;
