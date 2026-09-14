import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PersonalReminderStatus, PersonalTaskStatus } from '@prisma/client';

export class PersonalSearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;
}

export class PersonalTaskQueryDto extends PersonalSearchDto {
  @IsOptional()
  @IsEnum(PersonalTaskStatus)
  status?: PersonalTaskStatus;
}

export class PersonalReminderQueryDto {
  @IsOptional()
  @IsEnum(PersonalReminderStatus)
  status?: PersonalReminderStatus;
}

export class PersonalRecordIdDto {
  @IsUUID()
  id!: string;
}
