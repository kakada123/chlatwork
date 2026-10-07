import { SecurityService } from './security.service';
import type { TelegramMessage } from './telegram-bot.types';

describe('SecurityService', () => {
  const assessment = {
    riskScore: 92,
    confidence: 98,
    categories: ['scam', 'phishing_url'],
  };
  function setup() {
    const ai = {
      isConfigured: jest.fn().mockReturnValue(true),
      assessMessageSecurity: jest.fn().mockResolvedValue({ ...assessment }),
    };
    const files = { scan: jest.fn().mockResolvedValue({ status: 'disabled' }) };
    const urls = { scan: jest.fn().mockResolvedValue({ status: 'disabled' }) };
    return {
      ai,
      files,
      urls,
      service: new SecurityService(ai as never, files as never, urls as never),
    };
  }
  const message: TelegramMessage = {
    message_id: 1,
    chat: { id: 123, type: 'private' },
    from: { id: 456, username: 'private-user' },
    text: 'Verify your account',
  };

  it.each(['SOCIAL_ENGINEERING', 'MALWARE', 'UNWANTED_SOFTWARE'])(
    'uses a real %s verdict even without AI',
    async (threat) => {
      const { service, urls, ai } = setup();
      ai.isConfigured.mockReturnValue(false);
      urls.scan.mockResolvedValue({
        status: 'unsafe',
        threatTypes: [threat],
      } as never);
      await expect(
        service.scan({ ...message, text: 'https://example.com/a' }),
      ).resolves.toMatchObject({
        status: 'scanned',
        riskScore: 100,
        confidence: 100,
        categories: [
          threat === 'SOCIAL_ENGINEERING' ? 'phishing_url' : 'unsafe_url',
        ],
        urlScan: { status: 'unsafe' },
      });
      expect(ai.assessMessageSecurity).not.toHaveBeenCalled();
    },
  );
  it('continues AI phishing assessment for an unlisted link or failed reputation lookup', async () => {
    const { service, urls, ai } = setup();
    for (const status of ['not_listed', 'unavailable', 'busy']) {
      urls.scan.mockResolvedValue({ status } as never);
      await expect(
        service.scan({ ...message, text: 'https://example.com/login' }),
      ).resolves.toMatchObject({ ...assessment, urlScan: { status } });
    }
    expect(ai.assessMessageSecurity).toHaveBeenCalledTimes(3);
  });
  it('cannot promote an inconclusive lookup into a malicious verdict without AI', async () => {
    const { service, urls, ai } = setup();
    ai.isConfigured.mockReturnValue(false);
    urls.scan.mockResolvedValue({ status: 'unavailable' } as never);
    await expect(
      service.scan({ ...message, text: 'https://example.com/login' }),
    ).resolves.toMatchObject({
      status: 'unavailable',
      riskScore: 0,
      confidence: 0,
      categories: [],
    });
  });

  it('scans text and disguised links without transmitting identity or file IDs', async () => {
    const { ai, service } = setup();
    const result = await service.scan({
      ...message,
      caption: 'invoice',
      entities: [
        {
          type: 'text_link',
          offset: 0,
          length: 6,
          url: 'https://example.invalid/login',
        },
      ],
      caption_entities: [{ type: 'url', offset: 0, length: 7 }],
      document: {
        file_id: 'private-file-id',
        file_name: 'invoice.pdf.exe',
        mime_type: 'application/octet-stream',
      },
    });
    expect(result).toEqual({
      ...assessment,
      status: 'scanned',
      fileScan: { status: 'disabled' },
      urlScan: { status: 'disabled' },
    });
    expect(ai.assessMessageSecurity).toHaveBeenCalledWith({
      text: message.text,
      caption: 'invoice',
      links: [
        { target: 'https://example.invalid/login', label: 'Verify' },
        { target: 'invoice' },
      ],
      document: {
        fileName: 'invoice.pdf.exe',
        mimeType: 'application/octet-stream',
      },
    });
    const payload = JSON.stringify(ai.assessMessageSecurity.mock.calls);
    expect(payload).not.toContain('private-user');
    expect(payload).not.toContain('private-file-id');
  });

  it('caps confidence when only file metadata is suspicious', async () => {
    const { ai, service } = setup();
    ai.assessMessageSecurity.mockResolvedValue({
      riskScore: 99,
      confidence: 99,
      categories: ['suspicious_file'],
    });
    await expect(service.scan(message)).resolves.toMatchObject({
      confidence: 85,
    });
  });

  it.each([
    { categories: ['scam'] },
    { categories: ['suspicious_file', 'scam'] },
  ])('caps file-only confidence for assessment %j', async ({ categories }) => {
    const { ai, service } = setup();
    ai.assessMessageSecurity.mockResolvedValue({
      riskScore: 99,
      confidence: 99,
      categories,
    });
    await expect(
      service.scan({
        ...message,
        text: undefined,
        caption: '   ',
        document: {
          file_id: 'private-file-id',
          file_name: 'invoice.pdf.exe',
          mime_type: 'application/octet-stream',
        },
      }),
    ).resolves.toMatchObject({ confidence: 85 });
  });

  it('preserves unscannable media and oversized input without calling the provider', async () => {
    const { ai, service } = setup();
    await expect(
      service.scan({
        ...message,
        text: undefined,
        photo: [{ file_id: 'photo', width: 1, height: 1 }],
      }),
    ).resolves.toMatchObject({ status: 'unsupported', riskScore: 0 });
    await expect(
      service.scan({ ...message, text: 'x'.repeat(20_001) }),
    ).resolves.toMatchObject({ status: 'unsupported' });
    expect(ai.assessMessageSecurity).not.toHaveBeenCalled();
  });

  it('preserves messages when the provider is missing or fails', async () => {
    const { ai, service } = setup();
    ai.isConfigured.mockReturnValue(false);
    await expect(service.scan(message)).resolves.toMatchObject({
      status: 'unavailable',
      confidence: 0,
    });
    expect(ai.assessMessageSecurity).not.toHaveBeenCalled();
    ai.isConfigured.mockReturnValue(true);
    ai.assessMessageSecurity.mockRejectedValue(
      new Error('private provider content'),
    );
    await expect(service.scan(message)).resolves.toMatchObject({
      status: 'unavailable',
      categories: [],
    });
  });

  it('detects an infected document even without AI or text, and bypasses metadata confidence caps', async () => {
    const { service, ai, files } = setup();
    ai.isConfigured.mockReturnValue(false);
    files.scan.mockResolvedValue({ status: 'infected' });
    const document = { file_id: 'private-id', file_name: 'invoice.pdf' };
    await expect(
      service.scan({ ...message, text: undefined, document }),
    ).resolves.toEqual({
      status: 'scanned',
      riskScore: 100,
      confidence: 100,
      categories: ['suspicious_file'],
      fileScan: { status: 'infected' },
    });
    expect(files.scan).toHaveBeenCalledWith(document);
    expect(ai.assessMessageSecurity).not.toHaveBeenCalled();
  });

  it.each(['clean', 'unavailable', 'unsupported', 'busy'])(
    'does not turn a %s document scan into a high-confidence threat',
    async (status) => {
      const { service, files, ai } = setup();
      files.scan.mockResolvedValue({ status });
      ai.assessMessageSecurity.mockResolvedValue({
        riskScore: 99,
        confidence: 99,
        categories: ['suspicious_file'],
      });
      await expect(
        service.scan({
          ...message,
          text: undefined,
          document: { file_id: 'id' },
        }),
      ).resolves.toMatchObject({ confidence: 85, fileScan: { status } });
    },
  );

  it('retains independent phishing caption assessment alongside a clean file verdict', async () => {
    const { service, files } = setup();
    files.scan.mockResolvedValue({ status: 'clean' });
    await expect(
      service.scan({ ...message, document: { file_id: 'id' } }),
    ).resolves.toMatchObject({ ...assessment, fileScan: { status: 'clean' } });
  });

  it('does not download attachments for text-only or unsupported photo messages', async () => {
    const { service, files } = setup();
    await service.scan(message);
    await service.scan({
      ...message,
      text: undefined,
      photo: [{ file_id: 'photo', width: 1, height: 1 }],
    });
    expect(files.scan).not.toHaveBeenCalled();
  });
});
