import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateInvitationGuestsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  names!: string[];

  @IsIn(['INDIVIDUAL', 'COUPLE', 'FAMILY', 'GROUP'])
  recipientType!: 'INDIVIDUAL' | 'COUPLE' | 'FAMILY' | 'GROUP';

  @IsInt()
  @Min(1)
  @Max(20)
  maxGuests!: number;
}
