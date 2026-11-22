ALTER TABLE "norolink_pages" ADD COLUMN "claim_token" varchar(64);--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "claim_target_mobile" varchar(16);--> statement-breakpoint
ALTER TABLE "norolink_pages" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_pages_claim_token_uniq" ON "norolink_pages" USING btree ("claim_token");--> statement-breakpoint
ALTER TABLE "norolink_elements" DROP CONSTRAINT "norolink_elements_page_fk";--> statement-breakpoint
ALTER TABLE "norolink_elements" ADD CONSTRAINT "norolink_elements_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "norolink_page_stats" DROP CONSTRAINT "norolink_page_stats_page_fk";--> statement-breakpoint
ALTER TABLE "norolink_page_stats" ADD CONSTRAINT "norolink_page_stats_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "norolink_slug_redirects" DROP CONSTRAINT "norolink_slug_redirects_page_fk";--> statement-breakpoint
ALTER TABLE "norolink_slug_redirects" ADD CONSTRAINT "norolink_slug_redirects_page_fk" FOREIGN KEY ("page_id","tenant_id") REFERENCES "public"."norolink_pages"("id","tenant_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE POLICY "norolink_pages_claim_select" ON "norolink_pages" FOR SELECT USING (claim_token IS NOT NULL AND claim_token = NULLIF(current_setting('app.claim_token', true), ''));--> statement-breakpoint
CREATE POLICY "norolink_pages_claim_update" ON "norolink_pages" FOR UPDATE USING (claim_token IS NOT NULL AND claim_token = NULLIF(current_setting('app.claim_token', true), '') AND claimed_at IS NULL) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "norolink_elements_claim_select" ON "norolink_elements" FOR SELECT USING (EXISTS (SELECT 1 FROM norolink_pages WHERE norolink_pages.id = norolink_elements.page_id AND norolink_pages.claim_token IS NOT NULL AND norolink_pages.claim_token = NULLIF(current_setting('app.claim_token', true), '')));--> statement-breakpoint
CREATE POLICY "norolink_elements_claim_update" ON "norolink_elements" FOR UPDATE USING (EXISTS (SELECT 1 FROM norolink_pages WHERE norolink_pages.id = norolink_elements.page_id AND norolink_pages.claim_token IS NOT NULL AND norolink_pages.claim_token = NULLIF(current_setting('app.claim_token', true), ''))) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
