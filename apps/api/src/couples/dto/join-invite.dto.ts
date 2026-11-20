import { IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class JoinInviteDto {
  @ValidateIf((o: JoinInviteDto) => !o.token)
  @IsString()
  @Length(8, 8)
  invitationCode?: string;

  @ValidateIf((o: JoinInviteDto) => !o.invitationCode)
  @IsOptional()
  @IsString()
  @Length(16, 128)
  token?: string;
}
