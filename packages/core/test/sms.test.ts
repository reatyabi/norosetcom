import { describe, expect, it } from 'vitest';
import { ConsoleSmsProvider } from '../src/sms/console-sms-provider';
import { MelipayamakSmsProvider, smsProviderFromEnv } from '../src/sms/melipayamak-sms-provider';

const config = { token: 'secret-token', otpBodyId: 454153 };

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

describe('MelipayamakSmsProvider', () => {
  it('sends the code as the pattern argument to a local-format mobile', async () => {
    // شکل پاسخ واقعی: recId عدد JSON بزرگ‌تر از MAX_SAFE_INTEGER است و فقط قالب آن بررسی می‌شود.
    const { calls, fetcher } = fakeFetch(200, '{"recId":4874610168543105043,"status":"عملیات موفق"}');
    await new MelipayamakSmsProvider(config, fetcher).sendOtp('+989121234567', '654321');
    expect(calls[0]!.url).toBe('https://console.melipayamak.com/api/send/shared/secret-token');
    expect(calls[0]!.init.method).toBe('POST');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ bodyId: 454153, to: '09121234567', args: ['654321'] });
  });

  it('fails without exposing the code or token', async () => {
    const responses: [number, unknown][] = [
      [200, { recId: 0, status: 'error' }],
      [200, { recId: -4, status: 'bad pattern' }],
      [200, { status: 'به تنظیمات کنسول مراجعه کنید' }],
      [200, 'not json'],
      [500, { recId: 3741437414 }],
    ];
    for (const [status, body] of responses) {
      const { fetcher } = fakeFetch(status, body);
      const err = await new MelipayamakSmsProvider(config, fetcher).sendOtp('+989121234567', '654321').catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toMatch(/654321|secret-token/);
    }
  });
});

describe('smsProviderFromEnv', () => {
  const creds = { MELIPAYAMAK_TOKEN: 't', MELIPAYAMAK_OTP_BODY_ID: '12' };

  it('refuses unsafe production configuration', () => {
    expect(() => smsProviderFromEnv({ NODE_ENV: 'production', SMS_PROVIDER: 'console' })).toThrow(/not allowed/);
    expect(() => smsProviderFromEnv({ NODE_ENV: 'production' })).toThrow(/MELIPAYAMAK/);
    expect(() => smsProviderFromEnv({ NODE_ENV: 'production', ...creds, MELIPAYAMAK_OTP_BODY_ID: 'x' })).toThrow(/MELIPAYAMAK/);
    expect(() => smsProviderFromEnv({ SMS_PROVIDER: 'other' })).toThrow(/unknown/);
  });

  it('selects by environment', () => {
    expect(smsProviderFromEnv({})).toBeInstanceOf(ConsoleSmsProvider);
    expect(smsProviderFromEnv({ NODE_ENV: 'production', ...creds })).toBeInstanceOf(MelipayamakSmsProvider);
  });
});
