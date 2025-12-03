import React, { useState } from 'react';
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
import { Link } from 'expo-router';

import { useTournament } from '@/state/TournamentProvider';

export default function PreferencesScreen() {
  const { resetAllData, addGlobalPlayers } = useTournament();
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState('');

  const handleReset = async () => {
    Alert.alert(
      'Reset all data',
      'This will clear every saved night, team, and match. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await resetAllData();
            setLoading(false);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.title}>Import players</Text>
              <Text style={styles.subtle}>Add player names (one per line) to reuse across nights.</Text>
              <TextInput
                style={styles.input}
                multiline
                placeholder="e.g. Jane Smith\nOmar K\nLee"
                placeholderTextColor="#64748b"
                value={importText}
                onChangeText={setImportText}
              />
              <Pressable
                style={styles.buttonSecondary}
                onPress={() => {
              const names = importText.split('\n');
              addGlobalPlayers(names);
              setImportText('');
            }}>
                <Text style={styles.buttonText}>Save players</Text>
              </Pressable>
            </View>

        <View style={styles.card}>
          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.title}>Players library</Text>
            <Link href="/player-library" asChild>
              <Pressable style={styles.linkBtn}>
                <Text style={styles.linkText}>Open</Text>
              </Pressable>
            </Link>
          </View>
          <Text style={styles.subtle}>
            Manage reusable players on a dedicated page. You can search and delete there.
          </Text>
        </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.card}>
            <Text style={styles.title}>Preferences</Text>
            <Text style={styles.subtle}>
              Reset will wipe all stored nights, teams, players, and matches from this device.
            </Text>
            <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset}>
              <Text style={styles.buttonText}>{loading ? 'Resetting…' : 'Reset all data'}</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'hsl(0 0% 3.9%)' },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    gap: 12,
  },
  title: { color: '#e2e8f0', fontSize: 20, fontWeight: '800' },
  subtle: { color: '#94a3b8' },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#38bdf8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0b1220', fontWeight: '800', fontSize: 16 },
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
  playerRow: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    borderRadius: 10,
    padding: 12,
  },
  playerRowText: { color: '#e2e8f0', fontWeight: '600' },
});
