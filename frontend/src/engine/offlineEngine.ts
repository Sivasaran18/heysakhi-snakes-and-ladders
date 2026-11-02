import {
  GameSnapshot,
  MoveResult,
  Player,
  PlayerColor,
  TransitionType,
} from '../types/game';
import { LADDERS, PALETTE, SNAKES, TOTAL_SQUARES } from './boardConfig';

export class OfflineEngine {
  private players: Player[] = [];
  private currentPlayerIndex = 0;
  private hasRolled = false;
  private lastDiceValue = 0;
  private status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' = 'WAITING';
  private winnerId?: string;
  private stats: Record<string, { totalRolls: number; snakesEncountered: number; laddersClimbed: number; sixesRolled: number }> = {};

  constructor(playerNames: string[]) {
    const count = Math.min(Math.max(playerNames.length, 2), 4);
    for (let i = 0; i < count; i++) {
      const id = `offline-p${i + 1}`;
      this.players.push({
        id,
        name: playerNames[i]?.trim() || `Player ${i + 1}`,
        color: PALETTE[i],
        position: 0,
        isHost: i === 0,
        connected: true,
      });
      this.stats[id] = {
        totalRolls: 0,
        snakesEncountered: 0,
        laddersClimbed: 0,
        sixesRolled: 0,
      };
    }
  }

  public startGame(): void {
    this.status = 'IN_PROGRESS';
    this.currentPlayerIndex = 0;
    this.hasRolled = false;
    this.lastDiceValue = 0;
    this.winnerId = undefined;
  }

  public rollDice(forcedDice?: number): MoveResult {
    if (this.status !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }
    if (this.hasRolled) {
      throw new Error('Dice already rolled for this turn');
    }

    const diceValue = forcedDice && forcedDice >= 1 && forcedDice <= 6
      ? forcedDice
      : Math.floor(Math.random() * 6) + 1;

    const currPlayer = this.players[this.currentPlayerIndex];
    const prevPos = currPlayer.position;
    let targetPos = prevPos + diceValue;
    let finalPos = targetPos;
    let overshot = false;
    let transition: TransitionType = 'NONE';

    const pStats = this.stats[currPlayer.id];
    if (pStats) {
      pStats.totalRolls++;
      if (diceValue === 6) pStats.sixesRolled++;
    }

    // Exact 50 to win
    if (targetPos > TOTAL_SQUARES) {
      overshot = true;
      finalPos = prevPos;
      targetPos = prevPos;
    } else {
      if (LADDERS[targetPos]) {
        finalPos = LADDERS[targetPos];
        transition = 'LADDER';
        if (pStats) pStats.laddersClimbed++;
      } else if (SNAKES[targetPos]) {
        finalPos = SNAKES[targetPos];
        transition = 'SNAKE';
        if (pStats) pStats.snakesEncountered++;
      }
      currPlayer.position = finalPos;
    }

    const isWinner = currPlayer.position === TOTAL_SQUARES;
    const extraTurn = diceValue === 6 && !isWinner;

    if (isWinner) {
      this.status = 'FINISHED';
      this.winnerId = currPlayer.id;
    }

    let nextIndex = this.currentPlayerIndex;
    if (!isWinner && !extraTurn) {
      nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    this.currentPlayerIndex = nextIndex;
    this.hasRolled = false;
    this.lastDiceValue = diceValue;

    return {
      playerId: currPlayer.id,
      diceValue,
      previousPos: prevPos,
      targetPos,
      finalPos,
      transition,
      extraTurn,
      nextPlayerIndex: nextIndex,
      isWinner,
      overshot,
    };
  }

  public getSnapshot(): GameSnapshot {
    return {
      roomId: 'OFFLINE_MATCH',
      players: JSON.parse(JSON.stringify(this.players)),
      maxPlayers: this.players.length,
      turn: {
        currentPlayerIndex: this.currentPlayerIndex,
        hasRolled: this.hasRolled,
        lastDiceValue: this.lastDiceValue,
      },
      status: this.status,
      winnerId: this.winnerId,
      stats: JSON.parse(JSON.stringify(this.stats)),
    };
  }
}

