import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTelegramNotificationsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16_384)
  initData?: string;
}
