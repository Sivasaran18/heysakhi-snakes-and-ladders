package game

import (
	"crypto/rand"
	"errors"
	"math/big"
	"sync"
	"time"
)

type GameStatus string

const (
	StatusWaiting    GameStatus = "WAITING"
	StatusInProgress GameStatus = "IN_PROGRESS"
	StatusFinished   GameStatus = "FINISHED"
)

type Player struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Color     PlayerColor `json:"color"`
	Position  int         `json:"position"` // 0 is off-board, 1..50 on-board
	IsHost    bool        `json:"isHost"`
	Connected bool        `json:"connected"`
}

type TurnState struct {
	CurrentPlayerIndex int       `json:"currentPlayerIndex"`
	HasRolled          bool      `json:"hasRolled"`
	LastDiceValue      int       `json:"lastDiceValue"`
	TurnStartTime      time.Time `json:"turnStartTime"`
}

type TransitionType string

const (
	TransitionNone   TransitionType = "NONE"
	TransitionLadder TransitionType = "LADDER"
	TransitionSnake  TransitionType = "SNAKE"
)

type MoveResult struct {
	PlayerID        string         `json:"playerId"`
	DiceValue       int            `json:"diceValue"`
	PreviousPos     int            `json:"previousPos"`
	TargetPos       int            `json:"targetPos"`       // Position moved to by dice roll
	FinalPos        int            `json:"finalPos"`        // Position after snake or ladder
	Transition      TransitionType `json:"transition"`      // NONE, LADDER, SNAKE
	ExtraTurn       bool           `json:"extraTurn"`       // Rolled a 6
	NextPlayerIndex int            `json:"nextPlayerIndex"`
	IsWinner        bool           `json:"isWinner"`
	Overshot        bool           `json:"overshot"`        // Roll exceeded 50, stayed in place
}

type MatchStats struct {
	TotalRolls       int `json:"totalRolls"`
	SnakesEncountered int `json:"snakesEncountered"`
	LaddersClimbed   int `json:"laddersClimbed"`
	SixesRolled      int `json:"sixesRolled"`
}

type Engine struct {
	mu           sync.RWMutex
	RoomID       string              `json:"roomId"`
	Players      []*Player           `json:"players"`
	MaxPlayers   int                 `json:"maxPlayers"`
	Turn         TurnState           `json:"turn"`
	Status       GameStatus          `json:"status"`
	WinnerID     string              `json:"winnerId,omitempty"`
	Stats        map[string]*MatchStats `json:"stats"`
	ActionSeq    int64               `json:"actionSeq"`
	CreatedAt    time.Time           `json:"createdAt"`
}

func NewEngine(roomID string, maxPlayers int) *Engine {
	if maxPlayers < 2 {
		maxPlayers = 2
	} else if maxPlayers > 4 {
		maxPlayers = 4
	}
	return &Engine{
		RoomID:     roomID,
		Players:    make([]*Player, 0, maxPlayers),
		MaxPlayers: maxPlayers,
		Turn: TurnState{
			CurrentPlayerIndex: 0,
			HasRolled:          false,
			LastDiceValue:      0,
		},
		Status:    StatusWaiting,
		Stats:     make(map[string]*MatchStats),
		CreatedAt: time.Now(),
	}
}

func (e *Engine) AddPlayer(id, name string) (*Player, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.Status != StatusWaiting {
		return nil, errors.New("game has already started or finished")
	}
	if len(e.Players) >= e.MaxPlayers {
		return nil, errors.New("room is full")
	}
	for _, p := range e.Players {
		if p.ID == id {
			return p, nil // already in room
		}
	}

	slot := len(e.Players)
	player := &Player{
		ID:        id,
		Name:      name,
		Color:     Palette[slot],
		Position:  0,
		IsHost:    slot == 0,
		Connected: true,
	}
	e.Players = append(e.Players, player)
	e.Stats[id] = &MatchStats{}
	return player, nil
}

func (e *Engine) RemovePlayer(id string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	idx := -1
	for i, p := range e.Players {
		if p.ID == id {
			idx = i
			break
		}
	}
	if idx == -1 {
		return errors.New("player not found")
	}

	// If waiting, can remove
	if e.Status == StatusWaiting {
		e.Players = append(e.Players[:idx], e.Players[idx+1:]...)
		// Reassign colors & host
		for i, p := range e.Players {
			p.Color = Palette[i]
			p.IsHost = (i == 0)
		}
		delete(e.Stats, id)
		return nil
	}

	// If in progress, mark disconnected
	e.Players[idx].Connected = false
	return nil
}

func (e *Engine) ReconnectPlayer(id string) (*Player, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, p := range e.Players {
		if p.ID == id {
			p.Connected = true
			return p, nil
		}
	}
	return nil, errors.New("player not found in room")
}

func (e *Engine) StartGame(hostID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.Status != StatusWaiting {
		return errors.New("game is not in waiting state")
	}
	if len(e.Players) < 2 {
		return errors.New("need at least 2 players to start")
	}
	if len(e.Players) > 0 && e.Players[0].ID != hostID {
		return errors.New("only room host can start the game")
	}

	e.Status = StatusInProgress
	e.Turn = TurnState{
		CurrentPlayerIndex: 0,
		HasRolled:          false,
		LastDiceValue:      0,
		TurnStartTime:      time.Now(),
	}
	return nil
}

