import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  idToken!: string;
}
