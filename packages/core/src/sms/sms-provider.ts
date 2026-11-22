export const SMS_PROVIDER = 'SMS_PROVIDER';

export interface SmsProvider {
  /** ارسال کد OTP به موبایل. پیاده‌سازی واقعی بعداً جایگزین می‌شود. */
  sendOtp(mobile: string, code: string): Promise<void>;
}
