package game_test

import (
	"heysakhi-snakes-ladders/game"
	"testing"
)

// Tests all 50 squares and their exact bidirectional inversion:
// getSquareFromCoordinates(getSquareCoordinates(position)) === position
func TestAll50SquaresBijection(t *testing.T) {
	for pos := 1; pos <= game.TotalSquares; pos++ {
		coord, err := game.SquareToCoord(pos)
		if err != nil {
			t.Fatalf("SquareToCoord(%d) failed: %v", pos, err)
		}
		if coord.Col < 0 || coord.Col >= game.BoardCols {
			t.Fatalf("Square %d: Col %d out of bounds [0, 4]", pos, coord.Col)
		}
		if coord.Row < 0 || coord.Row >= game.BoardRows {
			t.Fatalf("Square %d: Row %d out of bounds [0, 9]", pos, coord.Row)
		}

		revPos, err := game.CoordToSquare(coord.Row, coord.Col)
		if err != nil {
			t.Fatalf("CoordToSquare(row=%d, col=%d) failed: %v", coord.Row, coord.Col, err)
		}
		if revPos != pos {
			t.Fatalf("Bijection failed: getSquareFromCoordinates(getSquareCoordinates(%d)) = %d", pos, revPos)
		}
	}
}

// Tests the exact numbering pattern defined in Prompt Section 2 & 3:
// Bottom row (row 9): 1 | 2 | 3 | 4 | 5
// Second row (row 8): 10 | 9 | 8 | 7 | 6
// ...
// Second from top (row 1): 45 | 44 | 43 | 42 | 41
// Top row (row 0): 46 | 47 | 48 | 49 | 50
func TestExactSerpentineRows(t *testing.T) {
	// Bottom row (row 9): 1 | 2 | 3 | 4 | 5
	for c := 0; c < 5; c++ {
		expectedSquare := c + 1
		sq, _ := game.CoordToSquare(9, c)
		if sq != expectedSquare {
			t.Errorf("Bottom row (row 9, col %d): expected square %d, got %d", c, expectedSquare, sq)
		}
		coord, _ := game.SquareToCoord(expectedSquare)
		if coord.Row != 9 || coord.Col != c {
			t.Errorf("Square %d: expected row 9, col %d, got row %d, col %d", expectedSquare, c, coord.Row, coord.Col)
		}
	}

	// Second row (row 8): 10 | 9 | 8 | 7 | 6
	expectedRow8 := []int{10, 9, 8, 7, 6}
	for c, expectedSquare := range expectedRow8 {
		sq, _ := game.CoordToSquare(8, c)
		if sq != expectedSquare {
			t.Errorf("Row 8, col %d: expected square %d, got %d", c, expectedSquare, sq)
		}
		coord, _ := game.SquareToCoord(expectedSquare)
		if coord.Row != 8 || coord.Col != c {
			t.Errorf("Square %d: expected row 8, col %d, got row %d, col %d", expectedSquare, c, coord.Row, coord.Col)
		}
	}

	// Row 1: 45 | 44 | 43 | 42 | 41
	expectedRow1 := []int{45, 44, 43, 42, 41}
	for c, expectedSquare := range expectedRow1 {
		sq, _ := game.CoordToSquare(1, c)
		if sq != expectedSquare {
			t.Errorf("Row 1, col %d: expected square %d, got %d", c, expectedSquare, sq)
		}
		coord, _ := game.SquareToCoord(expectedSquare)
		if coord.Row != 1 || coord.Col != c {
			t.Errorf("Square %d: expected row 1, col %d, got row %d, col %d", expectedSquare, c, coord.Row, coord.Col)
		}
	}

	// Top row (row 0): 46 | 47 | 48 | 49 | 50
	expectedRow0 := []int{46, 47, 48, 49, 50}
	for c, expectedSquare := range expectedRow0 {
		sq, _ := game.CoordToSquare(0, c)
		if sq != expectedSquare {
			t.Errorf("Top row (row 0, col %d): expected square %d, got %d", c, expectedSquare, sq)
		}
		coord, _ := game.SquareToCoord(expectedSquare)
		if coord.Row != 0 || coord.Col != c {
			t.Errorf("Square %d: expected row 0, col %d, got row %d, col %d", expectedSquare, c, coord.Row, coord.Col)
		}
	}
}

