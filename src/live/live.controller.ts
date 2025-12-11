import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { LiveService } from './live.service';
@Controller('live')
export class LiveController {
      constructor(private readonly liveService: LiveService) {}
    
      @Get('sports')
      async getSports() {
          const result = await this.liveService.getLiveSports();
          return result.sports;
      }
     @Get('matches')
      async getMatches() {
          const result = await this.liveService.getLiveSports();
          return result.matches;
      }
    @Get('sport',)
      async getLiveSport(@Query('sport') sport: string | '') {
          const result = await this.liveService.getLiveSport(sport);
          return result;
      }
}
