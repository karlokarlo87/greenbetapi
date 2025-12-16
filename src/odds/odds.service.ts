import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Odd } from './odd.entity';
import { LeaguesService } from '../leagues/leagues.service';

const puppeteer = require('puppeteer');
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(
    @InjectRepository(Odd)
    private readonly oddRepository: Repository<Odd>,
    private readonly leaguesService: LeaguesService,
  ) {
    this.loadOddsData();
  }

  private async loadOddsData() {
    try {
      const count = await this.oddRepository.count();
      this.logger.log(`Odds data loaded from database. Total odds: ${count}`);

      // If no data in database, scrape and populate
      if (count === 0) {
        this.logger.log('No odds in database, fetching from web...');
        await this.refreshOddsFromWeb();
      }
    } catch (error) {
      this.logger.error('Error loading odds data:', error);
    }
  }

  @Cron('2,7,12,17,22,27,32,37,42,47,52,57 * * * *') // Every 5 minutes starting at minute 2 (2 min after sports, 1 min after leagues)
  async handleCronRefresh() {
    this.logger.log('[STEP 3] Running odds data refresh from oddsportal.com (after leagues scraped)...');
    await this.refreshOddsFromWeb();
  }

  async refreshOddsFromWeb() {
    try {
      // Get all leagues from database
      const allLeagues = await this.leaguesService.getAllLeagues();

      if (!allLeagues || allLeagues.length === 0) {
        this.logger.warn('No leagues data available to fetch odds');
        return;
      }

      // Flatten leagues to get all league URLs
      const leagueUrls: Array<{ sport: string; league: string; country: string; url: string }> = [];
      allLeagues.forEach(sport => {
        sport.leagues.forEach(league => {
          leagueUrls.push({
            sport: sport.sport,
            league: league.name,
            country: league.country,
            url: league.url,
          });
        });
      });

      this.logger.log(`Found ${leagueUrls.length} total leagues to scrape odds from`);

      // Limit to scrape only 10 leagues per run to prevent timeouts
      // Prioritize leagues with fewest odds in database
      const leagueOddsCounts = await Promise.all(
        leagueUrls.map(async (league) => {
          const count = await this.oddRepository.count({ where: { leagueUrl: league.url } });
          return { league, count };
        })
      );

      // Sort by count (ascending) to prioritize leagues with fewer odds
      leagueOddsCounts.sort((a, b) => a.count - b.count);
      const leaguesToScrape = leagueOddsCounts.slice(0, 10).map(item => item.league);

      this.logger.log(
        `Scraping ${leaguesToScrape.length} leagues this run: ${leaguesToScrape.map(l => `${l.sport}/${l.league}`).join(', ')}`
      );

      let totalSaved = 0;
      let errors = 0;

      // Scrape each league
      for (const league of leaguesToScrape) {
        try {
          this.logger.log(`Scraping odds for: ${league.sport} - ${league.country} - ${league.league}`);
          const oddsData = await this.scrapeLeagueOdds(league.url);

          if (oddsData && oddsData.matches && oddsData.matches.length > 0) {
            // Save all matches to database
            for (const match of oddsData.matches) {
              try {
                const oddData: any = {
                  sport: oddsData.sport || league.sport,
                  country: oddsData.country || league.country,
                  league: oddsData.league || league.league,
                  leagueUrl: league.url,
                  date: match.date,
                  time: match.time,
                  homeTeam: match.homeTeam,
                  homeTeamLogo: match.homeTeamLogo,
                  awayTeam: match.awayTeam,
                  awayTeamLogo: match.awayTeamLogo,
                  oddsHome: match.odds.home ? parseFloat(match.odds.home) : null,
                  oddsDraw: match.odds.draw ? parseFloat(match.odds.draw) : null,
                  oddsAway: match.odds.away ? parseFloat(match.odds.away) : null,
                  bookmakers: match.bookmakers,
                  matchUrl: match.url,
                };

                await this.oddRepository.upsert(oddData, ['leagueUrl', 'matchUrl']);
                totalSaved++;
              } catch (error) {
                errors++;
                this.logger.error(`Error saving odd for ${match.homeTeam} vs ${match.awayTeam}:`, error.message);
              }
            }
          }
        } catch (error) {
          errors++;
          this.logger.error(`Error scraping league ${league.league}:`, error.message);
        }
      }

      this.logger.log(`Odds refresh complete. Total saved: ${totalSaved}, Errors: ${errors}`);
    } catch (error) {
      this.logger.error('Error refreshing odds from web:', error);
    }
  }

  async getAllOdds(leagueUrl?: string): Promise<any> {
    if (leagueUrl) {
      // Get odds for specific league from database
      const odds = await this.oddRepository.find({
        where: { leagueUrl },
        order: { date: 'ASC', time: 'ASC' },
      });

      if (odds.length === 0) {
        return { message: 'No odds found for this league', data: [] };
      }

      return {
        sport: odds[0].sport,
        country: odds[0].country,
        league: odds[0].league,
        totalMatches: odds.length,
        matches: odds.map(odd => ({
          date: odd.date,
          time: odd.time,
          homeTeam: odd.homeTeam,
          homeTeamLogo: odd.homeTeamLogo,
          awayTeam: odd.awayTeam,
          awayTeamLogo: odd.awayTeamLogo,
          odds: {
            home: odd.oddsHome?.toString(),
            draw: odd.oddsDraw?.toString(),
            away: odd.oddsAway?.toString(),
          },
          bookmakers: odd.bookmakers,
          url: odd.matchUrl,
        })),
      };
    } else {
      // Get all odds from database
      const odds = await this.oddRepository.find({
        order: { sport: 'ASC', league: 'ASC', date: 'ASC', time: 'ASC' },
      });

      return {
        totalMatches: odds.length,
        matches: odds.map(odd => ({
          sport: odd.sport,
          country: odd.country,
          league: odd.league,
          date: odd.date,
          time: odd.time,
          homeTeam: odd.homeTeam,
          homeTeamLogo: odd.homeTeamLogo,
          awayTeam: odd.awayTeam,
          awayTeamLogo: odd.awayTeamLogo,
          odds: {
            home: odd.oddsHome?.toString(),
            draw: odd.oddsDraw?.toString(),
            away: odd.oddsAway?.toString(),
          },
          bookmakers: odd.bookmakers,
          url: odd.matchUrl,
        })),
      };
    }
  }

  async getCountriesBySport(sport: string): Promise<any> {
    if (!sport) {
      return { message: 'Sport parameter is required', data: [] };
    }

    // Get distinct countries for the given sport (case-insensitive)
    const countries = await this.oddRepository
      .createQueryBuilder('odd')
      .select('DISTINCT odd.country', 'country')
      .where('LOWER(odd.sport) = LOWER(:sport)', { sport })
      .andWhere('odd.country IS NOT NULL')
      .orderBy('odd.country', 'ASC')
      .getRawMany();

    if (countries.length === 0) {
      // Check if there's any data for this sport at all
      const totalOdds = await this.oddRepository.count();
      if (totalOdds === 0) {
        return {
          message: 'No odds data available yet. Please wait for the scraper to populate data.',
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
      countries: countries.map(c => c.country),
    };
  }

  async getLeaguesBySportAndCountry(sport: string, country: string): Promise<any> {
    if (!sport || !country) {
      return { message: 'Sport and country parameters are required', data: [] };
    }

    // Get distinct leagues for the given sport and country (case-insensitive)
    const leagues = await this.oddRepository
      .createQueryBuilder('odd')
      .select('DISTINCT odd.league', 'league')
      .addSelect('odd.leagueUrl', 'leagueUrl')
      .where('LOWER(odd.sport) = LOWER(:sport)', { sport })
      .andWhere('LOWER(odd.country) = LOWER(:country)', { country })
      .andWhere('odd.league IS NOT NULL')
      .orderBy('odd.league', 'ASC')
      .getRawMany();

    if (leagues.length === 0) {
      const totalOdds = await this.oddRepository.count();
      if (totalOdds === 0) {
        return {
          message: 'No odds data available yet. Please wait for the scraper to populate data.',
          sport: sport,
          country: country,
          totalLeagues: 0,
          leagues: [],
        };
      }

      return {
        message: `No leagues found for sport: ${sport}, country: ${country}. Please check the parameters or wait for data to be scraped.`,
        sport: sport,
        country: country,
        totalLeagues: 0,
        leagues: [],
      };
    }

    return {
      sport: sport,
      country: country,
      totalLeagues: leagues.length,
      leagues: leagues.map(l => ({
        name: l.league,
        url: l.leagueUrl,
      })),
    };
  }

  private async scrapeLeagueOdds(leagueUrl: string): Promise<any> {
    const browserOptions = {
      headless: 'new',
      executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: false
    };

    const browser = await puppeteer.launch(browserOptions);

    try {
      const page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ka,en-US;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      await page.goto(leagueUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForSelector('main', { timeout: 30000 });
      await delay(1000);

      // Extract league info and matches
      const leagueData = await page.evaluate(() => {
        const matches: Array<{ date: string | null; time: string | null; homeTeam: string; homeTeamLogo: string | null; awayTeam: string; awayTeamLogo: string | null; odds: { home: string | null; draw: string | null; away: string | null }; bookmakers: string | null; url: string | null }> = [];
        let currentDate: string | null = null;
        let sport: string | null = null;
        let country: string | null = null;
        let league: string | null = null;

        // Get league info from breadcrumb header
        const breadcrumbHeader = document.querySelector('[data-testid="sport-country-league-item"]');

        if (breadcrumbHeader) {
          const sportLink = breadcrumbHeader.querySelector('[data-testid="header-sport-item"]');
          const countryLink = breadcrumbHeader.querySelector('[data-testid="header-country-item"]');
          const leagueLink = breadcrumbHeader.querySelector('[data-testid="header-tournament-item"]');

          sport = sportLink ? sportLink.textContent.trim() : null;
          country = countryLink ? (countryLink.querySelector('p')?.textContent?.trim() ?? null) : null;
          league = leagueLink ? leagueLink.textContent.trim() : null;
        }

        // Find all event rows
        const eventRows = document.querySelectorAll('.eventRow');
        eventRows.forEach(row => {
          // Check if this row contains a date header
          const dateHeader = row.querySelector('[data-testid="secondary-header"] [data-testid="date-header"]');
          if (dateHeader) {
            currentDate = dateHeader.textContent.trim();
          }

          // Extract match data
          const gameRow = row.querySelector('[data-testid="game-row"]');
          if (!gameRow) return;

          // Get match link
          const matchLink = gameRow.querySelector('a');
          const matchUrl = matchLink ? matchLink.getAttribute('href') : null;

          // Get time
          const timeElement = gameRow.querySelector('[data-testid="time-item"] p');
          const time = timeElement ? timeElement.textContent.trim() : null;

          // Get teams
          const participants = gameRow.querySelector('[data-testid="event-participants"]');
          const teamLinks = participants ? participants.querySelectorAll('a[title]') : [];

          let homeTeam: string | null = null;
          let awayTeam: string | null = null;
          let homeTeamLogo: string | null = null;
          let awayTeamLogo: string | null = null;

          if (teamLinks.length == 2) {
            homeTeam = teamLinks[0].getAttribute('title');
            awayTeam = teamLinks[1].getAttribute('title');

            const homeImg = teamLinks[0].querySelector('img');
            const awayImg = teamLinks[1].querySelector('img');

            homeTeamLogo = homeImg ? homeImg.getAttribute('src') : null;
            awayTeamLogo = awayImg ? awayImg.getAttribute('src') : null;
          }

          // Get odds (1, X, 2)
          const parentRow = gameRow.closest('.eventRow');
          const oddContainers = parentRow ? parentRow.querySelectorAll('[data-testid="odd-container-default"] p') : [];
          let odds = { home: null as string | null, draw: null as string | null, away: null as string | null };

          if (oddContainers.length >= 3) {
            odds = {
              home: oddContainers[0].textContent.trim(),
              draw: oddContainers[1].textContent.trim(),
              away: oddContainers[2].textContent.trim()
            };
          } else if (oddContainers.length >= 2) {
            odds = {
              home: oddContainers[0].textContent.trim(),
              draw: null,
              away: oddContainers[1].textContent.trim()
            };
          }

          // Get number of bookmakers
          const bookiesElement = parentRow ? parentRow.querySelector('[data-testid="bookies-amount-item"] div') : null;
          const bookmakers = bookiesElement ? bookiesElement.textContent.trim() : null;

          // Build match object
          if (homeTeam && awayTeam) {
            matches.push({
              date: currentDate,
              time: time,
              homeTeam: homeTeam,
              homeTeamLogo: homeTeamLogo,
              awayTeam: awayTeam,
              awayTeamLogo: awayTeamLogo,
              odds: odds,
              bookmakers: bookmakers,
              url: matchUrl ? 'https://www.oddsportal.com' + matchUrl : null
            });
          }
        });

        return {
          sport: sport,
          country: country,
          league: league,
          totalMatches: matches.length,
          matches: matches
        };
      });

      return leagueData;

    } catch (error) {
      console.error('Error scraping league odds:', error.message);
      return null;
    } finally {
      await browser.close();
    }
  }
}
