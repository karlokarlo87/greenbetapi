import { Controller, Get, Param } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  getAllSports() {
    return this.sportsService.getAllSports();
  }

  @Get(':id')
  getSportById(@Param('id') id: string) {
    return this.sportsService.getSportById(id);
  }
}
