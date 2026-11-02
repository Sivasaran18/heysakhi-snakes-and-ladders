import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, Alert } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { OnlineLobbyScreen } from './src/screens/OnlineLobbyScreen';
import { WaitingRoomScreen } from './src/screens/WaitingRoomScreen';
import { GameScreen } from './src/screens/GameScreen';
import { OfflineEngine } from './src/engine/offlineEngine';
import { MultiplayerService } from './src/services/multiplayerService';
import { GameSnapshot, MoveResult } from './src/types/game';

type AppView = 'HOME' | 'OFFLINE_SETUP' | 'ONLINE_LOBBY' | 'WAITING_ROOM' | 'GAME';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('HOME');
  const [isOnline, setIsOnline] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('offline-p1');
  const [rolling, setRolling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lobbyError, setLobbyError] = useState<string>('');
  const [lobbyLoading, setLobbyLoading] = useState<boolean>(false);

  // Engines and Services
  const offlineEngineRef = useRef<OfflineEngine | null>(null);
  const mpServiceRef = useRef<MultiplayerService | null>(null);

  // Initialize multiplayer service
  useEffect(() => {
    const service = new MultiplayerService('ws://127.0.0.1:8085/ws');
    mpServiceRef.current = service;

    service.on('ROOM_CREATED', (payload) => {
      setLobbyLoading(false);
      setSnapshot(payload.room);
      setCurrentPlayerId(payload.player.id);
      service.setRoomId(payload.roomCode);
      setCurrentView('WAITING_ROOM');
    });

    service.on('PLAYER_JOINED', (payload) => {
      setLobbyLoading(false);
      setSnapshot(payload.room);
      if (currentView === 'ONLINE_LOBBY') {
        setCurrentView('WAITING_ROOM');
      }
    });

    service.on('PLAYER_LEFT', (payload) => {
      setSnapshot(payload.room);
    });

    service.on('GAME_STARTED', (payload) => {
      setSnapshot(payload.room);
      setCurrentView('GAME');
    });

    service.on('PLAYER_MOVED', (payload: { result: MoveResult; room: GameSnapshot }) => {
      const res = payload.result;
      setRolling(false);
      setSnapshot(payload.room);

      let msg = `Rolled a ${res.diceValue}!`;
      if (res.overshot) {
        msg = `Rolled ${res.diceValue} — overshoot! Stayed at square ${res.finalPos}.`;
      } else if (res.extraTurn) {
        msg = `Rolled a 6! Extra turn granted 🎉`;
      }
      setStatusMessage(msg);
    });

    service.on('SNAKE_BITTEN', (payload) => {
      setStatusMessage(`🐍 Ouch! Bitten by snake at ${payload.from} → slid down to ${payload.to}!`);
    });

    service.on('LADDER_CLIMBED', (payload) => {
      setStatusMessage(`🪜 Awesome! Climbed ladder from ${payload.from} → up to ${payload.to}!`);
    });

    service.on('GAME_WON', (payload) => {
      setRolling(false);
      setSnapshot(payload.room);
      setStatusMessage(`🏆 Match finished! Player won!`);
    });

    service.on('GAME_STATE_SYNC', (payload) => {
      setSnapshot(payload.room);
    });

    service.on('ERROR', (payload) => {
      setLobbyLoading(false);
      setRolling(false);
      setLobbyError(payload.message || 'An error occurred');
    });

    return () => {
      service.disconnect();
    };
  }, []);

  // Offline Game Start
  const startOfflineGame = (playerNames: string[]) => {
    setIsOnline(false);
    const engine = new OfflineEngine(playerNames);
    engine.startGame();
    offlineEngineRef.current = engine;
    setSnapshot(engine.getSnapshot());
    setCurrentPlayerId('offline-p1');
    setStatusMessage('Game started! Player 1 rolls first.');
    setCurrentView('GAME');
  };

  // Online actions
  const handleCreateOnlineRoom = (playerName: string, maxPlayers: number) => {
    setLobbyError('');
    setLobbyLoading(true);
    setIsOnline(true);
    const service = mpServiceRef.current;
    if (service) {
      service.connect().then(() => {
        service.createRoom(playerName, maxPlayers);
      }).catch((e) => {
        setLobbyLoading(false);
        setLobbyError('Failed to connect to backend server on ws://127.0.0.1:8080/ws');
      });
    }
  };

  const handleJoinOnlineRoom = (roomCode: string, playerName: string) => {
    setLobbyError('');
    setLobbyLoading(true);
    setIsOnline(true);
    const service = mpServiceRef.current;
    if (service) {
      service.connect().then(() => {
        service.joinRoom(roomCode, playerName);
      }).catch((e) => {
        setLobbyLoading(false);
        setLobbyError('Failed to connect to backend server on ws://127.0.0.1:8080/ws');
      });
    }
  };

  const handleStartOnlineMatch = () => {
    mpServiceRef.current?.startGame();
  };

  // Roll Dice handling
  const handleRollDice = () => {
    if (rolling) return;
    setRolling(true);

    if (isOnline) {
      mpServiceRef.current?.rollDice();
      return;
    }

    // Offline Roll
    setTimeout(() => {
      if (!offlineEngineRef.current) return;
      try {
        const res = offlineEngineRef.current.rollDice();
        setSnapshot(offlineEngineRef.current.getSnapshot());
        setRolling(false);

        let msg = `Rolled a ${res.diceValue}!`;
        if (res.overshot) {
          msg = `Rolled ${res.diceValue} — overshoot! Stayed at square ${res.finalPos}.`;
        } else if (res.transition === 'LADDER') {
          msg = `🪜 Climbed ladder to square ${res.finalPos}!`;
        } else if (res.transition === 'SNAKE') {
          msg = `🐍 Slid down snake to square ${res.finalPos}!`;
        } else if (res.extraTurn) {
          msg = `Rolled a 6! Extra turn granted 🎉`;
        }
        setStatusMessage(msg);
      } catch (err: any) {
        setRolling(false);
        setStatusMessage(err.message || 'Error rolling dice');
      }
    }, 450);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF5FF" />
      <View style={styles.appContainer}>
        {currentView === 'HOME' && (
          <HomeScreen
            onPlayOffline={() => setCurrentView('OFFLINE_SETUP')}
            onPlayOnline={() => {
              setLobbyError('');
              setCurrentView('ONLINE_LOBBY');
            }}
          />
        )}

        {currentView === 'OFFLINE_SETUP' && (
          <SetupScreen
            onBack={() => setCurrentView('HOME')}
            onStartGame={startOfflineGame}
          />
        )}

        {currentView === 'ONLINE_LOBBY' && (
          <OnlineLobbyScreen
            onBack={() => setCurrentView('HOME')}
            onCreateRoom={handleCreateOnlineRoom}
            onJoinRoom={handleJoinOnlineRoom}
            loading={lobbyLoading}
            errorMessage={lobbyError}
          />
        )}

        {currentView === 'WAITING_ROOM' && snapshot && (
          <WaitingRoomScreen
            snapshot={snapshot}
            currentPlayerId={currentPlayerId}
            onStartGame={handleStartOnlineMatch}
            onLeaveRoom={() => {
              mpServiceRef.current?.disconnect();
              setCurrentView('HOME');
            }}
          />
        )}

        {currentView === 'GAME' && snapshot && (
          <GameScreen
            snapshot={snapshot}
            currentPlayerId={currentPlayerId}
            isOnline={isOnline}
            onRollDice={handleRollDice}
            onExitGame={() => {
              if (isOnline) {
                mpServiceRef.current?.disconnect();
              }
              setCurrentView('HOME');
            }}
            onPlayAgain={
              !isOnline
                ? () => {
                    const pNames = snapshot.players.map((p) => p.name);
                    startOfflineGame(pNames);
                  }
                : undefined
            }
            rolling={rolling}
            lastMessage={statusMessage}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  appContainer: {
    flex: 1,
  },
});

