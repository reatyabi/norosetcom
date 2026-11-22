-- OTP مشاهده‌ی بیرونی پاسخ (جدا از OTP ورود). فقط hash کد؛ موبایل برای ممیزی.
CREATE TABLE "noroform_response_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "noroform_response_otp_code_length" CHECK (char_length("noroform_response_otp_codes"."code_hash") = 64),
	CONSTRAINT "noroform_response_otp_attempts" CHECK ("noroform_response_otp_codes"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "noroform_response_otp_codes" ADD CONSTRAINT "noroform_response_otp_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noroform_response_otp_codes" ADD CONSTRAINT "noroform_response_otp_codes_link_id_noroform_response_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."noroform_response_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "noroform_response_otp_link_mobile_idx" ON "noroform_response_otp_codes" USING btree ("link_id","mobile","created_at");--> statement-breakpoint
ALTER TABLE "noroform_response_otp_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "noroform_response_otp_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "noroform_response_otp_codes_select" ON "noroform_response_otp_codes" FOR SELECT USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_otp_codes_insert" ON "noroform_response_otp_codes" FOR INSERT WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_otp_codes_update" ON "noroform_response_otp_codes" FOR UPDATE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "noroform_response_otp_codes_delete" ON "noroform_response_otp_codes" FOR DELETE USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "noroform_response_otp_codes" TO noroset_app;