func (e *Engine) RollDice(playerID string) (*MoveResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.Status != StatusInProgress {
		return nil, errors.New("game is not in progress")
	}
	if len(e.Players) == 0 {
		return nil, errors.New("no players in game")
	}

	currPlayer := e.Players[e.Turn.CurrentPlayerIndex]
	if currPlayer.ID != playerID {
		return nil, errors.New("not your turn")
	}
	if e.Turn.HasRolled {
		return nil, errors.New("dice has already been rolled for this turn")
	}

	// Roll 1..6 securely
	nBig, err := rand.Int(rand.Reader, big.NewInt(6))
	if err != nil {
		return nil, errors.New("failed to generate random dice")
	}
	diceVal := int(nBig.Int64()) + 1

	return e.executeMove(currPlayer, diceVal)
}

// For deterministic testing or offline mode with provided dice
func (e *Engine) ExecuteMoveWithDice(playerID string, diceVal int) (*MoveResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.Status != StatusInProgress {
		return nil, errors.New("game is not in progress")
	}
	if diceVal < 1 || diceVal > 6 {
		return nil, errors.New("invalid dice value")
	}

	currPlayer := e.Players[e.Turn.CurrentPlayerIndex]
	if currPlayer.ID != playerID {
		return nil, errors.New("not your turn")
	}
	if e.Turn.HasRolled {
		return nil, errors.New("dice has already been rolled for this turn")
	}

	return e.executeMove(currPlayer, diceVal)
}

func (e *Engine) executeMove(currPlayer *Player, diceVal int) (*MoveResult, error) {
	e.ActionSeq++
	e.Turn.HasRolled = true
	e.Turn.LastDiceValue = diceVal

	stats := e.Stats[currPlayer.ID]
	if stats != nil {
		stats.TotalRolls++
		if diceVal == 6 {
			stats.SixesRolled++
		}
	}

	prevPos := currPlayer.Position
	targetPos := prevPos + diceVal
	finalPos := targetPos
	overshot := false
	transition := TransitionNone

	// Rule: Exactly 50 to win. If overshoot, stay at prevPos
	if targetPos > TotalSquares {
		overshot = true
		finalPos = prevPos
		targetPos = prevPos
	} else {
		// Check snake or ladder
		if ladderEnd, isLadder := Ladders[targetPos]; isLadder {
			finalPos = ladderEnd
			transition = TransitionLadder
			if stats != nil {
				stats.LaddersClimbed++
			}
		} else if snakeEnd, isSnake := Snakes[targetPos]; isSnake {
			finalPos = snakeEnd
			transition = TransitionSnake
			if stats != nil {
				stats.SnakesEncountered++
			}
		}
		currPlayer.Position = finalPos
	}

	isWinner := (currPlayer.Position == TotalSquares)
	extraTurn := (diceVal == 6 && !isWinner)

	if isWinner {
		e.Status = StatusFinished
		e.WinnerID = currPlayer.ID
	}

	var nextPlayerIdx int
	if isWinner {
		nextPlayerIdx = e.Turn.CurrentPlayerIndex
	} else if extraTurn {
		nextPlayerIdx = e.Turn.CurrentPlayerIndex
		e.Turn.HasRolled = false // reset for extra roll
		e.Turn.TurnStartTime = time.Now()
	} else {
		nextPlayerIdx = (e.Turn.CurrentPlayerIndex + 1) % len(e.Players)
		e.Turn.CurrentPlayerIndex = nextPlayerIdx
		e.Turn.HasRolled = false
		e.Turn.TurnStartTime = time.Now()
	}

	return &MoveResult{
		PlayerID:        currPlayer.ID,
		DiceValue:       diceVal,
		PreviousPos:     prevPos,
		TargetPos:       targetPos,
		FinalPos:        finalPos,
		Transition:      transition,
		ExtraTurn:       extraTurn,
		NextPlayerIndex: nextPlayerIdx,
		IsWinner:        isWinner,
		Overshot:        overshot,
	}, nil
}

func (e *Engine) GetSnapshot() Engine {
	e.mu.RLock()
	defer e.mu.RUnlock()

	playersCopy := make([]*Player, len(e.Players))
	for i, p := range e.Players {
		copyP := *p
		playersCopy[i] = &copyP
	}

	statsCopy := make(map[string]*MatchStats)
	for k, v := range e.Stats {
		copyS := *v
		statsCopy[k] = &copyS
	}

	return Engine{
		RoomID:     e.RoomID,
		Players:    playersCopy,
		MaxPlayers: e.MaxPlayers,
		Turn:       e.Turn,
		Status:     e.Status,
		WinnerID:   e.WinnerID,
		Stats:      statsCopy,
		ActionSeq:  e.ActionSeq,
		CreatedAt:  e.CreatedAt,
	}
}
