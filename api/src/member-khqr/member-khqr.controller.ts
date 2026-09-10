import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_KHQR_BYTES, MemberKhqrService } from './member-khqr.service';

@Controller('admin/member-khqr')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MemberKhqrAdminController {
  constructor(private readonly khqr: MemberKhqrService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return this.khqr.list();
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
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
  ) {
    return this.khqr.upload(key, file);
  }
}

// QR images are public, like the existing public/images/khqr files, so Telegram
// can fetch them. Administrative listing and replacement always require ADMIN.
@Controller('member-khqr')
export class MemberKhqrImageController {
  constructor(private readonly khqr: MemberKhqrService) {}

  @Get(':key')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(@Param('key') key: string) {
    return new StreamableFile(await this.khqr.image(key), {
      type: 'image/png',
    });
  }
}
