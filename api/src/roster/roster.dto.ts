import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Valid leave codes as a constant so it can be used in both the DTO and service.
export const LEAVE_CODES = ['PRD', 'PHL', 'AL', 'H1', 'H2'] as const;
export type LeaveCodeValue = (typeof LEAVE_CODES)[number];

export const ROSTER_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'CONFIRMED',
  'CANCELLED',
] as const;
export type RosterStatusValue = (typeof ROSTER_STATUSES)[number];

export const LEAVE_TX_KINDS = [
  'OPENING_BALANCE',
  'EARNED',
  'ADJUSTMENT',
] as const;
export type LeaveTxKindValue = (typeof LEAVE_TX_KINDS)[number];

export class UpsertRosterDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  shiftCode?: string;

  @IsOptional()
  @IsIn(LEAVE_CODES)
  leaveCode?: LeaveCodeValue;

  @IsOptional()
  @IsIn(ROSTER_STATUSES)
  status?: RosterStatusValue;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  statusFlowEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  saturdayOff?: boolean;

  @IsOptional()
  @IsBoolean()
  sundayOff?: boolean;

  @IsOptional()
  @IsBoolean()
  publicHolidaysOff?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  defaultShiftCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  monthlyPrdAllowance?: number;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class CreateShiftDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  code!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isOvernight?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  code?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isOvernight?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LeaveAdjustmentDto {
  @IsIn(LEAVE_CODES)
  leaveCode!: LeaveCodeValue;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsIn(LEAVE_TX_KINDS)
  kind!: LeaveTxKindValue;

  @IsInt()
  halfDays!: number;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class GenerateRosterDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class ApplyRosterDto extends GenerateRosterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyRosterEntryDto)
  entries!: ApplyRosterEntryDto[];
}

export class UpdateRosterStatusesDto extends GenerateRosterDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  dates!: string[];

  @IsIn(ROSTER_STATUSES)
  status!: RosterStatusValue;
}

export class ApplyRosterEntryDto {
  /** Date in YYYY-MM-DD format */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @IsOptional()
  @IsString()
  shiftCode?: string;

  @IsOptional()
  @IsIn(LEAVE_CODES)
  leaveCode?: LeaveCodeValue;

  @IsOptional()
  @IsIn(ROSTER_STATUSES)
  status?: RosterStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
