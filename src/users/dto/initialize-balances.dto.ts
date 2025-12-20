import { IsOptional, IsNumber } from 'class-validator';

export class InitializeBalancesDto {
  @IsOptional()
  @IsNumber()
  initialBalance?: number;
}
