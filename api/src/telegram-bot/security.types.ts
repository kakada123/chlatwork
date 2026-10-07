export const SECURITY_CATEGORIES = [
  'scam',
  'phishing_url',
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
}
