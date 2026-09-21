import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureAvailabilityController } from './feature-availability.controller';
import { FeatureAvailabilityService } from './feature-availability.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [FeatureAvailabilityController],
  providers: [FeatureAvailabilityService],
  exports: [FeatureAvailabilityService],
})
export class FeatureAvailabilityModule {}
