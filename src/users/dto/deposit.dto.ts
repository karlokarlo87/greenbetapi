import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class DepositDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Deposit amount must be at least 1' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
