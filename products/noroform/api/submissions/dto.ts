import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_ID = /^f_[a-z0-9]{8}$/;
const SORT_KEY = /^(created_at|f_[a-z0-9]{8})$/;
/** فهرست مرتب ستون‌های خروجی، جداشده با کاما (خالی یعنی فقط ستون‌های پایه). */
const COLUMN_IDS = /^$|^f_[a-z0-9]{8}(,f_[a-z0-9]{8})*$/;
/** سقف تعداد مقدارهای انتخاب‌شده در فیلتر یک ستون (هم‌راستا با سقف لیست مقادیر). */
const MAX_FILTER_VALUES = 200;

/** بازه‌ی تاریخ میلادی (شامل)، بر اساس روز تهران. */
export class DateRangeQuery {
  @IsOptional()
  @Matches(ISO_DATE)
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE)
  to?: string;
}

export class ListSubmissionsQuery extends DateRangeQuery {
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
  @Max(1_000_000)
  offset?: number;

  /** شماره‌ی نسخه برای فیلتر. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  /** کلید مرتب‌سازی: created_at یا field_id. */
  @IsOptional()
  @IsString()
  @Matches(SORT_KEY)
  sort?: string;

  /** جهت مرتب‌سازی (پیش‌فرض desc). */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  dir?: 'asc' | 'desc';

  /** فیلد فیلتر متن (field_id). */
  @IsOptional()
  @IsString()
  @Matches(FIELD_ID)
  filterField?: string;

  /** مقدار فیلتر متن (باید همراه filterField بیاید). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  filterValue?: string;

  /**
   * فیلتر چندمقداری هر ستون (کارت فیلتر اکسل‌مانند) به‌صورت JSON:
   * {"f_ab12cd34":["مقدار۱","مقدار۲"]}؛ آرایه‌ی خالی یعنی «هیچ ردیفی».
   */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  filters?: string;
}

/**
 * خروجی CSV: همان فیلترهای فهرست، به‌علاوه‌ی ستون‌های شخصی‌سازی‌شده‌ی جدول تا
 * فایل خروجی هم دقیقاً همان ستون‌ها و همان ترتیب را داشته باشد.
 */
export class ExportSubmissionsQuery extends ListSubmissionsQuery {
  /**
   * فهرست مرتب field_idها (جداشده با کاما). نبودنش یعنی همه‌ی ستون‌ها،
   * رشته‌ی خالی یعنی فقط ستون‌های پایه (شناسه/زمان/نسخه).
   */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Matches(COLUMN_IDS)
  columns?: string;
}

/** مقادیر یکتای یک ستون برای کارت فیلتر. */
export class FilterValuesQuery extends DateRangeQuery {
  /** فیلد موردنظر. */
  @IsString()
  @Matches(FIELD_ID)
  fieldId!: string;

  /** فقط پاسخ‌های این شماره‌ی نسخه. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  /** فیلترهای فعال بقیه‌ی ستون‌ها (JSON مثل ListSubmissionsQuery.filters). */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  filters?: string;
}

/** ابطال/ساخت لینک مشاهده‌ی بیرونی یک پاسخ. */
export class CreateResponseLinkDto {
  /** مدت اعتبار لینک؛ پیش‌فرض ۳۰ روز. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;

  /** کلید دسترسی دستی برای authMode='key'؛ در نبودش پیشنهاد تصادفی ساخته می‌شود. */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  key?: string;
}

/**
 * رشته‌ی JSON فیلترها را به نگاشت field_id → مقدارها تبدیل و اعتبارسنجی می‌کند.
 * کلیدها و مقدارها دقیقاً مثل بقیه‌ی query محدود می‌شوند تا SQL امن بماند.
 */
export function parseFilters(raw: string | undefined): Record<string, string[]> | undefined {
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('invalid_filters');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestException('invalid_filters');
  }
  const out: Record<string, string[]> = {};
  for (const [fieldId, values] of Object.entries(parsed as Record<string, unknown>)) {
    if (
      !FIELD_ID.test(fieldId) ||
      !Array.isArray(values) ||
      values.length > MAX_FILTER_VALUES ||
      !values.every((v) => typeof v === 'string' && v.length <= 500)
    ) {
      throw new BadRequestException('invalid_filters');
    }
    out[fieldId] = values as string[];
  }
  return out;
}

/**
 * فهرست ستون‌های خروجی (رشته‌ی کاماجدا) را به آرایه‌ی مرتب field_id تبدیل می‌کند؛
 * تکراری‌ها حذف می‌شوند تا خروجی ستون تکراری نداشته باشد.
 */
export function parseColumnIds(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  return [...new Set(raw.split(',').filter(Boolean))];
}
