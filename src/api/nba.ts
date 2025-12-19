import axios from 'axios';
import type { Game, Shot, PlayEvent, ContextMeasure } from '../types/nba';

// Use relative URL in production, localhost in development
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

// Fetch Portland Trail Blazers games
export async function getPortlandGames(): Promise<Game[]> {
  try {
    const response = await axios.get(`${API_BASE}/games`);
    return response.data.games || [];
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return [];
  }
}

// Parse shot chart data from NBA API response
function parseShotChart(response: { resultSets: Array<{ headers: string[]; rowSet: (string | number | null)[][] }> }): Shot[] {
  const resultSet = response.resultSets[0];
  if (!resultSet || !resultSet.rowSet) return [];

  const headers = resultSet.headers;
  
  return resultSet.rowSet.map(row => {
    const getValue = (header: string) => {
      const idx = headers.indexOf(header);
      return idx !== -1 ? row[idx] : null;
    };

    return {
      gameId: String(getValue('GAME_ID')),
      gameEventId: Number(getValue('GAME_EVENT_ID')),
      playerId: Number(getValue('PLAYER_ID')),
      playerName: String(getValue('PLAYER_NAME')),
      teamId: Number(getValue('TEAM_ID')),
      teamName: String(getValue('TEAM_NAME')),
      period: Number(getValue('PERIOD')),
      minutesRemaining: Number(getValue('MINUTES_REMAINING')),
      secondsRemaining: Number(getValue('SECONDS_REMAINING')),
      eventType: String(getValue('EVENT_TYPE')),
      actionType: String(getValue('ACTION_TYPE')),
      shotType: String(getValue('SHOT_TYPE')),
      shotZoneBasic: String(getValue('SHOT_ZONE_BASIC')),
      shotZoneArea: String(getValue('SHOT_ZONE_AREA')),
      shotZoneRange: String(getValue('SHOT_ZONE_RANGE')),
      shotDistance: Number(getValue('SHOT_DISTANCE')),
      locX: Number(getValue('LOC_X')),
      locY: Number(getValue('LOC_Y')),
      shotMade: getValue('SHOT_MADE_FLAG') === 1,
      shotAttemptedFlag: Number(getValue('SHOT_ATTEMPTED_FLAG')),
      shotMadeFlag: Number(getValue('SHOT_MADE_FLAG')),
      gameDate: String(getValue('GAME_DATE')),
      htm: String(getValue('HTM')),
      vtm: String(getValue('VTM'))
    };
  });
}

// Fetch shot chart data for a specific game
export async function getShotChart(gameId: string): Promise<Shot[]> {
  try {
    const response = await axios.get(`${API_BASE}/shotchart`, {
      params: { gameId }
    });
    return parseShotChart(response.data);
  } catch (error) {
    console.error('Failed to fetch shot chart:', error);
    return [];
  }
}

// Video data from NBA API
interface VideoUrl {
  uuid: string;
  lurl: string;  // Large URL (1280x720)
  murl: string;  // Medium URL (960x540)
  surl: string;  // Small URL (320x180)
  lth: string;   // Large thumbnail
  ldur: number;  // Duration in ms
}

interface PlaylistItem {
  gi: string;    // Game ID
  ei: number;    // Event ID
  y: number;     // Year
  m: string;     // Month
  d: string;     // Day
  p: number;     // Period
  dsc: string;   // Description
  ha: string;    // Home team abbrev
  va: string;    // Away team abbrev
}

interface VideoResponse {
  resultSets: {
    Meta: {
      videoUrls: VideoUrl[];
    };
    playlist: PlaylistItem[];
  };
}

// Parse video details response
function parseVideoDetails(response: VideoResponse, contextMeasure: ContextMeasure): PlayEvent[] {
  const { videoUrls } = response.resultSets?.Meta || { videoUrls: [] };
  const playlist = response.resultSets?.playlist || [];
  
  if (!videoUrls || !playlist) return [];
  
  return playlist.map((item, index) => {
    const video = videoUrls[index];
    return {
      gameId: item.gi,
      eventId: item.ei,
      period: item.p,
      clock: '', // Not provided in this endpoint
      description: item.dsc,
      locX: 0,
      locY: 0,
      contextMeasure,
      videoUrl: video?.lurl || video?.murl || video?.surl,
      thumbnailUrl: video?.lth,
      videoDuration: video?.ldur
    };
  });
}

// Fetch video events for a specific game and context measure
export async function getVideoEvents(gameId: string, contextMeasure: ContextMeasure): Promise<PlayEvent[]> {
  try {
    const response = await axios.get(`${API_BASE}/videos`, {
      params: { gameId, contextMeasure }
    });
    return parseVideoDetails(response.data, contextMeasure);
  } catch (error) {
    console.error(`Failed to fetch ${contextMeasure} videos:`, error);
    return [];
  }
}

// Fetch all video events for a game (Deni's full game + clutch time for all players)
// Server handles deduplication and sorting
export async function getAllVideoEvents(gameId: string): Promise<PlayEvent[]> {
  try {
    const response = await axios.get(`${API_BASE}/videos/all`, {
      params: { gameId }
    });
    return response.data.events || [];
  } catch (error) {
    console.error('Failed to fetch all video events:', error);
    return [];
  }
}

// Legacy exports for compatibility
export const getPlayerEvents = getVideoEvents;
export const getAllPlayerEvents = getAllVideoEvents; // Note: now returns PlayEvent[] instead of Map
