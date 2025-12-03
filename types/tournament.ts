export type MatchStage =
  | 'roundRobin'
  | 'qualification'
  | 'semiFinal1'
  | 'semiFinal2'
  | 'consolation'
  | 'final';

export type MatchStatus = 'scheduled' | 'completed';

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  players: Player[];
}

export interface Match {
  id: string;
  stage: MatchStage;
  slot: number;
  homeId: string;
  awayId: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
}

export interface TableRow {
  teamId: string;
  name: string;
  color: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GameNightSummary {
  id: string;
  title: string;
  createdAt: string;
  winnerId?: string;
  teamCount: number;
}

export interface GameNight {
  id: string;
  title: string;
  createdAt: string;
  teams: Team[];
  matches: Match[];
  currentMatchId?: string;
}

export interface TimerSettings {
  durationSeconds: number;
  running: boolean;
  remainingSeconds: number;
  attachedMatchId?: string;
}
