import { IsNotEmpty, IsNumber, Min, IsArray, ArrayMinSize, ValidateNested, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class BetSelectionDto {
  @IsNotEmpty()
  @IsString()
  matchUrl: string;

  @IsNotEmpty()
  @IsString()
  sport: string;

  @IsNotEmpty()
  @IsString()
  league: string;

  @IsNotEmpty()
  @IsString()
  homeTeam: string;

  @IsNotEmpty()
  @IsString()
  awayTeam: string;

  @IsNotEmpty()
  @IsString()
  selection: string; // e.g., "home", "draw", "away"

  @IsNotEmpty()
  @IsNumber()
  @Min(1.01, { message: 'Odds must be at least 1.01' })
  odds: number;

  @IsNotEmpty()
  @IsString()
  matchDate: string;
}

export class PlaceBetDto {
  @IsNotEmpty()
  @IsEnum(['single', 'multi', 'system'])
  betType: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.1, { message: 'Stake must be at least 0.1' })
  stake: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one selection is required' })
  @ValidateNested({ each: true })
  @Type(() => BetSelectionDto)
  selections: BetSelectionDto[];
}
