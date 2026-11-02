import React from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, ScrollView } from 'react-native';

interface HomeScreenProps {
  onPlayOffline: () => void;
  onPlayOnline: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayOffline,
  onPlayOnline,
}) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HEYSAKHI GAMING</Text>
        </View>
        <Text style={styles.title}>Snakes & Ladders</Text>
        <Text style={styles.subtitle}>Strictly 50-Square Classic Edition</Text>
      </View>

      {/* Mini Board Illustration Card */}
      <View style={styles.cardPreview}>
        <View style={styles.miniBoard}>
          {[...Array(25)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.miniCell,
                { backgroundColor: i % 2 === 0 ? '#EEF2FF' : '#E0E7FF' },
                i === 0 && { backgroundColor: '#FDE68A' },
                i === 24 && { backgroundColor: '#DCFCE7' },
              ]}
            >
              <Text style={styles.miniCellText}>
                {i === 0 ? '50' : i === 24 ? '1' : ''}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.previewInfo}>
          <Text style={styles.previewTag}>5x10 Serpentine Grid • 1 to 50</Text>
          <Text style={styles.previewDesc}>
            Fast-paced, exact-to-50 finish, balanced ladders and snakes!
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryButton, styles.offlineButton]}
          onPress={onPlayOffline}
        >
          <View style={styles.btnContent}>
            <Text style={styles.btnIcon}>📱</Text>
            <View>
              <Text style={styles.btnTitle}>Play Offline</Text>
              <Text style={styles.btnDesc}>Single device • 2 to 4 Players</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryButton, styles.onlineButton]}
          onPress={onPlayOnline}
        >
          <View style={styles.btnContent}>
            <Text style={styles.btnIcon}>🌐</Text>
            <View>
              <Text style={styles.btnTitle}>Play Online</Text>
              <Text style={styles.btnDesc}>Create / Join Room • Real-Time Golang WebSocket</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Coral Red • Royal Blue • Emerald Green • Golden Yellow
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FAF5FF', // Pale soft lavender / pink light theme
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  cardPreview: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 28,
  },
  miniBoard: {
    width: 200,
    height: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  miniCell: {
    width: '20%',
    height: '20%',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCellText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
  },
  previewInfo: {
    alignItems: 'center',
  },
  previewTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  previewDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 380,
    gap: 14,
  },
  primaryButton: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  offlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  onlineButton: {
    backgroundColor: '#7C3AED', // Violet primary action
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  btnTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  btnDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    marginTop: 36,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

