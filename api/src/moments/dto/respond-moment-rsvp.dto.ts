import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class RespondMomentRsvpDto {
  @IsUUID('4')
  responseToken!: string;

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
