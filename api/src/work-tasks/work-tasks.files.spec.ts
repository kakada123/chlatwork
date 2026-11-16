import 'reflect-metadata';
import {
  INTERCEPTORS_METADATA,
  GUARDS_METADATA,
} from '@nestjs/common/constants';
import { Readable } from 'node:stream';
import { of } from 'rxjs';
import { NotFoundException } from '@nestjs/common';
import { WorkTasksController } from './work-tasks.controller';
import { WorkTasksFiles } from './work-tasks.files';
import { WorkTasksStore } from './work-tasks.store';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
async function multipart(size: number, count = 1) {
  const boundary = 'tasks-test-boundary',
    body = Buffer.concat([
      ...Array.from({ length: count }, () =>
        Buffer.concat([
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
          ),
          Buffer.alloc(size),
          Buffer.from('\r\n'),
        ]),
      ),
      Buffer.from(`--${boundary}--\r\n`),
    ]),
    req = Object.assign(Readable.from([body]), {
      method: 'POST',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
    }) as any;
  const [Interceptor] = Reflect.getMetadata(
    INTERCEPTORS_METADATA,
    WorkTasksController.prototype.upload,
  );
  await new Interceptor().intercept(
    {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
    } as any,
    { handle: () => of(true) },
  );
  return req.file;
}
describe('Tasks private upload boundary', () => {
  it('requires JWT authentication for the whole feature controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, WorkTasksController)).toContain(
      JwtAuthGuard,
    );
  });
  it('accepts one 5 MiB file through the actual endpoint interceptor', async () => {
    expect((await multipart(5 * 1024 * 1024)).buffer.length).toBe(
      5 * 1024 * 1024,
    );
  });
  it('rejects larger uploads and multiple files', async () => {
    await expect(multipart(5 * 1024 * 1024 + 1)).rejects.toThrow();
    await expect(multipart(100, 2)).rejects.toThrow();
  });
  it('does not read another owners file bytes', async () => {
    const db: any = {
      workAttachment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const files = new WorkTasksFiles(new WorkTasksStore(db));
    await expect(files.file('owner', 'file')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.workAttachment.findFirst).toHaveBeenCalledWith({
      where: { id: 'file', task: { userId: 'owner' } },
    });
  });
});
