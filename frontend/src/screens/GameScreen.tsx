import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { Board } from '../components/Board';
import { Dice } from '../components/Dice';
import { GameSnapshot, COLOR_MAP } from '../types/game';

interface GameScreenProps {
  snapshot: GameSnapshot;
  currentPlayerId: string;
  isOnline: boolean;
  onRollDice: () => void;
  onExitGame: () => void;
  onPlayAgain?: () => void;
  rolling: boolean;
  lastMessage?: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  snapshot,
  currentPlayerId,
  isOnline,
  onRollDice,
  onExitGame,
  onPlayAgain,
  rolling,
  lastMessage,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Responsive board width calculation: Max 360 or 92% of window
  const windowWidth = Dimensions.get('window').width || 380;
  const boardWidth = Math.min(windowWidth - 32, 360);

  const currPlayer = snapshot.players[snapshot.turn.currentPlayerIndex];
  const isMyTurn = !isOnline || (currPlayer && currPlayer.id === currentPlayerId);
  const colorDef = currPlayer ? COLOR_MAP[currPlayer.color] : COLOR_MAP['coral-red'];
  const isFinished = snapshot.status === 'FINISHED';
  const winner = snapshot.players.find((p) => p.id === snapshot.winnerId);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowExitConfirm(true)}
          style={styles.exitBtn}
        >
          <Text style={styles.exitBtnText}>✕ Exit</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>HeySakhi Snakes & Ladders</Text>
          <View style={styles.modePill}>
            <View
              style={[
                styles.modeDot,
                { backgroundColor: isOnline ? '#10B981' : '#6366F1' },
              ]}
            />
            <Text style={styles.modeText}>
              {isOnline ? `Online • Room ${snapshot.roomId}` : 'Offline Pass & Play'}
            </Text>
          </View>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Status Cards Bar */}
        <View style={styles.playerBar}>
          {snapshot.players.map((p, idx) => {
            const pColor = COLOR_MAP[p.color];
            const isTurn = idx === snapshot.turn.currentPlayerIndex;

            return (
              <View
                key={p.id}
                style={[
                  styles.playerBadge,
                  isTurn && [
                    styles.activePlayerBadge,
                    { borderColor: pColor.primary, backgroundColor: pColor.light },
                  ],
                ]}
              >
                <View
                  style={[
                    styles.playerBadgeDot,
                    { backgroundColor: pColor.primary },
                  ]}
                />
                <View>
                  <Text style={styles.playerBadgeName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.playerBadgePos}>
                    Sq {p.position === 0 ? 'Start' : p.position}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Turn Announcement Banner */}
        <View style={[styles.turnBanner, { backgroundColor: colorDef.light }]}>
          <Text style={[styles.turnBannerText, { color: colorDef.primary }]}>
            {isFinished
              ? `🏆 ${winner?.name || 'Player'} Won the Match!`
              : isMyTurn
              ? `👉 Your Turn (${currPlayer?.name}) — Roll the Dice!`
              : `⏳ ${currPlayer?.name}'s Turn...`}
          </Text>
          {lastMessage ? (
            <Text style={styles.lastMsgText}>{lastMessage}</Text>
          ) : null}
        </View>

        {/* The 50-Square Board (5 cols x 10 rows) */}
        <View style={styles.boardWrapper}>
          <Board players={snapshot.players} boardWidth={boardWidth} />
        </View>

        {/* Dice Controller */}
        {!isFinished && (
          <View style={styles.controlsArea}>
            <Dice
              value={snapshot.turn.lastDiceValue || 1}
              rolling={rolling}
              disabled={!isMyTurn || rolling}
              onRoll={onRollDice}
              playerColor={colorDef.primary}
            />
          </View>
        )}
      </ScrollView>

      {/* Victory Modal */}
      {isFinished && (
        <Modal transparent animationType="fade" visible={isFinished}>
          <View style={styles.modalOverlay}>
            <View style={styles.victoryCard}>
              <Text style={styles.trophyIcon}>🏆</Text>
              <Text style={styles.victoryTitle}>VICTORY!</Text>
              <Text style={styles.victorySub}>
                {winner?.name || 'Player'} reached Square 50!
              </Text>

              {/* Match Stats */}
              {snapshot.stats && (
                <View style={styles.statsBox}>
                  <Text style={styles.statsHeading}>Match Statistics</Text>
                  {snapshot.players.map((p) => {
                    const st = snapshot.stats?.[p.id];
                    return (
                      <View key={p.id} style={styles.statRow}>
                        <Text style={styles.statPlayer}>{p.name}:</Text>
                        <Text style={styles.statDetail}>
                          {st?.totalRolls || 0} rolls • 🪜 {st?.laddersClimbed || 0} • 🐍 {st?.snakesEncountered || 0}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.modalActions}>
                {onPlayAgain && (
                  <TouchableOpacity
                    style={styles.playAgainBtn}
                    onPress={onPlayAgain}
                  >
                    <Text style={styles.playAgainText}>Play Again 🎲</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.exitModalBtn}
                  onPress={onExitGame}
                >
                  <Text style={styles.exitModalText}>Return to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <Modal transparent animationType="fade" visible={showExitConfirm}>
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Exit Match?</Text>
              <Text style={styles.confirmMsg}>
                Are you sure you want to leave the current game?
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowExitConfirm(false)}
                >
                  <Text style={styles.cancelBtnText}>Continue Playing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() => {
                    setShowExitConfirm(false);
                    onExitGame();
                  }}
                >
                  <Text style={styles.dangerBtnText}>Yes, Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  exitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  exitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playerBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 80,
  },
  activePlayerBadge: {
    borderWidth: 2,
    elevation: 3,
  },
  playerBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  playerBadgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 70,
  },
  playerBadgePos: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  turnBanner: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  turnBannerText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  lastMsgText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  boardWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  controlsArea: {
    marginTop: 6,
    alignItems: 'center',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  trophyIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 1.5,
  },
  victorySub: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  statsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  statPlayer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  statDetail: {
    fontSize: 12,
    color: '#64748B',
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  playAgainBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  exitModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  exitModalText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 8,
  },
  confirmMsg: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  dangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

