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
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
