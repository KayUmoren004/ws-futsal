import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { exportNightsToCsv } from "@/lib/export";
import { calculateTable, stageLabel } from "@/lib/tournament";
import { useTournament } from "@/state/TournamentProvider";
import { Match, MatchStage, Team } from "@/types/tournament";

const PALETTE = [
  "#2563EB",
  "#22C55E",
  "#FACC15",
  "#EC4899",
  "#F97316",
  "#EF4444",
];

const stageOrder: MatchStage[] = [
  "roundRobin",
  "qualification",
  "semiFinal1",
  "semiFinal2",
  "consolation",
  "final",
];

type TransferState = { playerId: string; fromTeamId: string } | null;

const chipStyle = (color: string) => ({
  backgroundColor: color,
  width: 18,
  height: 18,
  borderRadius: 12,
  marginRight: 8,
});

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const TeamCard = ({
  team,
  onRename,
  onColorChange,
  usedColors,
  expanded,
  toggle,
}: {
  team: Team;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  usedColors: Set<string>;
  expanded: boolean;
  toggle: () => void;
}) => {
  const [draftName, setDraftName] = useState(team.name);

  return (
    <View style={styles.teamCard}>
      <Pressable style={styles.teamHeaderRow} onPress={toggle}>
        <View style={styles.teamHeaderLeft}>
          <View style={[chipStyle(team.color)]} />
          <Text style={styles.teamLabel} numberOfLines={1}>
            {team.name || "Team name"}
          </Text>
        </View>
        <View style={styles.teamHeaderRight}>
          <Text style={styles.teamMeta}>{team.players.length} players</Text>
          <IconSymbol
            name={expanded ? "chevron.up" : "chevron.down"}
            size={18}
            color="#e2e8f0"
          />
        </View>
      </Pressable>
      {expanded && (
        <View style={{ gap: 10 }}>
          <TextInput
            style={[styles.teamName, styles.input]}
            value={draftName}
            onChangeText={setDraftName}
            onBlur={() => onRename(draftName)}
            placeholder="Team name"
            placeholderTextColor="#475569"
          />
          <View style={styles.colorWrap}>
            {PALETTE.map((color) => {
              const takenByOther =
                usedColors.has(color) && color !== team.color;
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color, opacity: takenByOther ? 0.3 : 1 },
                    team.color === color && styles.colorSwatchActive,
                  ]}
                  disabled={takenByOther}
                  onPress={() => onColorChange(color)}
                />
              );
            })}
          </View>
          {/* View Players and Add Players buttons */}
          <View style={styles.row}>
            <Pressable
              style={[
                styles.smallButton,
                styles.flex,
                { backgroundColor: "#334155" },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/view-players-modal",
                  params: { teamId: team.id },
                })
              }
            >
              <Text style={[styles.smallButtonText, { color: "#e2e8f0" }]}>
                View Players ({team.players.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.smallButton, styles.flex]}
              onPress={() =>
                router.push({
                  pathname: "/add-players-modal",
                  params: { teamId: team.id },
                })
              }
            >
              <Text style={styles.smallButtonText}>Add Players</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const MatchRow = ({
  match,
  homeTeam,
  awayTeam,
  onSave,
  attachToTimer,
  isAttached,
  onResolveTie,
  onDurationChange,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  onSave: (home: number | undefined, away: number | undefined) => void;
  attachToTimer: () => void;
  isAttached: boolean;
  onResolveTie: (
    method: "extraTime" | "penalties",
    home: number,
    away: number
  ) => void;
  onDurationChange: (seconds: number) => void;
}) => {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const [etHome, setEtHome] = useState(match.extraTimeHome?.toString() ?? "");
  const [etAway, setEtAway] = useState(match.extraTimeAway?.toString() ?? "");
  const [penHome, setPenHome] = useState(match.penHome?.toString() ?? "");
  const [penAway, setPenAway] = useState(match.penAway?.toString() ?? "");
  const [duration, setDuration] = useState(
    match.durationSeconds
      ? Math.round(match.durationSeconds / 60).toString()
      : ""
  );

  useEffect(() => {
    setHome(match.homeScore?.toString() ?? "");
    setAway(match.awayScore?.toString() ?? "");
    setEtHome(match.extraTimeHome?.toString() ?? "");
    setEtAway(match.extraTimeAway?.toString() ?? "");
    setPenHome(match.penHome?.toString() ?? "");
    setPenAway(match.penAway?.toString() ?? "");
    setDuration(
      match.durationSeconds
        ? Math.round(match.durationSeconds / 60).toString()
        : ""
    );
  }, [
    match.homeScore,
    match.awayScore,
    match.extraTimeHome,
    match.extraTimeAway,
    match.penHome,
    match.penAway,
    match.durationSeconds,
  ]);

  const isKnockout = match.stage !== "roundRobin";
  const scoresFilled = home !== "" && away !== "";
  const isTied = scoresFilled && Number(home) === Number(away);

  const handleSaveDuration = () => {
    const minutes = Number(duration);
    if (!minutes || Number.isNaN(minutes)) return;
    onDurationChange(minutes * 60);
  };

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchTeams}>
        <View style={styles.matchTeam}>
          <View style={chipStyle(homeTeam?.color ?? "#475569")} />
          <Text style={styles.teamLabel}>{homeTeam?.name ?? "TBD"}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.matchTeam}>
          <View style={chipStyle(awayTeam?.color ?? "#475569")} />
          <Text style={styles.teamLabel}>{awayTeam?.name ?? "TBD"}</Text>
        </View>
      </View>
      <View style={styles.matchInputs}>
        <TextInput
          value={home}
          onChangeText={setHome}
          keyboardType="numeric"
          placeholder="-"
          placeholderTextColor="#64748b"
          style={[styles.scoreInput, styles.flex]}
        />
        <TextInput
          value={away}
          onChangeText={setAway}
          keyboardType="numeric"
          placeholder="-"
          placeholderTextColor="#64748b"
          style={[styles.scoreInput, styles.flex]}
        />
        <Pressable
          style={styles.saveButton}
          onPress={() => {
            const homeScore = home === "" ? undefined : Number(home);
            const awayScore = away === "" ? undefined : Number(away);
            onSave(homeScore, awayScore);
          }}
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      {isKnockout && scoresFilled && isTied && (
        <View style={styles.tieBox}>
          <Text style={styles.subtle}>
            Resolve tie (2 minute extra time, then penalties)
          </Text>
          <View style={styles.row}>
            <TextInput
              value={etHome}
              onChangeText={setEtHome}
              keyboardType="numeric"
              placeholder="ET home"
              placeholderTextColor="#475569"
              style={[styles.scoreInput, styles.flex]}
            />
            <TextInput
              value={etAway}
              onChangeText={setEtAway}
              keyboardType="numeric"
              placeholder="ET away"
              placeholderTextColor="#475569"
              style={[styles.scoreInput, styles.flex]}
            />
            <Pressable
              style={styles.smallButton}
              onPress={() =>
                onResolveTie("extraTime", Number(etHome), Number(etAway))
              }
            >
              <Text style={styles.smallButtonText}>Save ET</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <TextInput
              value={penHome}
              onChangeText={setPenHome}
              keyboardType="numeric"
              placeholder="Pens home"
              placeholderTextColor="#475569"
              style={[styles.scoreInput, styles.flex]}
            />
            <TextInput
              value={penAway}
              onChangeText={setPenAway}
              keyboardType="numeric"
              placeholder="Pens away"
              placeholderTextColor="#475569"
              style={[styles.scoreInput, styles.flex]}
            />
            <Pressable
              style={[styles.smallButton, { backgroundColor: "#f59e0b" }]}
              onPress={() =>
                onResolveTie("penalties", Number(penHome), Number(penAway))
              }
            >
              <Text style={styles.smallButtonText}>Pens</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.durationRow}>
        <Text style={styles.subtle}>Duration (mins)</Text>
        <View style={styles.row}>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="6 / 8 / custom"
            placeholderTextColor="#475569"
            style={[styles.scoreInput, styles.flex]}
          />
          <Pressable style={styles.smallButton} onPress={handleSaveDuration}>
            <Text style={styles.smallButtonText}>Set</Text>
          </Pressable>
        </View>
      </View>

      <TouchableOpacity
        style={styles.timerTag}
        onPress={attachToTimer}
        hitSlop={12}
      >
        <Text
          style={[styles.timerTagText, isAttached && styles.timerTagTextActive]}
        >
          {isAttached ? "Timing" : "Tag to timer"}
        </Text>
      </TouchableOpacity>
      {match.resolvedBy && (
        <Text style={styles.subtle}>Resolved by {match.resolvedBy}</Text>
      )}
    </View>
  );
};

