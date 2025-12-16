import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from './sport.entity';

const puppeteer = require('puppeteer');

interface ScrapedSport {
  name: string;
  icon: string | null;
  alt: string;
  url: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class SportsService {
  private readonly logger = new Logger(SportsService.name);
  private lastUpdated: Date;

  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {
    this.loadSportsData();
  }

  private async loadSportsData() {
    try {
      const count = await this.sportRepository.count();
      this.lastUpdated = new Date();
      this.logger.log(
        `Sports data loaded from database. Total sports: ${count}. Last updated: ${this.lastUpdated.toISOString()}`
      );

      // If no data in database, scrape and populate
      if (count === 0) {
        this.logger.log('No sports in database, fetching from web...');
        await this.refreshSportsFromWeb();
      }
    } catch (error) {
      this.logger.error('Error loading sports data:', error);
    }
  }

  @Cron('0,5,10,15,20,25,30,35,40,45,50,55 * * * *') // Every 5 minutes starting at minute 0
  async handleCronRefresh() {
    this.logger.log('[STEP 1] Running sports data refresh from oddsportal.com...');
    await this.refreshSportsFromWeb();
  }

  async refreshSportsFromWeb() {
    try {
      const scrapedSports = await parseSportsMenu();
      if (scrapedSports && scrapedSports.length > 0) {
        this.lastUpdated = new Date();

        // Save to database (upsert based on name)
        for (const sport of scrapedSports) {
          await this.sportRepository.upsert(
            {
              name: sport.name,
              icon: sport.icon,
              alt: sport.alt,
              url: sport.url,
            },
            ['name'], // conflict target: unique column
          );
        }

        this.logger.log(
          `Sports data refreshed from web and saved to database. Total sports: ${scrapedSports.length}. Last updated: ${this.lastUpdated.toISOString()}`
        );
      }
    } catch (error) {
      this.logger.error('Error refreshing sports from web:', error);
    }
  }

  async getAllSports() {
    // Get sports from database
    const sports = await this.sportRepository.find({
      order: { name: 'ASC' },
    });
    return sports;
  }

  async getCachedSportsData(): Promise<Sport[]> {
    return await this.sportRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getMatchDetail(matchUrl: string) {
    try {
      this.logger.log(`Fetching match details for: ${matchUrl}`);
      const matchData = await parseMatchDetail(matchUrl);
      return {
        message: 'Match details retrieved successfully',
        data: matchData,
      };
    } catch (error) {
      this.logger.error('Error fetching match details:', error);
      return {
        message: 'Error fetching match details',
        error: error.message,
        data: null,
      };
    }
  }

}

async function parseSportsMenu() {
          const browserOptions = {
            headless: 'new',
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

 
            const firstPageUrl = `https://www.oddsportal.com/`;
          
            
            await page.goto(firstPageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            console.log('Page loaded, waiting for sports menu...');

    // Wait for sports menu
    await page.waitForSelector('nav[aria-label="Sports Menu"]', {
      timeout: 30000
    });
    
    // Give extra time for content to render
    await delay(1000);
    
    // Parse all sports from ul > li
    const sports = await page.evaluate(() => {
      const menuItems = document.querySelectorAll('nav[aria-label="Sports Menu"] ul li');
      
      return Array.from(menuItems).map(li => {
        const img = li.querySelector('img');
        const sportName = li.querySelector('div[class*="text-white"]');
        const alt = img ? img.alt : null;
        
        return {
          name: sportName ? sportName.textContent.trim() : null,
          icon: img ? img.src : null,
          alt: alt,
          url: alt ? `https://www.oddsportal.com/${alt}/` : null
        };
      }).filter(sport => sport.name);
    });
    
    
    if (sports.length === 0) {
      console.log('No sports found, check selectors');
      return [];
    } else {
      return sports;
      // Save to JSON file
     // fs.writeFileSync('sports.json', JSON.stringify(sports, null, 2));
      console.log(`✓ Successfully saved ${sports.length} sports to sports.json`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

async function parseMatchDetail(matchUrl: string) {
  const browserOptions = {
    headless: 'new',
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

    console.log(`Navigating to: ${matchUrl}`);

    await page.goto(matchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Page loaded, waiting for match content...');

    // Wait for main content
    await page.waitForSelector('main', { timeout: 30000 });
    await delay(3000);

    // Parse match details
    const matchData = await page.evaluate(() => {
      const data: any = {
        teams: {},
        score: {},
        odds: [],
        matchInfo: {},
      };

      // Parse team names and date from react-event-header
      const eventHeader = document.getElementById('react-event-header');
      if (eventHeader) {
        const teamElementshome = eventHeader.querySelector('[data-testid="game-host"]');
        if (teamElementshome) {
          data.teams.home = teamElementshome?.textContent?.trim() || '';
        
        }
        // Get team names from event header
        const teamElementsguest = eventHeader.querySelector('[data-testid="game-guest"]');
        if (teamElementsguest) {
          data.teams.away = teamElementsguest?.textContent?.trim() || '';
        }

        // Get match date/time from event header
        const dateElement = eventHeader.querySelector('[data-testid="game-time-item"]');
        if (dateElement) {
          data.matchInfo.date = dateElement.textContent?.trim() || '';
        }

        // Get score from event header
        const scoreElements = eventHeader.querySelectorAll('p[class*="score"]');
        if (scoreElements.length >= 2) {
          data.score.home = scoreElements[0]?.textContent?.trim() || '';
          data.score.away = scoreElements[1]?.textContent?.trim() || '';
        }
              // FULL TIME SCORE
      const scoreStrong = eventHeader.querySelector('strong');
      if (scoreStrong) {
        const ft = scoreStrong.textContent?.trim();
        if (ft?.includes(':')) {
          const [home, away] = ft.split(':');
          data.score.fullTime = { home, away };
        }
      }

            // HALF TIME / PERIOD SCORES
      const headerText = eventHeader.textContent || '';
      const periodsMatch = headerText.match(/\(([^)]+)\)/);

      if (periodsMatch) {
        const periods = periodsMatch[1]
          .split(',')
          .map(p => p.trim());

        // HALF TIME
        if (periods[0]?.includes(':')) {
          const [htHome, htAway] = periods[0].split(':');
          data.score.halfTime = { home: htHome, away: htAway };
        }

        // SECOND HALF
        if (periods[1]?.includes(':')) {
          const [shHome, shAway] = periods[1].split(':');
          data.score.secondHalf = { home: shHome, away: shAway };
        }
      }


      }

      // Find and parse event-container for odds data
      const eventContainer = document.querySelector('[class*="event-container"]') ||
                            document.getElementById('event-container') ||
                            document.querySelector('div[class*="eventContainer"]');

      if (eventContainer) {
        // Get odds data from the event container
        const oddsRows = eventContainer.querySelectorAll('[data-testid="over-under-expanded-row"]');
        oddsRows.forEach((row,ind) => {
          if(ind>0) return; // limit number of odds entries
          const bookmaker = row.querySelectorAll('.odds-link,.odds-text');
          const oddsarr={};
           bookmaker.forEach((odd,index) => {
              const ol = odd.textContent?.trim();
             oddsarr[index]=ol;
           });
         
            data.odds.push(
                oddsarr
              
            );
           
        });
      }

      // Get event info (league, country, etc.) from breadcrumbs
      const breadcrumbs = document.querySelectorAll('[data-testid="breadcrumbs-line"] ul:nth-child(2) li a');
      const breadcrumbData: string[] = [];
      breadcrumbs.forEach(bc => {
        const text = bc.textContent?.trim();
        if (text) breadcrumbData.push(text);
      });

      if (breadcrumbData.length > 0) {
        data.matchInfo.sport = breadcrumbData[1] || '';
        data.matchInfo.country = breadcrumbData[2] || '';
        data.matchInfo.league = breadcrumbData[3] || '';
      }

      return data;
    });

    console.log('Match data extracted successfully');
    return matchData;

  } catch (error) {
    console.error('Error parsing match detail:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}
