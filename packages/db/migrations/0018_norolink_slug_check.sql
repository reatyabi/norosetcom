-- بررسی یکتایی نشانی در کل پلتفرم
CREATE POLICY "norolink_pages_slug_check_select" ON "norolink_pages" FOR SELECT USING (slug = NULLIF(current_setting('app.slug_check', true), ''));
