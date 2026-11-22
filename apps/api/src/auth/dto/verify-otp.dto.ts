import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  mobile!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
