import {
  DEFAULT_SECURITY_WARNING_THRESHOLDS,
  type SecurityWarningThresholds,
} from '../config/security-warnings';
import { SECURITY_CATEGORIES, type SecurityScanResult } from './security.types';

export type SecurityAlertKind =
  'infected_file' | 'unsafe_link' | 'suspicious_link' | 'suspicious_message';

export function securityAlertKind(
  result: SecurityScanResult,
  thresholds: Readonly<SecurityWarningThresholds> = DEFAULT_SECURITY_WARNING_THRESHOLDS,
): SecurityAlertKind | null {
  if (result.status !== 'scanned') return null;
  if (result.fileScan?.status === 'infected') return 'infected_file';
  if (result.urlScan?.status === 'unsafe') return 'unsafe_link';
  // A warning asks the owner to review; it must not weaken automatic deletion thresholds.
  if (
    result.riskScore >= thresholds.riskScore &&
    result.confidence >= thresholds.confidence &&
    result.categories.some((category) => SECURITY_CATEGORIES.includes(category))
  )
    return result.categories.some(
      (category) => category === 'phishing_url' || category === 'unsafe_url',
    )
      ? 'suspicious_link'
      : 'suspicious_message';
  return null;
}
