import { describe, expect, it } from 'vitest';
import { getApiBasePath, parseTrustProxy, refreshCookiePath } from '../src/config/http';

describe('parseTrustProxy', () => {
  it('defaults to not trusting any proxy', () => {
    expect(parseTrustProxy({})).toBe(false);
    expect(parseTrustProxy({ TRUST_PROXY: '' })).toBe(false);
    expect(parseTrustProxy({ TRUST_PROXY: 'false' })).toBe(false);
  });

  it('parses true, hop counts and address lists', () => {
    expect(parseTrustProxy({ TRUST_PROXY: 'true' })).toBe(true);
    expect(parseTrustProxy({ TRUST_PROXY: '1' })).toBe(1);
    expect(parseTrustProxy({ TRUST_PROXY: 'loopback' })).toEqual(['loopback']);
    expect(parseTrustProxy({ TRUST_PROXY: 'loopback, 10.0.0.0/8' })).toEqual(['loopback', '10.0.0.0/8']);
  });
});

describe('refresh cookie path', () => {
  it('follows API_BASE_PATH so the browser sends it through the web proxy', () => {
    expect(refreshCookiePath({})).toBe('/auth');
    expect(refreshCookiePath({ API_BASE_PATH: '/api' })).toBe('/api/auth');
    expect(refreshCookiePath({ API_BASE_PATH: 'api/' })).toBe('/api/auth');
    expect(getApiBasePath({ API_BASE_PATH: '  ' })).toBe('');
  });
});
