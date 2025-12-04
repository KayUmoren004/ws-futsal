import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTournament } from "@/state/TournamentProvider";

export default function AddPlayersModal() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { state, currentNight, addPlayer, addExistingPlayers } = useTournament();

  const [searchValue, setSearchValue] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
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
        isAssigned:
          assignedPlayerIds.has(p.id) && !currentTeamPlayerIds.has(p.id),
        isInCurrentTeam: currentTeamPlayerIds.has(p.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
    if (teamId && selectedIds.size > 0) {
      addExistingPlayers(teamId, Array.from(selectedIds));
      router.back();
    }
  };

  const handleAddNewPlayer = () => {
    if (newPlayerName.trim() && teamId) {
      addPlayer(teamId, newPlayerName);
      setNewPlayerName("");
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

  const selectedCount = selectedIds.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.colorDot, { backgroundColor: team.color }]} />
          <Text style={styles.title}>Add to {team.name}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color="#71717a" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <Ionicons
            name="search"
            size={18}
            color="#52525b"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players..."
            placeholderTextColor="#52525b"
            value={searchValue}
            onChangeText={setSearchValue}
          />
        </View>
      </View>

      {/* Add new player */}
      <View style={styles.addNewSection}>
        <Text style={styles.label}>Create New Player</Text>
        <View style={styles.addNewRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Player name"
            placeholderTextColor="#52525b"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={handleAddNewPlayer}
          />
          <Pressable style={styles.addButton} onPress={handleAddNewPlayer}>
            <Ionicons name="add" size={20} color="#09090b" />
          </Pressable>
        </View>
      </View>

      {/* Player list */}
      <View style={styles.listSection}>
        <Text style={styles.label}>Available Players</Text>
        <FlatList
          data={availablePlayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            const isDisabled = item.isAssigned || item.isInCurrentTeam;

            return (
              <Pressable
                style={[styles.playerRow, isDisabled && styles.playerRowDisabled]}
                onPress={() => !isDisabled && handleTogglePlayer(item.id)}
                disabled={isDisabled}
              >
                <View style={styles.playerLeft}>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxActive,
                      isDisabled && styles.checkboxDisabled,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#09090b" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.playerName,
                      isDisabled && styles.playerNameDisabled,
                    ]}
                  >
                    {item.name}
                  </Text>
                </View>
                {item.isInCurrentTeam && (
                  <Text style={styles.statusInTeam}>In team</Text>
                )}
                {item.isAssigned && !item.isInCurrentTeam && (
                  <Text style={styles.statusAssigned}>Assigned</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchValue ? "No players found" : "No players in library"}
            </Text>
          }
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            selectedCount === 0 && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={selectedCount === 0}
        >
          <Text style={styles.confirmButtonText}>
            Add {selectedCount > 0 ? selectedCount : ""} Player
            {selectedCount !== 1 ? "s" : ""}
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
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: "#fafafa",
    fontSize: 16,
  },
  addNewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  addNewRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    height: 48,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fafafa",
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 100,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  playerRowDisabled: {
    opacity: 0.5,
  },
  playerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#3f3f46",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkboxDisabled: {
    borderColor: "#27272a",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fafafa",
  },
  playerNameDisabled: {
    color: "#52525b",
  },
  statusInTeam: {
    fontSize: 12,
    fontWeight: "500",
    color: "#22c55e",
  },
  statusAssigned: {
    fontSize: 12,
    fontWeight: "500",
    color: "#f59e0b",
  },
  emptyText: {
    color: "#52525b",
    fontSize: 14,
    paddingVertical: 20,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "#09090b",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  confirmButton: {
    height: 54,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#27272a",
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fafafa",
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
