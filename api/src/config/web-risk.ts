export interface WebRiskConfig {
  apiKey: string;
  timeoutMs: number;
  maxLinks: number;
  maxConcurrent: number;
  maxRequestsPerMinute: number;
}

export function readWebRiskConfig(
  get: (key: string) => unknown,
): WebRiskConfig | null {
  const flag = get('TELEGRAM_BUSINESS_URL_SCAN_ENABLED');
  if (
    flag !== undefined &&
    !['true', 'false'].includes(String(flag).toLowerCase())
  )
    throw new Error('TELEGRAM_BUSINESS_URL_SCAN_ENABLED must be true or false');
  if (String(flag).toLowerCase() !== 'true') return null;
  const apiKey = String(get('WEBRISK_API_KEY') ?? '').trim();
  if (
    !apiKey ||
    apiKey.length > 256 ||
    /\s/.test(apiKey) ||
    /^(dummy_|replace_)/i.test(apiKey)
  )
    throw new Error('WEBRISK_API_KEY is required when URL scanning is enabled');
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = get(key);
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max)
      throw new Error(`${key} must be an integer from ${min} to ${max}`);
    return value;
  };
  return {
    apiKey,
    timeoutMs: integer('WEBRISK_TIMEOUT_MS', 5000, 1000, 10000),
    maxLinks: integer('TELEGRAM_BUSINESS_URL_SCAN_MAX_LINKS', 5, 1, 10),
    maxConcurrent: integer(
      'TELEGRAM_BUSINESS_URL_SCAN_MAX_CONCURRENT',
      2,
      1,
      4,
    ),
    maxRequestsPerMinute: integer(
      'TELEGRAM_BUSINESS_URL_SCAN_MAX_REQUESTS_PER_MINUTE',
      60,
      1,
      300,
    ),
  };
}
