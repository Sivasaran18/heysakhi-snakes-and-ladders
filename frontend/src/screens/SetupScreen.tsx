import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { PALETTE } from '../engine/boardConfig';
import { COLOR_MAP } from '../types/game';

interface SetupScreenProps {
  onBack: () => void;
  onStartGame: (playerNames: string[]) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  onBack,
  onStartGame,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [names, setNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]);

  const handleNameChange = (text: string, index: number) => {
    const updated = [...names];
    updated[index] = text;
    setNames(updated);
  };

  const handleStart = () => {
    const activeNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStartGame(activeNames);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pass & Play Setup</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.sectionLabel}>Select Number of Players</Text>
      <View style={styles.counterRow}>
        {[2, 3, 4].map((num) => (
          <TouchableOpacity
            key={num}
            activeOpacity={0.8}
            onPress={() => setPlayerCount(num)}
            style={[
              styles.countButton,
              playerCount === num && styles.activeCountButton,
            ]}
          >
            <Text
              style={[
                styles.countText,
                playerCount === num && styles.activeCountText,
              ]}
            >
              {num} Players
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Player Names & Colors</Text>
      <View style={styles.playerInputsContainer}>
        {Array.from({ length: playerCount }).map((_, index) => {
          const colorKey = PALETTE[index];
          const colorMeta = COLOR_MAP[colorKey];

          return (
            <View key={index} style={styles.playerCard}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: colorMeta.primary },
                ]}
              />
              <View style={styles.inputWrapper}>
                <Text style={styles.playerLabel}>
                  {colorMeta.label} (Player {index + 1})
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={names[index]}
                  onChangeText={(txt: string) => handleNameChange(txt, index)}
                  placeholder={`Player ${index + 1}`}
                  maxLength={18}
                />
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleStart}
        style={styles.startButton}
      >
        <Text style={styles.startBtnText}>Start Match 🎲</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6D28D9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    maxWidth: 400,
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
  },
  counterRow: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  countButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  activeCountButton: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  activeCountText: {
    color: '#FFFFFF',
  },
  playerInputsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    marginBottom: 28,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  colorIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  inputWrapper: {
    flex: 1,
  },
  playerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  startButton: {
    width: '100%',
    maxWidth: 400,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
