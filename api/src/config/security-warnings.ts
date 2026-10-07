export interface SecurityWarningThresholds {
  riskScore: number;
  confidence: number;
}

export const DEFAULT_SECURITY_WARNING_THRESHOLDS: Readonly<SecurityWarningThresholds> =
  Object.freeze({ riskScore: 50, confidence: 60 });

export function readSecurityWarningThresholds(
  get: (key: string) => unknown,
): SecurityWarningThresholds {
  const threshold = (key: string, fallback: number) => {
    const raw = get(key);
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < 1 || value > 100)
      throw new Error(`${key} must be an integer from 1 to 100`);
    return value;
  };
  return {
    riskScore: threshold(
      'TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD',
      DEFAULT_SECURITY_WARNING_THRESHOLDS.riskScore,
    ),
    confidence: threshold(
      'TELEGRAM_BUSINESS_SECURITY_WARNING_CONFIDENCE_THRESHOLD',
      DEFAULT_SECURITY_WARNING_THRESHOLDS.confidence,
    ),
  };
}
