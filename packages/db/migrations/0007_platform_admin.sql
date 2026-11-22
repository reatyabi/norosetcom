CREATE TYPE "public"."platform_role" AS ENUM('user', 'superadmin');--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'blocked';--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid,
	"reason" varchar(500),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_log_action_pattern" CHECK ("admin_audit_log"."action" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
	CONSTRAINT "admin_audit_log_target_type_pattern" CHECK ("admin_audit_log"."target_type" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "admin_audit_log_details_object" CHECK (jsonb_typeof("admin_audit_log"."details") = 'object')
);
--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "status_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_users" ADD COLUMN "platform_role" "platform_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_platform_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."platform_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_idx" ON "admin_audit_log" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_users_created_at_idx" ON "platform_users" USING btree ("created_at");--> statement-breakpoint
-- مدیریت پلتفرم (docs/architecture.md §9.11): ادمین فقط وقتی شناخته می‌شود که app.current_admin
-- (ست‌شده با withPlatformAdmin) کاربری باشد که در DB واقعاً superadmin و active است.
-- مقدار 'blocked' در همین migration استفاده نمی‌شود (ADD VALUE تا commit قابل استفاده نیست).
CREATE FUNCTION "is_platform_admin"() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM "platform_users"
    WHERE "id" = NULLIF(current_setting('app.current_admin', true), '')::uuid
      AND "platform_role" = 'superadmin'
      AND "status" = 'active'
  );
$$ LANGUAGE sql STABLE;--> statement-breakpoint
-- لاگ ممیزی: append-only و فقط برای ادمین.
ALTER TABLE "admin_audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_audit_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_audit_log_platform_admin_select" ON "admin_audit_log" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "admin_audit_log_platform_admin_insert" ON "admin_audit_log" FOR INSERT WITH CHECK (is_platform_admin() AND actor_user_id = NULLIF(current_setting('app.current_admin', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT ON "admin_audit_log" TO noroset_app;--> statement-breakpoint
-- خواندن عضویت‌های همه‌ی tenantها برای ادمین (فقط SELECT).
CREATE POLICY "tenant_memberships_platform_admin_select" ON "tenant_memberships" FOR SELECT USING (is_platform_admin());
