import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTournament } from '@/state/TournamentProvider';

export default function PreferencesScreen() {
  const { resetAllData } = useTournament();
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Navigation Links */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          
          <Link href="/player-library" asChild>
            <Pressable style={styles.linkRow}>
              <View style={styles.linkContent}>
                <Text style={styles.linkText}>Player Library</Text>
                <Text style={styles.linkSubtext}>Manage reusable players</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </Pressable>
          </Link>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danger Zone</Text>
          
          <Pressable
            style={({ pressed }) => [
              styles.destructiveButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleReset}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={18} color="#fca5a5" />
            <Text style={styles.destructiveButtonText}>
              {loading ? 'Resetting…' : 'Reset all data'}
            </Text>
          </Pressable>
          <Text style={styles.helperText}>
            Wipes all nights, teams, players, and matches from this device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hsl(0 0% 3.9%)',
  },
  scroll: {
    padding: 20,
    paddingTop: 16,
  },
  pageTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'hsl(0 0% 14.9%)',
  },
  linkContent: {
    flex: 1,
  },
  linkText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
  },
  linkSubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  destructiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'hsl(0 0% 14.9%)',
  },
  destructiveButtonText: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    color: '#475569',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
