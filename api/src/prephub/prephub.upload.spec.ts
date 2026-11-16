import 'reflect-metadata';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { PrepHubController } from './prephub.controller';
import { Readable } from 'node:stream';
import { of } from 'rxjs';

async function upload(
  parts: { name: string; filename?: string; content: Buffer }[],
) {
  const boundary = 'prephub-multipart-boundary';
  const body = Buffer.concat([
    ...parts.map((part) =>
      Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.filename ? `; filename="${part.filename}"` : ''}\r\n${part.filename ? 'Content-Type: application/pdf\r\n' : ''}\r\n`,
        ),
        part.content,
        Buffer.from('\r\n'),
      ]),
    ),
    Buffer.from(`--${boundary}--\r\n`),
  ]);
  const req = Object.assign(Readable.from([body]), {
    method: 'POST',
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
  }) as any;
  const [Interceptor] = Reflect.getMetadata(
    INTERCEPTORS_METADATA,
    PrepHubController.prototype.upload,
  );
  await new Interceptor().intercept(
    {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
    } as any,
    { handle: () => of(true) },
  );
  return req.file;
}

describe('PrepHub actual multipart interceptor', () => {
  it('accepts exactly one supported file through Multer', async () => {
    const buffer = Buffer.from('%PDF-1.7\n');
    const result = await upload([
      { name: 'file', filename: 'research.pdf', content: buffer },
    ]);
    expect(result.buffer).toEqual(buffer);
    expect(result.originalname).toBe('research.pdf');
  });
  it('rejects additional files and unexpected fields', async () => {
    const file = {
      name: 'file',
      filename: 'research.pdf',
      content: Buffer.from('%PDF-1.7\n'),
    };
    await expect(upload([file, file])).rejects.toThrow();
    await expect(
      upload([{ name: 'userId', content: Buffer.from('another-owner') }, file]),
    ).rejects.toThrow();
  });
  it('accepts a file at exactly 5 MiB', async () => {
    const content = Buffer.alloc(5 * 1024 * 1024);
    const result = await upload([
      { name: 'file', filename: 'research.pdf', content },
    ]);
    expect(result.buffer.length).toBe(content.length);
  });
  it('rejects a file larger than the configured 5 MiB limit', async () => {
    await expect(
      upload([
        {
          name: 'file',
          filename: 'research.pdf',
          content: Buffer.alloc(5 * 1024 * 1024 + 1),
        },
      ]),
    ).rejects.toThrow();
  });
});
