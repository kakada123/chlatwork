import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { AppearanceController } from './appearance.controller';

@Module({
  controllers: [AdminController, AppearanceController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
