import { Module } from '@nestjs/common';
import { BotAccessService } from './bot-access.service';

// Keep access independent of wallets, clients and dashboard services so every
// paid execution path can enforce approval without a circular module dependency.
@Module({
  providers: [BotAccessService],
  exports: [BotAccessService],
})
export class BotAccessModule {}