const Bracket = ({ matches, teams }: { matches: Match[]; teams: Team[] }) => {
  const findTeam = (id?: string) => teams.find((t) => t.id === id);
  const semi1 = matches.find((m) => m.stage === "semiFinal1");
  const semi2 = matches.find((m) => m.stage === "semiFinal2");
  const consolation = matches.find((m) => m.stage === "consolation");
  const finalMatch = matches.find((m) => m.stage === "final");
  const renderSlot = (label: string, match?: Match) => {
    if (!match) return null;
    const home = findTeam(match.homeId);
    const away = findTeam(match.awayId);
    return (
      <View style={styles.bracketCard} key={label}>
        <Text style={styles.bracketTitle}>{label}</Text>
        <Text style={styles.bracketLine}>
          <Text style={styles.bold}>{home?.name ?? "TBD"}</Text> (
          {match.homeScore ?? "-"})
        </Text>
        <Text style={styles.bracketLine}>
          <Text style={styles.bold}>{away?.name ?? "TBD"}</Text> (
          {match.awayScore ?? "-"})
        </Text>
      </View>
    );
  };
  return (
    <View style={styles.bracketGrid}>
      <View style={styles.bracketColumn}>
        {renderSlot("Semi 1", semi1)}
        {renderSlot("Semi 2", semi2)}
      </View>
      <View style={styles.bracketColumn}>
        {renderSlot("Consolation", consolation)}
      </View>
      <View style={styles.bracketColumn}>
        {renderSlot("Final", finalMatch)}
      </View>
    </View>
  );
};

