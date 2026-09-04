import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AiFeature, UserRole } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreatorCreditsService } from './creator-credits.service';
import { CreatorVideoUploadTicketGuard } from './creator-video-upload-ticket.guard';
import { CreatorVideoUploadTicketService } from './creator-video-upload-ticket.service';

describe('Creator video upload tickets', () => {
  it('issues a short-lived ticket bound to one user, feature, and idempotency key', async () => {
    const jwt = { signAsync: jest.fn().mockResolvedValue('scoped-ticket') };
    const credits = {
      validateIdempotencyKey: jest.fn((value: string) => value),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://creator-api.example.com/'),
    };
    const service = new CreatorVideoUploadTicketService(
      config as unknown as ConfigService,
      jwt as unknown as JwtService,
      credits as unknown as CreatorCreditsService,
    );

    await expect(
      service.issue(
        'user-id',
        AiFeature.VIDEO_CONTENT_PACK,
        'idempotency-key-1234',
      ),
    ).resolves.toEqual({
      ticket: 'scoped-ticket',
      uploadUrl:
        'https://creator-api.example.com/creator-ai/direct/video/content-pack',
      expiresInSeconds: 300,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-id',
        feature: AiFeature.VIDEO_CONTENT_PACK,
        idempotencyKey: 'idempotency-key-1234',
      }),
      expect.objectContaining({ expiresIn: '5m' }),
    );
  });

  it('rejects a valid ticket when its idempotency key does not match the upload', async () => {
    const request = {
      headers: {
        authorization: 'Bearer scoped-ticket',
        'idempotency-key': 'different-idempotency-key',
      },
    };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(AiFeature.VIDEO_CAPTION),
    };
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-id',
        type: 'creator-video-upload',
        feature: AiFeature.VIDEO_CAPTION,
        idempotencyKey: 'idempotency-key-1234',
      }),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          role: UserRole.USER,
          isActive: true,
        }),
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const guard = new CreatorVideoUploadTicketGuard(
      reflector as unknown as Reflector,
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
    );

    await expect(
      guard.canActivate(context as unknown as ExecutionContext),
    ).rejects.toThrow('Video upload ticket does not match this request');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
