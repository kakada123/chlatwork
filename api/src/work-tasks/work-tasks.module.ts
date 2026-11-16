import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkTasksController } from './work-tasks.controller';
import { WorkTasksStore } from './work-tasks.store';
import { WorkTasksService } from './work-tasks.service';
import { WorkTasksOrganization } from './work-tasks.organization';
import { WorkTasksReports } from './work-tasks.reports';
import { WorkTasksFiles } from './work-tasks.files';
@Module({imports:[PrismaModule],controllers:[WorkTasksController],providers:[WorkTasksStore,WorkTasksService,WorkTasksOrganization,WorkTasksReports,WorkTasksFiles]})
export class WorkTasksModule{}
