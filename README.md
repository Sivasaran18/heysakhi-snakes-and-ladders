# HeySakhi Snakes & Ladders (50-Square Edition)
## Complete React Native + Golang Real-Time Multiplayer Game

### 🎮 Overview
HeySakhi Snakes & Ladders is a complete, production-ready mobile board game featuring:
- **Strictly 50-Square Board**: Geometrically precise 5 columns × 10 rows with alternating serpentine numbering.
- **Offline Pass & Play**: Complete local gameplay for 2 to 4 players on a single mobile device.
- **Online Real-Time Multiplayer**: Golang backend server with WebSocket synchronization, authoritative turn/dice management, private room generation, and state recovery.
- **Palette**: HeySakhi signature colors (Coral Red, Royal Blue, Emerald Green, Golden Yellow).

---

### 📐 Board Specifications & Layout
- **Total Squares**: Exactly 50.
- **Grid**: 5 Columns × 10 Rows.
- **Serpentine Pattern**:
  - Row 0 (Bottom): 1 → 2 → 3 → 4 → 5
  - Row 1: 10 ← 9 ← 8 ← 7 ← 6
  - Row 2: 11 → 12 → 13 → 14 → 15
  - ...
  - Row 9 (Top): 50 ← 49 ← 48 ← 47 ← 46

#### Ladders:
- 3 → 14
- 8 → 19
- 17 → 27
- 22 → 36
- 31 → 42
- 39 → 48

#### Snakes:
- 12 → 5
- 20 → 9
- 29 → 16
- 35 → 24
- 44 → 33
- 47 → 38

---

### 🏗 Architecture

#### 1. Backend (`/backend`)
- **Language**: Go 1.27 darwin/arm64.
- **Architecture**: Modular game engine, room hub manager, and native RFC 6455 WebSocket layer (`backend/websocket/ws.go`).
- **Authoritative Rules**: Server validates player turns, generates cryptographically secure 1-6 dice rolls (`crypto/rand`), executes movements, applies snake/ladder transitions, enforces exact-to-50 victory, and rejects overshoots and out-of-turn actions.

#### 2. Frontend (`/frontend`)
- **Framework**: React Native + TypeScript.
- **Screens**:
  - `HomeScreen`: Branding, 50-square miniature board preview, navigation.
  - `SetupScreen`: Player count (2, 3, 4), nickname configuration, token color assignment.
  - `OnlineLobbyScreen`: Create private room, join with 6-character room code.
  - `WaitingRoomScreen`: Room code sharing, slot availability, host controls.
  - `GameScreen`: 5x10 board with SVG snakes and ladders, staggered tokens, dice roller, victory modal, stats.

---

### 🧪 Verification & Test Results
- **Go Engine & Server Unit Tests**:
  - `TestSerpentineBoardMapping`: PASS (Square 1..50 mapping, reverse lookup, bounds validation).
  - `TestSnakeAndLadderConfig`: PASS (Validation of transitions, non-overlapping starts).
  - `TestPlayerSetup`: PASS (2, 3, 4 players, color assignment, capacity limits).
  - `TestTokenMovementAndLadder`: PASS (Step movement, ladder climb).
  - `TestSnakeTransition`: PASS (Head landing, tail descent).
  - `TestOvershootAndExactWinning`: PASS (Exact square 50 requirement, overshoot retention).
  - `TestExtraTurnOnSix`: PASS (Rolling 6 grants extra turn).
  - `TestTurnValidationAndDuplicateRejection`: PASS (Out-of-turn rejection).
  - `TestRoomLifecycle`: PASS (Creation, joining, capacity rejection, reconnects).
- **Frontend TypeScript Tests**:
  - TypeScript compilation check (`tsc --noEmit`): **0 errors**.
  - Frontend Engine Test Runner: **ALL TESTS PASSED**.

---

### 🚀 Running the Application

#### 1. Start Golang Backend
```bash
cd backend
export PATH="/usr/local/go/bin:$PATH"
PORT=8080 ./snakes-server
# Or compile and run:
# go run main.go
```

#### 2. Run React Native Frontend
```bash
cd frontend
npm start # Or npx expo start / npx react-native run-android
```

