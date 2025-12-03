import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTournament } from '@/state/TournamentProvider';

export default function PlayerLibraryScreen() {
  const { globalPlayers, addGlobalPlayer, addGlobalPlayers, removeGlobalPlayer } =
    useTournament();
  const [search, setSearch] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return globalPlayers.filter((p) => p.name.toLowerCase().includes(term));
  }, [globalPlayers, search]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Remove player?', `${name} will be removed from the library and all teams.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeGlobalPlayer(id) },
    ]);
  };

  const handleAddPlayer = () => {
    if (!newPlayer.trim()) return;
    addGlobalPlayer(newPlayer);
    setNewPlayer('');
  };

  const handleBulkAdd = () => {
    const lines = bulkText.split('\n').filter((l) => l.trim());
    if (lines.length > 0) {
      addGlobalPlayers(lines);
      setBulkText('');
      setBulkMode(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color="#94a3b8" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Players</Text>
          <Text style={styles.count}>{globalPlayers.length}</Text>
        </View>
        <Pressable
          onPress={() => setBulkMode(!bulkMode)}
          hitSlop={12}
          style={styles.modeButton}>
          <Text style={[styles.modeButtonText, bulkMode && styles.modeButtonActive]}>
            {bulkMode ? 'Single' : 'Bulk'}
          </Text>
        </Pressable>
      </View>

      {/* Add player input */}
      <View style={styles.inputSection}>
        {bulkMode ? (
          <>
            <TextInput
              style={styles.bulkInput}
              placeholder="Paste player names (one per line)"
              placeholderTextColor="#475569"
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.addButton, !bulkText.trim() && styles.addButtonDisabled]}
              onPress={handleBulkAdd}
              disabled={!bulkText.trim()}>
              <Text style={styles.addButtonText}>Add All</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.singleInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add player..."
              placeholderTextColor="#475569"
              value={newPlayer}
              onChangeText={setNewPlayer}
              onSubmitEditing={handleAddPlayer}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addIconButton, !newPlayer.trim() && styles.addIconButtonDisabled]}
              onPress={handleAddPlayer}
              disabled={!newPlayer.trim()}>
              <IconSymbol name="plus" size={18} color={newPlayer.trim() ? '#0b1220' : '#64748b'} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Search */}
      {globalPlayers.length > 0 && (
        <View style={styles.searchSection}>
          <IconSymbol name="magnifyingglass" size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={12}>
              <IconSymbol name="xmark.circle.fill" size={16} color="#64748b" />
            </Pressable>
          )}
        </View>
      )}

      {/* Player list */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.playerRow, index === 0 && styles.playerRowFirst]}
            onLongPress={() => confirmDelete(item.id, item.name)}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Pressable
              onPress={() => confirmDelete(item.id, item.name)}
              hitSlop={12}
              style={styles.removeButton}>
              <IconSymbol name="minus.circle" size={18} color="#64748b" />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'No results' : 'No players yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? `No players match "${search}"`
                : 'Add players to build your library'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 44,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fafafa',
    letterSpacing: -0.3,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modeButton: {
    width: 44,
    alignItems: 'flex-end',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  modeButtonActive: {
    color: '#3b82f6',
  },
  inputSection: {
    padding: 16,
    gap: 12,
  },
  singleInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#fafafa',
  },
  bulkInput: {
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fafafa',
  },
  addIconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  addButton: {
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fafafa',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fafafa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  playerRowFirst: {
    paddingTop: 8,
  },
  playerName: {
    fontSize: 16,
    color: '#fafafa',
    fontWeight: '400',
    flex: 1,
  },
  removeButton: {
    padding: 4,
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fafafa',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    maxWidth: 200,
  },
});
