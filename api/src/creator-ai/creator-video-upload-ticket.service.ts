import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AiFeature } from '@prisma/client';
import { CreatorAiException } from './creator-ai.errors';
import { CreatorCreditsService } from './creator-credits.service';

export const CREATOR_VIDEO_UPLOAD_AUDIENCE = 'chlatwork-creator-video-upload';

const UPLOAD_PATHS: Partial<Record<AiFeature, string>> = {
  [AiFeature.VIDEO_SUBTITLE]: 'video/subtitle',
  [AiFeature.VIDEO_CAPTION]: 'video/caption',
  [AiFeature.VIDEO_SUMMARY]: 'video/summary',
  [AiFeature.VIDEO_CONTENT_PACK]: 'video/content-pack',
  [AiFeature.VIDEO_TO_SOCIAL]: 'repurpose/video-to-social',
};

export interface CreatorVideoUploadTicketPayload {
  sub: string;
  type: 'creator-video-upload';
  feature: AiFeature;
  idempotencyKey: string;
}

@Injectable()
export class CreatorVideoUploadTicketService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly credits: CreatorCreditsService,
  ) {}

  async issue(
    userId: string,
    feature: AiFeature,
    idempotencyHeader: string | undefined,
  ) {
    const path = UPLOAD_PATHS[feature];
    if (!path) {
      throw new CreatorAiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_VIDEO',
        'Unknown video workflow.',
      );
    }
    const idempotencyKey = this.credits.validateIdempotencyKey(
      idempotencyHeader,
    );
    const ticket = await this.jwt.signAsync<CreatorVideoUploadTicketPayload>(
      {
        sub: userId,
        type: 'creator-video-upload',
        feature,
        idempotencyKey,
      },
      { expiresIn: '5m', audience: CREATOR_VIDEO_UPLOAD_AUDIENCE },
    );
    const baseUrl = this.config
      .getOrThrow<string>('CREATOR_PUBLIC_API_BASE_URL')
      .replace(/\/$/, '');
    return {
      ticket,
      uploadUrl: `${baseUrl}/creator-ai/direct/${path}`,
      expiresInSeconds: 300,
    };
  }
}