const TransferModal = ({
  visible,
  onClose,
  teams,
  transferState,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  teams: Team[];
  transferState: TransferState;
  onSelect: (teamId: string) => void;
}) => {
  if (!transferState) return null;
  const from = teams.find((t) => t.id === transferState.fromTeamId);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Transfer from {from?.name}</Text>
          <FlatList
            data={teams.filter((t) => t.id !== transferState.fromTeamId)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.transferRow}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                hitSlop={12}
              >
                <View style={chipStyle(item.color)} />
                <Text style={styles.teamLabel}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Add another team to transfer.</Text>
            }
          />
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default function GamesScreen() {
  const {
    state,
    currentNight,
    addTeam,
    updateTeam,
    transferPlayer,
    updateMatchScore,
    resolveTie,
    setMatchDuration,
    resetNight,
    renameNight,
    attachMatchToTimer,
    setCurrentNight,
    startNight,
  } = useTournament();
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(PALETTE[0]);
  const [transferState, setTransferState] = useState<TransferState>(null);
  const [nightSheetVisible, setNightSheetVisible] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const loading = state.loading || !currentNight;

  const usedColors = useMemo(
    () => new Set(currentNight?.teams.map((t) => t.color) ?? []),
    [currentNight?.teams]
  );

  useEffect(() => {
    const available = PALETTE.find((color) => !usedColors.has(color));
    if (available) setNewTeamColor(available);
  }, [usedColors]);

  const table = useMemo(
    () =>
      currentNight
        ? calculateTable(currentNight.teams, currentNight.matches)
        : [],
    [currentNight]
  );

  const matchesByStage = useMemo(() => {
    if (!currentNight) return [];
    return stageOrder
      .map((stage) => ({
        stage,
        matches: currentNight.matches.filter((m) => m.stage === stage),
      }))
      .filter((item) => item.matches.length > 0);
  }, [currentNight]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    addTeam({ name: newTeamName.trim(), color: newTeamColor });
    setNewTeamName("");
  };

  const findTeam = (id?: string) =>
    currentNight?.teams.find((t) => t.id === id);
  const needQualification =
    currentNight.teams.length >= 3 && currentNight.teams.length % 2 === 1;
  const bottomTwo = needQualification
    ? table.slice(-2).map((r) => r.teamId)
    : [];

  const handleExport = async () => {
    try {
      await exportNightsToCsv(state.nights);
    } catch (err) {
      console.warn("Export failed", err);
    }
  };

  const useDateTitle = () => renameNight(new Date().toLocaleDateString());

  const toggleTeam = (id: string, nextState?: boolean) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      const shouldExpand = nextState ?? !next.has(id);
      if (shouldExpand) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedTeams(new Set(currentNight.teams.map((t) => t.id)));
  const collapseAll = () => setExpandedTeams(new Set());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Tonight">
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", alignItems: "center" },
            ]}
          >
            <Pressable
              style={styles.selectButton}
              onPress={() => setNightSheetVisible(true)}
            >
              <Text style={styles.selectText}>{currentNight.title}</Text>
              <IconSymbol
                name="chevron.up.chevron.down"
                color="#e2e8f0"
                size={18}
              />
            </Pressable>
            <Pressable
              style={[styles.smallButton, { marginLeft: 8 }]}
              onPress={() => startNight(`Night ${state.nights.length + 1}`)}
            >
              <Text style={styles.smallButtonText}>New night</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.titleInput, styles.input, styles.flex]}
              value={currentNight.title}
              onChangeText={renameNight}
              placeholder="Game night name"
              placeholderTextColor="#475569"
            />
            <Pressable
              style={[styles.smallButton, { marginLeft: 8 }]}
              onPress={useDateTitle}
            >
              <Text style={styles.smallButtonText}>Use Date</Text>
            </Pressable>
          </View>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={styles.subtle}>
              {new Date(currentNight.createdAt).toLocaleString()} ·{" "}
              {currentNight.teams.length} teams
            </Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.iconButton, styles.iconButtonDestructive]}
                onPress={resetNight}
                hitSlop={12}
              >
                <IconSymbol name="arrow.clockwise" size={18} color="#ef4444" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={handleExport}
                hitSlop={12}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={18}
                  color={Colors.light.tint}
                />
              </Pressable>
            </View>
          </View>
        </Section>

        <Section title="Teams & Players">
          <Text style={styles.subtle}>
            Colors are unique per night. Change a team color to free it up for
            others.
          </Text>
          <View style={{ gap: 10 }}>
            <TextInput
              placeholder="Team name"
              placeholderTextColor="#475569"
              value={newTeamName}
              onChangeText={setNewTeamName}
              style={styles.input}
            />
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", alignItems: "center" },
              ]}
            >
              <View style={[styles.colorWrap, { flex: 1 }]}>
                {PALETTE.map((color) => {
                  const taken = usedColors.has(color);
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color, opacity: taken ? 0.3 : 1 },
                        newTeamColor === color && styles.colorSwatchActive,
                      ]}
                      hitSlop={10}
                      disabled={taken}
                      onPress={() => setNewTeamColor(color)}
                    />
                  );
                })}
              </View>
              <Pressable
                style={[styles.iconButton, { marginLeft: 8 }]}
                onPress={handleAddTeam}
              >
                <IconSymbol
                  name="plus.circle.fill"
                  size={28}
                  color={Colors.light.tint}
                />
              </Pressable>
            </View>
            <View style={[styles.row, { justifyContent: "flex-end", gap: 8 }]}>
              <Pressable
                style={styles.iconButton}
                onPress={expandAll}
                hitSlop={12}
              >
                <IconSymbol
                  name="chevron.down"
                  size={18}
                  color={Colors.light.tint}
                />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={collapseAll}
                hitSlop={12}
              >
                <IconSymbol
                  name="chevron.up"
                  size={18}
                  color={Colors.light.tint}
                />
              </Pressable>
            </View>
          </View>
          {currentNight.teams.length === 0 ? (
            <Text style={styles.empty}>
              Add between 2–6 teams to generate fixtures.
            </Text>
          ) : (
            currentNight.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onRename={(name) => updateTeam(team.id, { name })}
                onColorChange={(color) => updateTeam(team.id, { color })}
                usedColors={usedColors}
                expanded={expandedTeams.has(team.id)}
                toggle={() => toggleTeam(team.id)}
              />
            ))
          )}
        </Section>

        <Section title="Table">
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.wide]}>Team</Text>
            <Text style={styles.tableCell}>P</Text>
            <Text style={styles.tableCell}>Pts</Text>
            <Text style={styles.tableCell}>GD</Text>
            <Text style={styles.tableCell}>GF</Text>
            <Text style={styles.tableCell}>GA</Text>
          </View>
          {table.map((row, index) => {
            const inSemiWindow =
              currentNight.teams.length >= 4 ? index < 4 : index === 0;
            const isBottomQual = bottomTwo.includes(row.teamId);
            return (
              <View
                key={row.teamId}
                style={[
                  styles.tableRow,
                  { backgroundColor: `${row.color}33` },
                  inSemiWindow && styles.tableSemi,
                  isBottomQual && styles.tableQual,
                ]}
              >
                <View style={[styles.tableCell, styles.wide, styles.row]}>
                  <View style={chipStyle(row.color)} />
                  <Text style={styles.teamLabel}>{row.name}</Text>
                </View>
                <Text style={styles.tableCell}>{row.played}</Text>
                <Text style={styles.tableCell}>{row.points}</Text>
                <Text style={styles.tableCell}>{row.goalDifference}</Text>
                <Text style={styles.tableCell}>{row.goalsFor}</Text>
                <Text style={styles.tableCell}>{row.goalsAgainst}</Text>
              </View>
            );
          })}
        </Section>

        <Section title="Matches">
          {matchesByStage.length === 0 && (
            <Text style={styles.empty}>
              Fixtures will appear once you add at least 2 teams.
            </Text>
          )}
          {matchesByStage.map(({ stage, matches }) => (
            <View key={stage} style={styles.stageBlock}>
              <Text style={styles.stageTitle}>{stageLabel[stage]}</Text>
              {matches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  homeTeam={findTeam(match.homeId)}
                  awayTeam={findTeam(match.awayId)}
                  isAttached={currentNight.currentMatchId === match.id}
                  attachToTimer={() => attachMatchToTimer(match.id)}
                  onSave={(h, a) => updateMatchScore(match.id, h, a)}
                  onResolveTie={(method, h, a) =>
                    resolveTie(match.id, method, h, a)
                  }
                  onDurationChange={(seconds) =>
                    setMatchDuration(match.id, seconds)
                  }
                />
              ))}
            </View>
          ))}
        </Section>

        <Section title="Bracket">
          <Bracket matches={currentNight.matches} teams={currentNight.teams} />
        </Section>
      </ScrollView>

      <TransferModal
        visible={!!transferState}
        onClose={() => setTransferState(null)}
        teams={currentNight.teams}
        transferState={transferState}
        onSelect={(teamId) => {
          if (transferState) {
            transferPlayer(
              transferState.playerId,
              transferState.fromTeamId,
              teamId
            );
          }
        }}
      />

      <Modal
        visible={nightSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNightSheetVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setNightSheetVisible(false)}
          />
          <View style={styles.sheet}>
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", alignItems: "center" },
              ]}
            >
              <Text style={styles.sheetTitle}>Select night</Text>
              <Pressable
                onPress={() => setNightSheetVisible(false)}
                hitSlop={12}
              >
                <IconSymbol
                  name="xmark.circle.fill"
                  size={24}
                  color="#e2e8f0"
                />
              </Pressable>
            </View>
            <Picker
              selectedValue={currentNight.id}
              onValueChange={(val) => {
                setCurrentNight(String(val));
                setNightSheetVisible(false);
              }}
              dropdownIconColor="#e2e8f0"
              style={styles.picker}
              mode="dropdown"
            >
              {state.nights.map((night) => (
                <Picker.Item
                  key={night.id}
                  label={night.title}
                  value={night.id}
                  color="#e2e8f0"
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseBg = "hsl(0 0% 3.9%)";
const cardBg = "hsl(0 0% 3.9%)";
const borderCol = "hsl(0 0% 14.9%)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: baseBg,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  section: {
    backgroundColor: cardBg,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: borderCol,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e2e8f0",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "800",
    paddingVertical: 6,
    color: "#e2e8f0",
  },
  subtle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  linkText: {
    color: Colors.light.tint,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: cardBg,
    color: "#e2e8f0",
    minHeight: 44,
  },
  flex: { flex: 1 },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 18,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: baseBg,
  },
  colorSwatchActive: {
    borderColor: "#e2e8f0",
  },
  smallButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  smallButtonText: {
    color: "#0b1220",
    fontWeight: "800",
  },
  teamCard: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
    backgroundColor: cardBg,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#e2e8f0",
  },
  playerList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerTag: {
    backgroundColor: borderCol,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    minHeight: 38,
  },
  playerName: { fontWeight: "700", color: "#e2e8f0" },
  transferHint: { color: "#94a3b8" },
  colorWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    marginBottom: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: borderCol,
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: borderCol,
  },
  tableCell: { width: 44, fontVariant: ["tabular-nums"], color: "#e2e8f0" },
  wide: { flex: 1, width: "auto" },
  teamLabel: {
    fontWeight: "700",
    color: "#e2e8f0",
    maxWidth: "70%",
  },
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  teamHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  teamHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  teamMeta: { color: "#94a3b8", fontSize: 12 },
  tableSemi: { backgroundColor: "#0b172e" },
  tableQual: { backgroundColor: "#221217" },
  empty: { color: "#94a3b8", paddingVertical: 6 },
  stageBlock: { marginBottom: 10, gap: 6 },
  stageTitle: { fontWeight: "800", fontSize: 16, color: "#e2e8f0" },
  matchRow: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    backgroundColor: cardBg,
  },
  matchTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchTeam: { flexDirection: "row", alignItems: "center", gap: 8 },
  vs: { fontWeight: "800", color: "#e2e8f0" },
  matchInputs: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreInput: {
    borderWidth: 1,
    borderColor: borderCol,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    textAlign: "center",
    backgroundColor: baseBg,
    color: "#e2e8f0",
    minHeight: 44,
  },
  saveButton: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  saveText: { color: "#0b1220", fontWeight: "800" },
  tieBox: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: borderCol,
  },
  durationRow: {
    gap: 4,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: borderCol,
  },
  selectText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  iconButton: {
    padding: 8,
  },
  iconButtonDestructive: {
    opacity: 0.8,
  },
  picker: {
    color: "#e2e8f0",
  },
  timerTag: { alignSelf: "flex-start" },
  timerTagText: { color: "#94a3b8", fontWeight: "700" },
  timerTagTextActive: { color: Colors.light.tint, fontWeight: "800" },
  bracketGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  bracketColumn: { flex: 1, gap: 8 },
  bracketCard: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 10,
    padding: 10,
    backgroundColor: cardBg,
  },
  bracketTitle: { fontWeight: "800", marginBottom: 4, color: "#e2e8f0" },
  bracketLine: { color: "#e2e8f0" },
  bold: { fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: cardBg,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: borderCol,
  },
  modalTitle: { fontWeight: "800", fontSize: 16, color: "#e2e8f0" },
  transferRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  modalClose: { alignSelf: "flex-end" },
  modalCloseText: { color: Colors.light.tint, fontWeight: "800" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: cardBg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: borderCol,
  },
  sheetTitle: { color: "#e2e8f0", fontWeight: "800", fontSize: 16 },
  existingModal: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: borderCol,
    gap: 10,
  },
  existingList: { maxHeight: 260 },
  existingRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  existingInput: {
    borderWidth: 1,
    borderColor: borderCol,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: baseBg,
    color: "#e2e8f0",
  },
});
