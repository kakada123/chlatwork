import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateProfileLinkDto {
  @IsString() @MinLength(1) @MaxLength(80) title: string;
  @IsString() @MinLength(1) @MaxLength(2048) url: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateProfileLinkDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isEnabled?: boolean;
}

export class ProfileLinkInputDto extends CreateProfileLinkDto {
  @ValidateIf((_, value) => value !== undefined) @IsUUID('4') id?: string;
}

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(40)
  slug?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(160)
  headline?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(320)
  bio?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  backgroundUrl?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn([
    'minimal',
    'midnight',
    'glass',
    'purple',
    'ocean',
    'creator',
    'developer',
    'business',
  ])
  theme?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['preset', 'solid', 'gradient', 'image'])
  backgroundMode?: string;
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^#[0-9a-fA-F]{6}$/)
  backgroundColor?: string;
  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^#[0-9a-fA-F]{6}$/)
  gradientColor?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['preset', 'light', 'dark'])
  colorMode?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['sans', 'serif', 'mono'])
  font?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['rounded', 'pill', 'square'])
  radius?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['solid', 'outline', 'glass'])
  buttonStyle?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  showBranding?: boolean;
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isPublished?: boolean;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  seoTitle?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  seoDescription?: string;
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProfileLinkInputDto)
  links?: ProfileLinkInputDto[];
}

export class ReorderProfileLinksDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
