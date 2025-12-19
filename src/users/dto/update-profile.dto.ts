import { IsEmail, IsString, IsOptional, MaxLength, Matches, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastname?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{9,15}$/, { message: 'Mobile must be between 9 and 15 digits' })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
