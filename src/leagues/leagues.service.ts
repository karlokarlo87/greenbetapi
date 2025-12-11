import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cron } from '@nestjs/schedule';
import type { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as path from 'path';
import { SportsService } from '../sports/sports.service';
const puppeteer = require('puppeteer');
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly sportsService: SportsService,
  ) {
    this.loadLeaguesData();
  }

  private async loadLeaguesData() {
    try {
      const dataPath = path.join(__dirname, 'data', 'leagues.json');
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Load data into cache
        const cachePromises = Object.keys(data).map((sport) =>
          this.cacheManager.set(`leagues:${sport.toLowerCase()}`, data[sport])
        );
        await Promise.all(cachePromises);

        this.logger.log(
          `Leagues data loaded into cache. Total sports: ${Object.keys(data).length}`
        );
      } else {
        this.logger.warn('Leagues data file not found. Starting with empty cache.');
      }
    } catch (error) {
      this.logger.error('Error loading leagues data:', error);
    }
  }

  async getLeaguesBySport(sportName: string) {
    if (!sportName) {
      throw new BadRequestException('Sport name is required');
    }

    const normalizedSport = sportName.toLowerCase();
    const leaguesData = await this.cacheManager.get<LeaguesBySport>(
      `leagues:${normalizedSport}`
    );

    if (!leaguesData) {
      return {
        message: `No leagues found for sport: ${sportName}`,
        sport: sportName,
        count: 0,
        data: [],
      };
    }

    return {
      message: `Leagues for ${sportName} (cached)`,
      sport: leaguesData.sport,
      count: leaguesData.leagues.length,
      lastUpdated: leaguesData.lastUpdated,
      data: leaguesData.leagues,
    };
  }

  async getAllLeagues() {
    try {
      const dataPath = path.join(__dirname, 'data', 'leagues.json');
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const allLeagues = JSON.parse(fileContent);

        return {
          message: 'All leagues data (from cache)',
          sports: Object.keys(allLeagues).length,
          data: allLeagues,
        };
      }

      return {
        message: 'No leagues data available',
        sports: 0,
        data: {},
      };
    } catch (error) {
      this.logger.error('Error getting all leagues:', error);
      return {
        message: 'Error retrieving leagues data',
        sports: 0,
        data: {},
      };
    }
  }

  @Cron('*/10 * * * *') // Run every 10 minutes
  async handleCacheRefresh() {
    this.logger.log('Running 10-minute leagues cache refresh...');
    await this.refreshLeaguesFromWeb();
  }

  async refreshLeaguesFromWeb() {
    try {
      const sportsData = this.sportsService.getCachedSportsData();
      if (!sportsData || sportsData.length === 0) {
        this.logger.warn('No sports data available to fetch leagues');
        return;
      }

      this.logger.log('Starting leagues data refresh from web...');
      const leaguesData = await parseLeaguesFromSports(sportsData);

      if (leaguesData && leaguesData.length > 0) {
        // Process and cache the leagues data
        // Group by sport
        const groupedBySport: any = {};

        leaguesData.forEach(entry => {
          if (!groupedBySport[entry.sport]) {
            groupedBySport[entry.sport] = {
              sport: entry.sport,
              leagues: [],
              lastUpdated: new Date().toISOString(),
            };
          }

          entry.leagues.forEach(league => {
            groupedBySport[entry.sport].leagues.push({
              name: league.name,
              country: entry.country,
              url: league.url,
            });
          });
        });

        // Update NestJS cache
        const cachePromises = Object.keys(groupedBySport).map((sport) =>
          this.cacheManager.set(`leagues:${sport.toLowerCase()}`, groupedBySport[sport])
        );
        await Promise.all(cachePromises);

        // Save to JSON file
        const dataPath = path.join(__dirname, 'data', 'leagues.json');
        fs.writeFileSync(dataPath, JSON.stringify(groupedBySport, null, 2));

        this.logger.log(`Leagues cache refreshed. Total sports: ${Object.keys(groupedBySport).length}`);
      }
    } catch (error) {
      this.logger.error('Error refreshing leagues from web:', error);
    }
  }
}

