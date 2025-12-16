import { Controller, Get, Query, Inject } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

// IMPORTANT FIX 👇
import type { Cache } from 'cache-manager';

@Controller('leagues')
export class LeaguesController {
  constructor(
    private readonly leaguesService: LeaguesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // uses type-only import
  ) {}

  @Get()
  async getLeagues(
    @Query('sport') sport?: string,
    @Query('country') country?: string,
  ) {
    // Filter by both sport and country
    if (sport && country) {
      return await this.leaguesService.getLeaguesBySportAndCountry(sport, country);
    }

    // Filter by sport only
    if (sport) {
      return await this.leaguesService.getLeaguesBySport(sport);
    }

    // Return all leagues
    return this.leaguesService.getAllLeagues();
  }
}
