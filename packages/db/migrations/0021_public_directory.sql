-- دایرکتوری عمومی صفحات لینک منتشرشده (n8l.ir)
CREATE POLICY "norolink_pages_directory_select" ON "norolink_pages" FOR SELECT USING (status = 'published' AND current_setting('app.public_directory', true) = 'on');
