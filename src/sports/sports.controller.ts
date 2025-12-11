import { Controller, Get, Param, Query } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  getAllSports(@Query('name') name?: string) {
    if (name) {
      return this.sportsService.getSportByName(name);
    }
    return this.sportsService.getAllSports();
  }

  @Get(':id')
  getSportById(@Param('id') id: string) {
    return this.sportsService.getSportById(id);
  }
}
