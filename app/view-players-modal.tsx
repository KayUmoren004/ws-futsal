import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTournament } from "@/state/TournamentProvider";

export default function ViewPlayersModal() {
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = Array.isArray(params.teamId)
    ? params.teamId[0]
    : params.teamId;
  const { currentNight, transferPlayer } = useTournament();

  const team = currentNight?.teams.find((t) => t.id === teamId);
  const otherTeams = currentNight?.teams.filter((t) => t.id !== teamId) ?? [];

  const [transferringPlayer, setTransferringPlayer] = useState<string | null>(
    null
  );

  const handleTransferTo = (toTeamId: string) => {
    if (transferringPlayer && teamId) {
      transferPlayer(transferringPlayer, teamId, toTeamId);
      setTransferringPlayer(null);
    }
  };

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Team not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Transfer destination selection view
  if (transferringPlayer) {
    const player = team.players.find((p) => p.id === transferringPlayer);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Transfer {player?.name}</Text>
          <Pressable onPress={() => setTransferringPlayer(null)} hitSlop={12}>
            <Ionicons name="close" size={24} color="#71717a" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Select Destination</Text>

          {otherTeams.length === 0 ? (
            <Text style={styles.emptyText}>
              Add another team to transfer players
            </Text>
          ) : (
            <FlatList
              data={otherTeams}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.teamRow}
                  onPress={() => handleTransferTo(item.id)}
                >
                  <View style={styles.teamLeft}>
                    <View
                      style={[styles.colorDot, { backgroundColor: item.color }]}
                    />
                    <Text style={styles.teamName}>{item.name}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#52525b" />
                </Pressable>
              )}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => setTransferringPlayer(null)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Main players list view
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.colorDot, { backgroundColor: team.color }]} />
          <Text style={styles.title}>{team.name}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color="#71717a" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Players</Text>
          <Text style={styles.countBadge}>{team.players.length}</Text>
        </View>

        {team.players.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#27272a" />
            <Text style={styles.emptyText}>No players yet</Text>
            <Pressable
              style={styles.addPlayersButton}
              onPress={() => {
                router.replace({
                  pathname: "/add-players-modal",
                  params: { teamId },
                });
              }}
            >
              <Ionicons name="add" size={18} color="#fafafa" />
              <Text style={styles.addPlayersButtonText}>Add Players</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={[...team.players].sort((a, b) =>
              a.name.localeCompare(b.name)
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={styles.playerRow}
                onPress={() => setTransferringPlayer(item.id)}
              >
                <Text style={styles.playerName}>{item.name}</Text>
                <View style={styles.transferHint}>
                  <Text style={styles.transferHintText}>Transfer</Text>
                  <Ionicons name="arrow-forward" size={14} color="#52525b" />
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      {/* Footer action */}
      {team.players.length > 0 && (
        <View style={styles.footer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              router.replace({
                pathname: "/add-players-modal",
                params: { teamId },
              });
            }}
          >
            <Ionicons name="add" size={20} color="#09090b" />
            <Text style={styles.primaryButtonText}>Add More Players</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fafafa",
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 100,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fafafa",
  },
  transferHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transferHintText: {
    fontSize: 14,
    color: "#52525b",
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  teamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fafafa",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "#52525b",
  },
  addPlayersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    marginTop: 8,
  },
  addPlayersButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fafafa",
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#09090b",
  },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#71717a",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#71717a",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3b82f6",
  },
});
