import type { BlogDoc } from './doc';
import type { PostSeo } from './seo';

// قرارداد پاسخ‌های API بلاگ (مشترک API و وب).

/** نام نویسنده‌ی همه‌ی مقاله‌ها و پاسخ‌های ادمین (تصمیم مالک محصول ۱۴۰۵/۸/۱۵). */
export const BLOG_AUTHOR = 'تیم نوروست';

export type PostStatus = 'draft' | 'published';
export type CommentStatus = 'pending' | 'approved' | 'rejected';

/** تصویر ذخیره‌شده (فایل پلتفرم norofile). */
export interface StoredImage {
  file_id: string;
  width: number | null;
  height: number | null;
  alt?: string;
}

export interface ImageView {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
}

export interface TermRef {
  slug: string;
  name: string;
}

// ---------- عمومی ----------

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  cover: ImageView | null;
  category: TermRef | null;
  tags: TermRef[];
  featured: boolean;
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
}

export interface PostSeoView {
  title: string;
  description: string;
  canonical: string | null;
  noindex: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: ImageView | null;
}

export interface PublicComment {
  id: string;
  parentId: string | null;
  authorName: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
}

export interface PostDetail extends PostSummary {
  content: BlogDoc;
  seo: PostSeoView;
  wordCount: number;
  allowComments: boolean;
  /** پیشوند آدرس فایل‌های پلتفرم برای تصاویر متن (`${assetBaseUrl}/${fileId}`). */
  assetBaseUrl: string;
}

export interface PublicPostResponse {
  post: PostDetail;
  related: PostSummary[];
  comments: PublicComment[];
}

export interface PostListResponse {
  items: PostSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicCategory extends TermRef {
  description: string;
  seoTitle: string;
  seoDescription: string;
  postCount: number;
}

export interface PublicTag extends TermRef {
  postCount: number;
}

export interface SitemapResponse {
  posts: { slug: string; updatedAt: string }[];
  categories: { slug: string; updatedAt: string | null }[];
  tags: { slug: string; updatedAt: string | null }[];
}

// ---------- مدیریت ----------

export interface AdminPostItem {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  featured: boolean;
  category: TermRef | null;
  cover: ImageView | null;
  wordCount: number;
  commentCount: number;
  pendingComments: number;
  publishedAt: string | null;
  updatedAt: string;
  updatedByName: string | null;
}

export interface AdminPostList {
  items: AdminPostItem[];
  total: number;
  counts: { all: number; draft: number; published: number };
}

export interface AdminPost {
  id: string;
  slug: string;
  status: PostStatus;
  title: string;
  excerpt: string;
  content: BlogDoc;
  cover: (StoredImage & { url: string; alt: string }) | null;
  categoryId: string | null;
  tags: TermRef[];
  featured: boolean;
  allowComments: boolean;
  seo: PostSeo;
  ogImageUrl: string | null;
  wordCount: number;
  readingMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** نشانی‌های قبلی (ریدایرکت ۳۰۸ به نشانی فعلی). */
  previousSlugs: string[];
  assetBaseUrl: string;
}

export interface AdminCategory extends TermRef {
  id: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  postCount: number;
}

export interface AdminTag extends TermRef {
  id: string;
  postCount: number;
}

export interface AdminComment {
  id: string;
  post: { id: string; title: string; slug: string; status: PostStatus };
  parentId: string | null;
  authorName: string;
  authorEmail: string | null;
  body: string;
  status: CommentStatus;
  fromAdmin: boolean;
  createdAt: string;
}

export interface AdminCommentList {
  items: AdminComment[];
  total: number;
  counts: Record<CommentStatus, number>;
}

export interface BlogUploadResult {
  fileId: string;
  url: string;
  width: number;
  height: number;
}

/** مانع انتشار (انتشار با ۴۲۲ `not_publishable` و `issues`). */
export type PublishIssue = 'missing_title' | 'missing_slug' | 'empty_content';
