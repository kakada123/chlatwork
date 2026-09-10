import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import {
  MemberKhqrAdminController,
  MemberKhqrImageController,
} from './member-khqr.controller';
import { MemberKhqrService } from './member-khqr.service';

@Module({
  controllers: [MemberKhqrAdminController, MemberKhqrImageController],
  providers: [MemberKhqrService, AdminGuard],
})
export class MemberKhqrModule {}
