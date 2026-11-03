import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class GenerateBirthdayWishDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  recipientName!: string;

  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  tone!: string;

  @IsIn(['en', 'km'])
  language!: 'en' | 'km';

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(1000)
  context?: string;
}
