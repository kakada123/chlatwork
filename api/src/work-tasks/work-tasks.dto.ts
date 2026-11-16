import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsISO8601, IsIn, IsInt, IsNumber, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { OBJECTIVE_STATUSES, PRIORITIES, PROJECT_STATUSES, TASK_STATUSES } from './work-tasks.domain';
const defined=(_:unknown,v:unknown)=>v!==undefined;
const nonNull=(_:unknown,v:unknown)=>v!==undefined&&v!==null;
class TaskFieldsDto {
  @ValidateIf(defined) @IsString() @MaxLength(4000) description?:string;
  @ValidateIf(defined) @IsIn(TASK_STATUSES) status?:string;
  @ValidateIf(defined) @IsIn(PRIORITIES) priority?:string;
  @ValidateIf(defined) @IsString() @MaxLength(80) category?:string;
  @ValidateIf(nonNull) @IsUUID('4') projectId?:string|null;
  @ValidateIf(defined) @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('4',{each:true}) objectiveIds?:string[];
  @ValidateIf(nonNull) @IsISO8601({strict:true}) startAt?:string|null;
  @ValidateIf(nonNull) @IsISO8601({strict:true}) dueAt?:string|null;
  @ValidateIf(nonNull) @IsISO8601({strict:true}) completedAt?:string|null;
  @ValidateIf(nonNull) @IsInt() @Min(0) @Max(1000000) estimatedMinutes?:number|null;
  @ValidateIf(nonNull) @IsInt() @Min(0) @Max(1000000) actualMinutes?:number|null;
  @ValidateIf(defined) @IsString() @MaxLength(4000) notes?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) summary?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) contribution?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) impact?:string;
  @ValidateIf(defined) @IsString() @MaxLength(1000) skills?:string;
  @ValidateIf(defined) @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsString({each:true}) @MaxLength(40,{each:true}) tags?:string[];
  @ValidateIf(defined) @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsString({each:true}) @MaxLength(2048,{each:true}) evidence?:string[];
  @ValidateIf(defined) @IsBoolean() highlighted?:boolean;
}
export class CreateTaskDto extends TaskFieldsDto { @IsString() @MinLength(1) @MaxLength(200) title:string; }
export class UpdateTaskDto extends TaskFieldsDto { @ValidateIf(defined) @IsString() @MinLength(1) @MaxLength(200) title?:string; }
export class SubtaskDto { @IsString() @MinLength(1) @MaxLength(300) title:string; @ValidateIf(defined) @IsBoolean() isCompleted?:boolean; }
export class UpdateSubtaskDto { @ValidateIf(defined) @IsString() @MinLength(1) @MaxLength(300) title?:string; @ValidateIf(defined) @IsBoolean() isCompleted?:boolean; }
class ProjectFieldsDto {
  @ValidateIf(defined) @IsString() @MaxLength(4000) description?:string;
  @ValidateIf(defined) @Matches(/^#[0-9a-fA-F]{6}$/) color?:string;
  @ValidateIf(defined) @IsIn(PROJECT_STATUSES) status?:string;
  @ValidateIf(nonNull) @Matches(/^\d{4}-\d{2}-\d{2}$/) targetDate?:string|null;
  @ValidateIf(defined) @IsString() @MaxLength(4000) notes?:string;
  @ValidateIf(defined) @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('4',{each:true}) objectiveIds?:string[];
}
export class CreateProjectDto extends ProjectFieldsDto { @IsString() @MinLength(1) @MaxLength(160) name:string; }
export class UpdateProjectDto extends ProjectFieldsDto { @ValidateIf(defined) @IsString() @MinLength(1) @MaxLength(160) name?:string; }
export class ObjectiveDto {
  @IsString() @MinLength(1) @MaxLength(200) title:string;
  @ValidateIf(defined) @IsString() @MaxLength(4000) description?:string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from:string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to:string;
  @ValidateIf(defined) @IsString() @MaxLength(4000) successCriteria?:string;
  @ValidateIf(nonNull) @IsNumber({maxDecimalPlaces:4}) @Min(-1000000000000) @Max(1000000000000) targetValue?:number|null;
  @ValidateIf(nonNull) @IsNumber({maxDecimalPlaces:4}) @Min(-1000000000000) @Max(1000000000000) actualValue?:number|null;
  @ValidateIf(defined) @IsString() @MaxLength(80) metricUnit?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) verificationEvidence?:string;
  @ValidateIf(defined) @IsBoolean() verifyResult?:boolean;
  @ValidateIf(defined) @IsIn(OBJECTIVE_STATUSES) status?:string;
}
class FollowUpFieldsDto {
  @ValidateIf(defined) @IsString() @MaxLength(2000) note?:string;
  @ValidateIf(defined) @IsString() @MaxLength(1000) nextAction?:string;
  @ValidateIf(nonNull) @IsISO8601({strict:true}) remindAt?:string|null;
}
export class CreateFollowUpDto extends FollowUpFieldsDto { @IsISO8601({strict:true}) followUpAt:string; }
export class UpdateFollowUpDto extends FollowUpFieldsDto {
  @ValidateIf(defined) @IsISO8601({strict:true}) followUpAt?:string;
  @ValidateIf(defined) @IsBoolean() resolved?:boolean;
  @ValidateIf(defined) @IsBoolean() dismiss?:boolean;
}
export class ListTasksDto {
  @ValidateIf(defined) @IsIn(['DUE_TODAY','OVERDUE']) focus?:string;
  @ValidateIf(defined) @IsString() @MaxLength(200) q?:string;
  @ValidateIf(defined) @IsIn(TASK_STATUSES) status?:string;
  @ValidateIf(defined) @IsIn(['ACTIVE','ALL','COMPLETED','ARCHIVED']) scope?:string;
  @ValidateIf(defined) @IsString() @MaxLength(80) category?:string;
  @ValidateIf(defined) @IsString() @MaxLength(40) tag?:string;
  @ValidateIf(defined) @IsUUID('4') projectId?:string;
  @ValidateIf(defined) @IsUUID('4') objectiveId?:string;
  @ValidateIf(defined) @Matches(/^\d{4}-\d{2}-\d{2}$/) from?:string;
  @ValidateIf(defined) @Matches(/^\d{4}-\d{2}-\d{2}$/) to?:string;
  @ValidateIf(defined) @IsIn(['UPDATED','DUE','COMPLETED','TITLE']) sort?:string;
  @Type(()=>Number) @IsInt() @Min(1) @Max(100000) page=1;
  @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit=20;
}
export class FollowUpQueryDto {
  @ValidateIf(defined) @IsIn(['OPEN','ALL','RESOLVED','OVERDUE','UPCOMING','REMINDERS']) scope?:string;
  @Type(()=>Number) @IsInt() @Min(1) @Max(100000) page=1;
}
export class ReportDto {
  @IsString() @MinLength(1) @MaxLength(200) title:string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from:string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to:string;
  @ValidateIf(defined) @IsString() @MaxLength(160) employeeName?:string;
  @ValidateIf(defined) @IsString() @MaxLength(4000) summary?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) challenges?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) lessons?:string;
  @ValidateIf(defined) @IsString() @MaxLength(2000) priorities?:string;
  @ValidateIf(nonNull) @IsUUID('4') projectId?:string|null;
  @ValidateIf(nonNull) @IsUUID('4') objectiveId?:string|null;
  @ValidateIf(defined) @IsString() @MaxLength(80) category?:string;
  @ValidateIf(defined) @IsIn(['ALL',...TASK_STATUSES]) status?:string;
}
export class RenameAttachmentDto { @IsString() @MinLength(1) @MaxLength(200) title:string; }
