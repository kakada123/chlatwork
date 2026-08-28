import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class GoogleLinkCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  codeVerifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  ticket!: string;

  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  redirectUri!: string;
}
