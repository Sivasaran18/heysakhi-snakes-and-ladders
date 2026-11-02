const net = require('net');
const crypto = require('crypto');

class TestWSClient {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.client = new net.Socket();
    this.messageHandlers = [];
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      this.client.connect(this.port, this.host, () => {
        const req =
          `GET /ws HTTP/1.1\r\n` +
          `Host: ${this.host}:${this.port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\n` +
          `Sec-WebSocket-Version: 13\r\n\r\n`;
        this.client.write(req);
      });

      let handshook = false;
      this.client.on('data', (buf) => {
        if (!handshook) {
          const str = buf.toString();
          if (str.includes('101 Switching Protocols')) {
            handshook = true;
            this.connected = true;
            resolve();
            return;
          } else {
            reject(new Error('Handshake failed: ' + str));
            return;
          }
        }

        // Parse WS Frame (Server -> Client is unmasked)
        let idx = 0;
        while (idx < buf.length) {
          const b1 = buf[idx++];
          const opcode = b1 & 0x0f;
          if (idx >= buf.length) break;
          const b2 = buf[idx++];
          let payloadLen = b2 & 0x7f;
          if (payloadLen === 126) {
            payloadLen = buf.readUInt16BE(idx);
            idx += 2;
          } else if (payloadLen === 127) {
            payloadLen = Number(buf.readBigUInt64BE(idx));
            idx += 8;
          }
          const payload = buf.subarray(idx, idx + payloadLen);
          idx += payloadLen;

          if (opcode === 1) { // Text
            try {
              const parsed = JSON.parse(payload.toString());
              this.messageHandlers.forEach((h) => h(parsed));
            } catch (e) {}
          }
        }
      });

      this.client.on('error', reject);
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  send(type, roomId, playerId, payload) {
    const jsonStr = JSON.stringify({
      type,
      roomId,
      playerId,
      payload,
      timestamp: Date.now(),
    });

    const data = Buffer.from(jsonStr);
    const length = data.length;
    let header;
    const maskKey = crypto.randomBytes(4);

    if (length <= 125) {
      header = Buffer.alloc(2 + 4);
      header[0] = 0x81;
      header[1] = 0x80 | length;
      maskKey.copy(header, 2);
    } else if (length <= 65535) {
      header = Buffer.alloc(4 + 4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(length, 2);
      maskKey.copy(header, 4);
    } else {
      header = Buffer.alloc(10 + 4);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(length), 2);
      maskKey.copy(header, 10);
    }

    const masked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      masked[i] = data[i] ^ maskKey[i % 4];
    }

    this.client.write(Buffer.concat([header, masked]));
  }

  close() {
    this.client.destroy();
  }
}

async function runMultiplayerTest() {
  console.log('=== Real-Time Golang Multi-Client Integration Test ===');
  const client1 = new TestWSClient('127.0.0.1', 8080);
  const client2 = new TestWSClient('127.0.0.1', 8080);

  try {
    await client1.connect();
    console.log('✓ Client 1 (Alice) connected to backend server on ws://127.0.0.1:8080/ws');
    await client2.connect();
    console.log('✓ Client 2 (Bob) connected to backend server on ws://127.0.0.1:8080/ws');

    let roomCode = '';

    // Step 1: Client 1 creates room
    const pRoomCreated = new Promise((resolve) => {
      client1.onMessage((msg) => {
        if (msg.type === 'ROOM_CREATED') {
          const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
          roomCode = payload.roomCode;
          console.log(`✓ Room created successfully: ${roomCode}`);
          resolve();
        }
      });
    });

    client1.send('CREATE_ROOM', '', 'p1', {
      playerId: 'p1',
      playerName: 'Alice',
      maxPlayers: 2,
    });

    await pRoomCreated;

    // Step 2: Client 2 joins room using room code
    const pPlayerJoined = new Promise((resolve) => {
      let client1Saw = false;
      let client2Saw = false;

      const checkBoth = () => {
        if (client1Saw && client2Saw) resolve();
      };

      client1.onMessage((msg) => {
        if (msg.type === 'PLAYER_JOINED') {
          client1Saw = true;
          checkBoth();
        }
      });
      client2.onMessage((msg) => {
        if (msg.type === 'PLAYER_JOINED') {
          client2Saw = true;
          checkBoth();
        }
      });
    });

    client2.send('JOIN_ROOM', roomCode, 'p2', {
      roomId: roomCode,
      playerId: 'p2',
      playerName: 'Bob',
    });

    await pPlayerJoined;
    console.log('✓ Bob joined room. Both Alice & Bob synchronized on PLAYER_JOINED event!');

    // Step 3: Alice (Host) starts the game
    const pGameStarted = new Promise((resolve) => {
      client2.onMessage((msg) => {
        if (msg.type === 'GAME_STARTED') {
          console.log('✓ GAME_STARTED broadcast received and verified by Bob!');
          resolve();
        }
      });
    });

    client1.send('START_GAME', roomCode, 'p1', {});
    await pGameStarted;

    // Step 4: Authoritative dice roll by Alice
    const pPlayerMoved = new Promise((resolve) => {
      client2.onMessage((msg) => {
        if (msg.type === 'PLAYER_MOVED') {
          const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
          console.log(`✓ Server-authoritative roll by Alice: Dice = ${payload.result.diceValue}! Moved to square ${payload.result.finalPos}`);
          console.log(`✓ Synchronized next turn: Player Index ${payload.result.nextPlayerIndex}`);
          resolve();
        }
      });
    });

    client1.send('ROLL_DICE', roomCode, 'p1', {});
    await pPlayerMoved;

    console.log('=== MULTI-CLIENT WEBSOCKET REAL-TIME SYNC TEST PASSED! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    client1.close();
    client2.close();
  }
}

runMultiplayerTest();
