import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Player } from '../types/game';
import {
  BOARD_COLS,
  BOARD_ROWS,
  TOTAL_SQUARES,
  LADDERS,
  SNAKES,
  getSquareCoordinates,
  getSquareFromCoordinates,
  getTokenScreenPosition,
  getTokenOffset,
} from '../engine/boardConfig';
import { Token } from './Token';

interface BoardProps {
  players: Player[];
  boardWidth: number;
}

export const Board: React.FC<BoardProps> = ({ players, boardWidth }) => {
  const cellWidth = Math.floor(boardWidth / BOARD_COLS);
  const cellHeight = Math.floor(cellWidth * 1.05);
  const boardHeight = cellHeight * BOARD_ROWS;

  const boardLayout = useMemo(() => ({
    width: boardWidth,
    height: boardHeight,
    left: 0,
    top: 0,
  }), [boardWidth, boardHeight]);

  // Build grid of 50 squares ordered visually from row 0 to 9, col 0 to 4
  const gridCells = useMemo(() => {
    const list: Array<{ square: number; row: number; column: number }> = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const square = getSquareFromCoordinates(r, c);
        list.push({ square, row: r, column: c });
      }
    }
    return list;
  }, []);

  // Group tokens by square
  const tokensBySquare = useMemo(() => {
    const map = new Map<number, Player[]>();
    players.forEach((p) => {
      if (p.position > 0 && p.position <= TOTAL_SQUARES) {
        if (!map.has(p.position)) {
          map.set(p.position, []);
        }
        map.get(p.position)!.push(p);
      }
    });
    return map;
  }, [players]);

  // Generate SVG lines/curves using exact centers from getTokenScreenPosition
  const ladderConnections = useMemo(() => {
    return Object.entries(LADDERS).map(([startStr, endVal]) => {
      const start = parseInt(startStr, 10);
      const end = endVal;
      const c1 = getTokenScreenPosition(start, boardLayout);
      const c2 = getTokenScreenPosition(end, boardLayout);
      return { start, end, c1, c2 };
    });
  }, [boardLayout]);

  const snakeConnections = useMemo(() => {
    return Object.entries(SNAKES).map(([startStr, endVal]) => {
      const head = parseInt(startStr, 10);
      const tail = endVal;
      const c1 = getTokenScreenPosition(head, boardLayout);
      const c2 = getTokenScreenPosition(tail, boardLayout);
      return { head, tail, c1, c2 };
    });
  }, [boardLayout]);

  return (
    <View style={[styles.container, { width: boardWidth, height: boardHeight }]}>
      {/* 50 Board Squares Grid */}
      {gridCells.map(({ square, row, column }) => {
        const top = row * cellHeight;
        const left = column * cellWidth;
        const isLadderStart = LADDERS[square] !== undefined;
        const isSnakeHead = SNAKES[square] !== undefined;
        const isEvenSquare = (column + row) % 2 === 0;

        return (
          <View
            key={`sq-${square}`}
            style={[
              styles.cell,
              {
                width: cellWidth,
                height: cellHeight,
                top,
                left,
                backgroundColor:
                  square === 50
                    ? '#FEF3C7' // Golden winning square
                    : square === 1
                    ? '#DCFCE7' // Starting square
                    : isEvenSquare
                    ? '#FFFFFF'
                    : '#F8FAFC',
              },
            ]}
          >
            <Text
              style={[
                styles.squareNumber,
                square === 50 && styles.winSquareText,
                square === 1 && styles.startSquareText,
              ]}
            >
              {square}
            </Text>

            {isLadderStart && (
              <View style={styles.ladderBadge}>
                <Text style={styles.badgeText}>🪜 {LADDERS[square]}</Text>
              </View>
            )}

            {isSnakeHead && (
              <View style={styles.snakeBadge}>
                <Text style={styles.badgeText}>🐍 {SNAKES[square]}</Text>
              </View>
            )}

            {square === 50 && (
              <View style={styles.trophyBadge}>
                <Text style={styles.trophyText}>🏆 WIN</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Scalable SVG Overlay for Authentic Ladders and Snakes */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: boardWidth,
          height: boardHeight,
          pointerEvents: 'none',
          zIndex: 5,
        }}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      >
        <defs>
          <linearGradient id="ladderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
        </defs>

        {/* Ladders: Double rail with rungs connecting exact center of start and end */}
        {ladderConnections.map(({ start, end, c1, c2 }) => {
          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ux = (-dy / len) * 6; // perpendicular vector 6px
          const uy = (dx / len) * 6;

          const rungs = 7;
          const rungLines = [];
          for (let i = 1; i < rungs; i++) {
            const t = i / rungs;
            const rx = c1.x + dx * t;
            const ry = c1.y + dy * t;
            rungLines.push(
              <line
                key={`rung-${start}-${i}`}
                x1={rx - ux}
                y1={ry - uy}
                x2={rx + ux}
                y2={ry + uy}
                stroke="#6366F1"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          }

          return (
            <g key={`ladder-${start}-${end}`} opacity={0.88}>
              {/* Left rail */}
              <line
                x1={c1.x - ux}
                y1={c1.y - uy}
                x2={c2.x - ux}
                y2={c2.y - uy}
                stroke="url(#ladderGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Right rail */}
              <line
                x1={c1.x + ux}
                y1={c1.y + uy}
                x2={c2.x + ux}
                y2={c2.y + uy}
                stroke="url(#ladderGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              {rungLines}
            </g>
          );
        })}

        {/* Snakes: Smooth serpentine curves ending at tail center */}
        {snakeConnections.map(({ head, tail, c1, c2 }) => {
          const midX = (c1.x + c2.x) / 2 + (head % 2 === 0 ? 30 : -30);
          const midY = (c1.y + c2.y) / 2;
          const pathD = `M ${c1.x} ${c1.y} Q ${midX} ${midY} ${c2.x} ${c2.y}`;

          return (
            <g key={`snake-${head}-${tail}`} opacity={0.9}>
              <path
                d={pathD}
                fill="none"
                stroke="url(#snakeGrad)"
                strokeWidth={5}
                strokeLinecap="round"
              />
              {/* Snake head circle */}
              <circle cx={c1.x} cy={c1.y} r={7} fill="#DC2626" />
              {/* Snake eyes */}
              <circle cx={c1.x - 2} cy={c1.y - 2} r={1.5} fill="#FFFFFF" />
              <circle cx={c1.x + 2} cy={c1.y - 2} r={1.5} fill="#FFFFFF" />
              {/* Snake tail tip */}
              <circle cx={c2.x} cy={c2.y} r={2.5} fill="#991B1B" />
            </g>
          );
        })}
      </svg>

      {/* Player Tokens positioned at exact center with deterministic collision offset */}
      {Array.from(tokensBySquare.entries()).map(([sq, sqPlayers]) => {
        const { x, y } = getTokenScreenPosition(sq, boardLayout);
        return sqPlayers.map((player, idx) => {
          const offset = getTokenOffset(idx, sqPlayers.length);
          return (
            <View
              key={`token-${player.id}`}
              style={{
                position: 'absolute',
                left: x - 11 + offset.dx,
                top: y - 11 + offset.dy,
                zIndex: 20,
              }}
            >
              <Token player={player} />
            </View>
          );
        });
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: 'center',
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'flex-start',
  },
  squareNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  winSquareText: {
    color: '#D97706',
    fontWeight: '800',
  },
  startSquareText: {
    color: '#16A34A',
    fontWeight: '800',
  },
  ladderBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: '#EEF2FF',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  snakeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#334155',
  },
  trophyBadge: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    backgroundColor: '#FDE68A',
    borderRadius: 4,
    paddingHorizontal: 3,
  },
  trophyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
});
