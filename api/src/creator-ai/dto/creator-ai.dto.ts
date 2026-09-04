import { Type } from 'class-transformer';
import { AiFeature } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const CREATOR_PLATFORMS = [
  'FACEBOOK',
  'TIKTOK',
  'INSTAGRAM',
  'YOUTUBE',
] as const;
export const CREATOR_LANGUAGES = [
  'KHMER',
  'ENGLISH',
  'KHMER_ENGLISH',
] as const;
export const CREATOR_TONES = [
  'NATURAL',
  'FRIENDLY',
  'PROFESSIONAL',
  'FUNNY',
  'GEN_Z',
  'SELLING',
  'CASUAL',
  'SHORTER',
  'MORE_ENGAGING',
  'NATURAL_KHMER',
  'SELLER',
] as const;

export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];
export type CreatorLanguage = (typeof CREATOR_LANGUAGES)[number];
export type CreatorTone = (typeof CREATOR_TONES)[number];

class LanguageToneDto {
  @IsIn(CREATOR_LANGUAGES)
  language!: CreatorLanguage;

  @IsIn(CREATOR_TONES)
  tone!: CreatorTone;
}

export class GeneratePostDto extends LanguageToneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  topic!: string;

  @IsIn(CREATOR_PLATFORMS)
  platform!: CreatorPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}

export class GenerateScriptDto extends GeneratePostDto {
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(600)
  durationSeconds!: number;
}

export class GenerateHooksDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  topic!: string;

  @IsIn(CREATOR_PLATFORMS)
  platform!: CreatorPlatform;

  @IsIn(CREATOR_TONES)
  tone!: CreatorTone;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  count = 5;
}

export class GenerateIdeasDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1_000)
  niche!: string;

  @IsIn(CREATOR_PLATFORMS)
  platform!: CreatorPlatform;

  @IsIn([
    'GROW_AUDIENCE',
    'SELL_PRODUCT',
    'EDUCATE',
    'ENGAGEMENT',
    'BRAND_AWARENESS',
  ])
  goal!:
    | 'GROW_AUDIENCE'
    | 'SELL_PRODUCT'
    | 'EDUCATE'
    | 'ENGAGEMENT'
    | 'BRAND_AWARENESS';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  count = 5;
}

export class KhmerGrammarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  content!: string;
}

export class RewriteDto extends LanguageToneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  content!: string;
}

export class LatinToKhmerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4_000)
  content!: string;
}

export class FacebookToTikTokDto extends RewriteDto {}

export class LongToShortDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content!: string;

  @IsIn(['SHORT', 'VERY_SHORT', 'TIKTOK', 'FACEBOOK_SHORT'])
  style!: 'SHORT' | 'VERY_SHORT' | 'TIKTOK' | 'FACEBOOK_SHORT';

  @IsIn(CREATOR_LANGUAGES)
  language!: CreatorLanguage;
}

export class VideoGenerateDto extends LanguageToneDto {}

export class CreatorVideoUploadTicketDto {
  @IsEnum(AiFeature)
  feature!: AiFeature;
}
