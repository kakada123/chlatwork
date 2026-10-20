import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DailyMomentVoteScheduler } from '../telegram-bot/daily-moment-vote.scheduler';
import { TelegramGroupVoteService } from '../telegram-bot/telegram-group-vote.service';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { GroupVoteService } from './group-vote.service';
import { GroupWorkspacesModule } from './group-workspaces.module';

// Provider verification is outside this wiring test; jose is ESM-only under the CommonJS Jest runner.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

// Use explicit dummy providers; compiling the module must never load local env files or connect to a database.
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: () => undefined,
        getOrThrow: () => 'test-only-placeholder',
      },
    },
    { provide: PrismaService, useValue: {} },
  ],
  exports: [ConfigService, PrismaService],
})
class TestGlobals {}

it('resolves HTTP reset and private bot controls with one shared voting scheduler', async () => {
  const module = await Test.createTestingModule({
    imports: [TestGlobals, GroupWorkspacesModule],
    providers: [TelegramGroupVoteService, TelegramBotClient],
  }).compile();
  try {
    expect(module.get(GroupVoteService)).toBeInstanceOf(GroupVoteService);
    expect(module.get(TelegramGroupVoteService)).toBeInstanceOf(
      TelegramGroupVoteService,
    );
    const worker = module
      .select(GroupWorkspacesModule)
      .get(DailyMomentVoteScheduler, { strict: true });
    expect(module.get(DailyMomentVoteScheduler, { each: true })).toEqual([
      worker,
    ]);
  } finally {
    await module.close();
  }
});
