package server_test

import (
	"encoding/json"
	"heysakhi-snakes-ladders/game"
	"heysakhi-snakes-ladders/server"
	"net/http/httptest"
	"testing"
)

// Tests Room Creation, Room Joining, Capacity, Start Game, and Disconnect
func TestRoomLifecycle(t *testing.T) {
	hub := server.NewHub()
	go hub.Run()

	s := httptest.NewServer(server.SetupRoutes(hub))
	defer s.Close()

	// 1. Create Room via Engine directly to test hub & engine synchronization
	roomCode := "ROOM12"
	engine := game.NewEngine(roomCode, 3)

	p1, err := engine.AddPlayer("p1", "Host")
	if err != nil {
		t.Fatalf("failed to add p1: %v", err)
	}
	if !p1.IsHost {
		t.Error("p1 should be host")
	}

	_, err = engine.AddPlayer("p2", "Player2")
	if err != nil {
		t.Fatalf("failed to add p2: %v", err)
	}

	_, err = engine.AddPlayer("p3", "Player3")
	if err != nil {
		t.Fatalf("failed to add p3: %v", err)
	}

	// 4th player should fail (max 3)
	_, err = engine.AddPlayer("p4", "Player4")
	if err == nil {
		t.Error("expected room full error for 4th player")
	}

	// Non-host starting game should fail
	if err := engine.StartGame("p2"); err == nil {
		t.Error("non-host should not be able to start game")
	}

	// Host starting game succeeds
	if err := engine.StartGame("p1"); err != nil {
		t.Fatalf("host failed to start game: %v", err)
	}

	if engine.Status != game.StatusInProgress {
		t.Errorf("expected IN_PROGRESS, got %v", engine.Status)
	}

	// Test Reconnection
	engine.RemovePlayer("p2")
	snap := engine.GetSnapshot()
	if snap.Players[1].Connected {
		t.Error("p2 should be marked disconnected")
	}

	_, err = engine.ReconnectPlayer("p2")
	if err != nil {
		t.Fatalf("reconnect failed: %v", err)
	}
	snap2 := engine.GetSnapshot()
	if !snap2.Players[1].Connected {
		t.Error("p2 should be marked connected after reconnect")
	}
}

func TestHealthAndBoardEndpoints(t *testing.T) {
	hub := server.NewHub()
	mux := server.SetupRoutes(hub)

	// Test /health directly with httptest.ResponseRecorder (no loopback socket)
	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Errorf("status code %d", rec.Code)
	}

	// Test /api/board
	req2 := httptest.NewRequest("GET", "/api/board", nil)
	rec2 := httptest.NewRecorder()
	mux.ServeHTTP(rec2, req2)

	var data map[string]interface{}
	json.NewDecoder(rec2.Body).Decode(&data)
	if int(data["totalSquares"].(float64)) != 50 {
		t.Errorf("expected 50 totalSquares, got %v", data["totalSquares"])
	}
	if int(data["cols"].(float64)) != 5 || int(data["rows"].(float64)) != 10 {
		t.Errorf("expected 5 cols x 10 rows, got %v x %v", data["cols"], data["rows"])
	}
}
