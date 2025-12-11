import { Controller, Get, Param, Query } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  getAllSports() {
     
    return this.sportsService.getAllSports();
  }

   
}
