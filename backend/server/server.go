package server

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"heysakhi-snakes-ladders/game"
	"heysakhi-snakes-ladders/websocket"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Event types matching Section 8 of prompt
const (
	EventCreateRoom    = "CREATE_ROOM"
	EventRoomCreated   = "ROOM_CREATED"
	EventJoinRoom      = "JOIN_ROOM"
	EventPlayerJoined  = "PLAYER_JOINED"
	EventPlayerLeft    = "PLAYER_LEFT"
	EventRoomUpdated   = "ROOM_UPDATED"
	EventStartGame     = "START_GAME"
	EventGameStarted   = "GAME_STARTED"
	EventRollDice      = "ROLL_DICE"
	EventDiceResult    = "DICE_RESULT"
	EventPlayerMoved   = "PLAYER_MOVED"
	EventSnakeBitten   = "SNAKE_BITTEN"
	EventLadderClimbed = "LADDER_CLIMBED"
	EventTurnChanged   = "TURN_CHANGED"
	EventGameWon       = "GAME_WON"
	EventReconnect     = "RECONNECT"
	EventGameStateSync = "GAME_STATE_SYNC"
	EventError         = "ERROR"
)

type WSMessage struct {
	Type      string          `json:"type"`
	RoomID    string          `json:"roomId,omitempty"`
	PlayerID  string          `json:"playerId,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Timestamp int64           `json:"timestamp"`
}

type Client struct {
	ID       string
	PlayerID string
	RoomID   string
	Conn     *websocket.Conn
	sendChan chan []byte
	hub      *Hub
}

type Room struct {
	mu      sync.RWMutex
	ID      string
	Engine  *game.Engine
	Clients map[string]*Client // PlayerID -> Client
}

type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]*Room
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			log.Printf("[Hub] Registered client player=%s room=%s", client.PlayerID, client.RoomID)
		case client := <-h.unregister:
			h.handleDisconnect(client)
		}
	}
}

func (h *Hub) handleDisconnect(c *Client) {
	if c.RoomID == "" || c.PlayerID == "" {
		return
	}
	h.mu.RLock()
	room, exists := h.rooms[c.RoomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	existingClient, clientPresent := room.Clients[c.PlayerID]
	if clientPresent && existingClient == c {
		delete(room.Clients, c.PlayerID)
		room.Engine.RemovePlayer(c.PlayerID)
		snapshot := room.Engine.GetSnapshot()
		room.mu.Unlock()

		// Broadcast player left / room updated
		leftPayload, _ := json.Marshal(map[string]interface{}{
			"playerId": c.PlayerID,
			"room":     snapshot,
		})
		h.broadcastToRoom(c.RoomID, WSMessage{
			Type:      EventPlayerLeft,
			RoomID:    c.RoomID,
			PlayerID:  c.PlayerID,
			Payload:   leftPayload,
			Timestamp: time.Now().UnixMilli(),
		})
	} else {
		room.mu.Unlock()
	}
}

func (h *Hub) broadcastToRoom(roomID string, msg WSMessage) {
	h.mu.RLock()
	room, exists := h.rooms[roomID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()
	for _, client := range room.Clients {
		select {
		case client.sendChan <- data:
		default:
			// If buffer full, skip or close
		}
	}
}

func generateRoomCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b)
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Upgrade(w, r)
	if err != nil {
		http.Error(w, "WebSocket upgrade failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	client := &Client{
		ID:       fmt.Sprintf("%d", time.Now().UnixNano()),
		Conn:     conn,
		sendChan: make(chan []byte, 64),
		hub:      h,
	}

	// Writer goroutine
	go func() {
		defer conn.Close()
		for msg := range client.sendChan {
			if err := conn.WriteTextMessage(msg); err != nil {
				return
			}
		}
	}()

	// Reader loop
	defer func() {
		h.unregister <- client
		client.Conn.Close()
	}()

	for {
		data, err := conn.ReadTextMessage()
		if err != nil {
			if err != io.EOF {
				// log.Printf("[WS] Read error: %v", err)
			}
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			client.sendError("invalid JSON message format")
			continue
		}

		h.dispatch(client, msg)
	}
}

func (c *Client) sendError(errMsg string) {
	payload, _ := json.Marshal(map[string]string{"message": errMsg})
	msg := WSMessage{
		Type:      EventError,
		RoomID:    c.RoomID,
		PlayerID:  c.PlayerID,
		Payload:   payload,
		Timestamp: time.Now().UnixMilli(),
	}
	data, _ := json.Marshal(msg)
	select {
	case c.sendChan <- data:
	default:
	}
}

func (c *Client) sendDirect(msg WSMessage) {
	data, _ := json.Marshal(msg)
	select {
	case c.sendChan <- data:
	default:
	}
}

func (h *Hub) dispatch(c *Client, msg WSMessage) {
	switch msg.Type {
	case EventCreateRoom:
		var payload struct {
			PlayerID   string `json:"playerId"`
			PlayerName string `json:"playerName"`
			MaxPlayers int    `json:"maxPlayers"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			c.sendError("invalid create room payload")
			return
		}
		if payload.MaxPlayers < 2 || payload.MaxPlayers > 4 {
			payload.MaxPlayers = 4
		}
		if payload.PlayerID == "" {
			payload.PlayerID = fmt.Sprintf("p-%d", time.Now().UnixNano()%100000)
		}
		if payload.PlayerName == "" {
			payload.PlayerName = "Host"
		}

		roomCode := generateRoomCode()
		engine := game.NewEngine(roomCode, payload.MaxPlayers)
		p, err := engine.AddPlayer(payload.PlayerID, payload.PlayerName)
		if err != nil {
			c.sendError(err.Error())
			return
		}

		room := &Room{
			ID:      roomCode,
			Engine:  engine,
			Clients: make(map[string]*Client),
		}

		c.RoomID = roomCode
		c.PlayerID = payload.PlayerID
		room.Clients[c.PlayerID] = c

		h.mu.Lock()
		h.rooms[roomCode] = room
		h.mu.Unlock()

		snapshot := engine.GetSnapshot()
		resPayload, _ := json.Marshal(map[string]interface{}{
			"roomCode": roomCode,
			"player":   p,
			"room":     snapshot,
		})

		c.sendDirect(WSMessage{
			Type:      EventRoomCreated,
			RoomID:    roomCode,
			PlayerID:  p.ID,
			Payload:   resPayload,
			Timestamp: time.Now().UnixMilli(),
		})

	case EventJoinRoom:
		var payload struct {
			RoomID     string `json:"roomId"`
			PlayerID   string `json:"playerId"`
			PlayerName string `json:"playerName"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			c.sendError("invalid join room payload")
			return
		}
		roomID := strings.ToUpper(strings.TrimSpace(payload.RoomID))

		h.mu.RLock()
		room, exists := h.rooms[roomID]
		h.mu.RUnlock()

		if !exists {
			c.sendError("room not found: " + roomID)
			return
		}

		room.mu.Lock()
		p, err := room.Engine.AddPlayer(payload.PlayerID, payload.PlayerName)
		if err != nil {
			room.mu.Unlock()
			c.sendError(err.Error())
			return
		}

		c.RoomID = roomID
		c.PlayerID = payload.PlayerID
		room.Clients[c.PlayerID] = c
		snapshot := room.Engine.GetSnapshot()
		room.mu.Unlock()

		joinedPayload, _ := json.Marshal(map[string]interface{}{
			"player": p,
			"room":   snapshot,
		})

		h.broadcastToRoom(roomID, WSMessage{
			Type:      EventPlayerJoined,
			RoomID:    roomID,
			PlayerID:  p.ID,
			Payload:   joinedPayload,
			Timestamp: time.Now().UnixMilli(),
		})

	case EventStartGame:
		h.mu.RLock()
		room, exists := h.rooms[c.RoomID]
		h.mu.RUnlock()

		if !exists {
			c.sendError("room not found")
			return
		}

		room.mu.Lock()
		err := room.Engine.StartGame(c.PlayerID)
		if err != nil {
			room.mu.Unlock()
			c.sendError(err.Error())
			return
		}
		snapshot := room.Engine.GetSnapshot()
		room.mu.Unlock()

		startPayload, _ := json.Marshal(map[string]interface{}{
			"room": snapshot,
		})
		h.broadcastToRoom(c.RoomID, WSMessage{
			Type:      EventGameStarted,
			RoomID:    c.RoomID,
			PlayerID:  c.PlayerID,
			Payload:   startPayload,
			Timestamp: time.Now().UnixMilli(),
		})

	case EventRollDice:
		h.mu.RLock()
		room, exists := h.rooms[c.RoomID]
		h.mu.RUnlock()

		if !exists {
			c.sendError("room not found")
			return
		}

		moveRes, err := room.Engine.RollDice(c.PlayerID)
		if err != nil {
			c.sendError(err.Error())
			return
		}

		room.mu.RLock()
		snapshot := room.Engine.GetSnapshot()
		room.mu.RUnlock()

		// 1. Broadcast dice result and movement
		movePayload, _ := json.Marshal(map[string]interface{}{
			"result": moveRes,
			"room":   snapshot,
		})

		h.broadcastToRoom(c.RoomID, WSMessage{
			Type:      EventPlayerMoved,
			RoomID:    c.RoomID,
			PlayerID:  c.PlayerID,
			Payload:   movePayload,
			Timestamp: time.Now().UnixMilli(),
		})

		// 2. If snake or ladder transition, broadcast specific event for audio/visual emphasis
		if moveRes.Transition == game.TransitionSnake {
			snakePayload, _ := json.Marshal(map[string]interface{}{
				"playerId": moveRes.PlayerID,
				"from":     moveRes.TargetPos,
				"to":       moveRes.FinalPos,
			})
			h.broadcastToRoom(c.RoomID, WSMessage{
				Type:      EventSnakeBitten,
				RoomID:    c.RoomID,
				PlayerID:  c.PlayerID,
				Payload:   snakePayload,
				Timestamp: time.Now().UnixMilli(),
			})
		} else if moveRes.Transition == game.TransitionLadder {
			ladderPayload, _ := json.Marshal(map[string]interface{}{
				"playerId": moveRes.PlayerID,
				"from":     moveRes.TargetPos,
				"to":       moveRes.FinalPos,
			})
			h.broadcastToRoom(c.RoomID, WSMessage{
				Type:      EventLadderClimbed,
				RoomID:    c.RoomID,
				PlayerID:  c.PlayerID,
				Payload:   ladderPayload,
				Timestamp: time.Now().UnixMilli(),
			})
		}

		// 3. If someone won, broadcast GameWon
		if moveRes.IsWinner {
			winPayload, _ := json.Marshal(map[string]interface{}{
				"winnerId": moveRes.PlayerID,
				"room":     snapshot,
			})
			h.broadcastToRoom(c.RoomID, WSMessage{
				Type:      EventGameWon,
				RoomID:    c.RoomID,
				PlayerID:  c.PlayerID,
				Payload:   winPayload,
				Timestamp: time.Now().UnixMilli(),
			})
		} else {
			// Broadcast turn change
			turnPayload, _ := json.Marshal(map[string]interface{}{
				"currentPlayerIndex": moveRes.NextPlayerIndex,
				"extraTurn":          moveRes.ExtraTurn,
				"room":               snapshot,
			})
			h.broadcastToRoom(c.RoomID, WSMessage{
				Type:      EventTurnChanged,
				RoomID:    c.RoomID,
				PlayerID:  c.PlayerID,
				Payload:   turnPayload,
				Timestamp: time.Now().UnixMilli(),
			})
		}

	case EventReconnect:
		var payload struct {
			RoomID   string `json:"roomId"`
			PlayerID string `json:"playerId"`
		}
		json.Unmarshal(msg.Payload, &payload)
		roomID := strings.ToUpper(strings.TrimSpace(payload.RoomID))

		h.mu.RLock()
		room, exists := h.rooms[roomID]
		h.mu.RUnlock()

		if !exists {
			c.sendError("cannot reconnect: room not found")
			return
		}

		p, err := room.Engine.ReconnectPlayer(payload.PlayerID)
		if err != nil {
			c.sendError(err.Error())
			return
		}

		c.RoomID = roomID
		c.PlayerID = payload.PlayerID
		room.mu.Lock()
		room.Clients[payload.PlayerID] = c
		snapshot := room.Engine.GetSnapshot()
		room.mu.Unlock()

		syncPayload, _ := json.Marshal(map[string]interface{}{
			"player": p,
			"room":   snapshot,
		})

		c.sendDirect(WSMessage{
			Type:      EventGameStateSync,
			RoomID:    roomID,
			PlayerID:  p.ID,
			Payload:   syncPayload,
			Timestamp: time.Now().UnixMilli(),
		})

		h.broadcastToRoom(roomID, WSMessage{
			Type:      EventRoomUpdated,
			RoomID:    roomID,
			PlayerID:  p.ID,
			Payload:   syncPayload,
			Timestamp: time.Now().UnixMilli(),
		})
	}
}

func SetupRoutes(hub *Hub) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","game":"HeySakhi Snakes & Ladders","boardSize":50}`))
	})

	mux.HandleFunc("/api/board", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		data := map[string]interface{}{
			"totalSquares": game.TotalSquares,
			"cols":         game.BoardCols,
			"rows":         game.BoardRows,
			"ladders":      game.Ladders,
			"snakes":       game.Snakes,
			"palette":      game.Palette,
		}
		json.NewEncoder(w).Encode(data)
	})

	mux.HandleFunc("/ws", hub.HandleWS)

	// Serve the interactive web UI at root "/"
	fs := http.FileServer(http.Dir("web"))
	mux.Handle("/", fs)

	return mux
}
