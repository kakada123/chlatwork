import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BIRTHDAY_AUDIO_TRACKS } from '../birthday-audio';
import type { BirthdayStorySettings } from '../birthday-story';

export class BirthdayAudioDto {
  @IsIn(BIRTHDAY_AUDIO_TRACKS.map((track) => track.id))
  trackId!: string;

  @IsInt()
  @Min(0)
  startMs!: number;

  @IsInt()
  @Min(1000)
  endMs!: number;
}

const OCCASIONS = [
  'ANNIVERSARY',
  'BIRTHDAY',
  'LOVE',
  'FRIENDSHIP',
  'GRADUATION',
  'WEDDING',
  'BABY',
  'MOTHERS_DAY',
  'FATHERS_DAY',
  'HOLIDAY',
  'FAREWELL',
  'SURPRISE',
  'INVITATION',
  'VOTING',
  'OTHER',
] as const;

const THEMES = [
  'ROMANTIC', 'CUTE', 'CELEBRATION', 'SUNSET',
  'BOTANICAL', 'OCEAN', 'MINIMAL', 'ELEGANT',
] as const;

export class CreateMomentDto {
  @IsOptional()
  @IsObject()
  birthdayStory?: BirthdayStorySettings;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BirthdayAudioDto)
  birthdayAudio?: BirthdayAudioDto;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  recipientName!: string;

  @IsIn(OCCASIONS)
  occasion!: (typeof OCCASIONS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  message!: string;

  @ValidateIf((dto: CreateMomentDto, value: unknown) => !(value === '' && dto.occasion === 'BIRTHDAY'))
  @IsString()
  @MinLength(1)
  @MaxLength(1500)
  secretMessage!: string;

  @IsIn(THEMES)
  theme!: (typeof THEMES)[number];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  specialDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  publishAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  eventAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dressCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  eventSchedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hostName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  pollQuestion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  pollOptions?: string[];

  @IsOptional()
  @IsIn(['ANONYMOUS', 'NAME_REQUIRED', 'LOGIN_REQUIRED'])
  pollIdentityMode?: 'ANONYMOUS' | 'NAME_REQUIRED' | 'LOGIN_REQUIRED';
}
