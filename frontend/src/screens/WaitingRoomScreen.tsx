import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { GameSnapshot, COLOR_MAP } from '../types/game';

interface WaitingRoomScreenProps {
  snapshot: GameSnapshot;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
  snapshot,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
}) => {
  const isHost = snapshot.players[0]?.id === currentPlayerId;
  const canStart = isHost && snapshot.players.length >= 2;

  const handleShare = () => {
    try {
      Share.share({
        message: `Join my HeySakhi Snakes & Ladders game! Room Code: ${snapshot.roomId}`,
      });
    } catch (e) {}
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onLeaveRoom} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Exit Room</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game Lobby</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Room Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.roomCodeText}>{snapshot.roomId}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleShare}
          style={styles.shareBtn}
        >
          <Text style={styles.shareBtnText}>📋 Share Room Code</Text>
        </TouchableOpacity>
      </View>

      {/* Players List */}
      <View style={styles.playersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Players ({snapshot.players.length}/{snapshot.maxPlayers})
          </Text>
          <Text style={styles.minRequirement}>Min. 2 to start</Text>
        </View>

        <View style={styles.playerList}>
          {snapshot.players.map((p, idx) => {
            const colorDef = COLOR_MAP[p.color];
            return (
              <View key={p.id} style={styles.playerItem}>
                <View
                  style={[
                    styles.playerDot,
                    { backgroundColor: colorDef.primary },
                  ]}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {p.name} {p.id === currentPlayerId ? '(You)' : ''}
                  </Text>
                  <Text style={styles.playerRole}>
                    {p.isHost ? '👑 Room Host' : 'Player'}
                  </Text>
                </View>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>Ready</Text>
                </View>
              </View>
            );
          })}

          {/* Empty Slots */}
          {Array.from({
            length: snapshot.maxPlayers - snapshot.players.length,
          }).map((_, idx) => (
            <View key={`slot-${idx}`} style={styles.emptySlot}>
              <Text style={styles.emptySlotText}>Waiting for player...</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.bottomControls}>
        {isHost ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onStartGame}
            disabled={!canStart}
            style={[
              styles.startBtn,
              !canStart && { opacity: 0.5, backgroundColor: '#94A3B8' },
            ]}
          >
            <Text style={styles.startBtnText}>
              {snapshot.players.length < 2
                ? 'Waiting for at least 1 more player...'
                : 'Start Game 🎮'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.guestWaiting}>
            <Text style={styles.guestWaitingText}>
              Waiting for the host to start the game...
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  codeCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  roomCodeText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1E1B4B',
    letterSpacing: 5,
    marginBottom: 14,
  },
  shareBtn: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#6D28D9',
    fontWeight: '700',
    fontSize: 13,
  },
  playersSection: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  minRequirement: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  playerList: {
    gap: 10,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  playerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  playerRole: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  readyBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  emptySlot: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  emptySlotText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  bottomControls: {
    width: '100%',
    maxWidth: 400,
  },
  startBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  guestWaiting: {
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  guestWaitingText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '700',
  },
});

