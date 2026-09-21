import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class MomentPollOptionDto {
  @IsString()
  @Matches(/^option-\d+$/)
  @MaxLength(40)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

export class UpdateMomentPollOptionsDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MomentPollOptionDto)
  options!: MomentPollOptionDto[];
}
