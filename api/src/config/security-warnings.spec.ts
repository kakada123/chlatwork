import { readSecurityWarningThresholds } from './security-warnings';

describe('Security warning configuration', () => {
  it('defaults to moderate risk and supports explicit thresholds independently of deletion', () => {
    expect(readSecurityWarningThresholds(() => undefined)).toEqual({
      riskScore: 50,
      confidence: 60,
    });
    const values: Record<string, unknown> = {
      TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD: '70',
      TELEGRAM_BUSINESS_SECURITY_WARNING_CONFIDENCE_THRESHOLD: '75',
    };
    expect(readSecurityWarningThresholds((key) => values[key])).toEqual({
      riskScore: 70,
      confidence: 75,
    });
  });
  it.each(['0', '101', '60.5', 'invalid', Infinity, NaN])(
    'rejects invalid warning thresholds %s',
    (value) => {
      for (const key of [
        'TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD',
        'TELEGRAM_BUSINESS_SECURITY_WARNING_CONFIDENCE_THRESHOLD',
      ]) {
        expect(() =>
          readSecurityWarningThresholds((candidate) =>
            candidate === key ? value : undefined,
          ),
        ).toThrow(key);
      }
    },
  );
});
