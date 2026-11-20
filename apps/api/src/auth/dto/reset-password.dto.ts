import { IsEmail, IsString, MinLength } from 'class-validator';

/** 테스트용: 이메일만으로 비밀번호 재설정 (인증메일 없음) */
export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
