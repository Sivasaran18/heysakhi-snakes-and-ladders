package game

import "errors"

// PlayerColor represents the four distinct player token colors
type PlayerColor string

const (
	ColorCoralRed     PlayerColor = "coral-red"
	ColorRoyalBlue    PlayerColor = "royal-blue"
	ColorEmeraldGreen PlayerColor = "emerald-green"
	ColorGoldenYellow PlayerColor = "golden-yellow"
)

var Palette = []PlayerColor{
	ColorCoralRed,
	ColorRoyalBlue,
	ColorEmeraldGreen,
	ColorGoldenYellow,
}

// Coordinate on the 5x10 board
// Row 0 = Top, Row 9 = Bottom
// Column 0 = Left, Column 4 = Right
type BoardCoord struct {
	Col int `json:"column"` // 0 to 4 (left to right)
	Row int `json:"row"`    // 0 to 9 (0 is top row, 9 is bottom row)
}

// LadderConfig maps start square to end square
var Ladders = map[int]int{
	3:  14,
	8:  19,
	17: 27,
	22: 36,
	31: 42,
	39: 48,
}

// SnakeConfig maps start square to end square
var Snakes = map[int]int{
	12: 5,
	20: 9,
	29: 16,
	35: 24,
	44: 33,
	47: 38,
}

const (
	TotalSquares = 50
	BoardCols    = 5
	BoardRows    = 10
)

// SquareToCoord implements getSquareCoordinates(position) as specified in Prompt Section 2 & 3:
// Top row (row 0): 46 | 47 | 48 | 49 | 50 (left to right, col 0 to 4)
// Second row (row 1): 45 | 44 | 43 | 42 | 41 (right to left, col 0 to 4)
// ...
// Bottom row (row 9): 1 | 2 | 3 | 4 | 5 (left to right, col 0 to 4)
//
// For position p (1..50):
// rowFromBottom = floor((p - 1) / 5)  // 0 at bottom row, 9 at top row
// offset = (p - 1) % 5
// Since row 0 (top, rowFromBottom 9) and row 9 (bottom, rowFromBottom 0) are both left-to-right,
// even rowFromBottom is left-to-right (col = offset) when starting from bottom,
// UNLESS top row (rowFromBottom 9) is left-to-right, in which case odd rowFromBottom (9, 7, 5, 3, 1) or even (8, 6, 4, 2, 0)
// With alternating pattern where bottom row (1..5) is left to right (col = offset),
// and top row (46..50) is also left to right (col = offset):
// Row 9 (bottom): 1 -> 5 (col = offset)
// Row 8: 10 <- 6 (col = 4 - offset)
// Row 7: 11 -> 15 (col = offset)
// Row 6: 20 <- 16 (col = 4 - offset)
// Row 5: 21 -> 25 (col = offset)
// Row 4: 30 <- 26 (col = 4 - offset)
// Row 3: 31 -> 35 (col = offset)
// Row 2: 40 <- 36 (col = 4 - offset)
// Row 1: 41 -> 45 (col = 4 - offset for 45..41)
// Row 0: 46 -> 50 (col = offset for 46..50)
func SquareToCoord(p int) (BoardCoord, error) {
	if p < 1 || p > TotalSquares {
		return BoardCoord{}, errors.New("square out of bounds (must be 1-50)")
	}

	rowFromBottom := (p - 1) / BoardCols
	offset := (p - 1) % BoardCols

	var col int
	// If rowFromBottom is even (0, 2, 4, 6, 8):
	// Row 9 (bottom, rFB 0): 1..5 -> left to right (col = offset)
	// Row 7 (rFB 2): 11..15 -> left to right (col = offset)
	// Row 5 (rFB 4): 21..25 -> left to right (col = offset)
	// Row 3 (rFB 6): 31..35 -> left to right (col = offset)
	// Row 1 (rFB 8): Section 2 states: 45 | 44 | 43 | 42 | 41 -> right to left (col = 4 - offset)
	// Row 0 (top, rFB 9): Section 2 states: 46 | 47 | 48 | 49 | 50 -> left to right (col = offset)
	// Therefore, rFB 8 is right-to-left and rFB 9 is left-to-right!
	if rowFromBottom%2 == 0 {
		if rowFromBottom == 8 {
			col = (BoardCols - 1) - offset
		} else {
			col = offset
		}
	} else {
		if rowFromBottom == 9 {
			col = offset
		} else {
			col = (BoardCols - 1) - offset
		}
	}

	row := (BoardRows - 1) - rowFromBottom

	return BoardCoord{Col: col, Row: row}, nil
}

// CoordToSquare implements getSquareFromCoordinates(row, column) as the exact inverse:
func CoordToSquare(row, col int) (int, error) {
	if col < 0 || col >= BoardCols || row < 0 || row >= BoardRows {
		return 0, errors.New("coord out of bounds")
	}

	rowFromBottom := (BoardRows - 1) - row
	var offset int
	if rowFromBottom%2 == 0 {
		if rowFromBottom == 8 {
			offset = (BoardCols - 1) - col
		} else {
			offset = col
		}
	} else {
		if rowFromBottom == 9 {
			offset = col
		} else {
			offset = (BoardCols - 1) - col
		}
	}

	p := rowFromBottom*BoardCols + offset + 1
	return p, nil
}
