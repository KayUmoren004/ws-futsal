import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTournament } from "@/state/TournamentProvider";

const CIRCLE_SIZE = 280;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

// Circular progress using two half-circles
const CircularProgress = ({
  progress,
  isRunning,
}: {
  progress: number;
  isRunning: boolean;
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(progress * 360, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, rotation]);

  const firstHalfStyle = useAnimatedStyle(() => {
    const rotate = Math.min(rotation.value, 180);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const secondHalfStyle = useAnimatedStyle(() => {
    const rotate = Math.max(rotation.value - 180, 0);
    return {
      transform: [{ rotate: `${rotate}deg` }],
      opacity: rotation.value > 180 ? 1 : 0,
    };
  });

  const progressColor = isRunning ? "#3b82f6" : "#71717a";

  return (
    <View style={styles.circleContainer}>
      {/* Background circle */}
      <View style={styles.circleBackground} />

      {/* Progress - First half (0-180 degrees) */}
      <View style={styles.halfCircleContainer}>
        <Animated.View
          style={[
            styles.halfCircle,
            { borderColor: progressColor },
            firstHalfStyle,
          ]}
        />
      </View>

      {/* Progress - Second half (180-360 degrees) */}
      <View style={[styles.halfCircleContainer, styles.secondHalf]}>
        <Animated.View
          style={[
            styles.halfCircle,
            styles.secondHalfCircle,
            { borderColor: progressColor },
            secondHalfStyle,
          ]}
        />
      </View>
    </View>
  );
};

export default function TimerScreen() {
  const { currentNight, setMatchDuration } = useTournament();
  const [duration, setDuration] = useState(6 * 60);
  const [remaining, setRemaining] = useState(6 * 60);
  const [running, setRunning] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const attachedMatch = useMemo(
    () =>
      currentNight?.matches.find((m) => m.id === currentNight?.currentMatchId),
    [currentNight]
  );

  const currentMatchLabel = useMemo(() => {
    if (!currentNight?.currentMatchId) return null;
    const match = currentNight.matches.find(
      (m) => m.id === currentNight.currentMatchId
    );
    if (!match) return null;
    const home =
      currentNight.teams.find((t) => t.id === match.homeId)?.name ?? "TBD";
    const away =
      currentNight.teams.find((t) => t.id === match.awayId)?.name ?? "TBD";
    return `${home} vs ${away}`;
  }, [currentNight]);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
  }, [remaining, running]);

  const progress = duration > 0 ? remaining / duration : 0;

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

  const saveCustomDuration = () => {
    const minutes = Number(customMinutes);
    if (!minutes || Number.isNaN(minutes)) return;
    const secs = minutes * 60;
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
    setShowCustom(false);
    setCustomMinutes("");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (attachedMatch) setMatchDuration(attachedMatch.id, secs);
  };

  const isComplete = remaining === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Match indicator */}
      {currentMatchLabel && (
        <View style={styles.matchBadge}>
          <View style={styles.matchDot} />
          <Text style={styles.matchLabel}>{currentMatchLabel}</Text>
        </View>
      )}

      {/* Timer display */}
      <View style={styles.timerSection}>
        <CircularProgress progress={progress} isRunning={running} />
        <View style={styles.timerCenter}>
          <Text style={[styles.timerText, isComplete && styles.timerComplete]}>
            {formatTime(remaining)}
          </Text>
          <Text style={styles.durationLabel}>
            of {Math.floor(duration / 60)} min
          </Text>
        </View>
      </View>

      {/* Duration presets */}
      <View style={styles.presetsSection}>
        {showCustom ? (
          <View style={styles.customRow}>
            <TextInput
              placeholder="Minutes"
              placeholderTextColor="#52525b"
              value={customMinutes}
              onChangeText={setCustomMinutes}
              keyboardType="number-pad"
              style={styles.customInput}
              autoFocus
            />
            <Pressable style={styles.customButton} onPress={saveCustomDuration}>
              <Text style={styles.customButtonText}>Set</Text>
            </Pressable>
            <Pressable
              style={styles.customCancel}
              onPress={() => {
                setShowCustom(false);
                setCustomMinutes("");
              }}
            >
              <Text style={styles.customCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.presetsRow}>
            {[6, 8, 10].map((mins) => (
              <Pressable
                key={mins}
                style={[
                  styles.presetPill,
                  duration === mins * 60 && styles.presetPillActive,
                ]}
                onPress={() => setPreset(mins)}
              >
                <Text
                  style={[
                    styles.presetText,
                    duration === mins * 60 && styles.presetTextActive,
                  ]}
                >
                  {mins}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.presetPill}
              onPress={() => setShowCustom(true)}
            >
              <Text style={styles.presetText}>...</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsSection}>
        <Pressable style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>

        <Pressable
          style={[
            styles.mainButton,
            running ? styles.mainButtonPause : styles.mainButtonStart,
            isComplete && styles.mainButtonComplete,
          ]}
          onPress={() => setRunning((prev) => !prev)}
        >
          <Text style={styles.mainButtonText}>
            {isComplete ? "Done" : running ? "Pause" : "Start"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    paddingHorizontal: 24,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  matchLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3b82f6",
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    position: "relative",
  },
  circleBackground: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  halfCircleContainer: {
    position: "absolute",
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    left: CIRCLE_SIZE / 2,
    overflow: "hidden",
  },
  halfCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: "#3b82f6",
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    position: "absolute",
    right: 0,
    transformOrigin: "center center",
  },
  secondHalf: {
    left: 0,
    transform: [{ rotate: "180deg" }],
  },
  secondHalfCircle: {
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
  timerCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 56,
    fontWeight: "200",
    color: "#fafafa",
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },
  timerComplete: {
    color: "#22c55e",
  },
  durationLabel: {
    fontSize: 14,
    color: "#52525b",
    marginTop: 4,
  },
  presetsSection: {
    paddingBottom: 32,
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  presetPill: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  presetPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  presetText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#71717a",
  },
  presetTextActive: {
    color: "#3b82f6",
  },
  customRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  customInput: {
    width: 100,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: "#fafafa",
    textAlign: "center",
  },
  customButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fafafa",
  },
  customCancel: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  customCancelText: {
    fontSize: 15,
    color: "#71717a",
  },
  controlsSection: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: 12,
  },
  resetButton: {
    flex: 1,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  mainButton: {
    flex: 2,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mainButtonStart: {
    backgroundColor: "#22c55e",
  },
  mainButtonPause: {
    backgroundColor: "#f59e0b",
  },
  mainButtonComplete: {
    backgroundColor: "#3b82f6",
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#09090b",
  },
});
