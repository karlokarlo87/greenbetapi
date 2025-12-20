import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class WithdrawDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Withdraw amount must be at least 1' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
