ALTER TABLE "noroform_forms" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "noroform_forms" ADD CONSTRAINT "noroform_forms_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD CONSTRAINT "norolink_pages_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "reserved_slugs" ("slug") VALUES ('templates') ON CONFLICT DO NOTHING;
