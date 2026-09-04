import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaybackModule } from './payback/payback.module';
import { validateEnvironment } from './config/environment';
import { ToolUsageModule } from './tool-usage/tool-usage.module';
import { MomentsModule } from './moments/moments.module';
import { AdminModule } from './admin/admin.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { CreatorAiModule } from './creator-ai/creator-ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    ExpensesModule,
    PaybackModule,
    ToolUsageModule,
    MomentsModule,
    AdminModule,
    FavoritesModule,
    NotificationsModule,
    TelegramBotModule,
    CreatorAiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
