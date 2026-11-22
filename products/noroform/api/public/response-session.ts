import { createHmac, timingSafeEqual } from 'node:crypto';

/** کوکی نشست کوتاه‌عمر مشاهده‌ی یک پاسخ (بعد از OTP/کلید). */
export const RESPONSE_SESSION_COOKIE = 'nf_response_session';
export const RESPONSE_SESSION_TTL_SECONDS = 30 * 60;

function secret(): string {
  const value = process.env.RESPONSE_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('RESPONSE_SESSION_SECRET is not set');
  return 'dev-response-session-secret';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

interface SessionPayload {
  linkId: string;
  tokenHash: string;
  exp: number;
}

/** نشست محدود به همان لینک و همان توکن؛ ۳۰ دقیقه. */
export function signResponseSession(linkId: string, tokenHash: string): string {
  const payload: SessionPayload = { linkId, tokenHash, exp: Math.floor(Date.now() / 1000) + RESPONSE_SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyResponseSession(value: string | undefined, linkId: string, tokenHash: string): boolean {
  if (!value) return false;
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return false;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    return payload.linkId === linkId && payload.tokenHash === tokenHash && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
