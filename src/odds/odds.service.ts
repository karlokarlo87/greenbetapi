import { Injectable } from '@nestjs/common';
const puppeteer = require('puppeteer');

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

@Injectable()
export class OddsService {
  private oddsData: any[] = [];

  // Scrape odds
  async getAllOdds(league: string): Promise<any> {
    const leagueUrl =league ||  "https://www.oddsportal.com/football/england/premier-league/";
    console.log(`Starting odds scraping for league: ${league}`);
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
      const browser = await puppeteer.launch( puppeteer.launch(browserOptions));

     try {
    const page = await browser.newPage();
    
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('Failed to load') && !text.includes('CORS') && !text.includes('Zone')) {
        console.log('PAGE:', text);
      }
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ka,en-US;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    //console.log(`\nNavigating to: ${leagueUrl}\n`);
    
    await page.goto(leagueUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    //console.log('Page loaded, waiting for content...');
    
    await page.waitForSelector('main', { timeout: 30000 });
    //console.log('✓ Main content found');
    
    await delay(1000);
    
   // console.log('Parsing matches...\n');
    
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
        // Check if this row contains a date header (but don't skip the row!)
        const dateHeader = row.querySelector('[data-testid="secondary-header"] [data-testid="date-header"]');
        if (dateHeader) {
          currentDate = dateHeader.textContent.trim();
          // DON'T RETURN - continue to extract match from same row
        }
        
        // Extract match data (still check if gameRow exists)
        const gameRow = row.querySelector('[data-testid="game-row"]');
        if (!gameRow) return; // Only skip if no match data
        
        // Get match link
        const matchLink = gameRow.closest('a');
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
        
        // Get odds (1, X, 2) - need to look in parent of gameRow
        const parentRow = gameRow.closest('.eventRow');
        const oddContainers = parentRow ? parentRow.querySelectorAll('[data-testid="odd-container-default"] p') : [];
        let odds = { home: null as string | null, draw: null as string | null, away: null as string | null };
        console.log('Odd containers found:', oddContainers.length);
        
          
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
              url: matchUrl ? (matchUrl.startsWith('http') ? matchUrl : 'https://www.oddsportal.com' + matchUrl) : null
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
   
    
    if (leagueData.matches.length > 0) {
     
      leagueData.matches.slice(0, 5).forEach((match, index) => {
       
      });
      
    return leagueData;
    } else {
      console.log('⚠ No matches found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\nBrowser will stay open for 15 seconds...');
     
    await browser.close();
  }



  }

  // Add new odds
  addOdd(odd: any) {
    this.oddsData.push(odd);
    return odd;
  }

  // Find odds by matchId
  findOddsByMatch(matchId: string) {
    return this.oddsData.filter(o => o.matchId === matchId);
  }
}
