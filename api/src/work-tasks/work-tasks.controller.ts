import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { PREPHUB_UPLOAD_LIMITS, type Upload } from '../prephub/prephub.domain';
import {
  CreateFollowUpDto,
  CreateProjectDto,
  CreateTaskDto,
  FollowUpQueryDto,
  ListTasksDto,
  ObjectiveDto,
  RenameAttachmentDto,
  ReportDto,
  SubtaskDto,
  UpdateFollowUpDto,
  UpdateProjectDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
} from './work-tasks.dto';
import { WorkTasksService } from './work-tasks.service';
import { WorkTasksOrganization } from './work-tasks.organization';
import { WorkTasksReports } from './work-tasks.reports';
import { WorkTasksFiles } from './work-tasks.files';
const uuid = new ParseUUIDPipe({ version: '4' });
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class WorkTasksController {
  constructor(
    private readonly tasks: WorkTasksService,
    private readonly org: WorkTasksOrganization,
    private readonly reports: WorkTasksReports,
    private readonly files: WorkTasksFiles,
  ) {}
  @Get('dashboard') @Header('Cache-Control', 'private, no-store') dashboard(
    @CurrentAuthUser() u: CurrentUser,
    @Query() q: ListTasksDto,
  ) {
    return this.tasks.dashboard(u.id, q);
  }
  @Get('catalog') @Header('Cache-Control', 'private, no-store') catalog(
    @CurrentAuthUser() u: CurrentUser,
  ) {
    return this.org.catalog(u.id);
  }
  @Get('records') @Header('Cache-Control', 'private, no-store') list(
    @CurrentAuthUser() u: CurrentUser,
    @Query() q: ListTasksDto,
  ) {
    return this.tasks.list(u.id, q);
  }
  @Post('records') create(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(u.id, dto);
  }
  @Post('work-log') log(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.logWork(u.id, dto);
  }
  @Get('records/:id') @Header('Cache-Control', 'private, no-store') detail(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.detail(u.id, id);
  }
  @Patch('records/:id') update(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(u.id, id, dto);
  }
  @Delete('records/:id') remove(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.remove(u.id, id);
  }
  @Post('records/:id/duplicate') duplicate(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.duplicate(u.id, id);
  }
  @Post('records/:id/restore') restore(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.restore(u.id, id);
  }
  @Get('records/:id/events')
  @Header('Cache-Control', 'private, no-store')
  events(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Query() q: ListTasksDto,
  ) {
    return this.tasks.events(u.id, id, q.page);
  }
  @Post('records/:id/subtasks') subtask(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: SubtaskDto,
  ) {
    return this.tasks.addSubtask(u.id, id, dto);
  }
  @Patch('records/:taskId/subtasks/:id') updateSubtask(
    @CurrentAuthUser() u: CurrentUser,
    @Param('taskId', uuid) t: string,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.tasks.subtask(u.id, t, id, dto);
  }
  @Delete('records/:taskId/subtasks/:id') deleteSubtask(
    @CurrentAuthUser() u: CurrentUser,
    @Param('taskId', uuid) t: string,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.subtask(u.id, t, id);
  }
  @Post('records/:id/follow-ups') createFollowUp(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.tasks.addFollowUp(u.id, id, dto);
  }
  @Get('follow-ups') @Header('Cache-Control', 'private, no-store') followUps(
    @CurrentAuthUser() u: CurrentUser,
    @Query() q: FollowUpQueryDto,
  ) {
    return this.tasks.followUps(u.id, q);
  }
  @Patch('follow-ups/:id') updateFollowUp(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.tasks.followUp(u.id, id, dto);
  }
  @Delete('follow-ups/:id') deleteFollowUp(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.tasks.followUp(u.id, id);
  }
  @Get('projects') @Header('Cache-Control', 'private, no-store') projects(
    @CurrentAuthUser() u: CurrentUser,
  ) {
    return this.org.projects(u.id);
  }
  @Post('projects') project(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.org.project(u.id, dto);
  }
  @Patch('projects/:id') updateProject(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.org.project(u.id, dto, id);
  }
  @Delete('projects/:id') deleteProject(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.org.remove(u.id, 'project', id);
  }
  @Get('objectives') @Header('Cache-Control', 'private, no-store') objectives(
    @CurrentAuthUser() u: CurrentUser,
  ) {
    return this.org.objectives(u.id);
  }
  @Post('objectives') objective(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: ObjectiveDto,
  ) {
    return this.org.objective(u.id, dto);
  }
  @Patch('objectives/:id') updateObjective(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: ObjectiveDto,
  ) {
    return this.org.objective(u.id, dto, id);
  }
  @Delete('objectives/:id') deleteObjective(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.org.remove(u.id, 'objective', id);
  }
  @Get('reports') @Header('Cache-Control', 'private, no-store') listReports(
    @CurrentAuthUser() u: CurrentUser,
  ) {
    return this.reports.list(u.id);
  }
  @Post('reports/preview') preview(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: ReportDto,
  ) {
    return this.reports.preview(u.id, dto);
  }
  @Post('reports') report(
    @CurrentAuthUser() u: CurrentUser,
    @Body() dto: ReportDto,
  ) {
    return this.reports.save(u.id, dto);
  }
  @Get('reports/:id') @Header('Cache-Control', 'private, no-store') getReport(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.reports.get(u.id, id);
  }
  @Get('reports/:id/data')
  @Header('Cache-Control', 'private, no-store')
  reportData(@CurrentAuthUser() u: CurrentUser, @Param('id', uuid) id: string) {
    return this.reports.savedPreview(u.id, id);
  }
  @Patch('reports/:id') updateReport(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: ReportDto,
  ) {
    return this.reports.save(u.id, dto, id);
  }
  @Delete('reports/:id') deleteReport(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.reports.remove(u.id, id);
  }
  @Post('records/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: PREPHUB_UPLOAD_LIMITS }))
  upload(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @UploadedFile() file?: Upload,
  ) {
    return this.files.upload(u.id, id, file);
  }
  @Get('attachments/:id')
  async download(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Query('preview') preview: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.files.file(u.id, id),
      inline =
        preview === '1' &&
        ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(
          file.mimeType,
        );
    const name =
      file.title.replace(/[\x00-\x1f\x7f]/g, '_') +
      (file.title.toLowerCase().endsWith(`.${file.extension}`)
        ? ''
        : `.${file.extension}`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="attachment.${file.extension}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))}`,
    );
    return new StreamableFile(Buffer.from(file.data), {
      type: file.mimeType,
      length: file.fileSize,
    });
  }
  @Patch('attachments/:id') rename(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
    @Body() dto: RenameAttachmentDto,
  ) {
    return this.files.change(u.id, id, dto.title);
  }
  @Delete('attachments/:id') deleteAttachment(
    @CurrentAuthUser() u: CurrentUser,
    @Param('id', uuid) id: string,
  ) {
    return this.files.change(u.id, id);
  }
}
