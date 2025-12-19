import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Constants
const PORTLAND_TEAM_ID = 1610612757;
const DENI_PLAYER_ID = '1630166';

// Calculate current NBA season
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 10) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

const CURRENT_SEASON = getCurrentSeason();
console.log(`Using NBA season: ${CURRENT_SEASON}`);

// Common headers - exact browser headers
const NBA_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Host': 'stats.nba.com',
  'Origin': 'https://www.nba.com',
  'Referer': 'https://www.nba.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors', 
  'Sec-Fetch-Site': 'same-site',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true'
};

// Get Portland's games from CDN schedule
app.get('/api/games', async (req, res) => {
  console.log('Fetching games from CDN schedule...');
  
  try {
    const response = await fetch('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json');
    const data = await response.json();
    
    const portlandGames = [];
    for (const gameDate of data.leagueSchedule.gameDates) {
      if (!gameDate.games || !Array.isArray(gameDate.games)) continue;
      
      for (const game of gameDate.games) {
        const isPortland = game.homeTeam?.teamId === PORTLAND_TEAM_ID || 
                          game.awayTeam?.teamId === PORTLAND_TEAM_ID;
        const isCompleted = game.gameStatus === 3;
        
        if (isPortland && isCompleted) {
          const isHome = game.homeTeam?.teamId === PORTLAND_TEAM_ID;
          const opponent = isHome ? game.awayTeam : game.homeTeam;
          const portlandTeam = isHome ? game.homeTeam : game.awayTeam;
          
          portlandGames.push({
            gameId: game.gameId,
            gameCode: game.gameCode,
            gameDate: game.gameDateEst,
            matchup: isHome ? `POR vs. ${opponent?.teamTricode}` : `POR @ ${opponent?.teamTricode}`,
            isHome,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeTeam?.score || 0,
            awayScore: game.awayTeam?.score || 0,
            result: portlandTeam?.score > opponent?.score ? 'W' : 'L',
            points: portlandTeam?.score || 0,
            opponentPoints: opponent?.score || 0
          });
        }
      }
    }
    
    portlandGames.sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate));
    console.log(`Found ${portlandGames.length} completed Portland games`);
    res.json({ games: portlandGames });
  } catch (error) {
    console.error('Error fetching games:', error.message);
    res.status(500).json({ error: 'Failed to fetch games', details: error.message });
  }
});

