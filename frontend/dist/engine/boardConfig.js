"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PALETTE = exports.SNAKES = exports.LADDERS = exports.BOARD_ROWS = exports.BOARD_COLS = exports.TOTAL_SQUARES = void 0;
exports.getSquareCoordinates = getSquareCoordinates;
exports.getSquareFromCoordinates = getSquareFromCoordinates;
exports.squareToCoord = squareToCoord;
exports.coordToSquare = coordToSquare;
exports.getTokenScreenPosition = getTokenScreenPosition;
exports.getTokenOffset = getTokenOffset;
exports.getIntermediatePath = getIntermediatePath;
exports.TOTAL_SQUARES = 50;
exports.BOARD_COLS = 5;
exports.BOARD_ROWS = 10;
// Ladders: start -> end (3 -> 14, 8 -> 19, 17 -> 27, 22 -> 36, 31 -> 42, 39 -> 48)
exports.LADDERS = {
    3: 14,
    8: 19,
    17: 27,
    22: 36,
    31: 42,
    39: 48,
};
// Snakes: start -> end (12 -> 5, 20 -> 9, 29 -> 16, 35 -> 24, 44 -> 33, 47 -> 38)
exports.SNAKES = {
    12: 5,
    20: 9,
    29: 16,
    35: 24,
    44: 33,
    47: 38,
};
exports.PALETTE = [
    'coral-red',
    'royal-blue',
    'emerald-green',
    'golden-yellow',
];
/**
 * getSquareCoordinates(position) (Prompt Section 3)
 * For a position p between 1 and 50:
 * rowFromBottom = floor((p - 1) / 5)  // 0 at bottom (row 9), 9 at top (row 0)
 * offset = (p - 1) % 5
 *
 * Board layout specified in Prompt Section 2:
 * Row 0 (top): 46 | 47 | 48 | 49 | 50 (left to right, col 0 to 4)
 * Row 1: 45 | 44 | 43 | 42 | 41 (right to left, col 0 to 4)
 * Row 2: 36 | 37 | 38 | 39 | 40 (left to right, col 0 to 4)
 * Row 3: 35 | 34 | 33 | 32 | 31 (right to left, col 0 to 4)
 * ...
 * Row 8: 10 | 9 | 8 | 7 | 6 (right to left, col 0 to 4)
 * Row 9 (bottom): 1 | 2 | 3 | 4 | 5 (left to right, col 0 to 4)
 *
 * Return: row, column, position
 */
function getSquareCoordinates(position) {
    if (position < 1 || position > exports.TOTAL_SQUARES) {
        throw new Error(`Square out of bounds: ${position} (must be 1 to 50)`);
    }
    const rowFromBottom = Math.floor((position - 1) / exports.BOARD_COLS);
    const offset = (position - 1) % exports.BOARD_COLS;
    let column;
    if (rowFromBottom % 2 === 0) {
        if (rowFromBottom === 8) {
            column = (exports.BOARD_COLS - 1) - offset;
        }
        else {
            column = offset;
        }
    }
    else {
        if (rowFromBottom === 9) {
            column = offset;
        }
        else {
            column = (exports.BOARD_COLS - 1) - offset;
        }
    }
    const row = (exports.BOARD_ROWS - 1) - rowFromBottom;
    return { row, column, position };
}
/**
 * getSquareFromCoordinates(row, column) (Prompt Section 3)
 * Exact inverse of getSquareCoordinates
 */
function getSquareFromCoordinates(row, column) {
    if (column < 0 || column >= exports.BOARD_COLS || row < 0 || row >= exports.BOARD_ROWS) {
        throw new Error(`Coordinates out of bounds: row=${row}, column=${column}`);
    }
    const rowFromBottom = (exports.BOARD_ROWS - 1) - row;
    let offset;
    if (rowFromBottom % 2 === 0) {
        if (rowFromBottom === 8) {
            offset = (exports.BOARD_COLS - 1) - column;
        }
        else {
            offset = column;
        }
    }
    else {
        if (rowFromBottom === 9) {
            offset = column;
        }
        else {
            offset = (exports.BOARD_COLS - 1) - column;
        }
    }
    return rowFromBottom * exports.BOARD_COLS + offset + 1;
}
// Backward compatibility alias
function squareToCoord(square) {
    const { row, column } = getSquareCoordinates(square);
    return { row, col: column };
}
function coordToSquare(col, row) {
    return getSquareFromCoordinates(row, col);
}
/**
 * getTokenScreenPosition(position, boardLayout) (Prompt Section 4)
 * Formula:
 * cellWidth = boardWidth / 5
 * cellHeight = boardHeight / 10
 * centerX = boardLeft + (column * cellWidth) + (cellWidth / 2)
 * centerY = boardTop + (row * cellHeight) + (cellHeight / 2)
 */
function getTokenScreenPosition(position, boardLayout) {
    if (position <= 0) {
        // Position 0 = off board (waiting area)
        const boardLeft = boardLayout.left || 0;
        const boardTop = boardLayout.top || 0;
        return {
            x: boardLeft + (boardLayout.width / 5) / 2,
            y: boardTop + boardLayout.height + 20,
        };
    }
    const { row, column } = getSquareCoordinates(position);
    const cellWidth = boardLayout.width / exports.BOARD_COLS;
    const cellHeight = boardLayout.height / exports.BOARD_ROWS;
    const boardLeft = boardLayout.left || 0;
    const boardTop = boardLayout.top || 0;
    const centerX = boardLeft + (column * cellWidth) + (cellWidth / 2);
    const centerY = boardTop + (row * cellHeight) + (cellHeight / 2);
    return { x: centerX, y: centerY };
}
/**
 * getTokenOffset(playerIndex, totalPlayers) (Prompt Section 11)
 * Deterministic offsets so up to 4 tokens on the same square are fully visible
 * and never hide one behind another. Returns dx, dy relative to square center.
 */
function getTokenOffset(playerIndex, totalPlayers) {
    if (totalPlayers <= 1) {
        return { dx: 0, dy: 0 };
    }
    const offsets = [
        { dx: -6, dy: -6 },
        { dx: 6, dy: -6 },
        { dx: -6, dy: 6 },
        { dx: 6, dy: 6 },
    ];
    return offsets[playerIndex % 4];
}
/**
 * Calculates intermediate steps from fromPos to toPos along serpentine track (Prompt Section 5)
 */
function getIntermediatePath(fromPos, toPos) {
    const path = [];
    if (fromPos < toPos) {
        for (let p = fromPos + 1; p <= toPos; p++) {
            path.push(p);
        }
    }
    else if (fromPos > toPos) {
        for (let p = fromPos - 1; p >= toPos; p--) {
            path.push(p);
        }
    }
    return path;
}
