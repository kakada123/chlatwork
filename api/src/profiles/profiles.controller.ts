import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/types';
import {
  CreateProfileLinkDto,
  ReorderProfileLinksDto,
  UpdateProfileDto,
  UpdateProfileLinkDto,
} from './dto/profile.dto';
import {
  MAX_PROFILE_IMAGE_BYTES,
  ProfilesService,
  type ProfileUpload,
} from './profiles.service';

@Controller('profiles/me')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get() async mine(@CurrentAuthUser() user: CurrentUser) {
    await this.profiles.assertEnabled();
    return this.profiles.getMine(user.id);
  }
  @Patch() async update(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.update(user.id, dto);
  }
  @Post('links') async addLink(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: CreateProfileLinkDto,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.addLink(user.id, dto);
  }
  @Patch('links/:id') async editLink(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProfileLinkDto,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.editLink(user.id, id, dto);
  }
  @Delete('links/:id') async deleteLink(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.deleteLink(user.id, id);
  }
  @Put('links/reorder') async reorder(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: ReorderProfileLinksDto,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.reorder(user.id, dto.ids);
  }

  @Post('media/:kind')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PROFILE_IMAGE_BYTES, files: 1 },
    }),
  )
  async upload(
    @CurrentAuthUser() user: CurrentUser,
    @Param('kind') kind: string,
    @UploadedFile() file?: ProfileUpload,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.uploadImage(user.id, kind, file);
  }

  @Get('media/:kind')
  async image(
    @CurrentAuthUser() user: CurrentUser,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.profiles.assertEnabled();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(await this.profiles.image(user.id, kind, true), {
      type: 'image/webp',
    });
  }
}

@Controller('public/profiles')
export class PublicProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get(':slug') async profile(@Param('slug') slug: string) {
    await this.profiles.assertEnabled();
    return this.profiles.publicProfile(slug);
  }
  @Post(':slug/view')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async view(@Param('slug') slug: string) {
    await this.profiles.assertEnabled();
    return this.profiles.recordView(slug);
  }
  @Post(':slug/links/:id/click')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  async click(
    @Param('slug') slug: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.profiles.assertEnabled();
    return this.profiles.recordClick(slug, id);
  }

  @Get(':slug/media/:kind')
  async image(
    @Param('slug') slug: string,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.profiles.assertEnabled();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(await this.profiles.image(slug, kind), {
      type: 'image/webp',
    });
  }
  @Get(':slug/og-image')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async ogImage(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.profiles.assertEnabled();
    response.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(await this.profiles.ogImage(slug), {
      type: 'image/jpeg',
    });
  }
}
