import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// سقف طول اینجا فقط جلوی ورودی‌های خیلی بزرگ را می‌گیرد؛ سیاست رمز (۸ تا ۱۲۸ کاراکتر) در سرویس است.
const MAX_INPUT = 512;

export class PasswordLoginDto {
  @IsString()
  mobile!: string;

  @IsString()
  @MaxLength(MAX_INPUT)
  password!: string;
}

export class SetPasswordDto {
  @IsString()
  @MaxLength(MAX_INPUT)
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_INPUT)
  currentPassword?: string;
}

export class ResetPasswordDto {
  @IsString()
  mobile!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @MaxLength(MAX_INPUT)
  newPassword!: string;
}

export class RedeemSupportDto {
  /** توکن لینک (base64url ۳۲ بایت). */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{20,128}$/)
  token!: string;
}
