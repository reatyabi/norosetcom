import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import {
  MODERATION_MAX_DAYS,
  MODERATION_NOTE_MAX,
  MODERATION_NOTICE_MAX,
  MODERATION_REASONS,
  MODERATION_REFERENCE_MAX,
  MODERATION_STATUSES,
  REPORT_STATUSES,
  type ModerationReason,
  type ModerationStatus,
  type ReportStatus,
} from '../../shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListModerationPagesQuery {
  /** نشانی، نشانی کامل (`https://x.n8l.ir`) یا عنوان. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  q?: string;

  /** `moderated` = هر محدودیتی، `reported` = گزارش باز دارد. */
  @IsOptional()
  @IsIn([...MODERATION_STATUSES, 'moderated', 'reported'])
  filter?: ModerationStatus | 'moderated' | 'reported';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/** تغییر وضعیت مدیریتی صفحه؛ یادداشت داخلی همیشه اجباری است (حتی برای برداشتن محدودیت). */
export class SetModerationDto {
  @IsIn(MODERATION_STATUSES)
  status!: ModerationStatus;

  /** برای هر وضعیتی جز `none` اجباری. */
  @IsOptional()
  @IsIn(MODERATION_REASONS)
  reason?: ModerationReason;

  /** دلیل داخلی (فقط در لاگ ممیزی؛ مالک و بازدیدکننده نمی‌بینند). */
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(MODERATION_NOTE_MAX)
  note!: string;

  /** پیام بازدیدکننده و مالک؛ خالی ← متن پیش‌فرض. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MODERATION_NOTICE_MAX)
  notice?: string;

  /** شماره‌ی نامه یا مرجع (مثلاً دستور قضایی). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MODERATION_REFERENCE_MAX)
  reference?: string;

  /** محدودیت موقت به روز؛ نبودن = تا برداشتن دستی. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MODERATION_MAX_DAYS)
  days?: number;

  /** گزارش‌های باز این صفحه با همین اقدام «اقدام شد» شوند. */
  @IsOptional()
  @IsBoolean()
  resolveReports?: boolean;
}

export class ListReportsQuery {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: ReportStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ResolveReportDto {
  @IsIn(['actioned', 'dismissed'])
  status!: Exclude<ReportStatus, 'open'>;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
