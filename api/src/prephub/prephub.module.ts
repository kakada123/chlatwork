import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrepHubController } from './prephub.controller';
import { PrepHubService } from './prephub.service';
@Module({
  imports: [PrismaModule],
  controllers: [PrepHubController],
  providers: [PrepHubService],
})
export class PrepHubModule {}
