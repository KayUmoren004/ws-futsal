import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTournament } from "@/state/TournamentProvider";

const CIRCLE_SIZE = 280;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const pulse = async () => {
  for (let i = 0; i < 15; i++) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

// Circular countdown progress
// Circle FILLS UP as time runs out (shows elapsed time)
// Empty at start → Full when timer ends
const CircularProgress = ({
  progress,
  isRunning,
}: {
  progress: number;
  isRunning: boolean;
}) => {
  // elapsed = 1 - progress (how much time has passed)
  const elapsed = 1 - progress;

  // strokeDashoffset: CIRCUMFERENCE = empty, 0 = full
  const strokeDashoffset = CIRCUMFERENCE * (1 - elapsed);

  const fillColor = isRunning ? "#3b82f6" : "#52525b";

  return (
    <View style={styles.progressContainer}>
      <Svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {/* Background track */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={fillColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      pulse();
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.contentWrapper}>
            {/* Spacer - compresses when keyboard opens */}
            <View />

            {/* Timer display */}
            <View style={styles.timerSection}>
              {/* Match indicator */}
              {currentMatchLabel && (
                <View style={styles.matchBadge}>
                  <View style={styles.matchDot} />
                  <Text style={styles.matchLabel}>{currentMatchLabel}</Text>
                </View>
              )}
              <CircularProgress progress={progress} isRunning={running} />
              <View style={styles.timerCenter}>
                <Text
                  style={[styles.timerText, isComplete && styles.timerComplete]}
                >
                  {formatTime(remaining)}
                </Text>
                <Text style={styles.durationLabel}>
                  of{" "}
                  {(duration / 60) % 1 === 0
                    ? Math.floor(duration / 60)
                    : (duration / 60).toFixed(1)}{" "}
                  min
                </Text>
              </View>
            </View>

            {/* Bottom section - input and controls */}
            <View>
              <View style={styles.presetsSection}>
                {showCustom ? (
                  <View style={styles.customRow}>
                    <TextInput
                      placeholder="Minutes"
                      placeholderTextColor="#52525b"
                      value={customMinutes}
                      onChangeText={setCustomMinutes}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={saveCustomDuration}
                      blurOnSubmit
                      style={styles.customInput}
                      autoFocus
                    />
                    <Pressable
                      style={styles.customButton}
                      onPress={saveCustomDuration}
                    >
                      <Text style={styles.customButtonText}>Set</Text>
                    </Pressable>
                    <Pressable
                      style={styles.customCancel}
                      onPress={() => {
                        Keyboard.dismiss();
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    paddingHorizontal: 24,
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  progressContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
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
