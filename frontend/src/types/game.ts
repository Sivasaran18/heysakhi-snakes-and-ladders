export type PlayerColor = 'coral-red' | 'royal-blue' | 'emerald-green' | 'golden-yellow';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  position: number; // 0 = off board, 1..50
  isHost: boolean;
  connected: boolean;
}

export type TransitionType = 'NONE' | 'LADDER' | 'SNAKE';

export interface MoveResult {
  playerId: string;
  diceValue: number;
  previousPos: number;
  targetPos: number;
  finalPos: number;
  transition: TransitionType;
  extraTurn: boolean;
  nextPlayerIndex: number;
  isWinner: boolean;
  overshot: boolean;
}

export interface MatchStats {
  totalRolls: number;
  snakesEncountered: number;
  laddersClimbed: number;
  sixesRolled: number;
}

export interface BoardCoord {
  col: number; // 0 to 4
  row: number; // 0 to 9 (0 is bottom row, 9 is top row)
}

export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED';

export interface GameSnapshot {
  roomId: string;
  players: Player[];
  maxPlayers: number;
  turn: {
    currentPlayerIndex: number;
    hasRolled: boolean;
    lastDiceValue: number;
  };
  status: GameStatus;
  winnerId?: string;
  stats?: Record<string, MatchStats>;
}

export const COLOR_MAP: Record<PlayerColor, { primary: string; light: string; border: string; label: string }> = {
  'coral-red': {
    primary: '#E63946',
    light: '#FFE5E8',
    border: '#B71C1C',
    label: 'Coral Red',
  },
  'royal-blue': {
    primary: '#1D3557',
    light: '#E1EDF8',
    border: '#0D2137',
    label: 'Royal Blue',
  },
  'emerald-green': {
    primary: '#2A9D8F',
    light: '#E2F7F2',
    border: '#1E6F65',
    label: 'Emerald Green',
  },
  'golden-yellow': {
    primary: '#F4A261',
    light: '#FEF3E8',
    border: '#C2722C',
    label: 'Golden Yellow',
  },
};

