import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

interface OnlineLobbyScreenProps {
  onBack: () => void;
  onCreateRoom: (playerName: string, maxPlayers: number) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  loading: boolean;
  errorMessage?: string;
}

export const OnlineLobbyScreen: React.FC<OnlineLobbyScreenProps> = ({
  onBack,
  onCreateRoom,
  onJoinRoom,
  loading,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [playerName, setPlayerName] = useState('Gamer');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    onCreateRoom(playerName.trim() || 'Host', maxPlayers);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim() || 'Player');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Online Multiplayer</Text>
        <View style={{ width: 44 }} />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, tab === 'CREATE' && styles.activeTab]}
          onPress={() => setTab('CREATE')}
        >
          <Text style={[styles.tabText, tab === 'CREATE' && styles.activeTabText]}>
            Create Room
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, tab === 'JOIN' && styles.activeTab]}
          onPress={() => setTab('JOIN')}
        >
          <Text style={[styles.tabText, tab === 'JOIN' && styles.activeTabText]}>
            Join Room
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player Display Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Nickname</Text>
        <TextInput
          style={styles.textInput}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name"
          maxLength={15}
        />
      </View>

      {tab === 'CREATE' ? (
        <View style={styles.panel}>
          <Text style={styles.inputLabel}>Room Capacity</Text>
          <View style={styles.capacityRow}>
            {[2, 3, 4].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.capacityBtn,
                  maxPlayers === count && styles.activeCapacityBtn,
                ]}
                onPress={() => setMaxPlayers(count)}
              >
                <Text
                  style={[
                    styles.capacityText,
                    maxPlayers === count && styles.activeCapacityText,
                  ]}
                >
                  {count} Players
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreate}
            disabled={loading}
            style={styles.actionBtn}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Create Private Room ✨</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.inputLabel}>Enter 6-Character Room Code</Text>
          <TextInput
            style={[styles.textInput, styles.codeField]}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="e.g. ABC123"
            autoCapitalize="characters"
            maxLength={6}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleJoin}
            disabled={loading || !roomCode.trim()}
            style={[
              styles.actionBtn,
              !roomCode.trim() && { opacity: 0.5 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Join Room 🚀</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 16,
    fontWeight: '700',
    color: '#6D28D9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  errorBanner: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  tabContainer: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
  },
  activeTabText: {
    color: '#1E1B4B',
  },
  inputGroup: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  capacityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  activeCapacityBtn: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  capacityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeCapacityText: {
    color: '#FFFFFF',
  },
  codeField: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 4,
    fontWeight: '800',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

