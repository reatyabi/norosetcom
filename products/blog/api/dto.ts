import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// ورودی‌های API بلاگ. شکل محتوا، تصویر و سئو در سرویس با `sanitizeDoc`/`parseImage`/`parseSeo` بررسی می‌شود.

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  /** `{fileId, alt, width, height}` یا null. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsObject()
  cover?: Record<string, unknown> | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  categoryId?: string | null;

  /** نام برچسب‌ها؛ برچسب تازه همان لحظه ساخته می‌شود. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>;

  /** فقط تاریخ گذشته (زمان‌بندی انتشار نداریم)؛ برای مقاله‌ی منتشرشده. */
  @IsOptional()
  @IsString()
  publishedAt?: string;
}

export class PostListQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(-1000)
  @Max(1000)
  sortOrder?: number;
}

export class TagDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}

export class CommentListQuery {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CommentStatusDto {
  @IsIn(['pending', 'approved', 'rejected'])
  status!: 'pending' | 'approved' | 'rejected';
}

export class CommentReplyDto {
  @IsString()
  @MaxLength(3000)
  body!: string;
}

// ---------- عمومی ----------

export class PublicPostQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['1', 'true'])
  featured?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number;
}

export class PublicCommentDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== '' && v !== null)
  @IsEmail()
  @MaxLength(200)
  email?: string | null;

  @IsString()
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  parentId?: string | null;

  /** honeypot؛ پرشده ← همان `{ok: true}` بدون ذخیره. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