// Tests Snakes and Ladders Configuration
func TestSnakeAndLadderConfig(t *testing.T) {
	expectedLadders := map[int]int{
		3:  14,
		8:  19,
		17: 27,
		22: 36,
		31: 42,
		39: 48,
	}
	for s, e := range expectedLadders {
		if game.Ladders[s] != e {
			t.Errorf("Ladder %d -> %d missing or wrong, got %d", s, e, game.Ladders[s])
		}
	}

	expectedSnakes := map[int]int{
		12: 5,
		20: 9,
		29: 16,
		35: 24,
		44: 33,
		47: 38,
	}
	for h, tail := range expectedSnakes {
		if game.Snakes[h] != tail {
			t.Errorf("Snake %d -> %d missing or wrong, got %d", h, tail, game.Snakes[h])
		}
	}
}

// Tests Token Movement & Intermediate paths
func TestTokenMovementMechanics(t *testing.T) {
	// 0 -> 4
	engine := game.NewEngine("TEST_MOVE", 2)
	p1, _ := engine.AddPlayer("p1", "Alice")
	engine.AddPlayer("p2", "Bob")
	engine.StartGame("p1")

	res, err := engine.ExecuteMoveWithDice("p1", 4)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if res.PreviousPos != 0 || res.TargetPos != 4 || res.FinalPos != 4 {
		t.Errorf("expected 0 -> 4, got prev %d, target %d, final %d", res.PreviousPos, res.TargetPos, res.FinalPos)
	}

	// 10 -> 14 (test from 10 + 4)
	p1.Position = 10
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	res2, err := engine.ExecuteMoveWithDice("p1", 4)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if res2.PreviousPos != 10 || res2.TargetPos != 14 || res2.FinalPos != 14 {
		t.Errorf("expected 10 -> 14, got prev %d, target %d, final %d", res2.PreviousPos, res2.TargetPos, res2.FinalPos)
	}

	// 20 -> 25 (test from 20 + 5)
	p1.Position = 20
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	res3, err := engine.ExecuteMoveWithDice("p1", 5)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if res3.TargetPos != 25 || res3.FinalPos != 25 {
		t.Errorf("expected 20 -> 25, got target %d, final %d", res3.TargetPos, res3.FinalPos)
	}

	// 46 -> 50 (test from 46 + 4)
	p1.Position = 46
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	res4, err := engine.ExecuteMoveWithDice("p1", 4)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if res4.TargetPos != 50 || res4.FinalPos != 50 || !res4.IsWinner {
		t.Errorf("expected 46 -> 50 (Winner), got target %d, final %d, winner %v", res4.TargetPos, res4.FinalPos, res4.IsWinner)
	}
}

// Tests Overshoot handling from 47 and 49 (Prompt Section 10 & 17)
func TestOvershootRules(t *testing.T) {
	engine := game.NewEngine("TEST_OVERSHOOT", 2)
	p1, _ := engine.AddPlayer("p1", "Alice")
	engine.AddPlayer("p2", "Bob")
	engine.StartGame("p1")

	// From 47 + 4 = 51 -> Remain at 47
	p1.Position = 47
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	res, err := engine.ExecuteMoveWithDice("p1", 4)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if !res.Overshot || res.FinalPos != 47 || p1.Position != 47 {
		t.Errorf("expected overshoot remain at 47, got overshot=%v, finalPos=%d", res.Overshot, res.FinalPos)
	}
	if res.NextPlayerIndex != 1 {
		t.Errorf("overshoot must pass turn to next player (Bob), got index %d", res.NextPlayerIndex)
	}

	// From 49 + 2 = 51 -> Remain at 49
	p1.Position = 49
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	res2, err := engine.ExecuteMoveWithDice("p1", 2)
	if err != nil {
		t.Fatalf("move failed: %v", err)
	}
	if !res2.Overshot || res2.FinalPos != 49 || p1.Position != 49 {
		t.Errorf("expected overshoot remain at 49, got overshot=%v, finalPos=%d", res2.Overshot, res2.FinalPos)
	}
	if res2.NextPlayerIndex != 1 {
		t.Errorf("overshoot must pass turn to next player (Bob), got index %d", res2.NextPlayerIndex)
	}
}

// Tests Snake Landing: 12 -> 5, 20 -> 9, 29 -> 16, 35 -> 24, 44 -> 33, 47 -> 38
func TestAllSnakes(t *testing.T) {
	snakes := map[int]int{
		12: 5,
		20: 9,
		29: 16,
		35: 24,
		44: 33,
		47: 38,
	}
	for head, tail := range snakes {
		engine := game.NewEngine("TEST_SNAKE", 2)
		p1, _ := engine.AddPlayer("p1", "Alice")
		engine.AddPlayer("p2", "Bob")
		engine.StartGame("p1")

		p1.Position = head - 2
		res, err := engine.ExecuteMoveWithDice("p1", 2)
		if err != nil {
			t.Fatalf("move failed for snake head %d: %v", head, err)
		}
		if res.TargetPos != head || res.FinalPos != tail || res.Transition != game.TransitionSnake {
			t.Errorf("Snake %d -> %d failed: got target %d, final %d, transition %v", head, tail, res.TargetPos, res.FinalPos, res.Transition)
		}
	}
}

