import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RequestPasswordResetDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  repeatPassword: string;
}
