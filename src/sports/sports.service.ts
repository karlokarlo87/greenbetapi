import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
 
const puppeteer = require('puppeteer');
export interface Sport {
  name: string;
  icon: string | null;
  alt: string;
  url: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class SportsService {
  private readonly logger = new Logger(SportsService.name);
  private sportsData: Sport[] = [];
  private lastUpdated: Date;

  constructor() {
    this.loadSportsData();
  }

  private loadSportsData() {
    try {
      const dataPath = path.join(__dirname, 'data', 'sports.json');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      this.sportsData = JSON.parse(fileContent);
      this.lastUpdated = new Date();
      this.logger.log(
        `Sports data loaded into cache. Total sports: ${this.sportsData.length}. Last updated: ${this.lastUpdated.toISOString()}`
      );
    } catch (error) {
      this.logger.error('Error loading sports data:', error);
      this.sportsData = [];
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCronRefresh() {
    this.logger.log('Running hourly sports data refresh from oddsportal.com...');
    await this.refreshSportsFromWeb();
  }

  async refreshSportsFromWeb() {
    try {
      const scrapedSports = await parseSportsMenu();
      if (scrapedSports && scrapedSports.length > 0) {
        this.sportsData = scrapedSports;
        this.lastUpdated = new Date();

        // Save to JSON file
        const dataPath = path.join(__dirname, 'data', 'sports.json');
        fs.writeFileSync(dataPath, JSON.stringify(scrapedSports, null, 2));

        this.logger.log(
          `Sports data refreshed from web. Total sports: ${this.sportsData.length}. Last updated: ${this.lastUpdated.toISOString()}`
        );
      }
    } catch (error) {
      this.logger.error('Error refreshing sports from web:', error);
    }
  }

  async getAllSports() {
      const scrapedSports = await parseSportsMenu();
    return scrapedSports
  }

  getCachedSportsData(): Sport[] {
    return this.sportsData;
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
          
            
            await page.goto(firstPageUrl, { waitUntil: 'domcontentloaded', timeout: 1000 });

            console.log('Page loaded, waiting for sports menu...');
    
    // Wait for sports menu
    await page.waitForSelector('nav[aria-label="Sports Menu"]', { 
      timeout: 1000 
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

      // Get team names
      const teamElements = document.querySelectorAll('a[class*="participant"]');
      if (teamElements.length >= 2) {
        data.teams.home = teamElements[0]?.textContent?.trim() || '';
        data.teams.away = teamElements[1]?.textContent?.trim() || '';
      }

      // Get score
      const scoreElements = document.querySelectorAll('p[class*="score"]');
      if (scoreElements.length >= 2) {
        data.score.home = scoreElements[0]?.textContent?.trim() || '';
        data.score.away = scoreElements[1]?.textContent?.trim() || '';
      }

      // Get match date/time
      const dateElement = document.querySelector('p[class*="date"]');
      if (dateElement) {
        data.matchInfo.date = dateElement.textContent?.trim() || '';
      }

      // Get odds data from the table
      const oddsRows = document.querySelectorAll('div[class*="border-black-main"] a');
      oddsRows.forEach((row) => {
        const bookmaker = row.querySelector('img')?.alt || row.querySelector('p')?.textContent?.trim() || '';
        const oddsElements = row.querySelectorAll('p');

        if (bookmaker && oddsElements.length >= 3) {
          data.odds.push({
            bookmaker: bookmaker,
            odds: {
              home: oddsElements[0]?.textContent?.trim() || '',
              draw: oddsElements[1]?.textContent?.trim() || '',
              away: oddsElements[2]?.textContent?.trim() || '',
            }
          });
        }
      });

      // Get event info (league, country, etc.)
      const breadcrumbs = document.querySelectorAll('a[class*="truncate"]');
      const breadcrumbData: string[] = [];
      breadcrumbs.forEach(bc => {
        const text = bc.textContent?.trim();
        if (text) breadcrumbData.push(text);
      });

      if (breadcrumbData.length > 0) {
        data.matchInfo.sport = breadcrumbData[0] || '';
        data.matchInfo.country = breadcrumbData[1] || '';
        data.matchInfo.league = breadcrumbData[2] || '';
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
