import { IsBoolean } from 'class-validator';

export class UpdateQuickExpenseSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}
