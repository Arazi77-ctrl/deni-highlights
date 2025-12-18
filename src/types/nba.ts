// NBA API Response Types

export interface NBAApiResponse<T> {
  resource: string;
  parameters: Record<string, unknown>;
  resultSets: T[];
}

export interface GameLogResultSet {
  name: string;
  headers: string[];
  rowSet: (string | number)[][];
}

export interface Game {
  gameId: string;
  gameDate: string;
  matchup: string;
  result: string;
  points: number;
  opponentPoints: number;
  isHome: boolean;
}

export interface ShotChartResultSet {
  name: string;
  headers: string[];
  rowSet: (string | number | null)[][];
}

export interface Shot {
  gameId: string;
  gameEventId: number;
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  period: number;
  minutesRemaining: number;
  secondsRemaining: number;
  eventType: string;
  actionType: string;
  shotType: string;
  shotZoneBasic: string;
  shotZoneArea: string;
  shotZoneRange: string;
  shotDistance: number;
  locX: number;
  locY: number;
  shotMade: boolean;
  shotAttemptedFlag: number;
  shotMadeFlag: number;
  gameDate: string;
  htm: string;
  vtm: string;
}

export interface VideoEvent {
  uuid: string;
  dur: number;
  gc: string;
  desc: string;
  per: number;
  cl: string;
  y: number;
  x: number;
  evt: number;
  type: string;
  url?: string;
}

export interface VideoEventsResponse {
  resultSets: {
    Meta: {
      videoUrls: VideoEvent[];
    };
    playlist: {
      g: string;
      p: number;
      vid: number;
      ev: string;
      desc: string;
      dsc: string;
      ha: string;
      hpb: number;
      va: string;
      vpb: number;
      gc: string;
      per: number;
      cl: string;
      locX: number;
      locY: number;
      opt: string;
      mde: number;
      ession: string;
    }[];
  };
}

export type ContextMeasure = 'FGA' | 'AST' | 'TOV' | 'REB' | 'BLK' | 'STL' | 'PF';

export interface PlayEvent {
  gameId: string;
  eventId: number;
  period: number;
  clock: string;
  description: string;
  locX: number;
  locY: number;
  contextMeasure: ContextMeasure;
  made?: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoDuration?: number;
}

