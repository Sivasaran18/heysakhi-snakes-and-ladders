import { GameSnapshot, MoveResult } from '../types/game';

export type WSEventCallback = (payload: any) => void;

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private reconnectTimer: any = null;
  private isIntentionalClose = false;
  private currentRoomId = '';
  private currentPlayerId = '';

  constructor(serverUrl: string = 'ws://127.0.0.1:8085/ws') {
    this.url = serverUrl;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.trigger('CONNECTED', {});
          if (this.currentRoomId && this.currentPlayerId) {
            this.send('RECONNECT', {
              roomId: this.currentRoomId,
              playerId: this.currentPlayerId,
            });
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type) {
              const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
              this.trigger(data.type, payload);
            }
          } catch (e) {
            console.warn('[WS] Failed to parse message:', event.data);
          }
        };

        this.ws.onerror = (err) => {
          this.trigger('ERROR', { message: 'WebSocket connection error' });
          reject(err);
        };

        this.ws.onclose = () => {
          this.trigger('DISCONNECTED', {});
          if (!this.isIntentionalClose) {
            this.scheduleReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionalClose) {
        this.connect().catch(() => {});
      }
    }, 2500);
  }

  public disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public on(event: string, callback: WSEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: WSEventCallback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private trigger(event: string, payload: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error('[WS Callback Error]', e);
        }
      });
    }
  }

  public send(type: string, payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.trigger('ERROR', { message: 'Not connected to multiplayer server' });
      return;
    }

    const msg = {
      type,
      roomId: this.currentRoomId,
      playerId: this.currentPlayerId,
      payload,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(msg));
  }

  public createRoom(playerName: string, maxPlayers: number = 4, playerId?: string) {
    const pid = playerId || `p-${Date.now() % 100000}`;
    this.currentPlayerId = pid;
    this.send('CREATE_ROOM', {
      playerName,
      maxPlayers,
      playerId: pid,
    });
  }

  public joinRoom(roomId: string, playerName: string, playerId?: string) {
    const pid = playerId || `p-${Date.now() % 100000}`;
    this.currentPlayerId = pid;
    this.currentRoomId = roomId;
    this.send('JOIN_ROOM', {
      roomId,
      playerName,
      playerId: pid,
    });
  }

  public setRoomId(roomId: string) {
    this.currentRoomId = roomId;
  }

  public startGame() {
    this.send('START_GAME', {});
  }

  public rollDice() {
    this.send('ROLL_DICE', {});
  }
}

