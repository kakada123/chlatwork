import { TelegramUrlSecurityService } from './telegram-url-security.service';

describe('URL reputation scanning', () => {
  const target = 'https://example.com/login?next=home#fragment';
  const match = {
    threat: {
      threatTypes: ['SOCIAL_ENGINEERING'],
      expireTime: new Date(Date.now() + 60000).toISOString(),
    },
  };
  let fetchMock: jest.SpyInstance;
  const setup = (overrides: Record<string, unknown> = {}) => {
    const values: Record<string, unknown> = {
      TELEGRAM_BUSINESS_URL_SCAN_ENABLED: 'true',
      WEBRISK_API_KEY: 'dummy-test-key',
      ...overrides,
    };
    return new TelegramUrlSecurityService({
      get: (key: string) => values[key],
    } as never);
  };
  beforeEach(() => {
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('queries only the fixed Google endpoint with no redirects, strips fragments and puts the key in a header', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(match)));
    await expect(setup().scan([{ target }])).resolves.toEqual({
      status: 'unsafe',
      threatTypes: ['SOCIAL_ENGINEERING'],
    });
    const [url, options] = fetchMock.mock.calls[0]!;
    const request = new URL(String(url));
    expect(request.origin + request.pathname).toBe(
      'https://webrisk.googleapis.com/v1/uris:search',
    );
    expect(request.searchParams.get('uri')).toBe(
      'https://example.com/login?next=home',
    );
    expect(request.searchParams.getAll('threatTypes')).toEqual([
      'MALWARE',
      'SOCIAL_ENGINEERING',
      'UNWANTED_SOFTWARE',
    ]);
    expect(String(url)).not.toContain('dummy-test-key');
    expect(options).toMatchObject({
      redirect: 'error',
      headers: { 'X-Goog-Api-Key': 'dummy-test-key' },
    });
  });
  it('reports not listed, never safe, when the provider has no match', async () => {
    await expect(setup().scan([{ target }])).resolves.toEqual({
      status: 'not_listed',
    });
  });
  it.each([
    'http://localhost/a',
    'http://127.1/a',
    'http://0x7f000001/a',
    'http://10.1.2.3/a',
    'http://192.168.1.2/a',
    'http://clamav.railway.internal/a',
    'http://[::1]/a',
    'file:///tmp/file',
    'https://user:password@example.com/a',
    'https://example.com/?access_token=private',
    'https://example.com/?sig=private',
    'https://example.com/?code=private',
    'https://example.com/?sessionid=private',
  ])('does not send private/unsupported URL %s', async (target) => {
    await expect(setup().scan([{ target }])).resolves.toMatchObject({
      status: 'unsupported',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('is opt-in and rejects invalid configuration without a request', async () => {
    await expect(
      setup({ TELEGRAM_BUSINESS_URL_SCAN_ENABLED: 'false' }).scan([{ target }]),
    ).resolves.toEqual({ status: 'disabled' });
    await expect(
      setup({ WEBRISK_API_KEY: '' }).scan([{ target }]),
    ).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'invalid_config',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    new Response('provider-error', { status: 403 }),
    new Response('not-json'),
    new Response('{"unexpected":true}'),
    new Response('{"threat":{"threatTypes":["UNKNOWN"]}}'),
    new Response('x'.repeat(65537)),
  ])('preserves inconclusive provider failures', async (response) => {
    fetchMock.mockResolvedValue(response);
    await expect(setup().scan([{ target }])).resolves.toMatchObject({
      status: 'unavailable',
    });
  });
  it('does not classify a partially scanned message as not listed', async () => {
    await expect(
      setup({ TELEGRAM_BUSINESS_URL_SCAN_MAX_LINKS: 1 }).scan([
        { target },
        { target: 'https://example.org/a' },
      ]),
    ).resolves.toMatchObject({
      status: 'unsupported',
      reason: 'too_many_links',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('caches hashed targets and coalesces simultaneous requests', async () => {
    const service = setup();
    await Promise.all([service.scan([{ target }]), service.scan([{ target }])]);
    await service.scan([{ target }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('caps requests and never caches provider errors', async () => {
    fetchMock.mockRejectedValue(new Error('private-provider-details'));
    const service = setup({
      TELEGRAM_BUSINESS_URL_SCAN_MAX_REQUESTS_PER_MINUTE: 1,
    });
    await expect(service.scan([{ target }])).resolves.toMatchObject({
      status: 'unavailable',
    });
    await expect(service.scan([{ target }])).resolves.toMatchObject({
      status: 'busy',
      reason: 'rate_limited',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('bounds concurrent requests and releases capacity after failure', async () => {
    let reject!: (reason: Error) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const service = setup({ TELEGRAM_BUSINESS_URL_SCAN_MAX_CONCURRENT: 1 });
    const first = service.scan([{ target }]);
    await expect(
      service.scan([{ target: 'https://example.org/a' }]),
    ).resolves.toMatchObject({ status: 'busy', reason: 'concurrency_limit' });
    reject(new Error('failure'));
    await first;
    await expect(
      service.scan([{ target: 'https://example.org/a' }]),
    ).resolves.toEqual({ status: 'not_listed' });
  });

  it('aborts an unavailable provider at the configured deadline', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          (options.signal as AbortSignal).addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const result = setup({ WEBRISK_TIMEOUT_MS: 1000 }).scan([{ target }]);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'provider_unavailable',
    });
  });
  it('does not cache a positive match past the provider expiry', async () => {
    jest.useFakeTimers();
    const start = Date.now();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          threat: {
            threatTypes: ['MALWARE'],
            expireTime: new Date(start + 1000).toISOString(),
          },
        }),
      ),
    );
    const service = setup();
    await expect(service.scan([{ target }])).resolves.toMatchObject({
      status: 'unsafe',
    });
    jest.setSystemTime(start + 1001);
    await expect(service.scan([{ target }])).resolves.toEqual({
      status: 'not_listed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('can still flag a dangerous public link when another target is unsupported', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          threat: {
            threatTypes: ['MALWARE'],
            expireTime: new Date(Date.now() + 60000).toISOString(),
          },
        }),
      ),
    );
    await expect(
      setup().scan([{ target: 'http://localhost/private' }, { target }]),
    ).resolves.toMatchObject({ status: 'unsafe' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
