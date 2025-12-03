import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTournament } from '@/state/TournamentProvider';

const baseBg = 'hsl(0 0% 3.9%)';
const cardBg = 'hsl(0 0% 3.9%)';
const borderCol = 'hsl(0 0% 14.9%)';

const chipStyle = (color: string) => ({
  backgroundColor: color,
  width: 18,
  height: 18,
  borderRadius: 12,
  marginRight: 8,
});

export default function AddPlayersModal() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { state, currentNight, addPlayer, addExistingPlayer } = useTournament();

  const [searchValue, setSearchValue] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const team = currentNight?.teams.find((t) => t.id === teamId);

  // Track players already assigned to any team in current night
  const assignedPlayerIds = useMemo(() => {
    if (!currentNight) return new Set<string>();
    const ids = new Set<string>();
    currentNight.teams.forEach((t) => {
      t.players.forEach((p) => ids.add(p.id));
    });
    return ids;
  }, [currentNight]);

  // Filter and annotate available players
  const availablePlayers = useMemo(() => {
    if (!team || !currentNight) return [];
    const term = searchValue.toLowerCase();
    const currentTeamPlayerIds = new Set(team.players.map((p) => p.id));

    return state.globalPlayers
      .filter((p) => p.name.toLowerCase().includes(term))
      .map((p) => ({
        ...p,
        isAssigned: assignedPlayerIds.has(p.id) && !currentTeamPlayerIds.has(p.id),
        isInCurrentTeam: currentTeamPlayerIds.has(p.id),
      }));
  }, [searchValue, state.globalPlayers, team, currentNight, assignedPlayerIds]);

  const handleTogglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (teamId) {
      selectedIds.forEach((playerId) => {
        addExistingPlayer(teamId, playerId);
      });
      router.back();
    }
  };

  const handleAddNewPlayer = () => {
    if (newPlayerName.trim() && teamId) {
      addPlayer(teamId, newPlayerName);
      setNewPlayerName('');
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

  const selectedCount = selectedIds.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={chipStyle(team.color)} />
          <Text style={styles.title}>Add Players to {team.name}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="xmark" size={24} color="#e2e8f0" />
        </Pressable>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search players..."
        placeholderTextColor="#64748b"
        value={searchValue}
        onChangeText={setSearchValue}
        autoFocus
      />

      {/* Add new player section */}
      <View style={styles.addNewSection}>
        <Text style={styles.subtle}>Can't find a player? Add them:</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            placeholder="New player name"
            placeholderTextColor="#475569"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={handleAddNewPlayer}
          />
          <Pressable style={styles.addButton} onPress={handleAddNewPlayer}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Player list */}
      <FlatList
        data={availablePlayers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const isDisabled = item.isAssigned || item.isInCurrentTeam;

          return (
            <Pressable
              style={[
                styles.playerRow,
                isSelected && styles.playerRowActive,
                isDisabled && styles.playerRowDisabled,
              ]}
              onPress={() => !isDisabled && handleTogglePlayer(item.id)}
              disabled={isDisabled}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxActive,
                    isDisabled && styles.checkboxDisabled,
                  ]}>
                  {isSelected && <IconSymbol name="checkmark" size={14} color="#0b1220" />}
                </View>
                <Text style={[styles.playerName, isDisabled && { color: '#64748b' }]}>
                  {item.name}
                </Text>
              </View>
              {item.isInCurrentTeam && (
                <Text style={styles.alreadyInTeam}>Already in team</Text>
              )}
              {item.isAssigned && !item.isInCurrentTeam && (
                <Text style={styles.assignedLabel}>In another team</Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No players found</Text>}
      />

      {/* Footer with confirm button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.confirmButton, selectedCount === 0 && { opacity: 0.5 }]}
          onPress={handleConfirm}
          disabled={selectedCount === 0}>
          <Text style={styles.confirmButtonText}>
            Add {selectedCount} Player{selectedCount !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      </View>
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
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: cardBg,
    color: '#e2e8f0',
    fontSize: 16,
  },
  addNewSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  subtle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: cardBg,
    color: '#e2e8f0',
    minHeight: 44,
  },
  flex: { flex: 1 },
  addButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#0b1220',
    fontWeight: '800',
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
  playerRowActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  playerRowDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  checkboxDisabled: {
    borderColor: '#475569',
  },
  playerName: {
    fontWeight: '700',
    color: '#e2e8f0',
  },
  assignedLabel: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  alreadyInTeam: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  empty: {
    color: '#94a3b8',
    paddingVertical: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: baseBg,
    borderTopWidth: 1,
    borderColor: borderCol,
  },
  confirmButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#0b1220',
    fontWeight: '800',
    fontSize: 16,
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