async function parseLeaguesFromSports(sportsData: Array<{ name: string; alt: string; url: string }>) {
    if (!sportsData || sportsData.length === 0) {
        console.error('Error: No sports data provided');
        return;
    }

    console.log(`Found ${sportsData.length} sports\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const finalOutput: Array<{ sport: any; country: string; url: string; flag: string | null; leagues: Array<{ name: string; alt: string; url: string }> }> = [];

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
        );

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ka,en-US;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        // ---------------------------
        //  LOOP ALL SPORTS
        // ---------------------------
        for (const sport of sportsData) {

            console.log(`\nParsing: ${sport.name}`);
            console.log(`URL: ${sport.url}`);

            await page.goto(sport.url, {
                waitUntil: 'networkidle0',
                timeout: 90000
            });

            await page.waitForSelector("main", { timeout: 30000 });
            await delay(3000);

            console.log("Page loaded. Extracting...");

            // ---------------------------
            //  EXTRACT COUNTRIES & LEAGUES
            // ---------------------------
            const { countries, leagues } = await page.evaluate((sport) => {
                const rows = document.querySelectorAll("main div.flex");
                const countries: Array<{ sport: any; name: string; url: string; flag: string | null }> = [];
                const leagues: Array<Array<{ name: string; alt: string; url: string }>> = [];

                rows.forEach(row => {
                    const link = row.querySelector("a");
                    if (!link) return;

                    const img = row.querySelector("img");
                    const url = link.href.startsWith("http")
                        ? link.href
                        : "https://www.oddsportal.com" + link.getAttribute("href");

                    if (img) {
                        // COUNTRY
                        countries.push({
                            sport: sport.alt,
                            name: link.textContent.trim(),
                            url: url,
                            flag: img.getAttribute("src"),
                        });
                    } else {
                        // LEAGUE GROUP
                        const ul = row.querySelector("ul");
                        if (!ul) return;

                        const items = Array.from(ul.querySelectorAll("li a")).map(a => {
                            const anchor = a as HTMLAnchorElement;
                            return {
                                name: anchor.textContent.trim(),
                                alt: ((anchor.getAttribute("href") || '').split('/').filter(Boolean).pop() ?? ''),
                                url: anchor.href.startsWith("http")
                                    ? anchor.href
                                    : "https://www.oddsportal.com" + anchor.getAttribute("href")
                            };
                        });

                        if (items.length > 0 && items) leagues.push(items);
                    }
                });

                return { countries, leagues };
            }, sport);
            // ---------------------------
            //  MATCH LEAGUES → COUNTRIES
            // ---------------------------
            const result: Array<{ sport: any; country: string; url: string; flag: string | null; leagues: Array<{ name: string; alt: string; url: string }> }> = [];

            countries.forEach(country => {
                const relatedLeagues: Array<{ name: string; alt: string; url: string }> = [];

                leagues.forEach(list => {
                    list.forEach(league => {
                        if (league.url.startsWith(country.url)) {
                            relatedLeagues.push(league);
                        }
                    });
                });

                if (relatedLeagues.length === 0) return;

                result.push({
                    sport: country.sport,
                    country: country.name,
                    url: country.url,
                    flag: country.flag,
                    leagues: relatedLeagues
                });
            });

            // ---------------------------
            //  REMOVE DUPLICATES
            // ---------------------------
            const unique = new Map();

            result.forEach(entry => {
                const key = `${entry.sport}|${entry.country}|${entry.url}`;

                if (!unique.has(key)) {
                    unique.set(key, {
                        ...entry,
                        leagues: [...entry.leagues]
                    });
                } else {
                    const existing = unique.get(key);

                    entry.leagues.forEach(l => {
                        if (!existing.leagues.find(x => x.url === l.url)) {
                            existing.leagues.push(l);
                        }
                    });
                }
            });

            const cleaned = Array.from(unique.values());

            console.log(`→ ${cleaned.length} countries with leagues extracted`);

            finalOutput.push(...cleaned);
        }

        // ---------------------------
        //  SAVE RESULT
        // ---------------------------
       return finalOutput;

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await delay(3000);
        await browser.close();
    }
}
