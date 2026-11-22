CREATE TYPE "public"."blog_comment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_categories_slug_pattern" CHECK ("blog_categories"."slug" ~ '^[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(-[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$' AND char_length("blog_categories"."slug") <= 120),
	CONSTRAINT "blog_categories_name_not_empty" CHECK (char_length("blog_categories"."name") > 0),
	CONSTRAINT "blog_categories_seo_object" CHECK (jsonb_typeof("blog_categories"."seo") = 'object')
);
--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_name" varchar(80) NOT NULL,
	"author_email" varchar(200),
	"body" varchar(3000) NOT NULL,
	"status" "blog_comment_status" DEFAULT 'pending' NOT NULL,
	"from_admin" boolean DEFAULT false NOT NULL,
	"ip_hash" varchar(64),
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_comments_name_not_empty" CHECK (char_length("blog_comments"."author_name") > 0),
	CONSTRAINT "blog_comments_body_not_empty" CHECK (char_length("blog_comments"."body") > 0)
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "blog_post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(200) DEFAULT '' NOT NULL,
	"excerpt" varchar(500) DEFAULT '' NOT NULL,
	"content" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"cover" jsonb,
	"category_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_posts_slug_pattern" CHECK ("blog_posts"."slug" ~ '^[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(-[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$' AND char_length("blog_posts"."slug") <= 120),
	CONSTRAINT "blog_posts_slug_reserved" CHECK ("blog_posts"."slug" NOT IN ('category', 'tag', 'feed', 'page', 'search', 'author')),
	CONSTRAINT "blog_posts_published_at" CHECK ("blog_posts"."status" = 'draft' OR "blog_posts"."published_at" IS NOT NULL),
	CONSTRAINT "blog_posts_content_object" CHECK (jsonb_typeof("blog_posts"."content") = 'object'),
	CONSTRAINT "blog_posts_seo_object" CHECK (jsonb_typeof("blog_posts"."seo") = 'object'),
	CONSTRAINT "blog_posts_cover_object" CHECK ("blog_posts"."cover" IS NULL OR jsonb_typeof("blog_posts"."cover") = 'object')
);
--> statement-breakpoint
CREATE TABLE "blog_slug_redirects" (
	"slug" varchar(120) PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_tags_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_tags_slug_pattern" CHECK ("blog_tags"."slug" ~ '^[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(-[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$' AND char_length("blog_tags"."slug") <= 120),
	CONSTRAINT "blog_tags_name_not_empty" CHECK (char_length("blog_tags"."name") > 0)
);
--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parent_id_blog_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_moderated_by_platform_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_platform_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_platform_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_slug_redirects" ADD CONSTRAINT "blog_slug_redirects_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_comments_post_idx" ON "blog_comments" USING btree ("post_id","status","created_at");--> statement-breakpoint
CREATE INDEX "blog_comments_status_idx" ON "blog_comments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "blog_post_tags_tag_idx" ON "blog_post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "blog_slug_redirects_post_idx" ON "blog_slug_redirects" USING btree ("post_id");--> statement-breakpoint
-- بلاگ (docs/architecture.md §9.12). همه سطح پلتفرم با RLS + FORCE؛ نوشتن فقط is_platform_admin().
-- خواندن عمومی (بدون هیچ setting): دسته و برچسب همه؛ مقاله فقط منتشرشده با زمان انتشار گذشته؛ برچسب‌ها و
-- نشانی‌های قبلی فقط برای مقاله‌ی قابل‌مشاهده؛ نظر فقط تأییدشده. ثبت نظر عمومی فقط pending و فقط روی مقاله‌ی باز.
ALTER TABLE "blog_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_categories_public_select" ON "blog_categories" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "blog_categories_platform_admin_insert" ON "blog_categories" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_categories_platform_admin_update" ON "blog_categories" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_categories_platform_admin_delete" ON "blog_categories" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "blog_categories" TO noroset_app;--> statement-breakpoint
ALTER TABLE "blog_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_tags" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_tags_public_select" ON "blog_tags" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "blog_tags_platform_admin_insert" ON "blog_tags" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_tags_platform_admin_update" ON "blog_tags" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_tags_platform_admin_delete" ON "blog_tags" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "blog_tags" TO noroset_app;--> statement-breakpoint
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_posts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_posts_public_select" ON "blog_posts" FOR SELECT USING (status = 'published' AND published_at <= now());--> statement-breakpoint
CREATE POLICY "blog_posts_platform_admin_select" ON "blog_posts" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_posts_platform_admin_insert" ON "blog_posts" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_posts_platform_admin_update" ON "blog_posts" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_posts_platform_admin_delete" ON "blog_posts" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "blog_posts" TO noroset_app;--> statement-breakpoint
-- زیرپرسش روی blog_posts خودش RLS می‌گیرد: عموم فقط مقاله‌ی منتشرشده و ادمین همه را می‌بیند.
ALTER TABLE "blog_post_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_post_tags" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_post_tags_visible_select" ON "blog_post_tags" FOR SELECT USING (EXISTS (SELECT 1 FROM "blog_posts" p WHERE p.id = post_id));--> statement-breakpoint
CREATE POLICY "blog_post_tags_platform_admin_insert" ON "blog_post_tags" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_post_tags_platform_admin_delete" ON "blog_post_tags" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "blog_post_tags" TO noroset_app;--> statement-breakpoint
ALTER TABLE "blog_slug_redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_slug_redirects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_slug_redirects_visible_select" ON "blog_slug_redirects" FOR SELECT USING (EXISTS (SELECT 1 FROM "blog_posts" p WHERE p.id = post_id));--> statement-breakpoint
CREATE POLICY "blog_slug_redirects_platform_admin_insert" ON "blog_slug_redirects" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_slug_redirects_platform_admin_delete" ON "blog_slug_redirects" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "blog_slug_redirects" TO noroset_app;--> statement-breakpoint
ALTER TABLE "blog_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_comments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_comments_public_select" ON "blog_comments" FOR SELECT USING (status = 'approved' AND EXISTS (SELECT 1 FROM "blog_posts" p WHERE p.id = post_id));--> statement-breakpoint
CREATE POLICY "blog_comments_public_insert" ON "blog_comments" FOR INSERT WITH CHECK (
  status = 'pending' AND NOT from_admin AND moderated_by IS NULL AND moderated_at IS NULL
  AND EXISTS (SELECT 1 FROM "blog_posts" p WHERE p.id = post_id AND p.allow_comments)
);--> statement-breakpoint
CREATE POLICY "blog_comments_platform_admin_select" ON "blog_comments" FOR SELECT USING (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_comments_platform_admin_insert" ON "blog_comments" FOR INSERT WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_comments_platform_admin_update" ON "blog_comments" FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());--> statement-breakpoint
CREATE POLICY "blog_comments_platform_admin_delete" ON "blog_comments" FOR DELETE USING (is_platform_admin());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "blog_comments" TO noroset_app;
