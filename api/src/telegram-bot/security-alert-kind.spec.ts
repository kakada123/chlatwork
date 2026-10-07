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
    { riskScore: 89 },
    { confidence: 79 },
    { categories: [] },
    { categories: ['suspicious_file'] },
    { status: 'unavailable' },
  ])('does not warn for inconclusive/non-link assessment %j', (change) => {
    expect(securityAlertKind({ ...base, ...change } as never)).toBeNull();
  });
});
