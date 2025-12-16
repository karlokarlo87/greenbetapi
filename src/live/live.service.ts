import { Injectable } from '@nestjs/common';
const puppeteer = require('puppeteer');

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

@Injectable()
export class LiveService {

     async getLiveSports() {
        return  parseInPlaySports();    
     }
     async getAllLiveSports() {
        return  parseInPlaySports();    
     }
    async getLiveSport(sport: string) {
            const data = await parseInPlaySports(); 
            const datamatch = data.matches;
            const result = datamatch.filter(item => item.sport.toLowerCase() === sport.toLowerCase());
            return result;
    }

}

async function parseInPlaySports() {
  const inPlayUrl = 'https://www.oddsportal.com/inplay-odds/';
  
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

    console.log(`\nNavigating to: ${inPlayUrl}\n`);
    
    await page.goto(inPlayUrl, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
       async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 800;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve(null);
        }
      }, 300);
    });
  });
}
    await autoScroll(page);
    console.log('Page loaded, waiting for content...');
    await page.waitForSelector('.eventRow', { timeout: 10000 }).catch(() => {
        console.log('No matches found for this sport');
    });
    await page.waitForSelector('[data-testid="sport-tabs-nav-menu"]', { timeout: 30000 });
    console.log('✓ Sport tabs found');
    
    await delay(3000);
    
    console.log('Parsing sport tabs...\n');
    
    // Extract all sport tabs
    const sportsData = await page.evaluate(() => {

          const matchRows = document.querySelectorAll('.eventRow');
          const matches: Array<{ sport: string; country: string; countryFlag: string | null; league: string; matchTime: string; matchStatus: string; homeTeam: string | null; homeTeamLogo: string | null; homeScore: string; awayTeam: string | null; awayTeamLogo: string | null; awayScore: string; odds: any; bookmakers: string | null; url: string | null }> = [];
          let currentLeague: { sport: string; country: string; countryFlag: string | null; league: string } | null = null;
                  matchRows.forEach(row => {
            // Check for league header
            const leagueHeader = row.querySelector('[data-testid="sport-country-league-item"]');
            if (leagueHeader) {
              const sportElement = leagueHeader.querySelector('[data-testid="header-sport-item"]');
              const countryElement = leagueHeader.querySelector('[data-testid="header-country-item"]');
              const leagueElement = leagueHeader.querySelector('[data-testid="header-tournament-item"]');
              
              currentLeague = {
                sport: sportElement ? sportElement.textContent.trim() : '',
                country: countryElement ? countryElement.textContent.trim() : '',
                countryFlag: countryElement ? countryElement.querySelector('img')?.getAttribute('src') ?? null : null,
                league: leagueElement ? leagueElement.textContent.trim() : ''
              };
            }
            
            // Check for game row
            const gameRow = row.querySelector('[data-testid="game-row"]');
            if (!gameRow || !currentLeague) return;
            
            try {
              // Extract match time
              const timeElement = gameRow.querySelector('[data-testid="time-item"] p');
              const matchTime = timeElement ? timeElement.textContent.trim() : '';
              
              // Determine match status
              let matchStatus = 'LIVE';
              if (matchTime === 'HT') {
                matchStatus = 'HALF TIME';
              } else if (matchTime === 'FT') {
                matchStatus = 'FINISHED';
              } else if (matchTime.includes('Q')) {
                matchStatus = 'LIVE';
              } else if (matchTime.includes("'")) {
                matchStatus = 'LIVE';
              }
              
              // Extract teams and scores
              const participants = gameRow.querySelector('[data-testid="event-participants"]');
              if (!participants) return;
              
              const teamElements = participants.querySelectorAll('a[title]');
              if (teamElements.length < 2) return;
              
              const homeTeamElement = teamElements[0];
              const awayTeamElement = teamElements[1];
              
              const homeTeam = homeTeamElement.getAttribute('title');
              const awayTeam = awayTeamElement.getAttribute('title');
              
              const homeTeamLogo = homeTeamElement.querySelector('img')?.getAttribute('src') || null;
              const awayTeamLogo = awayTeamElement.querySelector('img')?.getAttribute('src') || null;
              
              // Extract scores (looking for font-bold text-red-dark elements)
              const scoreElements = participants.querySelectorAll('.text-red-dark.font-bold');
              let homeScore: string = '';
              let awayScore: string = '';
              
              if (scoreElements.length >= 2) {
                // Scores are typically in the order: home, away (in the hidden section for larger screens)
                const hiddenScores = Array.from(scoreElements).filter(el => 
                  el.classList.contains('min-mt:!flex') && el.classList.contains('hidden')
                );
                
                if (hiddenScores.length >= 2) {
                  homeScore = hiddenScores[0].textContent.trim();
                  awayScore = hiddenScores[2] ? hiddenScores[2].textContent.trim() : hiddenScores[1].textContent.trim();
                } else {
                  // Fallback to visible scores
                  const visibleScores = Array.from(scoreElements).filter(el => 
                    el.classList.contains('min-mt:!hidden')
                  );
                  if (visibleScores.length >= 2) {
                    homeScore = visibleScores[0].textContent.trim();
                    awayScore = visibleScores[1].textContent.trim();
                  }
                }
              }
              
              // Extract odds - DYNAMICALLY detect 2-way or 3-way odds
              const parentRow = gameRow.closest('.eventRow');
              if (!parentRow) return;
              const oddContainers = parentRow.querySelectorAll('[data-testid="odd-container-default"] .font-bold');
              
              let odds = {};
              
              // Check how many odds columns are present
              if (oddContainers.length >= 3) {
                // 3-way odds (1-X-2): home, draw, away
                const homeOdds = oddContainers[0].textContent.trim();
                const drawOdds = oddContainers[1].textContent.trim();
                const awayOdds = oddContainers[2].textContent.trim();
                
                odds = {
                  home: homeOdds !== '-' ? homeOdds : null,
                  draw: drawOdds !== '-' ? drawOdds : null,
                  away: awayOdds !== '-' ? awayOdds : null
                };
              } else if (oddContainers.length >= 2) {
                // 2-way odds (1-2): home, away
                const homeOdds = oddContainers[0].textContent.trim();
                const awayOdds = oddContainers[1].textContent.trim();
                
                odds = {
                  home: homeOdds !== '-' ? homeOdds : null,
                  away: awayOdds !== '-' ? awayOdds : null
                };
              }
              
              // Extract bookmakers count
              const bookiesElement = parentRow.querySelector('[data-testid="bookies-amount-item"] .text-black-main');
              const bookmakers = bookiesElement ? bookiesElement.textContent.trim() : null;
              
              // Extract match URL
              const matchLink = gameRow.querySelector('a');
              const matchUrl = matchLink ? 'https://www.oddsportal.com' + matchLink.getAttribute('href') : null;
              
              matches.push({
                ...currentLeague,
                matchTime,
                matchStatus,
                homeTeam,
                homeTeamLogo,
                homeScore,
                awayTeam,
                awayTeamLogo,
                awayScore,
                odds,
                bookmakers,
                url: matchUrl
              });
              
            } catch (error) {
              console.log('Error parsing match:', error.message);
            }
          });
      const sports: Array<{ name: string; url: string; icon: string | null }> = [];
      
      // Get visible sport tabs
      const visibleTabs = document.querySelectorAll('[data-testid="sport-tabs-nav-menu"] > a[href*="/inplay-odds/live-now/"]');
      
      visibleTabs.forEach(tab => {
        const href = tab.getAttribute('href');
        const sportNameElement = tab.querySelector('[data-testid="sport-tab-name"]');
        const sportIconElement = tab.querySelector('[data-testid="sport-tab-icon"] img');
        
        if (href && sportNameElement) {
          const sportName = sportNameElement.textContent.trim();
          const sportIcon = sportIconElement ? sportIconElement.getAttribute('src') : null;
          const url = href.startsWith('http') ? href : 'https://www.oddsportal.com' + href;
          
          sports.push({
            name: sportName,
            url: url,
            icon: sportIcon
          });
        }
      });
      
      // Get hidden sport tabs (in "More" dropdown)
      const hiddenTabs = document.querySelectorAll('[data-testid="sport-tabs-nav-hidden-menu"] > a[href*="/inplay-odds/live-now/"]');
      
      hiddenTabs.forEach(tab => {
        const href = tab.getAttribute('href');
        const sportNameElement = tab.querySelector('[data-testid="sport-tab-name"]');
        const sportIconElement = tab.querySelector('[data-testid="sport-tab-icon"] img');
        
        if (href && sportNameElement) {
          const sportName = sportNameElement.textContent.trim();
          const sportIcon = sportIconElement ? sportIconElement.getAttribute('src') : null;
          const url = href.startsWith('http') ? href : 'https://www.oddsportal.com' + href;
          
          sports.push({
            name: sportName,
            url: url,
            icon: sportIcon
          });
        }
      });
      console.log(sports)
      console.log(`Found ${sports.length} sports in navigation`);
      
      return {sports:sports,matches:matches};
    });
    
    console.log(`✓ Extracted ${sportsData.length} sports\n`);
    
    return sportsData;
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\nBrowser will stay open for 15 seconds...');
     
    await browser.close();
  }
}
