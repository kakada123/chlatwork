import { Module } from '@nestjs/common';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { GroupAccessModule } from '../group-workspaces/group-access.module';

@Module({
  imports: [GroupAccessModule],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
