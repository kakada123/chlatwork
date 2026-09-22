import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class MomentPollOptionDto {
  @IsOptional()
  @IsString()
  @Matches(/^option-\d+$/)
  @MaxLength(40)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

export class UpdateMomentPollOptionsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @Matches(/^option-\d+$/, { each: true })
  expectedOptionIds?: string[];

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => MomentPollOptionDto)
  options!: MomentPollOptionDto[];
}
