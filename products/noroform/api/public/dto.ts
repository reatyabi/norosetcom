import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class UnlockResponseDto {
  /** کلید دسترسی لینک پاسخ (authMode='key'). */
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  key!: string;
}

export class RequestResponseOtpDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;
}

export class VerifyResponseOtpDto extends RequestResponseOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class SubmitAnswersDto {
  /** نسخه‌ای که فرم با آن رندر شده (از پاسخ GET). */
  @IsUUID()
  versionId!: string;

  /** `{ field_id: value }`؛ با field-engine روی همان نسخه validate می‌شود. */
  @IsObject()
  answers!: Record<string, unknown>;

  /** یکتا برای هر بار پرکردن فرم (مثلاً UUID ساخته‌شده در مرورگر)؛ ارسال دوباره همان پاسخ را برمی‌گرداند. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,64}$/)
  idempotencyKey!: string;

  /** honeypot: در UI پنهان است؛ اگر پر شود پاسخ بی‌صدا دور ریخته می‌شود. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
