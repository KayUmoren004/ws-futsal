import React from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTournament } from '@/state/TournamentProvider';

const baseBg = 'hsl(0 0% 3.9%)';
const borderCol = 'hsl(0 0% 14.9%)';

const chipStyle = (color: string) => ({
  backgroundColor: color,
  width: 18,
  height: 18,
  borderRadius: 12,
  marginRight: 8,
});

export default function ViewPlayersModal() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { currentNight, transferPlayer } = useTournament();

  const team = currentNight?.teams.find((t) => t.id === teamId);
  const otherTeams = currentNight?.teams.filter((t) => t.id !== teamId) ?? [];

  const [transferringPlayer, setTransferringPlayer] = React.useState<string | null>(null);

  const handleTransferTo = (toTeamId: string) => {
    if (transferringPlayer && teamId) {
      transferPlayer(transferringPlayer, teamId, toTeamId);
      setTransferringPlayer(null);
    }
  };

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Team not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // If transferring, show team selection
  if (transferringPlayer) {
    const player = team.players.find((p) => p.id === transferringPlayer);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Transfer {player?.name}</Text>
          <Pressable onPress={() => setTransferringPlayer(null)} hitSlop={12}>
            <IconSymbol name="xmark.circle.fill" size={24} color="#e2e8f0" />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Select destination team:</Text>
        <FlatList
          data={otherTeams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.teamRow}
              onPress={() => handleTransferTo(item.id)}
              hitSlop={8}>
              <View style={styles.row}>
                <View style={chipStyle(item.color)} />
                <Text style={styles.teamName}>{item.name}</Text>
              </View>
              <IconSymbol name="arrow.right" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Add another team to transfer players.</Text>
          }
        />
        <Pressable style={styles.cancelButton} onPress={() => setTransferringPlayer(null)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={chipStyle(team.color)} />
          <Text style={styles.title}>{team.name} Players</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="xmark.circle.fill" size={24} color="#e2e8f0" />
        </Pressable>
      </View>

      {team.players.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No players added yet.</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => {
              router.back();
              setTimeout(() => {
                router.push({
                  pathname: '/add-players-modal',
                  params: { teamId },
                });
              }, 300);
            }}>
            <Text style={styles.addButtonText}>Add Players</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={team.players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playerRow}
              onPress={() => setTransferringPlayer(item.id)}
              hitSlop={8}>
              <Text style={styles.playerName}>{item.name}</Text>
              <View style={styles.row}>
                <Text style={styles.transferHint}>Transfer</Text>
                <IconSymbol name="arrow.right" size={14} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: baseBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: borderCol,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    padding: 16,
    paddingBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: borderCol,
  },
  playerName: {
    fontWeight: '700',
    color: '#e2e8f0',
    fontSize: 16,
  },
  transferHint: {
    color: '#94a3b8',
    marginRight: 4,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: borderCol,
  },
  teamName: {
    fontWeight: '700',
    color: '#e2e8f0',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  empty: {
    color: '#94a3b8',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#0b1220',
    fontWeight: '800',
  },
  cancelButton: {
    margin: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  errorText: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  linkText: {
    color: Colors.light.tint,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
});