// Tests Ladder Landing: 3 -> 14, 8 -> 19, 17 -> 27, 22 -> 36, 31 -> 42, 39 -> 48
func TestAllLadders(t *testing.T) {
	ladders := map[int]int{
		3:  14,
		8:  19,
		17: 27,
		22: 36,
		31: 42,
		39: 48,
	}
	for start, top := range ladders {
		engine := game.NewEngine("TEST_LADDER", 2)
		p1, _ := engine.AddPlayer("p1", "Alice")
		engine.AddPlayer("p2", "Bob")
		engine.StartGame("p1")

		p1.Position = start - 3
		res, err := engine.ExecuteMoveWithDice("p1", 3)
		if err != nil {
			t.Fatalf("move failed for ladder %d: %v", start, err)
		}
		if res.TargetPos != start || res.FinalPos != top || res.Transition != game.TransitionLadder {
			t.Errorf("Ladder %d -> %d failed: got target %d, final %d, transition %v", start, top, res.TargetPos, res.FinalPos, res.Transition)
		}
	}
}

// Tests Turn Logic: Normal, 6 (extra turn), 6 on snake (still extra turn), 6 on ladder (still extra turn)
func TestTurnLogicAndSix(t *testing.T) {
	engine := game.NewEngine("TEST_TURNS", 2)
	p1, _ := engine.AddPlayer("p1", "Alice")
	engine.AddPlayer("p2", "Bob")
	engine.StartGame("p1")

	// Alice rolls 3 (not 6) -> turn switches to Bob
	res1, _ := engine.ExecuteMoveWithDice("p1", 3) // landing on 3 -> ladder 14
	if res1.ExtraTurn || res1.NextPlayerIndex != 1 {
		t.Errorf("expected turn to switch to Bob, got extraTurn=%v, nextIndex=%d", res1.ExtraTurn, res1.NextPlayerIndex)
	}

	// Bob rolls 6 -> pos 6 -> extra turn for Bob
	res2, _ := engine.ExecuteMoveWithDice("p2", 6)
	if !res2.ExtraTurn || res2.NextPlayerIndex != 1 {
		t.Errorf("expected extra turn for Bob, got extraTurn=%v, nextIndex=%d", res2.ExtraTurn, res2.NextPlayerIndex)
	}

	// Bob rolls 6 again and lands on snake: Bob is at 6, 6 + 6 = 12 (Snake 12 -> 5).
	// Must apply snake AND grant extra turn!
	res3, _ := engine.ExecuteMoveWithDice("p2", 6)
	if res3.FinalPos != 5 || res3.Transition != game.TransitionSnake {
		t.Errorf("expected Snake 12 -> 5, got pos %d, transition %v", res3.FinalPos, res3.Transition)
	}
	if !res3.ExtraTurn || res3.NextPlayerIndex != 1 {
		t.Errorf("rolling 6 and landing on snake must grant additional turn, got extraTurn=%v, nextIndex=%d", res3.ExtraTurn, res3.NextPlayerIndex)
	}

	// Bob rolls 3 and lands on ladder: Bob is at 5, 5 + 3 = 8 (Ladder 8 -> 19).
	// Normal roll (3) -> turn switches to Alice
	res4, _ := engine.ExecuteMoveWithDice("p2", 3)
	if res4.FinalPos != 19 || res4.Transition != game.TransitionLadder {
		t.Errorf("expected Ladder 8 -> 19, got pos %d, transition %v", res4.FinalPos, res4.Transition)
	}
	if res4.ExtraTurn || res4.NextPlayerIndex != 0 {
		t.Errorf("turn must switch to Alice (0), got extraTurn=%v, nextIndex=%d", res4.ExtraTurn, res4.NextPlayerIndex)
	}

	// Alice lands on 50 with exact roll -> game finished, no actions allowed
	p1.Position = 48
	engine.Turn.CurrentPlayerIndex = 0
	engine.Turn.HasRolled = false
	resWin, _ := engine.ExecuteMoveWithDice("p1", 2)
	if !resWin.IsWinner || engine.Status != game.StatusFinished {
		t.Errorf("expected Alice to win on exact 50")
	}

	// Any further actions rejected
	_, err := engine.ExecuteMoveWithDice("p2", 1)
	if err == nil {
		t.Errorf("actions after winning must be rejected")
	}
}
