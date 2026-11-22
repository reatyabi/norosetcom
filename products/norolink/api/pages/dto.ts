import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ELEMENT_KINDS, PAGE_SLUG, type ElementKind } from '../../shared';

const SLUG = PAGE_SLUG;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class CreatePageDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  /** زیردامنه؛ در نبودش یک slug تصادفی ساخته می‌شود. */
  @IsOptional()
  @Transform(lower)
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(SLUG)
  slug?: string;

  /** محتوای آغازین (مثلاً از قالب)؛ در نبودش پروفایل با همین عنوان و قالب پیش‌فرض. */
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  /** المان‌های آغازین به همین ترتیب؛ settings هر کدام با zod در سرویس. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InitialElementDto)
  elements?: InitialElementDto[];
}

export class InitialElementDto {
  @IsIn(ELEMENT_KINDS)
  kind!: ElementKind;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdatePageDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(lower)
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(SLUG)
  slug?: string;

  /** { profile, theme, seo, layout }؛ کامل با zod در سرویس اعتبارسنجی می‌شود. */
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class AddElementDto {
  @IsIn(ELEMENT_KINDS)
  kind!: ElementKind;

  /** المان جدید بعد از این المان؛ در نبودش در انتهای صفحه. */
  @IsOptional()
  @IsUUID()
  afterId?: string;
}

export class UpdateElementDto {
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class MoveElementDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

export class StatsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

/** تحویل لینک واگذاری؛ `slug` نشانی‌ای که مشتری به‌جای نشانی رزروشده‌ی لینک خواسته. */
export class ClaimPageDto {
  @IsOptional()
  @Transform(lower)
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(SLUG)
  slug?: string;
}
