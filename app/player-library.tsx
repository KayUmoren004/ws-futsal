import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTournament } from '@/state/TournamentProvider';

export default function PlayerLibraryScreen() {
  const { globalPlayers, addGlobalPlayer, addGlobalPlayers, removeGlobalPlayer } = useTournament();
  const [search, setSearch] = useState('');
  const [newPlayer, setNewPlayer] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return globalPlayers.filter((p) => p.name.toLowerCase().includes(term));
  }, [globalPlayers, search]);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete player', `Remove ${name} from the library and all teams?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeGlobalPlayer(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Player Library</Text>
        <TextInput
          style={styles.input}
          placeholder="Search players"
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add single player (First Last or Last, First)"
            placeholderTextColor="#64748b"
            value={newPlayer}
            onChangeText={setNewPlayer}
            onSubmitEditing={() => {
              addGlobalPlayer(newPlayer);
              setNewPlayer('');
            }}
          />
          <Pressable
            style={[styles.iconButton, { marginLeft: 8 }]}
            onPress={() => {
              addGlobalPlayer(newPlayer);
              setNewPlayer('');
            }}>
            <Text style={styles.iconText}>＋</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.buttonSecondary}
          onPress={() => {
            const bulk = search.split('\n');
            addGlobalPlayers(bulk);
          }}>
          <Text style={styles.buttonText}>Bulk add (paste lines)</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerRowText}>{item.name}</Text>
            <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item.id, item.name)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.subtle}>No players yet.</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'hsl(0 0% 3.9%)' },
  card: {
    margin: 16,
    backgroundColor: 'hsl(0 0% 3.9%)',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  title: { color: '#e2e8f0', fontSize: 20, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'hsl(0 0% 3.9%)',
    color: '#e2e8f0',
    minHeight: 44,
  },
  buttonSecondary: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#0b1220', fontWeight: '800' },
  subtle: { color: '#94a3b8' },
  playerRow: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerRowText: { color: '#e2e8f0', fontWeight: '600', flex: 1 },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteText: { color: '#ef4444', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconText: { color: Colors.light.tint, fontWeight: '800', fontSize: 18 },
});
