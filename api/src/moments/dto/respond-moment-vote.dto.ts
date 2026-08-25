import { IsString, Matches, MaxLength, MinLength, IsOptional } from 'class-validator';

export class RespondMomentVoteDto {
  @IsString()
  @MinLength(16)
  @MaxLength(120)
  responseToken!: string;

  @IsString()
  @Matches(/^option-[1-9][0-9]?$/)
  optionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voterName?: string;
}
