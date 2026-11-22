CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "platform_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile" varchar(20),
	"email" varchar(320),
	"full_name" varchar(200) DEFAULT '' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_users_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "platform_users_email_unique" UNIQUE("email"),
	CONSTRAINT "platform_users_mobile_or_email" CHECK ("platform_users"."mobile" IS NOT NULL OR "platform_users"."email" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "reserved_slugs" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_slug_pattern" CHECK ("tenants"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "tenants_slug_length" CHECK (char_length("tenants"."slug") BETWEEN 2 AND 64)
);
--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_platform_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_memberships_tenant_user_uniq" ON "tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_memberships_id_tenant_uniq" ON "tenant_memberships" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_memberships_select" ON "tenant_memberships" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_memberships_insert" ON "tenant_memberships" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_memberships_update" ON "tenant_memberships" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_memberships_delete" ON "tenant_memberships" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE FUNCTION "check_reserved_slug"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "reserved_slugs" WHERE slug = NEW.slug) THEN
    RAISE EXCEPTION 'slug % is reserved', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_tenants_reserved_slug" BEFORE INSERT OR UPDATE OF slug ON "tenants" FOR EACH ROW EXECUTE FUNCTION "check_reserved_slug"();--> statement-breakpoint
INSERT INTO "reserved_slugs" ("slug") VALUES ('new'), ('app'), ('api'), ('form'), ('link'), ('f'), ('l'), ('admin'), ('dashboard'), ('login'), ('signup'), ('settings'), ('static'), ('health');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "platform_users" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "tenants" TO noroset_app;--> statement-breakpoint
GRANT SELECT ON "reserved_slugs" TO noroset_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_memberships" TO noroset_app;
