import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
import type { BotKind } from '../bot-admin/bot-access.service';

export class GroupQuery {
  @IsIn(['CHLATWORK', 'CREATOR']) bot: BotKind = 'CHLATWORK';
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class VersionedGroupInput {
  @IsInt() @Min(0) expectedVersion!: number;
}
export class GroupFeaturesInput extends VersionedGroupInput {
  @IsBoolean() enabled!: boolean;
  @IsBoolean() voting!: boolean;
  @IsBoolean() split!: boolean;
  @IsBoolean() khqr!: boolean;
  @IsBoolean() creator!: boolean;
}
export class GroupPollOption {
  @IsOptional() @IsString() @Matches(/^option-[1-9][0-9]{0,8}$/) id?: string;
  @IsString() @MinLength(1) @MaxLength(120) label!: string;
}
export class GroupVoteInput extends VersionedGroupInput {
  @IsString() @MinLength(1) @MaxLength(240) question!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => GroupPollOption)
  options!: GroupPollOption[];
  @IsString() @MaxLength(64) timeZone!: string;
  @IsInt() @Min(0) @Max(23) sendHour!: number;
  @IsInt() @Min(0) @Max(59) sendMinute!: number;
  @IsInt() @Min(1) @Max(1440) durationMinutes!: number;
  @IsBoolean() enabled!: boolean;
}
export class GroupResetInput {
  @IsString() @Matches(/^[0-9a-f-]{36}$/i) expectedRoundId!: string;
}
export class GroupStatusInput extends VersionedGroupInput {
  @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED';
  @IsString() @MinLength(3) @MaxLength(240) reason!: string;
}
