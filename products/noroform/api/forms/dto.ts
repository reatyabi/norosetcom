import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateFormDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  /** اختیاری؛ در نبودش یک slug تصادفی ساخته می‌شود. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG)
  slug?: string;

  /** محل اجرای فرم؛ برای سازگاری API در نبودش external است. */
  @IsOptional()
  @IsIn(['internal', 'external'])
  channel?: 'internal' | 'external';

  /** دسترسی پیش‌فرض پاسخ‌ها؛ پیش‌فرض external. */
  @IsOptional()
  @IsIn(['internal', 'external'])
  responseAccess?: 'internal' | 'external';

  /** روش احراز لینک پاسخ؛ تا انتخاب مالک null می‌ماند. */
  @IsOptional()
  @IsIn(['link', 'key', 'otp'])
  responseAuth?: 'link' | 'key' | 'otp';

  /** مدت اعتبار پیش‌فرض لینک پاسخ (روز). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  responseAccessTtlDays?: number;

  /** پیش‌نویس آغازین (مثلاً از قالب)؛ در نبودش یک صفحه‌ی main خالی. */
  @IsOptional()
  @IsObject()
  draftDefinition?: Record<string, unknown>;
}

export class UpdateFormDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG)
  slug?: string;

  /** فقط تا قبل از اولین انتشار قابل تغییر است. */
  @IsOptional()
  @IsIn(['internal', 'external'])
  channel?: 'internal' | 'external';

  @IsOptional()
  @IsIn(['internal', 'external'])
  responseAccess?: 'internal' | 'external';

  @IsOptional()
  @IsIn(['link', 'key', 'otp'])
  responseAuth?: 'link' | 'key' | 'otp';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  responseAccessTtlDays?: number;

  /** پیش‌نویس می‌تواند ناقص باشد؛ اعتبارسنجی کامل هنگام انتشار. */
  @IsOptional()
  @IsObject()
  draftDefinition?: Record<string, unknown>;
}
