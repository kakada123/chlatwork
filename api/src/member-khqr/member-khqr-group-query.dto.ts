import { IsString, Matches } from 'class-validator';

export class MemberKhqrGroupQueryDto {
  @IsString()
  @Matches(/^-[1-9][0-9]{0,15}$/)
  chatId: string;
}
