import { Controller, Get, Query } from '@nestjs/common';
import { OddsService } from './odds.service';

@Controller('odds')
export class OddsController {
  constructor(private readonly oddsService: OddsService) {}

  @Get()
  async getAll(@Query('league') leagueUrl?: string) {
    return await this.oddsService.getAllOdds(leagueUrl);
  }

  @Get('countries')
  async getCountries(@Query('sport') sport: string) {
    return await this.oddsService.getCountriesBySport(sport);
  }

  @Get('leagues')
  async getLeagues(@Query('sport') sport: string, @Query('country') country: string) {
    return await this.oddsService.getLeaguesBySportAndCountry(sport, country);
  }

  @Get('match')
  async getMatchOdds(@Query('url') matchUrl: string) {
    if (!matchUrl) {
      return { error: 'Match URL is required', message: 'Please provide a match URL parameter' };
    }
    return await this.oddsService.scrapeMatchOdds(matchUrl);
  }
}