// Get video details for a specific game and context measure using the correct endpoint
app.get('/api/videos', async (req, res) => {
  const { gameId, contextMeasure } = req.query;
  
  if (!gameId || !contextMeasure) {
    return res.status(400).json({ error: 'gameId and contextMeasure are required' });
  }

  console.log(`Fetching ${contextMeasure} videos for game ${gameId}`);

  // Use the exact parameters the NBA website uses
  const params = new URLSearchParams({
    AheadBehind: '',
    CFID: '',
    CFPARAMS: '',
    ClutchTime: '',
    Conference: '',
    ContextFilter: '',
    ContextMeasure: contextMeasure,
    DateFrom: '',
    DateTo: '',
    Division: '',
    EndPeriod: '0',
    EndRange: '31800',
    GROUP_ID: '',
    GameEventID: '',
    GameID: gameId,
    GameSegment: '',
    GroupID: '',
    GroupMode: '',
    GroupQuantity: '5',
    LastNGames: '0',
    LeagueID: '00',
    Location: '',
    Month: '0',
    OnOff: '',
    OppPlayerID: '',
    OpponentTeamID: '0',
    Outcome: '',
    PORound: '0',
    Period: '0',
    PlayerID: DENI_PLAYER_ID,
    PlayerID1: '',
    PlayerID2: '',
    PlayerID3: '',
    PlayerID4: '',
    PlayerID5: '',
    PlayerPosition: '',
    PointDiff: '',
    Position: '',
    RangeType: '0',
    RookieYear: '',
    Season: CURRENT_SEASON,
    SeasonSegment: '',
    SeasonType: 'Regular Season',
    ShotClockRange: '',
    StartPeriod: '0',
    StartRange: '0',
    StarterBench: '',
    TeamID: String(PORTLAND_TEAM_ID),
    VsConference: '',
    VsDivision: '',
    VsPlayerID1: '',
    VsPlayerID2: '',
    VsPlayerID3: '',
    VsPlayerID4: '',
    VsPlayerID5: '',
    VsTeamID: ''
  });

  const url = `https://stats.nba.com/stats/videodetailsasset?${params}`;
  console.log(`Calling videodetailsasset...`);

  try {
    const response = await fetch(url, {
      headers: NBA_HEADERS
    });
    
    if (!response.ok) {
      console.error(`NBA API returned ${response.status}`);
      return res.status(response.status).json({ error: `NBA API returned ${response.status}` });
    }
    
    const data = await response.json();
    console.log(`Got ${data.resultSets?.playlist?.length || 0} video events`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching videos:', error.message);
    res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
  }
});

// Get shot chart data with coordinates
app.get('/api/shotchart', async (req, res) => {
  const { gameId } = req.query;
  
  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  console.log(`Fetching shot chart for game ${gameId}`);

  // Use exact parameters the NBA website uses
  const params = new URLSearchParams({
    AheadBehind: '',
    CFID: '',
    CFPARAMS: '',
    ClutchTime: '',
    Conference: '',
    ContextFilter: '',
    ContextMeasure: 'FGA',
    DateFrom: '',
    DateTo: '',
    Division: '',
    EndPeriod: '0',
    EndRange: '31800',
    GROUP_ID: '',
    GameEventID: '',
    GameID: gameId,
    GameSegment: '',
    GroupID: '',
    GroupMode: '',
    GroupQuantity: '5',
    LastNGames: '0',
    LeagueID: '00',
    Location: '',
    Month: '0',
    OnOff: '',
    OppPlayerID: '',
    OpponentTeamID: '0',
    Outcome: '',
    PORound: '0',
    Period: '0',
    PlayerID: DENI_PLAYER_ID,
    PlayerID1: '',
    PlayerID2: '',
    PlayerID3: '',
    PlayerID4: '',
    PlayerID5: '',
    PlayerPosition: '',
    PointDiff: '',
    Position: '',
    RangeType: '0',
    RookieYear: '',
    Season: CURRENT_SEASON,
    SeasonSegment: '',
    SeasonType: 'Regular Season',
    ShotClockRange: '',
    StartPeriod: '0',
    StartRange: '0',
    StarterBench: '',
    TeamID: String(PORTLAND_TEAM_ID),
    VsConference: '',
    VsDivision: '',
    VsPlayerID1: '',
    VsPlayerID2: '',
    VsPlayerID3: '',
    VsPlayerID4: '',
    VsPlayerID5: '',
    VsTeamID: ''
  });

  try {
    const response = await fetch(`https://stats.nba.com/stats/shotchartdetail?${params}`, {
      headers: NBA_HEADERS
    });
    
    if (!response.ok) {
      throw new Error(`NBA API returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Got ${data.resultSets?.[0]?.rowSet?.length || 0} shots`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching shot chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch shot chart', details: error.message });
  }
});

// Fetch with timeout helper
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Helper function to fetch player-specific videos
// Set teamId to '0' to get videos for any team (for opponent players in clutch)
async function fetchPlayerVideos(gameId, contextMeasure, playerId, teamId = String(PORTLAND_TEAM_ID)) {
  const params = new URLSearchParams({
    AheadBehind: '',
    CFID: '',
    CFPARAMS: '',
    ClutchTime: '',
    Conference: '',
    ContextFilter: '',
    ContextMeasure: contextMeasure,
    DateFrom: '',
    DateTo: '',
    Division: '',
    EndPeriod: '0',
    EndRange: '31800',
    GROUP_ID: '',
    GameEventID: '',
    GameID: gameId,
    GameSegment: '',
    GroupID: '',
    GroupMode: '',
    GroupQuantity: '5',
    LastNGames: '0',
    LeagueID: '00',
    Location: '',
    Month: '0',
    OnOff: '',
    OppPlayerID: '',
    OpponentTeamID: '0',
    Outcome: '',
    PORound: '0',
    Period: '0',
    PlayerID: playerId,
    PlayerID1: '',
    PlayerID2: '',
    PlayerID3: '',
    PlayerID4: '',
    PlayerID5: '',
    PlayerPosition: '',
    PointDiff: '',
    Position: '',
    RangeType: '0',
    RookieYear: '',
    Season: CURRENT_SEASON,
    SeasonSegment: '',
    SeasonType: 'Regular Season',
    ShotClockRange: '',
    StartPeriod: '0',
    StartRange: '0',
    StarterBench: '',
    TeamID: teamId,
    VsConference: '',
    VsDivision: '',
    VsPlayerID1: '',
    VsPlayerID2: '',
    VsPlayerID3: '',
    VsPlayerID4: '',
    VsPlayerID5: '',
    VsTeamID: ''
  });

  const url = `https://stats.nba.com/stats/videodetailsasset?${params}`;
  
  try {
    console.log(`  Fetching ${contextMeasure}...`);
    const response = await fetchWithTimeout(url, { headers: NBA_HEADERS }, 15000);
    
    if (!response.ok) {
      console.error(`  NBA API returned ${response.status} for ${contextMeasure}`);
      return [];
    }
    
    const data = await response.json();
    const videoUrls = data.resultSets?.Meta?.videoUrls || [];
    const playlist = data.resultSets?.playlist || [];
    
    console.log(`  Got ${playlist.length} ${contextMeasure} events`);
    
    return playlist.map((item, index) => {
      const video = videoUrls[index];
      return {
        gameId: item.gi,
        eventId: item.ei,
        period: item.p,
        description: item.dsc,
        contextMeasure,
        videoUrl: video?.lurl || video?.murl || video?.surl,
        thumbnailUrl: video?.lth,
        videoDuration: video?.ldur
      };
    });
  } catch (error) {
    console.error(`  Error fetching ${contextMeasure}:`, error.message);
    return [];
  }
}

// Fetch clutch-time events from play-by-play CDN, then get videos matching those event IDs
async function fetchClutchVideosFromPlayByPlay(gameId) {
  console.log('  Fetching play-by-play to find clutch events...');
  
  try {
    // 1. Get play-by-play data from CDN (has ALL events with clock time)
    const pbpResponse = await fetchWithTimeout(
      `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`,
      {},
      10000
    );
    
    if (!pbpResponse.ok) {
      console.error(`  Play-by-play CDN returned ${pbpResponse.status}`);
      return [];
    }
    
    const pbpData = await pbpResponse.json();
    const allActions = pbpData.game?.actions || [];
    
    // 2. Filter for clutch time: Q4 last 5 min (clock <= 5:00) OR any OT period
    const clutchActions = allActions.filter(action => {
      const period = action.period;
      const clock = action.clock || ''; // Format: "PT05M30.00S"
      
      // Parse clock to get minutes
      const clockMatch = clock.match(/PT(\d+)M/);
      const minutes = clockMatch ? parseInt(clockMatch[1]) : 0;
      
      // Include if: OT (period >= 5) OR Q4 with <= 5 minutes left
      if (period >= 5) return true; // All OT events
      if (period === 4 && minutes <= 5) return true; // Q4 last 5 min
      
      return false;
    });
    
    // 3. Build a SET of clutch-time event IDs for fast lookup
    const clutchEventIds = new Set();
    clutchActions.forEach(action => {
      if (action.actionNumber) {
        clutchEventIds.add(action.actionNumber);
      }
    });
    
    console.log(`  Found ${clutchEventIds.size} clutch-time event IDs`);
    
    // Debug: Show last few clutch events to verify event IDs
    const lastClutchActions = clutchActions.slice(-5);
    console.log('  Last 5 clutch events from play-by-play:');
    lastClutchActions.forEach(a => {
      console.log(`    #${a.actionNumber}: ${a.actionType} - ${a.description} (${a.clock})`);
    });
    
    // 4. Get unique player IDs from clutch actions (excluding Deni)
    const deniId = parseInt(DENI_PLAYER_ID);
    const playerIds = new Set();
    clutchActions.forEach(action => {
      if (action.personId && action.personId !== deniId) {
        playerIds.add(action.personId);
      }
    });
    
    console.log(`  Found ${playerIds.size} unique players in clutch time`);
    
    // 5. Fetch videos for each player, then filter by clutch event IDs
    const allClutchEvents = [];
    const playerArray = Array.from(playerIds).slice(0, 8); // Limit to 8 players to reduce API calls
    // Focus on most important categories for clutch time (skip less common ones)
    const clutchMeasures = ['FGA', 'AST', 'TOV'];
    
    console.log(`  Fetching videos for ${playerArray.length} players × ${clutchMeasures.length} categories = ${playerArray.length * clutchMeasures.length} API calls...`);
    
    let playerCount = 0;
    for (const playerId of playerArray) {
      playerCount++;
      const playerStart = Date.now();
      
      // Fetch categories for this player (sequentially to avoid rate limiting)
      // Use teamId='0' to get videos from ANY team (including opponents)
      const playerResults = [];
      for (const measure of clutchMeasures) {
        const events = await fetchPlayerVideos(gameId, measure, String(playerId), '0');
        playerResults.push(events);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }
      
      const playerTime = Date.now() - playerStart;
      
      // Flatten and filter: only keep videos whose eventId is in our clutch set
      let matchCount = 0;
      playerResults.forEach(events => {
        events.forEach(event => {
          if (clutchEventIds.has(event.eventId)) {
            allClutchEvents.push(event);
            matchCount++;
          }
        });
      });
      
      console.log(`    Player ${playerCount}/${playerArray.length} (${playerId}): ${matchCount} clutch events in ${(playerTime/1000).toFixed(1)}s`);
    }
    
    console.log(`  Got ${allClutchEvents.length} clutch video events (filtered by event ID)`);
    return allClutchEvents;
    
  } catch (error) {
    console.error(`  Error fetching clutch from play-by-play:`, error.message);
    return [];
  }
}

// Get all videos: Deni's full game + clutch time (Q4 last 5 min + all OT)
app.get('/api/videos/all', async (req, res) => {
  const { gameId } = req.query;
  
  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  const totalStart = Date.now();
  console.log(`\n========== Fetching all videos for game ${gameId} ==========`);
  
  // FTA (free throws) removed - NBA API doesn't provide video clips for free throws
  const contextMeasures = ['FGA', 'AST', 'TOV', 'REB', 'BLK', 'STL', 'PF'];
  const allEvents = [];
  
  try {
    // 1. Fetch all Deni videos (full game) - sequential to avoid rate limiting
    const deniStart = Date.now();
    console.log('Step 1: Fetching Deni videos (full game)...');
    const deniResults = [];
    for (const measure of contextMeasures) {
      const events = await fetchPlayerVideos(gameId, measure, DENI_PLAYER_ID);
      deniResults.push(events);
      console.log(`  ${measure}: ${events.length} events`);
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    const deniTime = Date.now() - deniStart;
    
    deniResults.forEach(events => allEvents.push(...events));
    console.log(`✓ Deni: ${allEvents.length} events in ${(deniTime/1000).toFixed(1)}s`);
    
    // Debug: show last few Deni events
    const sortedDeni = [...allEvents].sort((a, b) => a.eventId - b.eventId);
    console.log('  Last 3 Deni events by eventId:');
    sortedDeni.slice(-3).forEach(e => {
      console.log(`    #${e.eventId}: ${e.contextMeasure} - ${e.description}`);
    });
    
    // 2. Fetch clutch-time videos using play-by-play approach
    const clutchStart = Date.now();
    console.log('Step 2: Fetching clutch videos (Q4 last 5 min + OT)...');
    const clutchEvents = await fetchClutchVideosFromPlayByPlay(gameId);
    const clutchTime = Date.now() - clutchStart;
    allEvents.push(...clutchEvents);
    console.log(`✓ Clutch: ${clutchEvents.length} events in ${(clutchTime/1000).toFixed(1)}s`);
    
    // 3. Deduplicate by eventId
    const eventMap = new Map();
    allEvents.forEach(event => {
      if (event.eventId && !eventMap.has(event.eventId)) {
        eventMap.set(event.eventId, event);
      }
    });
    
    // 4. Sort chronologically by eventId
    const dedupedEvents = Array.from(eventMap.values());
    dedupedEvents.sort((a, b) => a.eventId - b.eventId);
    
    const totalTime = Date.now() - totalStart;
    console.log(`\n========== COMPLETE ==========`);
    console.log(`Total: ${dedupedEvents.length} unique events in ${(totalTime/1000).toFixed(1)}s`);
    console.log(`  - Deni fetch: ${(deniTime/1000).toFixed(1)}s`);
    console.log(`  - Clutch fetch: ${(clutchTime/1000).toFixed(1)}s`);
    console.log(`===============================\n`);
    
    res.json({ events: dedupedEvents });
    
  } catch (error) {
    console.error('Error fetching all videos:', error.message);
    res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
  }
});

// Get play-by-play from CDN (has all events with coordinates)
app.get('/api/playbyplay', async (req, res) => {
  const { gameId } = req.query;
  
  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  console.log(`Fetching play-by-play for game ${gameId}`);

  try {
    const response = await fetch(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`);
    
    if (!response.ok) {
      throw new Error(`CDN returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for Deni's actions
    const deniId = parseInt(DENI_PLAYER_ID);
    const deniActions = data.game.actions.filter(action => 
      action.personId === deniId || action.assistPersonId === deniId
    );
    
    console.log(`Found ${deniActions.length} Deni actions`);
    res.json({ 
      gameId,
      actions: deniActions,
      totalActions: data.game.actions.length
    });
  } catch (error) {
    console.error('Error fetching play-by-play:', error.message);
    res.status(500).json({ error: 'Failed to fetch play-by-play', details: error.message });
  }
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
