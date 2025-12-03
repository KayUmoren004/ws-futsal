import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useTournament } from '@/state/TournamentProvider';

export default function PreferencesScreen() {
  const { resetAllData } = useTournament();
  const [loading, setLoading] = useState(false);

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
      <View style={styles.card}>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.subtle}>
          Reset will wipe all stored nights, teams, players, and matches from this device.
        </Text>
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset}>
          <Text style={styles.buttonText}>{loading ? 'Resetting…' : 'Reset all data'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
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
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0b1220', fontWeight: '800', fontSize: 16 },
});
