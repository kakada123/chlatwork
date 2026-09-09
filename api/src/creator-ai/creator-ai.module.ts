import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreatorAiController } from './creator-ai.controller';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorGenerationService } from './creator-generation.service';
import { CreatorPlanLimitsService } from './creator-plan-limits.service';
import { CreatorPricingService } from './creator-pricing.service';
import { CreatorProtectionService } from './creator-protection.service';
import { CreatorVideoController } from './creator-video.controller';
import { CreatorVideoService } from './creator-video.service';
import { CreatorVideoToolsService } from './creator-video-tools.service';
import { CreatorVideoWorker } from './creator-video.worker';
import { CreatorVideoDirectUploadController } from './creator-video-direct-upload.controller';
import { CreatorVideoUploadTicketGuard } from './creator-video-upload-ticket.guard';
import { CreatorVideoUploadTicketService } from './creator-video-upload-ticket.service';
import { CreatorCreditAdminController } from './creator-credit-admin.controller';
import { CreatorCreditAdminService } from './creator-credit-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CreatorAiController,
    CreatorCreditAdminController,
    CreatorVideoController,
    CreatorVideoDirectUploadController,
  ],
  providers: [
    CreatorAiGatewayService,
    CreatorCreditsService,
    CreatorCreditAdminService,
    CreatorGenerationService,
    CreatorPlanLimitsService,
    CreatorPricingService,
    CreatorProtectionService,
    CreatorVideoService,
    CreatorVideoToolsService,
    CreatorVideoWorker,
    CreatorVideoUploadTicketGuard,
    CreatorVideoUploadTicketService,
  ],
  exports: [
    CreatorGenerationService,
    CreatorCreditsService,
    CreatorPlanLimitsService,
    CreatorPricingService,
  ],
})
export class CreatorAiModule {}
