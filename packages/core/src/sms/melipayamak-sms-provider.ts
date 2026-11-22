import { ConsoleSmsProvider } from './console-sms-provider';
import type { SmsProvider } from './sms-provider';

// ملی‌پیامک: ارسال با پترن تأییدشده از API کنسول (docs/architecture.md §7). کد را خود سیستم می‌سازد و
// فقط هش آن را نگه می‌دارد، پس مسیر send/shared به‌کار می‌رود، نه send/otp.
// انتخاب با env: SMS_PROVIDER=melipayamak|console (پیش‌فرض console خارج از production).
// در production ارائه‌دهنده‌ی console یا ملی‌پیامک بدون تنظیمات = برنامه بالا نمی‌آید.

const SEND_URL = 'https://console.melipayamak.com/api/send/shared';
/** کدهای خطا کوتاه‌اند؛ شناسه‌ی ارسال موفق عددی بلند است. */
const REC_ID = /^\d{4,}$/;

type Fetch = typeof fetch;

export interface MelipayamakConfig {
  token: string;
  otpBodyId: number;
}

export class MelipayamakSmsProvider implements SmsProvider {
  constructor(
    private readonly config: MelipayamakConfig,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async sendOtp(mobile: string, code: string): Promise<void> {
    const res = await this.fetcher(`${SEND_URL}/${encodeURIComponent(this.config.token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyId: this.config.otpBodyId, to: mobile.replace(/^\+98/, '0'), args: [code] }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { recId?: unknown; status?: unknown } | null;
    // فقط پاسخ سرویس لاگ می‌شود؛ OTP و توکن (که در آدرس است) هرگز.
    if (!res.ok || !REC_ID.test(String(data?.recId ?? ''))) {
      throw new Error(`melipayamak send failed: ${res.status} ${String(data?.recId ?? '')} ${String(data?.status ?? '').slice(0, 80)}`);
    }
  }
}

export function smsProviderFromEnv(env: Record<string, string | undefined> = process.env): SmsProvider {
  const production = env.NODE_ENV === 'production';
  const kind = env.SMS_PROVIDER?.trim() || (production ? 'melipayamak' : 'console');
  if (kind === 'console') {
    if (production) throw new Error('SMS_PROVIDER=console is not allowed in production');
    return new ConsoleSmsProvider();
  }
  if (kind === 'melipayamak') {
    const token = env.MELIPAYAMAK_TOKEN?.trim();
    const otpBodyId = Number(env.MELIPAYAMAK_OTP_BODY_ID);
    if (!token || !Number.isInteger(otpBodyId) || otpBodyId <= 0) {
      throw new Error('MELIPAYAMAK_TOKEN and MELIPAYAMAK_OTP_BODY_ID are required for SMS_PROVIDER=melipayamak');
    }
    return new MelipayamakSmsProvider({ token, otpBodyId });
  }
  throw new Error(`unknown SMS_PROVIDER: ${kind}`);
}
