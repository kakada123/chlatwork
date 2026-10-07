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
    return { ai, service: new SecurityService(ai as never) };
  }
  const message: TelegramMessage = {
    message_id: 1,
    chat: { id: 123, type: 'private' },
    from: { id: 456, username: 'private-user' },
    text: 'Verify your account',
  };

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
    expect(result).toEqual({ ...assessment, status: 'scanned' });
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
});
