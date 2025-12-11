import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface League {
  name: string;
  country?: string;
  url: string;
}

export interface LeaguesBySport {
  sport: string;
  leagues: League[];
  lastUpdated: string;
}

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);
  private leaguesCache: Map<string, LeaguesBySport> = new Map();

  constructor() {
    this.loadLeaguesData();
  }

  private loadLeaguesData() {
    try {
      const dataPath = path.join(__dirname, 'data', 'leagues.json');
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Load data into cache
        Object.keys(data).forEach((sport) => {
          this.leaguesCache.set(sport.toLowerCase(), data[sport]);
        });

        this.logger.log(
          `Leagues data loaded into cache. Total sports: ${this.leaguesCache.size}`
        );
      } else {
        this.logger.warn('Leagues data file not found. Starting with empty cache.');
      }
    } catch (error) {
      this.logger.error('Error loading leagues data:', error);
    }
  }

  getLeaguesBySport(sportName: string) {
    if (!sportName) {
      throw new BadRequestException('Sport name is required');
    }

    const normalizedSport = sportName.toLowerCase();
    const leaguesData = this.leaguesCache.get(normalizedSport);

    if (!leaguesData) {
      return {
        message: `No leagues found for sport: ${sportName}`,
        sport: sportName,
        count: 0,
        data: [],
      };
    }

    return {
      message: `Leagues for ${sportName}`,
      sport: leaguesData.sport,
      count: leaguesData.leagues.length,
      lastUpdated: leaguesData.lastUpdated,
      data: leaguesData.leagues,
    };
  }

  getAllLeagues() {
    const allLeagues: any = {};
    this.leaguesCache.forEach((value, key) => {
      allLeagues[key] = value;
    });

    return {
      message: 'All leagues data',
      sports: Object.keys(allLeagues).length,
      data: allLeagues,
    };
  }
}
