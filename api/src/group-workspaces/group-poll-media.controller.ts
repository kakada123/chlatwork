import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { GroupPollMediaService } from './group-poll-media.service';
@Controller('bot/group-media')
export class GroupPollMediaController {
  constructor(private readonly media: GroupPollMediaService) {}
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'image/jpeg')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('token') token: string,
  ) {
    return new StreamableFile(await this.media.fetch(id, token));
  }
}
