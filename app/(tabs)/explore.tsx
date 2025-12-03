import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useTournament } from '@/state/TournamentProvider';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function TimerScreen() {
  const { currentNight, setMatchDuration } = useTournament();
  const [duration, setDuration] = useState(6 * 60);
  const [remaining, setRemaining] = useState(6 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  const attachedMatch = useMemo(
    () => currentNight?.matches.find((m) => m.id === currentNight?.currentMatchId),
    [currentNight],
  );

  useEffect(() => {
    if (attachedMatch?.durationSeconds) {
      setDuration(attachedMatch.durationSeconds);
      setRemaining(attachedMatch.durationSeconds);
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [attachedMatch?.durationSeconds]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => Math.max(prev - 1, 0));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [remaining, running]);

  const currentMatchLabel = useMemo(() => {
    if (!currentNight?.currentMatchId) return 'No match tagged';
    const match = currentNight.matches.find((m) => m.id === currentNight.currentMatchId);
    if (!match) return 'No match tagged';
    const home = currentNight.teams.find((t) => t.id === match.homeId)?.name ?? 'TBD';
    const away = currentNight.teams.find((t) => t.id === match.awayId)?.name ?? 'TBD';
    return `${home} vs ${away}`;
  }, [currentNight]);

  const setPreset = (mins: number) => {
    const value = mins * 60;
    setDuration(value);
    setRemaining(value);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (attachedMatch) setMatchDuration(attachedMatch.id, value);
  };

  const reset = () => {
    setRemaining(duration);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const saveCustomDuration = (minutes: number) => {
    if (!minutes || Number.isNaN(minutes)) return;
    const secs = minutes * 60;
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (attachedMatch) setMatchDuration(attachedMatch.id, secs);
  };

  const [customMinutes, setCustomMinutes] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Match Timer</Text>
      <Text style={styles.subtle}>{currentMatchLabel}</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{formatTime(remaining)}</Text>
      </View>
      <View style={styles.row}>
        <Pressable style={styles.pill} onPress={() => setPreset(6)}>
          <Text style={styles.pillText}>6 min</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => setPreset(8)}>
          <Text style={styles.pillText}>8 min</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => setPreset(10)}>
          <Text style={styles.pillText}>10 min</Text>
        </Pressable>
      </View>
      <View style={styles.customRow}>
        <TextInput
          placeholder="Custom minutes"
          placeholderTextColor="#64748b"
          value={customMinutes}
          onChangeText={setCustomMinutes}
          keyboardType="numeric"
          style={styles.customInput}
        />
        <Pressable style={styles.pill} onPress={() => saveCustomDuration(Number(customMinutes))}>
          <Text style={styles.pillText}>Set</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable
          style={[styles.cta, running ? styles.pause : styles.start]}
          onPress={() => setRunning((prev) => !prev)}>
          <Text style={styles.ctaText}>{running ? 'Pause' : 'Start'}</Text>
        </Pressable>
        <Pressable style={styles.reset} onPress={reset}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'hsl(0 0% 3.9%)', padding: 16, gap: 16 },
  heading: { color: '#e2e8f0', fontSize: 22, fontWeight: '800' },
  subtle: { color: '#94a3b8' },
  timerBox: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    borderRadius: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
  },
  timerText: {
    color: '#fff',
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  row: { flexDirection: 'row', gap: 12 },
  pill: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
  },
  pillText: { color: '#e2e8f0', fontWeight: '800' },
  customRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  customInput: {
    flex: 1,
    backgroundColor: 'hsl(0 0% 3.9%)',
    color: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  cta: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: { backgroundColor: Colors.light.tint },
  pause: { backgroundColor: '#f59e0b' },
  ctaText: { color: '#0f172a', fontWeight: '800', fontSize: 18 },
  reset: {
    backgroundColor: 'hsl(0 0% 3.9%)',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hsl(0 0% 14.9%)',
  },
  resetText: { color: '#e2e8f0', fontWeight: '800' },
});
