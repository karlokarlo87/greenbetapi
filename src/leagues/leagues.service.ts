import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { SportsService } from '../sports/sports.service';
import { CountriesService } from '../countries/countries.service';
import { League } from './league.entity';
const puppeteer = require('puppeteer');

export interface LeaguesBySport {
  sport: string;
  leagues: Array<{ name: string; country: string; url: string }>;
  lastUpdated: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
    private readonly sportsService: SportsService,
    private readonly countriesService: CountriesService,
  ) {
    this.loadLeaguesData();
  }

  private async loadLeaguesData() {
    try {
      const count = await this.leagueRepository.count();
      this.logger.log(`Leagues data loaded from database. Total leagues: ${count}`);

      // If no data in database, scrape and populate
      if (count === 0) {
        this.logger.log('No leagues in database, fetching from web...');
        await this.refreshLeaguesFromWeb();
      }
    } catch (error) {
      this.logger.error('Error loading leagues data:', error);
    }
  }

  @Cron('1,6,11,16,21,26,31,36,41,46,51,56 * * * *') // Every 5 minutes starting at minute 1 (1 min after sports)
  async handleCronRefresh() {
    this.logger.log('[STEP 2] Running leagues data refresh from oddsportal.com (after sports scraped)...');
    await this.refreshLeaguesFromWeb();
  }

  async getLeaguesBySport(sportName: string) {
    // Get leagues from database filtered by sport name
    const leagues = await this.leagueRepository.find({
      where: { sportName },
      order: { country: 'ASC', name: 'ASC' },
    });

    // Group by sport
    const grouped: LeaguesBySport = {
      sport: sportName,
      leagues: leagues.map(l => ({
        name: l.name,
        country: l.country,
        url: l.url,
      })),
      lastUpdated: leagues.length > 0 ? leagues[0].updatedAt.toISOString() : new Date().toISOString(),
    };

    return [grouped];
  }

  async getAllLeagues() {
    // Get all leagues from database
    const leagues = await this.leagueRepository.find({
      order: { sportName: 'ASC', country: 'ASC', name: 'ASC' },
    });

    // Group by sport
    const groupedBySport: { [key: string]: LeaguesBySport } = {};

    leagues.forEach(league => {
      if (!groupedBySport[league.sportName]) {
        groupedBySport[league.sportName] = {
          sport: league.sportName,
          leagues: [],
          lastUpdated: league.updatedAt.toISOString(),
        };
      }

      groupedBySport[league.sportName].leagues.push({
        name: league.name,
        country: league.country,
        url: league.url,
      });
    });

    return Object.values(groupedBySport);
  }

  async refreshLeaguesFromWeb() {
    try {
      const sportsData = await this.sportsService.getCachedSportsData();
      if (!sportsData || sportsData.length === 0) {
        this.logger.warn('No sports data available to fetch leagues');
        return;
      }

      this.logger.log(`Starting leagues data refresh from web... Found ${sportsData.length} sports`);

      // Limit to scrape only 5 sports per run to prevent timeouts
      // Rotate through sports by checking which ones have fewest/oldest leagues
      const sportLeagueCounts = await Promise.all(
        sportsData.map(async (sport) => {
          const count = await this.leagueRepository.count({ where: { sportName: sport.name } });
          return { sport, count };
        })
      );

      // Sort by count (ascending) to prioritize sports with fewer leagues
      sportLeagueCounts.sort((a, b) => a.count - b.count);
      const sportsToScrape = sportLeagueCounts.slice(0, 5).map(item => item.sport);

      this.logger.log(`Scraping ${sportsToScrape.length} sports this run: ${sportsToScrape.map(s => s.name).join(', ')}`);

      const leaguesData = await parseLeaguesFromSports(sportsToScrape);

      this.logger.log(`Scraped leagues data. Found ${leaguesData?.length || 0} entries`);

      if (leaguesData && leaguesData.length > 0) {
        let totalSaved = 0;
        let errors = 0;

        // Save each country and league to database
        for (const entry of leaguesData) {
          // Find the sport in database to get sport details
          const sport = sportsData.find(s => s.alt === entry.sport);

          if (!sport) {
            this.logger.warn(`Sport not found for alt: ${entry.sport}`);
          }

          // Save country data
          try {
            const countryData = {
              sportName: sport?.name || entry.sport,
              country: entry.country,
              sportAlt: sport?.alt || entry.sport,
              flag: entry.flag || undefined,
              url: entry.url,
            };

            await this.countriesService.upsertCountry(countryData);
          } catch (error) {
            this.logger.error(`Error saving country ${entry.country}:`, error.message);
          }

          // Save leagues
          for (const league of entry.leagues) {
            try {
              const leagueData: any = {
                name: league.name,
                country: entry.country,
                url: league.url,
                sportName: sport?.name || entry.sport,
                sportAlt: sport?.alt || entry.sport,
              };

              await this.leagueRepository.upsert(leagueData, ['sportName', 'country', 'name']);
              totalSaved++;
            } catch (error) {
              errors++;
              this.logger.error(`Error saving league ${league.name}:`, error.message);
            }
          }
        }

        this.logger.log(
          `Leagues data refresh complete. Total saved: ${totalSaved}, Errors: ${errors}`
        );
      } else {
        this.logger.warn('No leagues data scraped from web');
      }
    } catch (error) {
      this.logger.error('Error refreshing leagues from web:', error);
    }
  }
}

async function parseLeaguesFromSports(sportsData: Array<{ name: string; alt: string; url: string }>) {

    if (!sportsData || sportsData.length === 0) {
        console.error('Error: No sports data provided');
        return [];
    }

    console.log(`[parseLeaguesFromSports] Starting to parse ${sportsData.length} sports`);

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
            console.log(`[parseLeaguesFromSports] Parsing sport: ${sport.name} (${sport.alt})`);
            console.log(`[parseLeaguesFromSports] URL: ${sport.url}`);

            try {
                await page.goto(sport.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await page.waitForSelector("main", { timeout: 30000 });
                await delay(1000);

                console.log("[parseLeaguesFromSports] Page loaded. Extracting...");

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

                console.log(`[parseLeaguesFromSports] Extracted ${countries.length} countries and ${leagues.length} league groups for ${sport.name}`);

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

                console.log(`[parseLeaguesFromSports] → ${cleaned.length} countries with leagues extracted for ${sport.name}`);

                finalOutput.push(...cleaned);

            } catch (sportError) {
                console.error(`[parseLeaguesFromSports] Error processing sport ${sport.name}:`, sportError.message);
            }
        }

        console.log(`[parseLeaguesFromSports] Finished parsing all sports. Total output entries: ${finalOutput.length}`);

        // ---------------------------
        //  SAVE RESULT
        // ---------------------------
       return finalOutput;

    } catch (err) {
        console.error("Error:", err);
        return [];
    } finally {
        await delay(3000);
        await browser.close();
    }
}