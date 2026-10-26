import { frontendOrigins, isAllowedCallback } from './frontend-origins';

describe('frontend origin policy', () => {
  const allowed = frontendOrigins('https://chlatwork.com', 'https://creator.chlatwork.com,https://link.chlatwork.com');
  it('retains the legacy origin and explicitly configured product origins', () => {
    expect(allowed).toEqual(['https://chlatwork.com', 'https://creator.chlatwork.com', 'https://link.chlatwork.com']);
    expect(isAllowedCallback('https://link.chlatwork.com/api/auth/telegram/callback', '/api/auth/telegram/callback', allowed)).toBe(true);
    expect(isAllowedCallback('https://creator.chlatwork.com/api/auth/google/callback', '/api/auth/google/callback', allowed)).toBe(true);
  });
  it('rejects sibling lookalikes, extra query data, credentials, and path changes', () => {
    for (const url of [
      'https://creator.chlatwork.com.evil.test/api/auth/google/callback',
      'https://creator.chlatwork.com/api/auth/google/callback?next=evil',
      'https://user:password@creator.chlatwork.com/api/auth/google/callback',
      'https://creator.chlatwork.com/api/auth/google/callback/',
      'https://unconfigured.chlatwork.com/api/auth/google/callback',
    ]) expect(isAllowedCallback(url, '/api/auth/google/callback', allowed)).toBe(false);
  });
  it('rejects wildcard or non-origin configuration and permits localhost development', () => {
    expect(frontendOrigins('http://localhost:3001')).toEqual(['http://localhost:3001']);
    for (const value of ['https://*.chlatwork.com', 'https://chlatwork.com/path', 'http://chlatwork.com', 'https://user:pass@chlatwork.com']) {
      expect(() => frontendOrigins(value)).toThrow();
    }
  });
});
