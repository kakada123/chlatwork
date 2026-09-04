import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AiFeature } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../auth/types';
import {
  CREATOR_VIDEO_UPLOAD_AUDIENCE,
  type CreatorVideoUploadTicketPayload,
} from './creator-video-upload-ticket.service';

const CREATOR_VIDEO_FEATURE = 'creator-video-upload-feature';

export const CreatorVideoUploadFeature = (feature: AiFeature) =>
  SetMetadata(CREATOR_VIDEO_FEATURE, feature);

export interface CreatorDirectUploadRequest extends Request {
  user: CurrentUser;
  creatorVideoUpload: CreatorVideoUploadTicketPayload;
}

@Injectable()
export class CreatorVideoUploadTicketGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const expectedFeature = this.reflector.getAllAndOverride<AiFeature>(
      CREATOR_VIDEO_FEATURE,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<CreatorDirectUploadRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i);
    if (!expectedFeature || !match?.[1]) throw new UnauthorizedException();

    let payload: CreatorVideoUploadTicketPayload;
    try {
      payload = await this.jwt.verifyAsync<CreatorVideoUploadTicketPayload>(
        match[1],
        {
          issuer: 'chlatwork-auth',
          audience: CREATOR_VIDEO_UPLOAD_AUDIENCE,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired video upload ticket');
    }
    const idempotencyKey = request.headers['idempotency-key'];
    if (
      payload.type !== 'creator-video-upload' ||
      payload.feature !== expectedFeature ||
      typeof idempotencyKey !== 'string' ||
      payload.idempotencyKey !== idempotencyKey.trim()
    ) {
      throw new UnauthorizedException('Video upload ticket does not match this request');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException('User is inactive');
    request.user = { id: user.id, role: user.role };
    request.creatorVideoUpload = payload;
    return true;
  }
}
