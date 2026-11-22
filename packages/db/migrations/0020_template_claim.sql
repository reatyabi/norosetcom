-- واگذاری به مشتری از صفحه‌ی فضای کاری به قالب مدیریت پلتفرم منتقل شد (docs/architecture.md §9.8). لینک‌های قبلی صفحه‌ها با حذف policyها از کار می‌افتند.
-- ستون‌های claim_token و claimed_at صفحه‌ها فعلاً می‌مانند، چون release قبلی آن‌ها را می‌خواند و برگشت به آن باید ممکن بماند؛ در release بعدی حذف می‌شوند (docs/release.md §۶).
DROP POLICY "norolink_pages_platform_admin_claim_select" ON "norolink_pages";--> statement-breakpoint
DROP POLICY "norolink_pages_claim_select" ON "norolink_pages";--> statement-breakpoint
DROP POLICY "norolink_pages_claim_update" ON "norolink_pages";--> statement-breakpoint
DROP POLICY "norolink_elements_claim_select" ON "norolink_elements";--> statement-breakpoint
DROP POLICY "norolink_elements_claim_update" ON "norolink_elements";--> statement-breakpoint
ALTER TABLE "norolink_templates" ADD COLUMN "claim_token" varchar(64);--> statement-breakpoint
ALTER TABLE "norolink_templates" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "norolink_templates_claim_token_uniq" ON "norolink_templates" USING btree ("claim_token");--> statement-breakpoint
-- دارنده‌ی توکن فقط همان قالب را می‌بیند (حتی پیش‌نویس) و فقط تا وقتی تحویل نشده می‌تواند آن را مصرف کند.
CREATE POLICY "norolink_templates_claim_select" ON "norolink_templates" FOR SELECT USING (claim_token IS NOT NULL AND claim_token = NULLIF(current_setting('app.claim_token', true), ''));--> statement-breakpoint
CREATE POLICY "norolink_templates_claim_update" ON "norolink_templates" FOR UPDATE USING (claim_token IS NOT NULL AND claim_token = NULLIF(current_setting('app.claim_token', true), '') AND claimed_at IS NULL) WITH CHECK (claim_token IS NOT NULL AND claim_token = NULLIF(current_setting('app.claim_token', true), ''));
