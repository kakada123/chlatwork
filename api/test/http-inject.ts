import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { INestApplication } from '@nestjs/common';

// Exercise the real Express/Nest middleware without opening a socket in the restricted checkout.
export function injectHttp(
  app: INestApplication,
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  return new Promise<{
    status: number;
    headers: Headers;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }>((resolve, reject) => {
    const request = new IncomingMessage(new Socket());
    const payload = options.body === undefined ? '' : JSON.stringify(options.body);
    request.method = options.method ?? 'GET';
    request.url = path;
    request.headers = {
      ...options.headers,
      ...(payload
        ? {
            'content-type': 'application/json',
            'content-length': String(Buffer.byteLength(payload)),
          }
        : {}),
    };
    const response = new ServerResponse(request);
    const chunks: Buffer[] = [];
    response.write = ((chunk: string | Buffer) => {
      chunks.push(Buffer.from(chunk));
      return true;
    }) as typeof response.write;
    response.end = ((chunk?: string | Buffer) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      const text = Buffer.concat(chunks).toString('utf8');
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.getHeaders()))
        if (value !== undefined) headers.set(name, String(value));
      response.emit('finish');
      resolve({
        status: response.statusCode,
        headers,
        json: async () => JSON.parse(text),
        text: async () => text,
      });
      return response;
    }) as typeof response.end;
    request.on('error', reject);
    response.on('error', reject);
    if (payload) request.push(Buffer.from(payload));
    request.push(null);
    app.getHttpAdapter().getInstance().handle(request, response);
  });
}
