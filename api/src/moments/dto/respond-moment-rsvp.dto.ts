import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class RespondMomentRsvpDto {
  @IsOptional()
  @IsUUID('4')
  responseToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  guestToken?: string;

  @IsIn(['YES', 'MAYBE', 'NO'])
  choice!: 'YES' | 'MAYBE' | 'NO';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;

  @IsInt()
  @Min(0)
  @Max(20)
  guestCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
