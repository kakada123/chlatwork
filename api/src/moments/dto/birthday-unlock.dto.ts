import { IsInt, Max, Min } from 'class-validator';

export class BirthdayUnlockDto {
  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
