"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const boardConfig_1 = require("./engine/boardConfig");
const offlineEngine_1 = require("./engine/offlineEngine");
function assert(condition, msg) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}
console.log('--- Starting Complete 50-Square Mathematical Validation ---');
// 1. BOARD: All 50 positions & all 50 reverse coordinate conversions
for (let p = 1; p <= boardConfig_1.TOTAL_SQUARES; p++) {
    const coord = (0, boardConfig_1.getSquareCoordinates)(p);
    assert(coord.position === p, `Square ${p}: position mismatch`);
    assert(coord.row >= 0 && coord.row < boardConfig_1.BOARD_ROWS, `Square ${p}: row ${coord.row} out of bounds [0, 9]`);
    assert(coord.column >= 0 && coord.column < boardConfig_1.BOARD_COLS, `Square ${p}: col ${coord.column} out of bounds [0, 4]`);
    const revP = (0, boardConfig_1.getSquareFromCoordinates)(coord.row, coord.column);
    assert(revP === p, `Bijective invertibility failed: getSquareFromCoordinates(${coord.row}, ${coord.column}) = ${revP} !== ${p}`);
}
console.log('✓ All 50 squares and reverse coordinate conversions strictly bijective.');
// 2. Correct Top and Bottom Rows & Alternating Serpentine directions (Prompt Section 2)
// Bottom row (row 9): 1 | 2 | 3 | 4 | 5
for (let c = 0; c < 5; c++) {
    const sq = (0, boardConfig_1.getSquareFromCoordinates)(9, c);
    assert(sq === c + 1, `Bottom row col ${c} must be ${c + 1}, got ${sq}`);
}
// Second row (row 8): 10 | 9 | 8 | 7 | 6
const row8Expected = [10, 9, 8, 7, 6];
for (let c = 0; c < 5; c++) {
    const sq = (0, boardConfig_1.getSquareFromCoordinates)(8, c);
    assert(sq === row8Expected[c], `Row 8 col ${c} must be ${row8Expected[c]}, got ${sq}`);
}
// Row 1: 45 | 44 | 43 | 42 | 41
const row1Expected = [45, 44, 43, 42, 41];
for (let c = 0; c < 5; c++) {
    const sq = (0, boardConfig_1.getSquareFromCoordinates)(1, c);
    assert(sq === row1Expected[c], `Row 1 col ${c} must be ${row1Expected[c]}, got ${sq}`);
}
// Top row (row 0): 46 | 47 | 48 | 49 | 50
const row0Expected = [46, 47, 48, 49, 50];
for (let c = 0; c < 5; c++) {
    const sq = (0, boardConfig_1.getSquareFromCoordinates)(0, c);
    assert(sq === row0Expected[c], `Top row col ${c} must be ${row0Expected[c]}, got ${sq}`);
}
console.log('✓ Exact serpentine pattern (bottom 1..5, second 10..6, row 1 45..41, top 46..50) verified.');
// 3. TOKEN MOVEMENT & INTERMEDIATE PATHS
// 0 -> 4
const path0to4 = (0, boardConfig_1.getIntermediatePath)(0, 4);
assert(path0to4.join(',') === '1,2,3,4', `Path 0->4 mismatch: ${path0to4}`);
// 10 -> 14
const path10to14 = (0, boardConfig_1.getIntermediatePath)(10, 14);
assert(path10to14.join(',') === '11,12,13,14', `Path 10->14 mismatch: ${path10to14}`);
// 20 -> 25
const path20to25 = (0, boardConfig_1.getIntermediatePath)(20, 25);
assert(path20to25.join(',') === '21,22,23,24,25', `Path 20->25 mismatch: ${path20to25}`);
// 46 -> 50
const path46to50 = (0, boardConfig_1.getIntermediatePath)(46, 50);
assert(path46to50.join(',') === '47,48,49,50', `Path 46->50 mismatch: ${path46to50}`);
console.log('✓ Intermediate square-by-square token paths verified.');
// 4. LADDERS: 3->14, 8->19, 17->27, 22->36, 31->42, 39->48
const expectedLadders = { 3: 14, 8: 19, 17: 27, 22: 36, 31: 42, 39: 48 };
for (const [start, end] of Object.entries(expectedLadders)) {
    assert(boardConfig_1.LADDERS[Number(start)] === end, `Ladder ${start} -> ${end} missing or incorrect`);
}
// 5. SNAKES: 12->5, 20->9, 29->16, 35->24, 44->33, 47->38
const expectedSnakes = { 12: 5, 20: 9, 29: 16, 35: 24, 44: 33, 47: 38 };
for (const [head, tail] of Object.entries(expectedSnakes)) {
    assert(boardConfig_1.SNAKES[Number(head)] === tail, `Snake ${head} -> ${tail} missing or incorrect`);
}
console.log('✓ All ladders and snakes configuration verified.');
// 6. OVERSHOOT RULES: 47 + 4 = 51 -> 47; 49 + 2 = 51 -> 49
const engine = new offlineEngine_1.OfflineEngine(['Alice', 'Bob']);
engine.startGame();
const snap = engine.getSnapshot();
const p1 = engine.players[0];
p1.position = 47;
const moveOvershoot1 = engine.rollDice(4);
assert(moveOvershoot1.overshot === true, 'Overshoot 47+4 must flag overshot');
assert(moveOvershoot1.finalPos === 47, 'Overshoot 47+4 must remain at 47');
assert(moveOvershoot1.nextPlayerIndex === 1, 'Overshoot must switch turn to next player');
// Bob rolls
engine.rollDice(1);
// Alice at 49 rolls 2 -> overshoot 49
p1.position = 49;
const moveOvershoot2 = engine.rollDice(2);
assert(moveOvershoot2.overshot === true, 'Overshoot 49+2 must flag overshot');
assert(moveOvershoot2.finalPos === 49, 'Overshoot 49+2 must remain at 49');
assert(moveOvershoot2.nextPlayerIndex === 1, 'Overshoot 49+2 must switch turn to Bob');
console.log('✓ Overshoot from 47 and 49 verified.');
// 7. TOKEN SCREEN POSITION & MULTI-TOKEN OFFSETS
const boardLayout = { width: 340, height: 440, left: 0, top: 0 };
const cellW = 340 / 5;
const cellH = 440 / 10;
// Test Square 1 center: row 9, col 0 -> x = cellW/2, y = 9*cellH + cellH/2
const center1 = (0, boardConfig_1.getTokenScreenPosition)(1, boardLayout);
assert(Math.abs(center1.x - cellW / 2) < 0.001, 'Square 1 center x incorrect');
assert(Math.abs(center1.y - (9 * cellH + cellH / 2)) < 0.001, 'Square 1 center y incorrect');
// Test Square 50 center: row 0, col 4 -> x = 4*cellW + cellW/2, y = cellH/2
const center50 = (0, boardConfig_1.getTokenScreenPosition)(50, boardLayout);
assert(Math.abs(center50.x - (4 * cellW + cellW / 2)) < 0.001, 'Square 50 center x incorrect');
assert(Math.abs(center50.y - (cellH / 2)) < 0.001, 'Square 50 center y incorrect');
// Offsets for up to 4 players on same square
const off0 = (0, boardConfig_1.getTokenOffset)(0, 4);
const off1 = (0, boardConfig_1.getTokenOffset)(1, 4);
const off2 = (0, boardConfig_1.getTokenOffset)(2, 4);
const off3 = (0, boardConfig_1.getTokenOffset)(3, 4);
assert(off0.dx !== off1.dx || off0.dy !== off1.dy, 'Offsets must be distinct');
assert(off1.dx !== off2.dx || off1.dy !== off2.dy, 'Offsets must be distinct');
console.log('✓ Token screen center & deterministic collision offsets verified.');
console.log('--- ALL 50-SQUARE MATHEMATICAL TESTS PASSED ---');
