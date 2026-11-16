import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrepHubController } from './prephub.controller';
import { PrepHubPublicController } from './prephub.public.controller';
import { PrepHubService } from './prephub.service';
@Module({
  imports: [PrismaModule],
  controllers: [PrepHubController, PrepHubPublicController],
  providers: [PrepHubService],
})
export class PrepHubModule {}
