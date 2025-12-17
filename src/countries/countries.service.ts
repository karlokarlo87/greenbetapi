import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './country.entity';

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);

  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async getCountriesBySport(sport: string): Promise<any> {
    if (!sport) {
      return { message: 'Sport parameter is required', data: [] };
    }

    // Get countries for the given sport (case-insensitive)
    const countries = await this.countryRepository
      .createQueryBuilder('country')
      .select(['country.country', 'country.flag', 'country.url'])
      .where('LOWER(country.sportName) = LOWER(:sport)', { sport })
      .orderBy('country.country', 'ASC')
      .getMany();

    if (countries.length === 0) {
      const totalCountries = await this.countryRepository.count();
      if (totalCountries === 0) {
        return {
          message: 'No countries data available yet. Please wait for the scraper to populate data.',
          sport: sport,
          totalCountries: 0,
          countries: [],
        };
      }

      return {
        message: `No countries found for sport: ${sport}. Please check the sport name or wait for data to be scraped.`,
        sport: sport,
        totalCountries: 0,
        countries: [],
      };
    }

    return {
      sport: sport,
      totalCountries: countries.length,
      countries: countries.map(c => ({
        name: c.country,
        flag: c.flag,
        url: c.url,
      })),
    };
  }

  async getAllCountries(): Promise<Country[]> {
    return await this.countryRepository.find({
      order: { sportName: 'ASC', country: 'ASC' },
    });
  }

  async upsertCountry(countryData: Partial<Country>): Promise<void> {
    await this.countryRepository.upsert(countryData, ['sportName', 'country']);
  }
}
