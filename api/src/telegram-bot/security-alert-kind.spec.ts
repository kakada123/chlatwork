import { securityAlertKind } from './security-alert-kind';

describe('Security alert eligibility', () => {
  const base = {
    status: 'scanned',
    riskScore: 95,
    confidence: 90,
    categories: ['phishing_url'],
  };
  it('warns for the observed 95 risk / 90 confidence phishing finding without lowering deletion thresholds', () => {
    expect(securityAlertKind(base as never)).toBe('suspicious_link');
  });
  it('uses a verified-link label for reputation matches and gives infected files priority', () => {
    expect(
      securityAlertKind({
        ...base,
        urlScan: { status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] },
      } as never),
    ).toBe('unsafe_link');
    expect(
      securityAlertKind({
        ...base,
        fileScan: { status: 'infected' },
        urlScan: { status: 'unsafe' },
      } as never),
    ).toBe('infected_file');
  });
  it.each([
    { riskScore: 49 },
    { confidence: 59 },
    { categories: [] },
    { categories: ['unknown_category'] },
    { status: 'unavailable' },
    { status: 'unsupported' },
  ])('does not warn for inconclusive/non-link assessment %j', (change) => {
    expect(securityAlertKind({ ...base, ...change } as never)).toBeNull();
  });

  it.each([
    { categories: ['phishing_url'], kind: 'suspicious_link' },
    { categories: ['unsafe_url'], kind: 'suspicious_link' },
    { categories: ['scam'], kind: 'suspicious_message' },
    { categories: ['suspicious_file'], kind: 'suspicious_message' },
    { categories: ['spam'], kind: 'suspicious_message' },
    { categories: ['dangerous_content'], kind: 'suspicious_message' },
  ])(
    'warns at the moderate-risk boundary for $categories',
    ({ categories, kind }) => {
      expect(
        securityAlertKind({
          ...base,
          riskScore: 50,
          confidence: 60,
          categories,
        } as never),
      ).toBe(kind);
    },
  );

  it('uses configurable warning thresholds without restricting confirmed scanner alerts', () => {
    const thresholds = { riskScore: 70, confidence: 75 };
    expect(
      securityAlertKind(
        { ...base, riskScore: 69, confidence: 80 } as never,
        thresholds,
      ),
    ).toBeNull();
    expect(
      securityAlertKind(
        { ...base, riskScore: 70, confidence: 74 } as never,
        thresholds,
      ),
    ).toBeNull();
    expect(
      securityAlertKind(
        { ...base, riskScore: 70, confidence: 75 } as never,
        thresholds,
      ),
    ).toBe('suspicious_link');
    expect(
      securityAlertKind(
        {
          ...base,
          riskScore: 0,
          confidence: 0,
          fileScan: { status: 'infected' },
        } as never,
        thresholds,
      ),
    ).toBe('infected_file');
    expect(
      securityAlertKind(
        {
          ...base,
          riskScore: 0,
          confidence: 0,
          urlScan: { status: 'unsafe' },
        } as never,
        thresholds,
      ),
    ).toBe('unsafe_link');
  });
});
