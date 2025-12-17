import { Controller, Get, Query } from '@nestjs/common';
import { CountriesService } from './countries.service';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  async getCountries(@Query('sport') sport?: string) {
    // If sport parameter is provided, filter by sport
    if (sport) {
      return await this.countriesService.getCountriesBySport(sport);
    }

    // Otherwise return all unique countries
    return await this.countriesService.getAllUniqueCountries();
  }
}
