// Serverless Authoritative Game Engine for Vercel
// Strictly 50-Square Board (5 cols x 10 rows)

const TOTAL_SQUARES = 50;
const BOARD_COLS = 5;
const BOARD_ROWS = 10;

// Configured Ladders: 3->14, 8->19, 17->27, 22->36, 31->42, 39->48
const LADDERS = {
  3: 14,
  8: 19,
  17: 27,
  22: 36,
  31: 42,
  39: 48,
};

// Configured Snakes: 12->5, 20->9, 29->16, 35->24, 44->33, 47->38
const SNAKES = {
  12: 5,
  20: 9,
  29: 16,
  35: 24,
  44: 33,
  47: 38,
};

const PALETTE = [
  { id: 'coral-red', hex: '#E63946', light: '#FFE5E8', label: 'Coral Red' },
  { id: 'royal-blue', hex: '#1D3557', light: '#E1EDF8', label: 'Royal Blue' },
  { id: 'emerald-green', hex: '#2A9D8F', light: '#E2F7F2', label: 'Emerald Green' },
  { id: 'golden-yellow', hex: '#F4A261', light: '#FEF3E8', label: 'Golden Yellow' }
];

// In-Memory store across warm invocations
// Key: roomCode -> Room
const rooms = global._SNAKE_ROOMS = global._SNAKE_ROOMS || new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 200;
    return res.end();
  }

  // Parse path: /api/rooms or /api/rooms/:code/...
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = urlObj.pathname.split('/').filter(Boolean); // ['api', 'rooms', ...]

  if (parts[0] !== 'api' || parts[1] !== 'rooms') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  const code = (parts[2] || '').toUpperCase();
  const action = (parts[3] || '').toLowerCase();

  // 1. POST /api/rooms — Create room
  if (req.method === 'POST' && !code) {
    const body = await parseJsonBody(req);
    const hostName = (body.playerName || 'Host').trim();
    const hostId = body.playerId || `p-${Date.now() % 100000}`;
    const maxPlayers = Math.min(Math.max(parseInt(body.maxPlayers) || 4, 2), 4);

    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const hostPlayer = {
      id: hostId,
      name: hostName,
      color: PALETTE[0].id,
      position: 0,
      isHost: true,
      ready: true, // host is ready by default
      connected: true
    };

    const newRoom = {
      roomId: roomCode,
      code: roomCode,
      maxPlayers,
      players: [hostPlayer],
      status: 'WAITING',
      turn: {
        currentPlayerIndex: 0,
        hasRolled: false,
        lastDiceValue: 1
      },
      winnerId: null,
      lastMove: null,
      updatedAt: Date.now()
    };

    rooms.set(roomCode, newRoom);
    return sendJson(res, 201, {
      success: true,
      roomCode,
      player: hostPlayer,
      room: newRoom
    });
  }

  if (!code) {
    return sendJson(res, 400, { error: 'Room code required' });
  }

  const room = rooms.get(code);
  if (!room) {
    return sendJson(res, 404, { error: `Room ${code} not found` });
  }

  // 2. GET /api/rooms/:code — Authoritative Snapshot
  if (req.method === 'GET' && !action) {
    return sendJson(res, 200, {
      success: true,
      room
    });
  }

  // 3. POST /api/rooms/:code/join — Join room
  if (req.method === 'POST' && action === 'join') {
    const body = await parseJsonBody(req);
    const playerName = (body.playerName || 'Player').trim();
    const playerId = body.playerId || `p-${Date.now() % 100000}`;

    if (room.status !== 'WAITING') {
      return sendJson(res, 400, { error: 'Game has already started' });
    }

    // Check if player already exists (reconnect/re-join)
    const existing = room.players.find(p => p.id === playerId);
    if (existing) {
      existing.connected = true;
      room.updatedAt = Date.now();
      return sendJson(res, 200, { success: true, player: existing, room });
    }

    if (room.players.length >= room.maxPlayers) {
      return sendJson(res, 400, { error: 'Room is full' });
    }

    const slot = room.players.length;
    const newPlayer = {
      id: playerId,
      name: playerName,
      color: PALETTE[slot].id,
      position: 0,
      isHost: false,
      ready: false,
      connected: true
    };

    room.players.push(newPlayer);
    room.updatedAt = Date.now();

    return sendJson(res, 200, {
      success: true,
      player: newPlayer,
      room
    });
  }

  // 4. POST /api/rooms/:code/ready — Toggle ready
  if (req.method === 'POST' && action === 'ready') {
    const body = await parseJsonBody(req);
    const playerId = body.playerId;

    const p = room.players.find(player => player.id === playerId);
    if (!p) {
      return sendJson(res, 404, { error: 'Player not found in room' });
    }

    p.ready = typeof body.ready === 'boolean' ? body.ready : !p.ready;
    room.updatedAt = Date.now();

    return sendJson(res, 200, {
      success: true,
      ready: p.ready,
      room
    });
  }

  // 5. POST /api/rooms/:code/start — Host start game
  if (req.method === 'POST' && action === 'start') {
    const body = await parseJsonBody(req);
    const playerId = body.playerId;

    if (room.players[0].id !== playerId) {
      return sendJson(res, 403, { error: 'Only room host can start the game' });
    }
    if (room.players.length < 2) {
      return sendJson(res, 400, { error: 'Need at least 2 players to start' });
    }
    // Check if all non-hosts are ready
    const allReady = room.players.every(p => p.ready);
    if (!allReady) {
      return sendJson(res, 400, { error: 'Waiting for all players to be READY' });
    }

    room.status = 'IN_PROGRESS';
    room.turn = {
      currentPlayerIndex: 0,
      hasRolled: false,
      lastDiceValue: 1
    };
    room.updatedAt = Date.now();

    return sendJson(res, 200, {
      success: true,
      room
    });
  }

  // 6. POST /api/rooms/:code/roll — Authoritative Dice Roll & Movement
  if (req.method === 'POST' && action === 'roll') {
    const body = await parseJsonBody(req);
    const playerId = body.playerId;

    if (room.status !== 'IN_PROGRESS') {
      return sendJson(res, 400, { error: 'Game is not in progress' });
    }

    const currPlayer = room.players[room.turn.currentPlayerIndex];
    if (!currPlayer || currPlayer.id !== playerId) {
      return sendJson(res, 403, { error: 'Not your turn' });
    }

    // Roll 1-6 cryptographically or reliably
    const diceValue = Math.floor(Math.random() * 6) + 1;
    const prevPos = currPlayer.position;
    let targetPos = prevPos + diceValue;
    let finalPos = targetPos;
    let overshot = false;
    let transition = 'NONE';

    // Rule: Exact 50 to win
    if (targetPos > TOTAL_SQUARES) {
      overshot = true;
      finalPos = prevPos;
      targetPos = prevPos;
    } else {
      if (LADDERS[targetPos]) {
        finalPos = LADDERS[targetPos];
        transition = 'LADDER';
      } else if (SNAKES[targetPos]) {
        finalPos = SNAKES[targetPos];
        transition = 'SNAKE';
      }
      currPlayer.position = finalPos;
    }

    const isWinner = currPlayer.position === TOTAL_SQUARES;
    const extraTurn = (diceValue === 6 && !isWinner && !overshot);

    if (isWinner) {
      room.status = 'FINISHED';
      room.winnerId = currPlayer.id;
    }

    let nextIndex = room.turn.currentPlayerIndex;
    if (!isWinner && !extraTurn) {
      nextIndex = (room.turn.currentPlayerIndex + 1) % room.players.length;
    }

    room.turn = {
      currentPlayerIndex: nextIndex,
      hasRolled: false,
      lastDiceValue: diceValue
    };

    const moveResult = {
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
      timestamp: Date.now()
    };

    room.lastMove = moveResult;
    room.updatedAt = Date.now();

    return sendJson(res, 200, {
      success: true,
      result: moveResult,
      room
    });
  }

  // 7. POST /api/rooms/:code/leave — Leave room
  if (req.method === 'POST' && action === 'leave') {
    const body = await parseJsonBody(req);
    const playerId = body.playerId;

    const pIdx = room.players.findIndex(p => p.id === playerId);
    if (pIdx !== -1) {
      if (room.status === 'WAITING') {
        room.players.splice(pIdx, 1);
        if (room.players.length > 0) {
          room.players[0].isHost = true;
          room.players[0].ready = true;
        }
      } else {
        room.players[pIdx].connected = false;
      }
      room.updatedAt = Date.now();
    }

    return sendJson(res, 200, { success: true, room });
  }

  return sendJson(res, 404, { error: 'Action not supported' });
};
