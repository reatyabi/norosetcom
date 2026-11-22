import { Transform } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PAGE_SLUG, PLATFORM_ASSET_PATTERN, LINK_TEMPLATE_CATEGORIES, type LinkTemplateCategory } from '../../shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTemplateDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsIn(LINK_TEMPLATE_CATEGORIES)
  category!: LinkTemplateCategory;
}

export class UpdateTemplateDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsIn(LINK_TEMPLATE_CATEGORIES)
  category?: LinkTemplateCategory;

  /** { profile, theme, seo, layout }؛ کامل با zod در سرویس اعتبارسنجی می‌شود. */
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class PublishTemplateDto {
  /** بندانگشتی گالری: فایل پلتفرمی که پیش از انتشار با آپلود همین قالب ساخته شده. */
  @IsOptional()
  @IsString()
  @Matches(PLATFORM_ASSET_PATTERN)
  thumb?: string;
}

/** لینک واگذاری به مشتری (§9.8): نشانی رزروشده، نام کسب‌وکار و یادداشت برای پیگیری در مدیریت پلتفرم. */
export class CreateClaimLinkDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(PAGE_SLUG)
  slug!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  businessName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
