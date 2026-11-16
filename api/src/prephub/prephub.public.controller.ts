import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrepHubService } from './prephub.service';

// Public access is a revocable capability; keep it separate from the guarded management controller.
@Controller('prephub/public')
export class PrepHubPublicController {
  constructor(private readonly hub: PrepHubService) {}
  @Get(':token')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @Header('Referrer-Policy', 'no-referrer')
  workspace(@Param('token') token: string) {
    return this.hub.publicWorkspace(token);
  }

  @Get(':token/resources/:resourceId')
  async file(
    @Param('token') token: string,
    @Param('resourceId', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('preview') preview: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.hub.publicFile(token, id);
    const inline =
      preview === '1' &&
      ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(
        f.mimeType,
      );
    const title = f.title.replace(/[\x00-\x1f\x7f]/g, '_');
    const name = title.toLowerCase().endsWith(`.${f.extension}`)
      ? title
      : `${title}.${f.extension}`;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="attachment.${f.extension}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
    );
    return new StreamableFile(Buffer.from(f.data), {
      type: f.mimeType,
      length: f.fileSize,
    });
  }
}
