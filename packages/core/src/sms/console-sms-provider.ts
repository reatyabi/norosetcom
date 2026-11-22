import type { SmsProvider } from './sms-provider';

/**
 * پیاده‌سازی توسعه: کد را فقط در حالت development لاگ می‌کند، هرگز در production.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(mobile: string, code: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    console.log(`[DEV-OTP] mobile=${mobile} code=${code}`);
  }
}
