import { isIP } from 'node:net';

export interface ClamavConfig {
  host: string;
  port: number;
  timeoutMs: number;
  maxBytes: number;
  maxConcurrent: number;
}

export function readClamavConfig(
  get: (key: string) => unknown,
): ClamavConfig | null {
  const flag = get('TELEGRAM_BUSINESS_FILE_SCAN_ENABLED');
  if (
    flag !== undefined &&
    !['true', 'false'].includes(String(flag).toLowerCase())
  ) {
    throw new Error(
      'TELEGRAM_BUSINESS_FILE_SCAN_ENABLED must be true or false',
    );
  }
  if (String(flag).toLowerCase() !== 'true') return null;

  const host = String(get('CLAMAV_HOST') ?? '')
    .trim()
    .toLowerCase();
  const octets = host.split('.').map(Number);
  const privateIpv4 =
    isIP(host) === 4 &&
    (octets[0] === 127 ||
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  const privateIpv6 =
    isIP(host) === 6 && (host === '::1' || /^(fc|fd)/.test(host));
  // ClamD TCP has no authentication/TLS. Never send inbox files to public hosts.
  if (!(
    host === 'localhost' ||
    privateIpv4 ||
    privateIpv6 ||
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.railway\.internal$/.test(host)
  ))
    throw new Error(
      'CLAMAV_HOST must be a loopback/private IP or Railway private hostname',
    );

  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = get(key);
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`${key} must be an integer from ${min} to ${max}`);
    }
    return value;
  };
  return {
    host,
    port: integer('CLAMAV_PORT', 3310, 1, 65535),
    timeoutMs: integer('CLAMAV_TIMEOUT_MS', 10000, 1000, 30000),
    maxBytes: integer(
      'TELEGRAM_BUSINESS_FILE_SCAN_MAX_BYTES',
      10 * 1024 * 1024,
      1,
      20 * 1024 * 1024,
    ),
    maxConcurrent: integer(
      'TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT',
      2,
      1,
      4,
    ),
  };
}
