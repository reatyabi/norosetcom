import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { REPORT_CONTACT_MAX, REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '../../shared';

export class PublicEventDto {
  @IsIn(['page_view', 'element_click'])
  kind!: 'page_view' | 'element_click';

  @IsOptional()
  @IsUUID()
  elementId?: string;

  /** document.referrer صفحه (فقط دامنه‌اش ذخیره می‌شود). */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}

/** گزارش تخلف بازدیدکننده (§9.13)؛ `website` همان honeypot است. */
export class PublicReportDto {
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(REPORT_DETAILS_MAX)
  details?: string;

  /** ایمیل یا تلفن اختیاری برای پیگیری (فقط ادمین می‌بیند). */
  @IsOptional()
  @IsString()
  @MaxLength(REPORT_CONTACT_MAX)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
