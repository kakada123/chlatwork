export const SECURITY_CATEGORIES = [
  'scam',
  'phishing_url',
  'unsafe_url',
  'suspicious_file',
  'spam',
  'dangerous_content',
] as const;

export type SecurityCategory = (typeof SECURITY_CATEGORIES)[number];

export interface SecurityAssessment {
  riskScore: number;
  confidence: number;
  categories: SecurityCategory[];
}

export interface SecurityScanInput {
  text: string;
  caption: string;
  links: Array<{ target: string; label?: string }>;
  document: { fileName: string; mimeType: string } | null;
}

export interface SecurityScanResult extends SecurityAssessment {
  status: 'scanned' | 'unavailable' | 'unsupported';
  fileScan?: FileScanResult;
  urlScan?: UrlScanResult;
}

export const URL_THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
] as const;
export type UrlThreatType = (typeof URL_THREAT_TYPES)[number];
export interface UrlScanResult {
  status:
    | 'disabled'
    | 'not_listed'
    | 'unsafe'
    | 'unavailable'
    | 'unsupported'
    | 'busy';
  threatTypes?: UrlThreatType[];
  reason?:
    | 'invalid_config'
    | 'invalid_or_private_url'
    | 'too_many_links'
    | 'concurrency_limit'
    | 'rate_limited'
    | 'provider_unavailable'
    | 'invalid_response';
}

export interface FileScanResult {
  status:
    'disabled' | 'clean' | 'infected' | 'unavailable' | 'unsupported' | 'busy';
  reason?:
    | 'invalid_config'
    | 'invalid_or_oversized_file'
    | 'concurrency_limit'
    | 'download_failed'
    | 'scanner_unavailable'
    | 'scan_incomplete';
}
