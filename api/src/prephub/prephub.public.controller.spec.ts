import 'reflect-metadata';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  HEADERS_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrepHubController } from './prephub.controller';
import { PrepHubPublicController } from './prephub.public.controller';
describe('PrepHub public controller boundary', () => {
  it('keeps all owner management guarded and exposes only public GET handlers', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PrepHubController)).toContain(
      JwtAuthGuard,
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PrepHubPublicController),
    ).toBeUndefined();
    for (const name of Object.getOwnPropertyNames(
      PrepHubPublicController.prototype,
    ).filter((n) => n !== 'constructor'))
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          (PrepHubPublicController.prototype as any)[name],
        ),
      ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        HEADERS_METADATA,
        PrepHubPublicController.prototype.workspace,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Cache-Control',
          value: 'private, no-store',
        }),
        expect.objectContaining({
          name: 'Referrer-Policy',
          value: 'no-referrer',
        }),
      ]),
    );
  });
  it('rechecks file permission on every download and sanitizes download headers', async () => {
    const hub = {
      publicFile: jest.fn().mockResolvedValue({
        title: 'Report\r\n"',
        extension: 'pdf',
        mimeType: 'application/pdf',
        data: Buffer.from('%PDF'),
        fileSize: 4,
      }),
    };
    const controller = new PrepHubPublicController(hub as any),
      res = { setHeader: jest.fn() };
    const file = await controller.file('token', 'file', '1', res as any);
    expect(hub.publicFile).toHaveBeenCalledWith('token', 'file');
    expect(file.getHeaders().type).toBe('application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    const disposition = res.setHeader.mock.calls.find(
      ([name]) => name === 'Content-Disposition',
    )![1];
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).toContain('inline; filename="attachment.pdf"');
  });
});
