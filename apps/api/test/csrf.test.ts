import { describe, expect, it } from 'vitest';
import { isCsrfRejected, type CsrfRequest } from '../src/config/csrf';

const env = { NODE_ENV: 'production', WEB_ORIGIN: 'https://noroset.com/' };
const post = (over: Partial<CsrfRequest>): CsrfRequest => ({
  method: 'POST',
  path: '/norolink/pages',
  origin: 'https://evil.example',
  cookie: 'access_token=x',
  ...over,
});

describe('isCsrfRejected', () => {
  it('rejects a foreign origin carrying a session cookie', () => {
    expect(isCsrfRejected(post({}), env)).toBe(true);
    expect(isCsrfRejected(post({ cookie: 'a=1; refresh_token=x' }), env)).toBe(true);
    expect(isCsrfRejected(post({ cookie: 'support_token=x' }), env)).toBe(true);
  });

  it('allows the web origin', () => {
    expect(isCsrfRejected(post({ origin: 'https://noroset.com' }), env)).toBe(false);
  });

  it('checks auth routes even without a cookie (login CSRF)', () => {
    expect(isCsrfRejected(post({ path: '/auth/otp/verify', cookie: undefined }), env)).toBe(true);
    expect(isCsrfRejected(post({ path: '/auth/otp/verify', origin: 'https://noroset.com', cookie: undefined }), env)).toBe(false);
  });

  it('leaves public routes without a session cookie open (n8l.ir beacons and forms)', () => {
    expect(isCsrfRejected(post({ path: '/norolink/public/pages/a/events', origin: 'https://a.n8l.ir', cookie: undefined }), env)).toBe(false);
    expect(isCsrfRejected(post({ cookie: 'noroset_utm=x' }), env)).toBe(false);
  });

  it('ignores safe methods, missing Origin and non-production', () => {
    expect(isCsrfRejected(post({ method: 'GET' }), env)).toBe(false);
    expect(isCsrfRejected(post({ origin: undefined }), env)).toBe(false);
    expect(isCsrfRejected(post({}), { NODE_ENV: 'development' })).toBe(false);
  });
});
