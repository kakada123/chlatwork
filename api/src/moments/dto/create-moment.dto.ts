import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  'INVITATION',
  'OTHER',
] as const;

const THEMES = ['ROMANTIC', 'CUTE', 'MINIMAL', 'ELEGANT'] as const;

export class CreateMomentDto {
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
}
