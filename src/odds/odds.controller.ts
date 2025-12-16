import { Controller, Get, Query } from '@nestjs/common';
import { OddsService } from './odds.service';

@Controller('odds')
export class OddsController {
  constructor(private readonly oddsService: OddsService) {}

  @Get()
  async getAll(@Query('league') leagueUrl?: string) {
    return await this.oddsService.getAllOdds(leagueUrl);
  }
}
