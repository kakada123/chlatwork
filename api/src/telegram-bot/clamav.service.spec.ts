import { EventEmitter } from 'node:events';
import * as net from 'node:net';
import { ClamavService } from './clamav.service';

jest.mock('node:net', () => ({
  ...jest.requireActual('node:net'),
  createConnection: jest.fn(),
}));

describe('ClamAV INSTREAM transport', () => {
  const settings = { host: '127.0.0.1', port: 3310, timeoutMs: 1000 };
  function setup(reply = 'stream: OK\0') {
    const socket = new EventEmitter() as EventEmitter & {
      write: jest.Mock;
      destroy: jest.Mock;
    };
    const writes: Buffer[] = [];
    socket.destroy = jest.fn();
    socket.write = jest.fn(
      (bytes: Buffer, callback: (error?: Error) => void) => {
        writes.push(Buffer.from(bytes));
        callback();
        if (bytes.length === 4 && bytes.readUInt32BE() === 0 && reply) {
          queueMicrotask(() => {
            // Replies may be split at any TCP byte boundary.
            socket.emit('data', Buffer.from(reply.slice(0, 5)));
            socket.emit('data', Buffer.from(reply.slice(5)));
          });
        }
        return true;
      },
    );
    (net.createConnection as jest.Mock).mockImplementation(() => {
      queueMicrotask(() => socket.emit('connect'));
      return socket;
    });
    return { socket, writes, service: new ClamavService() };
  }
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('sends bytes with big-endian chunk framing and a zero terminator', async () => {
    const { service, writes, socket } = setup();
    const bytes = new Uint8Array(70_000).fill(123);
    await expect(service.scan(bytes, settings)).resolves.toEqual({
      status: 'clean',
    });
    expect(net.createConnection).toHaveBeenCalledWith({
      host: settings.host,
      port: 3310,
    });
    const wire = Buffer.concat(writes);
    expect(wire.subarray(0, 10).toString()).toBe('zINSTREAM\0');
    let offset = 10;
    const chunks: Buffer[] = [];
    while (wire.readUInt32BE(offset) !== 0) {
      const length = wire.readUInt32BE(offset);
      expect(length).toBeLessThanOrEqual(65_536);
      offset += 4;
      chunks.push(wire.subarray(offset, offset + length));
      offset += length;
    }
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(bytes));
    expect(offset + 4).toBe(wire.length);
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('recognizes a signature without exposing the raw scanner response', async () => {
    const { service } = setup('stream: Win.Test.Signature FOUND\0');
    await expect(service.scan(new Uint8Array([1]), settings)).resolves.toEqual({
      status: 'infected',
    });
  });

  it.each([
    'stream: Heuristics.Limits.Exceeded.MaxScanSize FOUND\0',
    'stream: Heuristics.Encrypted.Zip FOUND\0',
  ])('treats incomplete/heuristic scans as unsupported: %s', async (reply) => {
    const { service } = setup(reply);
    await expect(service.scan(new Uint8Array([1]), settings)).resolves.toEqual({
      status: 'unsupported',
      reason: 'scan_incomplete',
    });
  });

  it.each([
    'stream: private-error ERROR\0',
    'INSTREAM size limit exceeded. ERROR\0',
    'private-response\0',
    'stream: OK\n',
    'stream: ' + 'x'.repeat(4096) + '\0',
  ])(
    'never reports a malformed/error reply as clean or infected',
    async (reply) => {
      const { service, socket } = setup(reply);
      const pending = service.scan(new Uint8Array([1]), settings);
      await new Promise<void>((resolve) => setImmediate(resolve));
      socket.emit('close');
      await expect(pending).resolves.toEqual({
        status: 'unavailable',
        reason: 'scanner_unavailable',
      });
    },
  );

  it('bounds total connection time and closes a silent socket', async () => {
    jest.useFakeTimers();
    const { service, socket } = setup('');
    const pending = service.scan(new Uint8Array([1]), settings);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({
      status: 'unavailable',
      reason: 'scanner_unavailable',
    });
    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves on connection and write errors without leaking details', async () => {
    const { service, socket } = setup('');
    socket.write.mockImplementation(() => {
      throw new Error('private payload');
    });
    await expect(
      service.scan(new Uint8Array([1]), settings),
    ).resolves.toMatchObject({ status: 'unavailable' });
    const test = setup('');
    const pending = test.service.scan(new Uint8Array([1]), settings);
    test.socket.emit('error', new Error('private host'));
    await expect(pending).resolves.toMatchObject({ status: 'unavailable' });
  });
});
