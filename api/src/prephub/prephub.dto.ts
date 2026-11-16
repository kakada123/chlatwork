import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CATEGORIES,
  RESEARCH_STATUSES,
  SECTION_TYPES,
  STATUSES,
} from './prephub.domain';
const defined = (_: unknown, v: unknown) => v !== undefined;
const nonNull = (_: unknown, v: unknown) => v !== undefined && v !== null;

class SubjectFieldsDto {
  @ValidateIf(defined) @IsString() @MaxLength(4000) description?: string;
  @ValidateIf(defined) @IsString() @MaxLength(4000) goal?: string;
  @ValidateIf(defined) @IsIn(CATEGORIES) category?: string;
  @ValidateIf(defined) @IsIn(STATUSES) status?: string;
  @ValidateIf(defined) @IsIn(['LOW', 'NORMAL', 'HIGH']) priority?: string;
  @ValidateIf(nonNull) @IsISO8601({ strict: true }) eventAt?: string | null;
  @ValidateIf(nonNull) @IsISO8601({ strict: true }) deadlineAt?: string | null;
}
export class SubjectDto extends SubjectFieldsDto {
  @ValidateIf(defined) @IsString() @MinLength(1) @MaxLength(200) title?: string;
}
export class CreateSubjectDto extends SubjectFieldsDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @ValidateIf(defined)
  @IsIn(['NONE', 'GENERAL', 'RESEARCH', 'MEETING', 'VIDEO'])
  template?: string;
}
export class SectionDto {
  @IsString() @MinLength(1) @MaxLength(160) title: string;
}
export class CreateSectionDto extends SectionDto {
  @IsIn(SECTION_TYPES) type: string;
}
class ItemFieldsDto {
  @ValidateIf(defined) @IsString() @MaxLength(20000) content?: string;
  @ValidateIf(defined) @IsString() @MaxLength(4000) objective?: string;
  @ValidateIf(defined) @IsString() @MaxLength(20000) findings?: string;
  @ValidateIf(defined) @IsString() @MaxLength(8000) sources?: string;
  @ValidateIf(defined) @IsString() @MaxLength(8000) conclusion?: string;
  @ValidateIf(defined) @IsString() @MaxLength(2048) url?: string;
  @ValidateIf(defined) @IsString() @MaxLength(80) label?: string;
  @ValidateIf(defined) @IsIn(RESEARCH_STATUSES) status?: string;
  @ValidateIf(defined) @IsBoolean() isRequired?: boolean;
  @ValidateIf(defined) @IsBoolean() isCompleted?: boolean;
  @ValidateIf(nonNull) @IsISO8601({ strict: true }) dueAt?: string | null;
}
export class ItemDto extends ItemFieldsDto {
  @ValidateIf(defined) @IsString() @MinLength(1) @MaxLength(300) title?: string;
}
export class CreateItemDto extends ItemFieldsDto {
  @IsString() @MinLength(1) @MaxLength(300) title: string;
}
export class ReorderDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
export class ResourceDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
}
export class ReminderDto {
  @IsISO8601({ strict: true }) remindAt: string;
}
export class ListSubjectsDto {
  @ValidateIf(defined) @IsString() @MaxLength(200) q?: string;
  @ValidateIf(defined) @IsIn(CATEGORIES) category?: string;
  @ValidateIf(defined)
  @IsIn([...STATUSES, 'ACTIVE', 'ALL', 'UPCOMING', 'OVERDUE'])
  status?: string;
  @ValidateIf(defined) @IsIn(['UPCOMING', 'UPDATED', 'TITLE']) sort?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class ShareSubjectDto {
  @IsBoolean() includeAttachments: boolean;
  @ValidateIf(defined) @IsBoolean() regenerate?: boolean;
}
