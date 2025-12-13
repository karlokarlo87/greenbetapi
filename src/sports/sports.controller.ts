import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  getAllSports() {
    return this.sportsService.getAllSports();
  }

  @Get('match-detail')
  async getMatchDetail(@Query('match') matchUrl: string) {
    if (!matchUrl) {
      throw new BadRequestException('Match URL is required');
    }

    return this.sportsService.getMatchDetail(matchUrl);
  }
}
