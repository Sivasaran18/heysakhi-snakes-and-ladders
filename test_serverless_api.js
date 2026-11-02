const http = require('http');
const handler = require('./api/index.js');

function doRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage();
    req.method = method;
    req.url = urlPath;
    req.headers = { host: 'localhost:3000' };

    let resData = '';
    let statusCode = 200;
    const res = {
      setHeader: () => {},
      statusCode: 200,
      end: (data) => {
        if (data) resData += data;
        resolve({ status: res.statusCode, body: resData ? JSON.parse(resData) : {} });
      }
    };

    if (body) {
      req.body = body;
    }

    handler(req, res).catch(reject);
  });
}

async function testFullMultiplayerFlow() {
  console.log('=== Testing Vercel Serverless Multiplayer API Gateway ===');

  // 1. Create Room (Host: Alice)
  const createRes = await doRequest('POST', '/api/rooms', {
    playerName: 'Alice',
    playerId: 'p-alice',
    maxPlayers: 2
  });
  console.log('1. POST /api/rooms status:', createRes.status);
  if (createRes.status !== 201) throw new Error('Failed to create room');
  const roomCode = createRes.body.roomCode;
  console.log('   Created Room Code:', roomCode);

  // 2. Join Room (Player 2: Bob)
  const joinRes = await doRequest('POST', `/api/rooms/${roomCode}/join`, {
    playerName: 'Bob',
    playerId: 'p-bob'
  });
  console.log('2. POST /api/rooms/:code/join status:', joinRes.status);
  if (joinRes.status !== 200 || joinRes.body.room.players.length !== 2) {
    throw new Error('Bob failed to join room');
  }
  console.log('   Bob joined. Players count:', joinRes.body.room.players.length);

  // 3. Bob Toggles Ready
  const readyRes = await doRequest('POST', `/api/rooms/${roomCode}/ready`, {
    playerId: 'p-bob',
    ready: true
  });
  console.log('3. POST /api/rooms/:code/ready status:', readyRes.status);
  if (readyRes.status !== 200 || !readyRes.body.ready) {
    throw new Error('Failed to set Bob ready');
  }
  console.log('   Bob is READY:', readyRes.body.ready);

  // 4. Host Starts Game
  const startRes = await doRequest('POST', `/api/rooms/${roomCode}/start`, {
    playerId: 'p-alice'
  });
  console.log('4. POST /api/rooms/:code/start status:', startRes.status);
  if (startRes.status !== 200 || startRes.body.room.status !== 'IN_PROGRESS') {
    throw new Error('Failed to start game');
  }
  console.log('   Game status:', startRes.body.room.status);

  // 5. Alice Rolls Dice
  const rollRes = await doRequest('POST', `/api/rooms/${roomCode}/roll`, {
    playerId: 'p-alice'
  });
  console.log('5. POST /api/rooms/:code/roll status:', rollRes.status);
  if (rollRes.status !== 200) throw new Error('Roll failed');
  const res = rollRes.body.result;
  console.log(`   Alice rolled: ${res.diceValue}! From ${res.previousPos} -> to square ${res.finalPos} (transition: ${res.transition})`);
  console.log(`   Next turn player index: ${res.nextPlayerIndex}`);

  // 6. GET Authoritative Snapshot
  const snapRes = await doRequest('GET', `/api/rooms/${roomCode}`);
  console.log('6. GET /api/rooms/:code status:', snapRes.status);
  if (snapRes.status !== 200 || snapRes.body.room.code !== roomCode) {
    throw new Error('Failed to retrieve snapshot');
  }
  console.log('   Authoritative state retrieved successfully.');

  console.log('=== ALL MULTIPLAYER API TESTS PASSED SUCCESSFULLY! ===');
}

testFullMultiplayerFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
