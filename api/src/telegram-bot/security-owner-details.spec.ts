import { buildSecurityOwnerDetails } from './security-owner-details';
import type { TelegramMessage } from './telegram-bot.types';
import type { SecurityScanResult } from './security.types';

describe('private security report details', () => {
  const sent = Date.parse('2026-10-07T07:00:00Z') / 1000;
  const scanned = new Date('2026-10-07T07:01:00Z');
  const message: TelegramMessage = {
    message_id: 7,
    chat: { id: 222, type: 'private' },
    date: sent,
    from: {
      id: 222,
      first_name: 'Sok',
      last_name: 'Dara',
      username: 'sok_dara',
    },
    document: {
      file_id: 'never-store-file-id',
      file_name: 'invoice.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
    },
    text: 'Invoice',
    entities: [
      {
        type: 'text_link',
        offset: 0,
        length: 7,
        url: 'https://user:password@example.com/login?token=never-store#private',
      },
    ],
  };
  const result: SecurityScanResult = {
    status: 'scanned',
    riskScore: 100,
    confidence: 100,
    categories: ['suspicious_file', 'phishing_url'],
    fileScan: { status: 'infected' },
    urlScan: { status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] },
  };

  it('identifies sender, attachment, safe link target, times and scanner evidence', () => {
    const text = buildSecurityOwnerDetails(message, result, scanned);
    for (const value of [
      'Sok Dara',
      '@sok_dara',
      '222',
      'invoice.pdf',
      'application/pdf',
      '2.0 KiB',
      'hxxps://example[.]com/login',
      'Invoice',
      '14:00:00',
      '14:01:00',
      'UTC+07',
      '100/100',
      'infected',
      'SOCIAL_ENGINEERING',
    ])
      expect(text).toContain(value);
    for (const value of [
      'user:password',
      'never-store',
      '#private',
      'https://example.com',
      'never-store-file-id',
    ])
      expect(text).not.toContain(value);
  });

  it('bounds hostile metadata and removes control characters and unsafe embedded URLs', () => {
    const text = buildSecurityOwnerDetails(
      {
        ...message,
        from: {
          id: 222,
          first_name: 'Name\nDeleted\u202e ' + '😀'.repeat(4000),
        },
        document: {
          file_id: 'id',
          file_name:
            'https://user:password@example.com/file?token=never-store\nDeleted.pdf\u2066',
        },
        text: 'x'.repeat(7),
        entities: Array.from({ length: 100 }, (_, i) => ({
          type: 'text_link',
          offset: 0,
          length: 7,
          url: `https://example.com/${i}/${'a'.repeat(1500)}`,
        })),
      },
      result,
      scanned,
    );
    expect(text.length).toBeLessThanOrEqual(3000);
    expect(text).not.toMatch(/[\u202e\u2066]/);
    expect(text).not.toContain('https://');
    expect(text).not.toContain('password');
    expect(text).not.toContain('never-store');
    expect(text).toContain('95 more');
  });

  it('does not treat an unlisted link or an unavailable file scan as safe', () => {
    const text = buildSecurityOwnerDetails(
      { message_id: 7, chat: { id: 222, type: 'private' }, date: sent },
      {
        ...result,
        fileScan: { status: 'unavailable', reason: 'scanner_unavailable' },
        urlScan: { status: 'not_listed' },
      },
      scanned,
    );
    expect(text).toContain('Sender unavailable');
    expect(text).toContain('scanner_unavailable');
    expect(text).toContain('not proof of safety');
    expect(text).not.toContain('invoice.pdf');
  });

  it('uses fixed text for non-web link schemes rather than storing their payloads', () => {
    const text = buildSecurityOwnerDetails(
      {
        ...message,
        entities: [
          {
            type: 'text_link',
            offset: 0,
            length: 7,
            url: 'javascript:never-store',
          },
        ],
      },
      result,
      scanned,
    );
    expect(text).toContain('Unsupported link');
    expect(text).not.toContain('never-store');
  });
});
