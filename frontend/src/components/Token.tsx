import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Player, COLOR_MAP } from '../types/game';

interface TokenProps {
  player: Player;
  size?: number;
  offsetIndex?: number; // When multiple tokens are on the same square
}

export const Token: React.FC<TokenProps> = ({ player, size = 22, offsetIndex = 0 }) => {
  const colorDef = COLOR_MAP[player.color] || COLOR_MAP['coral-red'];

  // Stagger offsets so up to 4 tokens on the same square are fully visible
  const offsets = [
    { dx: -6, dy: -6 },
    { dx: 6, dy: -6 },
    { dx: -6, dy: 6 },
    { dx: 6, dy: 6 },
  ];
  const offset = offsets[offsetIndex % 4];

  return (
    <View
      style={[
        styles.tokenContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorDef.primary,
          borderColor: '#FFFFFF',
          transform: [
            { translateX: offset.dx },
            { translateY: offset.dy },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: (size * 0.5) / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tokenContainer: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 6,
    position: 'absolute',
    zIndex: 10,
  },
  innerRing: {
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
});

