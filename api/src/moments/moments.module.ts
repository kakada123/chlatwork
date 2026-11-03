import { Module } from '@nestjs/common';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { GroupAccessModule } from '../group-workspaces/group-access.module';
import { CreatorAiGatewayService } from '../creator-ai/creator-ai-gateway.service';
import { BirthdayWishService } from './birthday-wish.service';
import { BirthdayWishRateLimitGuard } from './birthday-wish-rate-limit.guard';
import { BirthdayAudioService } from './birthday-audio.service';

@Module({
  imports: [GroupAccessModule],
  controllers: [MomentsController],
  providers: [MomentsService, CreatorAiGatewayService, BirthdayWishService, BirthdayWishRateLimitGuard, BirthdayAudioService],
  exports: [MomentsService],
})
export class MomentsModule {}
