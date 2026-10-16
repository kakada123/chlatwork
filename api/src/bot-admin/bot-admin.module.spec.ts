import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiFeature } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditsService } from '../creator-ai/creator-credits.service';
import { BotAdminModule } from './bot-admin.module';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
const prisma = { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) };
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: prisma },
    {
      provide: ConfigService,
      useValue: { get: () => undefined, getOrThrow: () => 'dummy-test-value' },
    },
  ],
  exports: [PrismaService, ConfigService],
})
class SafeTestGlobals {}

describe('production access wiring', () => {
  it('enforces approval inside a real imported wallet module before touching funds', async () => {
    const module = await Test.createTestingModule({
      imports: [SafeTestGlobals, BotAdminModule],
    }).compile();
    const credits = module.get(CreatorCreditsService);
    await expect(
      credits.reserve({
        userId: '00000000-0000-4000-8000-000000000001',
        feature: AiFeature.KHMER_GRAMMAR,
        sourceBot: 'CREATOR',
        idempotencyKey: 'creator-telegram:123',
        requestHash: 'hash',
        inputSummary: 'test',
        credits: 1,
        isVideo: false,
      }),
    ).rejects.toThrow('Bot access is unavailable');
    await module.close();
  });
});
