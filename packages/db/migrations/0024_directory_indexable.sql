-- دایرکتوری عمومی n8l.ir فقط صفحه‌هایی را می‌بیند که صاحبشان «نمایش در موتورهای جستجو» را روشن و منتشر کرده است
-- (docs/architecture.md §9.1). صفحه‌ی noindex نباید از هیچ مسیر عمومی دیگری فهرست شود.
DROP POLICY IF EXISTS "norolink_pages_directory_select" ON "norolink_pages";
--> statement-breakpoint
CREATE POLICY "norolink_pages_directory_select" ON "norolink_pages" FOR SELECT USING (
  status = 'published'
  AND current_setting('app.public_directory', true) = 'on'
  AND (published_snapshot #>> '{content,seo,indexable}') = 'true'
);
