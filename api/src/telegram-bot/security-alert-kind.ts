import type { SecurityScanResult } from './security.types';

export type SecurityAlertKind =
  'infected_file' | 'unsafe_link' | 'suspicious_link';

export function securityAlertKind(
  result: SecurityScanResult,
): SecurityAlertKind | null {
  if (result.status !== 'scanned') return null;
  if (result.fileScan?.status === 'infected') return 'infected_file';
  if (result.urlScan?.status === 'unsafe') return 'unsafe_link';
  // A warning asks the owner to review; it must not weaken automatic deletion thresholds.
  if (
    result.riskScore >= 90 &&
    result.confidence >= 80 &&
    result.categories.some(
      (category) => category === 'phishing_url' || category === 'unsafe_url',
    )
  )
    return 'suspicious_link';
  return null;
}
