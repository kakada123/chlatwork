import { Module } from '@nestjs/common';
import { PaybackController } from './payback.controller';
import { PaybackService } from './payback.service';

@Module({ controllers: [PaybackController], providers: [PaybackService] })
export class PaybackModule {}
