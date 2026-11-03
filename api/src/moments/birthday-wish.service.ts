import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CreatorAiGatewayService } from '../creator-ai/creator-ai-gateway.service';
import { buildBirthdayWishPrompt } from './birthday-wish-prompt';
import type { GenerateBirthdayWishDto } from './dto/generate-birthday-wish.dto';

@Injectable()
export class BirthdayWishService {
  constructor(private readonly gateway: CreatorAiGatewayService) {}

  async generate(input: GenerateBirthdayWishDto) {
    try {
      // Reuse provider routing and structured parsing without creating a billed Creator generation.
      const result = await this.gateway.generateStructured(
        AiFeature.POST,
        `birthday-wish:${randomUUID()}`,
        buildBirthdayWishPrompt(input),
      );
      return result.data;
    } catch {
      // Provider details and personal card content must never reach the client or application logs.
      throw new ServiceUnavailableException(
        'Birthday wish generation is unavailable. Please try again later.',
      );
    }
  }
}
