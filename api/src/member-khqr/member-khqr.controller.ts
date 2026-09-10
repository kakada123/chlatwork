import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_KHQR_BYTES, MemberKhqrService } from './member-khqr.service';
import { MemberKhqrGroupQueryDto } from './member-khqr-group-query.dto';
import { memberKhqrImageType } from './member-khqr-image';

@Controller('admin/member-khqr')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MemberKhqrAdminController {
  constructor(private readonly khqr: MemberKhqrService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: MemberKhqrGroupQueryDto) {
    return this.khqr.list(query.chatId);
  }

  @Get('groups')
  @Header('Cache-Control', 'no-store')
  groups() {
    return this.khqr.groups();
  }

  @Post(':key')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_KHQR_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  upload(
    @Param('key') key: string,
    @Query() query: MemberKhqrGroupQueryDto,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
  ) {
    return this.khqr.upload(query.chatId, key, file);
  }
}

// Telegram needs public image access; listing and replacement require ADMIN.
@Controller('member-khqr')
export class MemberKhqrImageController {
  constructor(private readonly khqr: MemberKhqrService) {}

  @Get(':key')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(@Param('key') key: string) {
    const content = await this.khqr.image(key);
    const type = memberKhqrImageType(content);
    if (!type) throw new NotFoundException('KHQR not found');
    return new StreamableFile(content, { type });
  }
}
