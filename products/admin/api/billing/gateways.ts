import { randomBytes } from 'node:crypto';
import type { PaymentGateway, PaymentRequest } from '@noroset/core';

// درگاه‌های پرداخت (Port PAYMENT_GATEWAY؛ docs/architecture.md §9.11). انتخاب با env:
//   PAYMENT_GATEWAY=zarinpal|fake (پیش‌فرض fake خارج از production)
//   ZARINPAL_MERCHANT_ID=...      ZARINPAL_SANDBOX=true|false
// در production درگاه ساختگی، sandbox یا زرین‌پال بدون مرچنت = برنامه بالا نمی‌آید.

type Fetch = typeof fetch;

/** زرین‌پال (API نسخه‌ی ۴، مبلغ ریال). */
export class ZarinpalGateway implements PaymentGateway {
  readonly name = 'zarinpal' as const;
  private readonly base: string;

  constructor(
    private readonly merchantId: string,
    sandbox: boolean,
    private readonly fetcher: Fetch = fetch,
  ) {
    this.base = sandbox ? 'https://sandbox.zarinpal.com/pg' : 'https://payment.zarinpal.com/pg';
  }

  async request(input: PaymentRequest) {
    const data = await this.post('/v4/payment/request.json', {
      merchant_id: this.merchantId,
      amount: input.amountRial,
      currency: 'IRR',
      description: input.description,
      callback_url: input.callbackUrl,
      ...(input.mobile ? { metadata: { mobile: input.mobile.replace(/^\+98/, '0') } } : {}),
    });
    if (data?.code !== 100 || typeof data.authority !== 'string') throw new Error(`zarinpal request failed: ${String(data?.code)}`);
    return { authority: data.authority, redirectUrl: `${this.base}/StartPay/${data.authority}` };
  }

  async verify(input: { authority: string; amountRial: number }) {
    const data = await this.post('/v4/payment/verify.json', { merchant_id: this.merchantId, amount: input.amountRial, authority: input.authority });
    // 100 = موفق، 101 = قبلاً تأیید شده (بازگشت تکراری).
    if (data?.code === 100 || data?.code === 101) {
      return { ok: true as const, refId: String(data.ref_id), cardPan: typeof data.card_pan === 'string' ? data.card_pan : null };
    }
    return { ok: false as const, reason: `code_${String(data?.code ?? 'unknown')}` };
  }

  private async post(path: string, body: unknown): Promise<{ code?: number; authority?: string; ref_id?: unknown; card_pan?: unknown } | undefined> {
    const res = await this.fetcher(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { code?: number } } | null;
    return json?.data && !Array.isArray(json.data) ? (json.data as never) : undefined;
  }
}

/** درگاه ساختگی (توسعه و تست): بدون پول، مستقیم به آدرس بازگشت با Status=OK. */
export class FakeGateway implements PaymentGateway {
  readonly name = 'fake' as const;

  async request(input: PaymentRequest) {
    const authority = `FAKE${randomBytes(12).toString('hex')}`;
    const url = new URL(input.callbackUrl);
    url.searchParams.set('Authority', authority);
    url.searchParams.set('Status', 'OK');
    return { authority, redirectUrl: url.toString() };
  }

  async verify(input: { authority: string }) {
    return input.authority.startsWith('FAKE')
      ? { ok: true as const, refId: `FAKE-${input.authority.slice(4, 12)}`, cardPan: null }
      : { ok: false as const, reason: 'unknown_authority' };
  }
}

export function gatewayFromEnv(env: Record<string, string | undefined> = process.env): PaymentGateway {
  const production = env.NODE_ENV === 'production';
  const kind = env.PAYMENT_GATEWAY?.trim() || (production ? 'zarinpal' : 'fake');
  if (kind === 'fake') {
    if (production) throw new Error('PAYMENT_GATEWAY=fake is not allowed in production');
    return new FakeGateway();
  }
  if (kind === 'zarinpal') {
    const merchant = env.ZARINPAL_MERCHANT_ID?.trim();
    if (!merchant) throw new Error('ZARINPAL_MERCHANT_ID is required for PAYMENT_GATEWAY=zarinpal');
    const sandbox = env.ZARINPAL_SANDBOX === 'true';
    // sandbox پرداخت را بدون دریافت پول تأیید می‌کند.
    if (sandbox && production) throw new Error('ZARINPAL_SANDBOX=true is not allowed in production');
    return new ZarinpalGateway(merchant, sandbox);
  }
  throw new Error(`unknown PAYMENT_GATEWAY: ${kind}`);
}

/** آدرس‌هایی که مرورگر می‌بیند: بازگشت درگاه به API (پشت proxy وب) و صفحه‌ی نتیجه در پنل. */
export function billingUrls(env: Record<string, string | undefined> = process.env) {
  const origin = (env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
  const raw = (env.API_BASE_PATH ?? '').trim().replace(/\/+$/, '');
  const apiBase = raw === '' ? '' : raw.startsWith('/') ? raw : `/${raw}`;
  return {
    callback: `${origin}${apiBase}/billing/callback`,
    result: (paymentId: string | null, status: 'ok' | 'failed') =>
      `${origin}/billing/result?status=${status}${paymentId ? `&payment=${encodeURIComponent(paymentId)}` : ''}`,
  };
}
