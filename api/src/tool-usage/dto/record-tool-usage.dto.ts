import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

export class RecordToolUsageDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  toolKey!: string;

  @IsIn(['OPEN'])
  event!: 'OPEN';
}
