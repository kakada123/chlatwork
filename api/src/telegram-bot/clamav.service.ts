import { Injectable } from '@nestjs/common';
import { createConnection } from 'node:net';
import type { ClamavConfig } from '../config/clamav';
import type { FileScanResult } from './security.types';

const CHUNK_BYTES = 64 * 1024;
const MAX_REPLY_BYTES = 4096;

@Injectable()
export class ClamavService {
  scan(
    bytes: Uint8Array,
    settings: Pick<ClamavConfig, 'host' | 'port' | 'timeoutMs'>,
  ): Promise<FileScanResult> {
    return new Promise((resolve) => {
      const socket = createConnection({
        host: settings.host,
        port: settings.port,
      });
      let settled = false;
      let reply = Buffer.alloc(0);
      const unavailable: FileScanResult = {
        status: 'unavailable',
        reason: 'scanner_unavailable',
      };
      const finish = (result: FileScanResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        resolve(result);
      };
      // A total deadline also covers DNS/connect and stalled writes, unlike an idle timeout.
      const timer = setTimeout(() => finish(unavailable), settings.timeoutMs);
      socket.on('error', () => finish(unavailable));
      socket.on('close', () => finish(unavailable));
      socket.on('data', (chunk: Buffer) => {
        if (settled) return;
        if (reply.length + chunk.length > MAX_REPLY_BYTES) {
          finish(unavailable);
          return;
        }
        reply = Buffer.concat([reply, chunk]);
        const end = reply.indexOf(0);
        if (end < 0) return;
        const line = reply.subarray(0, end).toString('utf8');
        if (line === 'stream: OK') {
          finish({ status: 'clean' });
          return;
        }
        const match = /^stream: ([A-Za-z0-9_.-]{1,256}) FOUND$/.exec(line);
        if (!match) {
          finish(unavailable);
          return;
        }
        // Limits/encryption/heuristics are inconclusive, not signature-confirmed malware.
        finish(
          match[1]!.startsWith('Heuristics.')
            ? { status: 'unsupported', reason: 'scan_incomplete' }
            : { status: 'infected' },
        );
      });
      socket.once('connect', () => {
        const write = (chunk: Buffer) =>
          new Promise<void>((done, reject) => {
            if (settled) {
              reject(new Error('Scan ended'));
              return;
            }
            socket.write(chunk, (error?: Error | null) =>
              error ? reject(error) : done(),
            );
          });
        void (async () => {
          await write(Buffer.from('zINSTREAM\0'));
          for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
            const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
            const header = Buffer.alloc(4);
            header.writeUInt32BE(chunk.length);
            // Await each write callback to respect socket backpressure without buffering the file again.
            await write(header);
            await write(
              Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength),
            );
          }
          await write(Buffer.alloc(4));
        })().catch(() => finish(unavailable));
      });
    });
  }
}
