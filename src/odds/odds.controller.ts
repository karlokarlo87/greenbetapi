import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OddsService } from './odds.service';

@Controller('odds')
export class OddsController {
  constructor(private readonly oddsService: OddsService) {}

  @Get()
  getAll(@Query('league') league?: string) {
    console.log('Received league query:', league);
    if (league) {
      return this.oddsService.getAllOdds(league);
    }
    return null;
  }

  @Post()
  addOdd(@Body() body: any) {
    return this.oddsService.addOdd(body);
  }
}
