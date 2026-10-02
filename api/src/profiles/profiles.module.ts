import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  ProfilesController,
  PublicProfilesController,
} from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController, PublicProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
