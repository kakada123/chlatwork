export function frontendOrigins(primary: string, additional = ''): string[] {
  return [...new Set([primary, ...additional.split(',')].map((value) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('chrome-extension://')) {
      const url = new URL(trimmed);
      if (
        url.protocol !== 'chrome-extension:' ||
        !/^[a-z0-9_-]+$/i.test(url.hostname) ||
        (url.pathname !== '' && url.pathname !== '/') ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      ) {
        throw new Error('Chrome extension origins must be valid chrome-extension://<id> origins');
      }
      return `${url.protocol}//${url.hostname}`;
    }
    const url = new URL(trimmed);
    if (
      !['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.hostname.includes('*') || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol === 'http:' && !/^(localhost|[a-z0-9-]+\.localhost|127\.0\.0\.1)$/.test(url.hostname))
    ) throw new Error('Frontend origins must be exact HTTPS origins or local development origins');
    return url.origin;
  }).filter(Boolean))];
}

export function isAllowedCallback(value: string, path: string, origins: string[]) {
  // Exact equality pins the scheme, port, path, and absence of query/fragment credentials.
  return origins.some((origin) => value === `${origin}${path}`);
}
