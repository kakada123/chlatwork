import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { PREPHUB_UPLOAD_LIMITS, type Upload } from './prephub.domain';
import {
  CreateItemDto,
  CreateSectionDto,
  CreateSubjectDto,
  ItemDto,
  ListSubjectsDto,
  ReminderDto,
  ReorderDto,
  ResourceDto,
  SectionDto,
  SubjectDto,
} from './prephub.dto';
import { PrepHubService } from './prephub.service';
const uuid = new ParseUUIDPipe({ version: '4' });

@Controller('prephub')
@UseGuards(JwtAuthGuard)
export class PrepHubController {
  constructor(private readonly hub: PrepHubService) {}
  @Get('dashboard') dashboard(@CurrentAuthUser() u: CurrentUser) {
    return this.hub.dashboard(u.id);
  }
  @Get('inbox') inbox(@CurrentAuthUser() u: CurrentUser) {
    return this.hub.inbox(u.id);
  }
  @Get('subjects') list(
    @CurrentAuthUser() u: CurrentUser,
    @Query() q: ListSubjectsDto,
  ) {
    return this.hub.list(u.id, q);
  }
  @Post('subjects') create(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: CreateSubjectDto,
  ) {
    return this.hub.create(u.id, dto);
  }
  @Get('subjects/:subjectId') workspace(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
  ) {
    return this.hub.workspace(u.id, s);
  }
  @Patch('subjects/:subjectId') update(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Body() dto: SubjectDto,
  ) {
    return this.hub.update(u.id, s, dto);
  }
  @Delete('subjects/:subjectId') remove(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
  ) {
    return this.hub.delete(u.id, s);
  }
  @Post('subjects/:subjectId/restore') restore(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
  ) {
    return this.hub.restore(u.id, s);
  }
  @Get('subjects/:subjectId/history') history(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Query() q: ListSubjectsDto,
  ) {
    return this.hub.history(u.id, s, q.page);
  }
  @Post('subjects/:subjectId/sections') section(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.hub.addSection(u.id, s, dto);
  }
  @Put('subjects/:subjectId/sections/reorder') sectionsOrder(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Body() dto: ReorderDto,
  ) {
    return this.hub.reorderSections(u.id, s, dto.ids);
  }
  @Patch('subjects/:subjectId/sections/:sectionId') editSection(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @Body() dto: SectionDto,
  ) {
    return this.hub.editSection(u.id, s, section, dto.title);
  }
  @Delete('subjects/:subjectId/sections/:sectionId') removeSection(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
  ) {
    return this.hub.removeSection(u.id, s, section);
  }
  @Post('subjects/:subjectId/sections/:sectionId/items') item(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.hub.addItem(u.id, s, section, dto);
  }
  @Put('subjects/:subjectId/sections/:sectionId/items/reorder') itemsOrder(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @Body() dto: ReorderDto,
  ) {
    return this.hub.reorderItems(u.id, s, section, dto.ids);
  }
  @Patch('subjects/:subjectId/sections/:sectionId/items/:itemId') editItem(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @Param('itemId', uuid) item: string,
    @Body() dto: ItemDto,
  ) {
    return this.hub.editItem(u.id, s, section, item, dto);
  }
  @Delete('subjects/:subjectId/sections/:sectionId/items/:itemId') removeItem(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @Param('itemId', uuid) item: string,
  ) {
    return this.hub.removeItem(u.id, s, section, item);
  }
  @Post('subjects/:subjectId/sections/:sectionId/resources')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: PREPHUB_UPLOAD_LIMITS,
    }),
  )
  upload(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('sectionId', uuid) section: string,
    @UploadedFile() file?: Upload,
  ) {
    return this.hub.upload(u.id, s, section, file);
  }
  @Get('subjects/:subjectId/resources/:resourceId')
  async file(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('resourceId', uuid) r: string,
    @Query('preview') preview: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.hub.file(u.id, s, r);
    const inline =
      preview === '1' &&
      ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(
        f.mimeType,
      );
    const name = `${f.title.replace(/[\x00-\x1f\x7f]/g, '_')}${f.title.toLowerCase().endsWith(`.${f.extension}`) ? '' : `.${f.extension}`}`;
    res.setHeader('Cache-Control', 'private, no-store');
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
  @Patch('subjects/:subjectId/resources/:resourceId') rename(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('resourceId', uuid) r: string,
    @Body() dto: ResourceDto,
  ) {
    return this.hub.resource(u.id, s, r, dto.title);
  }
  @Delete('subjects/:subjectId/resources/:resourceId') removeResource(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('resourceId', uuid) r: string,
  ) {
    return this.hub.resource(u.id, s, r);
  }
  @Post('subjects/:subjectId/reminders') reminder(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Body() dto: ReminderDto,
  ) {
    return this.hub.addReminder(u.id, s, dto);
  }
  @Patch('subjects/:subjectId/reminders/:reminderId') dismiss(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('reminderId', uuid) r: string,
  ) {
    return this.hub.reminder(u.id, s, r, true);
  }
  @Delete('subjects/:subjectId/reminders/:reminderId') removeReminder(
    @CurrentAuthUser() u: CurrentUser,
    @Param('subjectId', uuid) s: string,
    @Param('reminderId', uuid) r: string,
  ) {
    return this.hub.reminder(u.id, s, r, false);
  }
}
