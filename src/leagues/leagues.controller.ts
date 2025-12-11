import { Controller, Get, Query } from '@nestjs/common';
import { LeaguesService } from './leagues.service';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  getLeagues(@Query('name') sportName?: string) {
    if (sportName) {
      return this.leaguesService.getLeaguesBySport(sportName);
    }
    return this.leaguesService.getAllLeagues();
  }
}
