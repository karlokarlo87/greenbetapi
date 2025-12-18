import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsDateString } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  lastname: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{11}$/, { message: 'Personal number must be 11 digits' })
  personalnumber: string;

  @IsNotEmpty()
  @IsDateString()
  birthDate: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{9,15}$/, { message: 'Mobile must be between 9 and 15 digits' })
  mobile: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  repeatPassword: string;
}
