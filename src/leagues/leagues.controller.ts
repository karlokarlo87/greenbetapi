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
  async getLeagues(@Query('name') sportName?: string) {
    if (sportName) {
      const cacheKey = `leagues_${sportName}`;

      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      const data = await this.leaguesService.getLeaguesBySport(sportName);

      // cache for 10 minutes
      await this.cacheManager.set(cacheKey, data,  10 * 60 * 1000);

      return data;
    }

    return this.leaguesService.getAllLeagues();
  }
}
