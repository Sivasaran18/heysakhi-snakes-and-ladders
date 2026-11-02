import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface DiceProps {
  value: number;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
  playerColor?: string;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  rolling,
  disabled,
  onRoll,
  playerColor = '#6C5CE7',
}) => {
  // 3x3 grid dot positions for values 1-6
  const getDots = (num: number) => {
    switch (num) {
      case 1:
        return [4]; // center
      case 2:
        return [0, 8]; // top-left, bottom-right
      case 3:
        return [0, 4, 8]; // diagonal
      case 4:
        return [0, 2, 6, 8]; // 4 corners
      case 5:
        return [0, 2, 4, 6, 8]; // 4 corners + center
      case 6:
        return [0, 2, 3, 5, 6, 8]; // left & right columns
      default:
        return [4];
    }
  };

  const dots = getDots(value || 1);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onRoll}
        disabled={disabled || rolling}
        style={[
          styles.diceBox,
          { borderColor: playerColor },
          disabled && styles.disabledDice,
          rolling && styles.rollingDice,
        ]}
      >
        <View style={styles.dotGrid}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
            <View key={idx} style={styles.gridCell}>
              {dots.includes(idx) && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: rolling ? '#CBD5E1' : playerColor },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </TouchableOpacity>
      <Text style={styles.statusText}>
        {rolling ? 'Rolling...' : disabled ? 'Waiting for turn...' : 'Tap Dice to Roll'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  diceBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 3,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledDice: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  rollingDice: {
    transform: [{ rotate: '15deg' }, { scale: 0.95 }],
  },
  dotGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '33.33%',
    height: '33.33%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});

