import { TelegramFileSecurityService } from './telegram-file-security.service';
import { BadRequestException } from '@nestjs/common';

describe('Telegram document malware scanning', () => {
  const document = {
    file_id: 'private-file',
    file_name: 'private.pdf',
    file_size: 4,
  };
  function setup(overrides: Record<string, unknown> = {}) {
    const settings: Record<string, unknown> = {
      TELEGRAM_BUSINESS_FILE_SCAN_ENABLED: 'true',
      CLAMAV_HOST: 'clamav.railway.internal',
      ...overrides,
    };
    const config = { get: (key: string) => settings[key] };
    const bot = {
      downloadFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    };
    const clamav = { scan: jest.fn().mockResolvedValue({ status: 'clean' }) };
    return {
      bot,
      clamav,
      service: new TelegramFileSecurityService(
        config as never,
        bot as never,
        clamav as never,
      ),
    };
  }

  it('is opt-in and never downloads when disabled', async () => {
    const { service, bot } = setup({
      TELEGRAM_BUSINESS_FILE_SCAN_ENABLED: 'false',
    });
    await expect(service.scan(document)).resolves.toEqual({
      status: 'disabled',
    });
    expect(bot.downloadFile).not.toHaveBeenCalled();
  });

  it('sends only bounded bytes to the private scanner, regardless of filename/MIME', async () => {
    const { service, bot, clamav } = setup();
    await expect(
      service.scan({
        ...document,
        file_name: 'fake.jpg',
        mime_type: 'image/jpeg',
      }),
    ).resolves.toEqual({ status: 'clean' });
    expect(bot.downloadFile).toHaveBeenCalledWith(
      'private-file',
      10 * 1024 * 1024,
    );
    expect(clamav.scan).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3, 4]),
      expect.objectContaining({
        host: 'clamav.railway.internal',
        port: 3310,
        timeoutMs: 10000,
      }),
    );
    expect(JSON.stringify(clamav.scan.mock.calls)).not.toContain(
      'private-file',
    );
    expect(JSON.stringify(clamav.scan.mock.calls)).not.toContain('fake.jpg');
  });

  it.each([
    { file_size: 20 * 1024 * 1024 + 1 },
    { file_size: -1 },
    { file_size: 0 },
    { file_size: 1.5 },
    { file_id: '' },
  ])('does not download invalid/oversized documents: %j', async (override) => {
    const { service, bot } = setup();
    await expect(
      service.scan({ ...document, ...override }),
    ).resolves.toMatchObject({ status: 'unsupported' });
    expect(bot.downloadFile).not.toHaveBeenCalled();
  });

  it('preserves on unsafe configuration and download/scanner failures', async () => {
    const invalid = setup({ CLAMAV_HOST: 'scanner.example.com' });
    await expect(invalid.service.scan(document)).resolves.toMatchObject({
      status: 'unavailable',
    });
    expect(invalid.bot.downloadFile).not.toHaveBeenCalled();
    const { service, bot, clamav } = setup();
    bot.downloadFile.mockRejectedValueOnce(new Error('private token'));
    await expect(service.scan(document)).resolves.toEqual({
      status: 'unavailable',
      reason: 'download_failed',
    });
    expect(clamav.scan).not.toHaveBeenCalled();
    clamav.scan.mockRejectedValueOnce(new Error('private bytes'));
    await expect(service.scan(document)).resolves.toEqual({
      status: 'unavailable',
      reason: 'scanner_unavailable',
    });
  });

  it('bounds concurrent downloads/scans without queuing and releases slots on failure', async () => {
    const { service, bot } = setup({
      TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT: '1',
    });
    let release!: (bytes: Uint8Array) => void;
    bot.downloadFile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = service.scan(document);
    await expect(service.scan(document)).resolves.toEqual({
      status: 'busy',
      reason: 'concurrency_limit',
    });
    expect(bot.downloadFile).toHaveBeenCalledTimes(1);
    release(new Uint8Array([1]));
    await first;
    bot.downloadFile.mockRejectedValueOnce(new Error('download failed'));
    await service.scan(document);
    await expect(service.scan(document)).resolves.toEqual({ status: 'clean' });
  });

  it('preserves an oversized/unavailable Telegram file without sending bytes to ClamAV', async () => {
    const { service, bot, clamav } = setup();
    bot.downloadFile.mockRejectedValueOnce(
      new BadRequestException('File too large'),
    );
    await expect(service.scan(document)).resolves.toEqual({
      status: 'unsupported',
      reason: 'invalid_or_oversized_file',
    });
    bot.downloadFile.mockResolvedValueOnce(new Uint8Array());
    await expect(service.scan(document)).resolves.toMatchObject({
      status: 'unsupported',
    });
    expect(clamav.scan).not.toHaveBeenCalled();
  });
});
