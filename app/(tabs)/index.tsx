import { exportNightsToCsv } from "@/lib/export";
import { calculateTable, stageLabel } from "@/lib/tournament";
import { useTournament } from "@/state/TournamentProvider";
import { Match, MatchStage, Team } from "@/types/tournament";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#f97316",
  "#ef4444",
];

const stageOrder: MatchStage[] = [
  "roundRobin",
  "qualification",
  "semiFinal1",
  "semiFinal2",
  "consolation",
  "final",
];

// Collapsible Section Component
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setIsOpen(!isOpen)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#52525b"
        />
      </Pressable>
      {isOpen && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

// Team Row Component
const TeamRow = ({ team, onPress }: { team: Team; onPress: () => void }) => (
  <Pressable style={styles.listRow} onPress={onPress}>
    <View style={styles.rowLeft}>
      <View style={[styles.colorDot, { backgroundColor: team.color }]} />
      <View>
        <Text style={styles.rowTitle}>{team.name || "Unnamed Team"}</Text>
        <Text style={styles.rowSubtitle}>{team.players.length} players</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#52525b" />
  </Pressable>
);

// Team Edit Sheet
const TeamEditSheet = ({
  team,
  visible,
  onClose,
  onRename,
  onColorChange,
  onRemove,
  usedColors,
}: {
  team: Team | null;
  visible: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
  usedColors: Set<string>;
}) => {
  const [draftName, setDraftName] = useState(team?.name ?? "");

  useEffect(() => {
    if (team) setDraftName(team.name);
  }, [team]);

  if (!team) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Team</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#a1a1aa" />
            </Pressable>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              onBlur={() => onRename(draftName)}
              placeholder="Enter team name"
              placeholderTextColor="#52525b"
            />
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {PALETTE.map((color) => {
                const taken = usedColors.has(color) && color !== team.color;
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color, opacity: taken ? 0.3 : 1 },
                      team.color === color && styles.colorOptionActive,
                    ]}
                    disabled={taken}
                    onPress={() => onColorChange(color)}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              style={styles.sheetButton}
              onPress={() => {
                onClose();
                router.push({
                  pathname: "/view-players-modal",
                  params: { teamId: team.id },
                });
              }}
            >
              <Text style={styles.sheetButtonText}>View Players</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetButton, styles.sheetButtonPrimary]}
              onPress={() => {
                onClose();
                router.push({
                  pathname: "/add-players-modal",
                  params: { teamId: team.id },
                });
              }}
            >
              <Text style={styles.sheetButtonTextPrimary}>Add Players</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.sheetButtonDanger}
            onPress={() => {
              Alert.alert(
                "Remove Team?",
                `Are you sure you want to remove "${
                  team.name || "this team"
                }"? This will also remove all matches involving this team.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                      onRemove();
                      onClose();
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={styles.sheetButtonDangerText}>Remove Team</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Match Row Component
const MatchRow = ({
  match,
  homeTeam,
  awayTeam,
  onSave,
  isAttached,
  attachToTimer,
  onResolveTie,
  onDurationChange,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  onSave: (home: number | undefined, away: number | undefined) => void;
  isAttached: boolean;
  attachToTimer: () => void;
  onResolveTie: (
    method: "extraTime" | "penalties",
    home: number,
    away: number
  ) => void;
  onDurationChange: (seconds: number) => void;
}) => {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");

  useEffect(() => {
    setHome(match.homeScore?.toString() ?? "");
    setAway(match.awayScore?.toString() ?? "");
  }, [match.homeScore, match.awayScore]);

  const isKnockout = match.stage !== "roundRobin";
  const scoresFilled = home !== "" && away !== "";
  const isTied = scoresFilled && Number(home) === Number(away);

  return (
    <View style={styles.matchItem}>
      {/* Team names row */}
      <View style={styles.matchTeams}>
        <View style={styles.matchTeam}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: homeTeam?.color ?? "#52525b" },
            ]}
          />
          <Text style={styles.matchTeamName} numberOfLines={1}>
            {homeTeam?.name ?? "TBD"}
          </Text>
        </View>
        <Text style={styles.vsText}>vs</Text>
        <View style={[styles.matchTeam, { justifyContent: "flex-end" }]}>
          <Text
            style={[styles.matchTeamName, { textAlign: "right" }]}
            numberOfLines={1}
          >
            {awayTeam?.name ?? "TBD"}
          </Text>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: awayTeam?.color ?? "#52525b" },
            ]}
          />
        </View>
      </View>

      {/* Score inputs */}
      <View style={styles.scoreInputRow}>
        <TextInput
          value={home}
          onChangeText={setHome}
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit
          placeholder="0"
          placeholderTextColor="#52525b"
          style={styles.scoreInput}
        />
        <Text style={styles.scoreSeparator}>:</Text>
        <TextInput
          value={away}
          onChangeText={setAway}
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit
          placeholder="0"
          placeholderTextColor="#52525b"
          style={styles.scoreInput}
        />
      </View>

      <Pressable
        style={styles.saveScoreButton}
        onPress={() => {
          const homeScore = home === "" ? undefined : Number(home);
          const awayScore = away === "" ? undefined : Number(away);
          onSave(homeScore, awayScore);
        }}
      >
        <Text style={styles.saveScoreText}>Save</Text>
      </Pressable>

      {isKnockout && scoresFilled && isTied && (
        <TieResolver match={match} onResolveTie={onResolveTie} />
      )}

      {/* Actions row */}
      {/* <View style={styles.matchActions}>
        <Pressable
          style={[styles.actionPill, isAttached && styles.actionPillActive]}
          onPress={attachToTimer}
        >
          <Ionicons
            name="timer-outline"
            size={16}
            color={isAttached ? "#3b82f6" : "#71717a"}
          />
          <Text
            style={[
              styles.actionPillText,
              isAttached && styles.actionPillTextActive,
            ]}
          >
            {isAttached ? "Timing" : "Timer"}
          </Text>
        </Pressable>
        <DurationPicker match={match} onDurationChange={onDurationChange} />
      </View> */}
    </View>
  );
};

// Tie Resolver Component
const TieResolver = ({
  match,
  onResolveTie,
}: {
  match: Match;
  onResolveTie: (
    method: "extraTime" | "penalties",
    home: number,
    away: number
  ) => void;
}) => {
  const [etHome, setEtHome] = useState(match.extraTimeHome?.toString() ?? "");
  const [etAway, setEtAway] = useState(match.extraTimeAway?.toString() ?? "");
  const [penHome, setPenHome] = useState(match.penHome?.toString() ?? "");
  const [penAway, setPenAway] = useState(match.penAway?.toString() ?? "");

  return (
    <View style={styles.tieSection}>
      <Text style={styles.tieTitle}>Resolve Tie</Text>
      <View style={styles.tieRow}>
        <Text style={styles.tieLabel}>Extra Time</Text>
        <View style={styles.tieInputs}>
          <TextInput
            value={etHome}
            onChangeText={setEtHome}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            placeholder="0"
            placeholderTextColor="#52525b"
            style={styles.tieInput}
          />
          <Text style={styles.tieSeparator}>:</Text>
          <TextInput
            value={etAway}
            onChangeText={setEtAway}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            placeholder="0"
            placeholderTextColor="#52525b"
            style={styles.tieInput}
          />
          <Pressable
            style={styles.tieButton}
            onPress={() =>
              onResolveTie("extraTime", Number(etHome), Number(etAway))
            }
          >
            <Text style={styles.tieButtonText}>Set</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tieRow}>
        <Text style={styles.tieLabel}>Penalties</Text>
        <View style={styles.tieInputs}>
          <TextInput
            value={penHome}
            onChangeText={setPenHome}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            placeholder="0"
            placeholderTextColor="#52525b"
            style={styles.tieInput}
          />
          <Text style={styles.tieSeparator}>:</Text>
          <TextInput
            value={penAway}
            onChangeText={setPenAway}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit
            placeholder="0"
            placeholderTextColor="#52525b"
            style={styles.tieInput}
          />
          <Pressable
            style={[styles.tieButton, { backgroundColor: "#f59e0b" }]}
            onPress={() =>
              onResolveTie("penalties", Number(penHome), Number(penAway))
            }
          >
            <Text style={styles.tieButtonText}>Set</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// Duration Picker Component
const DurationPicker = ({
  match,
  onDurationChange,
}: {
  match: Match;
  onDurationChange: (seconds: number) => void;
}) => {
  const currentMins = match.durationSeconds
    ? Math.round(match.durationSeconds / 60)
    : 6;

  return (
    <View style={styles.durationPicker}>
      {[6, 8, 10].map((mins) => (
        <Pressable
          key={mins}
          style={[
            styles.durationPill,
            currentMins === mins && styles.durationPillActive,
          ]}
          onPress={() => onDurationChange(mins * 60)}
        >
          <Text
            style={[
              styles.durationPillText,
              currentMins === mins && styles.durationPillTextActive,
            ]}
          >
            {mins}m
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

// Simple Table Row
const TableRow = ({
  row,
  index,
  inSemiWindow,
  isBottomQual,
}: {
  row: ReturnType<typeof calculateTable>[0];
  index: number;
  inSemiWindow: boolean;
  isBottomQual: boolean;
}) => (
  <View
    style={[
      styles.tableRow,
      inSemiWindow && styles.tableRowSemi,
      isBottomQual && styles.tableRowQual,
    ]}
  >
    <Text style={styles.tablePos}>{index + 1}</Text>
    <View style={[styles.colorDot, { backgroundColor: row.color }]} />
    <Text style={[styles.tableCell, styles.tableTeamName]} numberOfLines={1}>
      {row.name}
    </Text>
    <Text style={styles.tableCell}>{row.played}</Text>
    <Text style={[styles.tableCell, styles.tableBold]}>{row.points}</Text>
    <Text style={styles.tableCell}>
      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
    </Text>
  </View>
);

// Bracket Component
const Bracket = ({ matches, teams }: { matches: Match[]; teams: Team[] }) => {
  const findTeam = (id?: string) => teams.find((t) => t.id === id);
  const semi1 = matches.find((m) => m.stage === "semiFinal1");
  const semi2 = matches.find((m) => m.stage === "semiFinal2");
  const consolation = matches.find((m) => m.stage === "consolation");
  const finalMatch = matches.find((m) => m.stage === "final");

  const BracketSlot = ({ label, match }: { label: string; match?: Match }) => {
    if (!match) return null;
    const home = findTeam(match.homeId);
    const away = findTeam(match.awayId);

    // Determine winner: check regular score, then extra time, then penalties
    let homeWins = false;
    let awayWins = false;
    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      if (match.homeScore > match.awayScore) {
        homeWins = true;
      } else if (match.awayScore > match.homeScore) {
        awayWins = true;
      } else {
        // Tied in regular time, check extra time
        if (
          match.extraTimeHome !== undefined &&
          match.extraTimeAway !== undefined
        ) {
          if (match.extraTimeHome > match.extraTimeAway) {
            homeWins = true;
          } else if (match.extraTimeAway > match.extraTimeHome) {
            awayWins = true;
          }
        }
        // Check penalties
        if (
          !homeWins &&
          !awayWins &&
          match.penHome !== undefined &&
          match.penAway !== undefined
        ) {
          if (match.penHome > match.penAway) {
            homeWins = true;
          } else if (match.penAway > match.penHome) {
            awayWins = true;
          }
        }
      }
    }

    const hasResult = homeWins || awayWins;

    return (
      <View style={styles.bracketSlot}>
        <Text style={styles.bracketLabel}>{label}</Text>
        <View
          style={[
            styles.bracketTeam,
            hasResult && !homeWins && styles.bracketTeamLoser,
          ]}
        >
          <View
            style={[
              styles.colorDot,
              { backgroundColor: home?.color ?? "#52525b" },
            ]}
          />
          <Text
            style={[
              styles.bracketTeamName,
              homeWins && styles.bracketTeamWinner,
            ]}
          >
            {home?.name ?? "TBD"}
          </Text>
          <Text
            style={[styles.bracketScore, homeWins && styles.bracketScoreWinner]}
          >
            {match.homeScore ?? "-"}
          </Text>
        </View>
        <View
          style={[
            styles.bracketTeam,
            hasResult && !awayWins && styles.bracketTeamLoser,
          ]}
        >
          <View
            style={[
              styles.colorDot,
              { backgroundColor: away?.color ?? "#52525b" },
            ]}
          />
          <Text
            style={[
              styles.bracketTeamName,
              awayWins && styles.bracketTeamWinner,
            ]}
          >
            {away?.name ?? "TBD"}
          </Text>
          <Text
            style={[styles.bracketScore, awayWins && styles.bracketScoreWinner]}
          >
            {match.awayScore ?? "-"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.bracketContainer}>
      <View style={styles.bracketColumn}>
        <BracketSlot label="Semi 1" match={semi1} />
        <BracketSlot label="Semi 2" match={semi2} />
      </View>
      <View style={styles.bracketColumn}>
        <BracketSlot label="3rd Place" match={consolation} />
        <BracketSlot label="Final" match={finalMatch} />
      </View>
    </View>
  );
};

export default function GamesScreen() {
  const {
    state,
    currentNight,
    addTeam,
    removeTeam,
    updateTeam,
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
  const [nightSheetVisible, setNightSheetVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

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

  const allMatchesFlat = useMemo(() => {
    if (!currentNight) return [];
    return matchesByStage.flatMap(({ stage, matches }) =>
      matches.map((match) => ({ match, stage }))
    );
  }, [matchesByStage, currentNight]);

  useEffect(() => {
    if (currentMatchIndex >= allMatchesFlat.length) {
      setCurrentMatchIndex(0);
    }
  }, [allMatchesFlat.length, currentMatchIndex]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#3b82f6" />
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.nightSelector}
            onPress={() => setNightSheetVisible(true)}
          >
            <Text style={styles.nightTitle}>{currentNight.title}</Text>
            <Ionicons name="chevron-down" size={18} color="#71717a" />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={handleExport}
              hitSlop={12}
            >
              <Ionicons name="share-outline" size={20} color="#71717a" />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                Alert.alert(
                  "Reset Night?",
                  "This will remove all teams and matches for this night. Players will remain in the library.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset",
                      style: "destructive",
                      onPress: resetNight,
                    },
                  ]
                );
              }}
              hitSlop={12}
            >
              <Ionicons name="refresh" size={20} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* Night name edit */}
        <View style={styles.nightMeta}>
          <TextInput
            style={styles.nightInput}
            value={currentNight.title}
            onChangeText={renameNight}
            placeholder="Night name"
            placeholderTextColor="#52525b"
          />
          <Pressable
            style={styles.dateButton}
            onPress={() => renameNight(new Date().toLocaleDateString())}
          >
            <Text style={styles.dateButtonText}>Use Date</Text>
          </Pressable>
        </View>

        {/* Teams Section */}
        <CollapsibleSection
          title="Teams"
          badge={currentNight.teams.length}
          defaultOpen={true}
        >
          {/* Add team row */}
          <View style={styles.addTeamRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Team name"
              placeholderTextColor="#52525b"
              value={newTeamName}
              onChangeText={setNewTeamName}
              onSubmitEditing={handleAddTeam}
            />
            <View style={styles.colorRow}>
              {PALETTE.map((color) => {
                const taken = usedColors.has(color);
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorDotSmall,
                      { backgroundColor: color, opacity: taken ? 0.3 : 1 },
                      newTeamColor === color && styles.colorDotActive,
                    ]}
                    disabled={taken}
                    onPress={() => setNewTeamColor(color)}
                  />
                );
              })}
            </View>
            <Pressable style={styles.addButton} onPress={handleAddTeam}>
              <Ionicons name="add" size={22} color="#09090b" />
            </Pressable>
          </View>

          {/* Team list */}
          {currentNight.teams.length === 0 ? (
            <Text style={styles.emptyText}>Add 2–6 teams to start</Text>
          ) : (
            currentNight.teams.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                onPress={() => setEditingTeam(team)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Table Section */}
        <CollapsibleSection title="Standings" defaultOpen={true}>
          {table.length === 0 ? (
            <Text style={styles.emptyText}>No standings yet</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tablePos}>#</Text>
                <View style={styles.colorDot} />
                <Text style={[styles.tableCell, styles.tableTeamName]}>
                  Team
                </Text>
                <Text style={styles.tableCell}>P</Text>
                <Text style={styles.tableCell}>Pts</Text>
                <Text style={styles.tableCell}>GD</Text>
              </View>
              {table.map((row, index) => {
                const inSemiWindow =
                  currentNight.teams.length >= 4 ? index < 4 : index === 0;
                const isBottomQual = bottomTwo.includes(row.teamId);
                return (
                  <TableRow
                    key={row.teamId}
                    row={row}
                    index={index}
                    inSemiWindow={inSemiWindow}
                    isBottomQual={isBottomQual}
                  />
                );
              })}
            </View>
          )}
        </CollapsibleSection>

        {/* Matches Section */}
        <CollapsibleSection
          title="Matches"
          badge={allMatchesFlat.length}
          defaultOpen={true}
        >
          {/* View toggle */}
          <View style={styles.matchToggle}>
            <Pressable
              style={[
                styles.togglePill,
                showAllMatches && styles.togglePillActive,
              ]}
              onPress={() => setShowAllMatches(true)}
            >
              <Text
                style={[
                  styles.togglePillText,
                  showAllMatches && styles.togglePillTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.togglePill,
                !showAllMatches && styles.togglePillActive,
              ]}
              onPress={() => setShowAllMatches(false)}
            >
              <Text
                style={[
                  styles.togglePillText,
                  !showAllMatches && styles.togglePillTextActive,
                ]}
              >
                One by One
              </Text>
            </Pressable>
          </View>

          {matchesByStage.length === 0 ? (
            <Text style={styles.emptyText}>
              Add at least 2 teams to generate fixtures
            </Text>
          ) : showAllMatches ? (
            matchesByStage.map(({ stage, matches }) => (
              <View key={stage} style={styles.stageBlock}>
                <Text style={styles.stageLabel}>{stageLabel[stage]}</Text>
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
            ))
          ) : (
            allMatchesFlat.length > 0 &&
            allMatchesFlat[currentMatchIndex] && (
              <View style={styles.singleMatchView}>
                <Text style={styles.matchCounter}>
                  {currentMatchIndex + 1} / {allMatchesFlat.length}
                </Text>
                <Text style={styles.stageLabel}>
                  {stageLabel[allMatchesFlat[currentMatchIndex].stage]}
                </Text>
                <MatchRow
                  match={allMatchesFlat[currentMatchIndex].match}
                  homeTeam={findTeam(
                    allMatchesFlat[currentMatchIndex].match.homeId
                  )}
                  awayTeam={findTeam(
                    allMatchesFlat[currentMatchIndex].match.awayId
                  )}
                  isAttached={
                    currentNight.currentMatchId ===
                    allMatchesFlat[currentMatchIndex].match.id
                  }
                  attachToTimer={() =>
                    attachMatchToTimer(
                      allMatchesFlat[currentMatchIndex].match.id
                    )
                  }
                  onSave={(h, a) =>
                    updateMatchScore(
                      allMatchesFlat[currentMatchIndex].match.id,
                      h,
                      a
                    )
                  }
                  onResolveTie={(method, h, a) =>
                    resolveTie(
                      allMatchesFlat[currentMatchIndex].match.id,
                      method,
                      h,
                      a
                    )
                  }
                  onDurationChange={(seconds) =>
                    setMatchDuration(
                      allMatchesFlat[currentMatchIndex].match.id,
                      seconds
                    )
                  }
                />
                <View style={styles.matchNav}>
                  <Pressable
                    style={[
                      styles.navButton,
                      currentMatchIndex === 0 && styles.navButtonDisabled,
                    ]}
                    onPress={() =>
                      setCurrentMatchIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentMatchIndex === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={currentMatchIndex === 0 ? "#3f3f46" : "#fafafa"}
                    />
                    <Text
                      style={[
                        styles.navButtonText,
                        currentMatchIndex === 0 && styles.navButtonTextDisabled,
                      ]}
                    >
                      Prev
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.navButton,
                      currentMatchIndex === allMatchesFlat.length - 1 &&
                        styles.navButtonDisabled,
                    ]}
                    onPress={() =>
                      setCurrentMatchIndex((prev) =>
                        Math.min(allMatchesFlat.length - 1, prev + 1)
                      )
                    }
                    disabled={currentMatchIndex === allMatchesFlat.length - 1}
                  >
                    <Text
                      style={[
                        styles.navButtonText,
                        currentMatchIndex === allMatchesFlat.length - 1 &&
                          styles.navButtonTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={
                        currentMatchIndex === allMatchesFlat.length - 1
                          ? "#3f3f46"
                          : "#fafafa"
                      }
                    />
                  </Pressable>
                </View>
              </View>
            )
          )}
        </CollapsibleSection>

        {/* Bracket Section */}
        <CollapsibleSection title="Bracket" defaultOpen={false}>
          <Bracket matches={currentNight.matches} teams={currentNight.teams} />
        </CollapsibleSection>
      </ScrollView>

      {/* Team Edit Sheet */}
      <TeamEditSheet
        team={editingTeam}
        visible={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        onRename={(name) => {
          if (editingTeam) updateTeam(editingTeam.id, { name });
        }}
        onColorChange={(color) => {
          if (editingTeam) updateTeam(editingTeam.id, { color });
        }}
        onRemove={() => {
          if (editingTeam) removeTeam(editingTeam.id);
        }}
        usedColors={usedColors}
      />

      {/* Night Selector Modal */}
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
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Night</Text>
              <Pressable
                onPress={() => setNightSheetVisible(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </Pressable>
            </View>
            <Picker
              selectedValue={currentNight.id}
              onValueChange={(val) => {
                setCurrentNight(String(val));
                setNightSheetVisible(false);
              }}
              dropdownIconColor="#fafafa"
              style={styles.picker}
              mode="dropdown"
            >
              {state.nights.map((night) => (
                <Picker.Item
                  key={night.id}
                  label={night.title}
                  value={night.id}
                  color="#fafafa"
                />
              ))}
            </Picker>
            <Pressable
              style={styles.newNightButton}
              onPress={() => {
                startNight(`Night ${state.nights.length + 1}`);
                setNightSheetVisible(false);
              }}
            >
              <Ionicons name="add" size={20} color="#09090b" />
              <Text style={styles.newNightButtonText}>New Night</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nightSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nightTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fafafa",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  nightMeta: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  nightInput: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 14,
    color: "#fafafa",
    fontSize: 15,
  },
  dateButton: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    justifyContent: "center",
  },
  dateButtonText: {
    color: "#71717a",
    fontSize: 14,
    fontWeight: "500",
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  sectionContent: {
    gap: 1,
  },

  // List Row
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fafafa",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#52525b",
    marginTop: 1,
  },

  // Color elements
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorDotSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: "#fafafa",
  },
  colorRow: {
    flexDirection: "row",
    gap: 6,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionActive: {
    borderWidth: 2,
    borderColor: "#fafafa",
  },

  // Add team
  addTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Input
  input: {
    height: 44,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 14,
    color: "#fafafa",
    fontSize: 15,
  },

  // Empty
  emptyText: {
    color: "#52525b",
    fontSize: 14,
    paddingVertical: 16,
  },

  // Table
  table: {
    gap: 0,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 8,
  },
  tableRowSemi: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  tableRowQual: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  tablePos: {
    width: 20,
    fontSize: 13,
    color: "#52525b",
    fontVariant: ["tabular-nums"],
  },
  tableCell: {
    width: 32,
    fontSize: 14,
    color: "#a1a1aa",
    fontVariant: ["tabular-nums"],
  },
  tableTeamName: {
    flex: 1,
    width: "auto",
    color: "#fafafa",
    fontWeight: "500",
  },
  tableBold: {
    fontWeight: "600",
    color: "#fafafa",
  },

  // Match toggle
  matchToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  togglePillActive: {
    backgroundColor: "#3b82f6",
  },
  togglePillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#71717a",
  },
  togglePillTextActive: {
    color: "#fafafa",
  },

  // Stage
  stageBlock: {
    marginBottom: 16,
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Match item
  matchItem: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    marginBottom: 8,
    padding: 14,
    gap: 12,
  },
  matchTeams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  matchTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  matchTeamName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fafafa",
    maxWidth: 80,
  },
  vsText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#52525b",
    paddingHorizontal: 8,
  },
  timingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  timingText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3b82f6",
  },

  // Match expanded
  scoreInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
  },
  scoreInput: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    textAlign: "center",
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "600",
  },
  scoreSeparator: {
    fontSize: 18,
    color: "#52525b",
  },
  saveScoreButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: "auto",
    alignItems: "center",
    width: "100%",
  },
  saveScoreText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#09090b",
  },

  // Match actions
  matchActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
  },
  actionPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#71717a",
  },
  actionPillTextActive: {
    color: "#3b82f6",
  },

  // Duration picker
  durationPicker: {
    flexDirection: "row",
    gap: 6,
  },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
  },
  durationPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  durationPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#71717a",
  },
  durationPillTextActive: {
    color: "#3b82f6",
  },

  // Tie section
  tieSection: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  tieTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tieRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tieLabel: {
    fontSize: 14,
    color: "#a1a1aa",
  },
  tieInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tieInput: {
    width: 44,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 6,
    textAlign: "center",
    color: "#fafafa",
    fontSize: 15,
  },
  tieSeparator: {
    color: "#52525b",
  },
  tieButton: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    justifyContent: "center",
  },
  tieButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fafafa",
  },

  // Single match view
  singleMatchView: {
    gap: 12,
  },
  matchCounter: {
    fontSize: 14,
    color: "#52525b",
    textAlign: "center",
  },
  matchNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fafafa",
  },
  navButtonTextDisabled: {
    color: "#3f3f46",
  },

  // Bracket
  bracketContainer: {
    flexDirection: "row",
    gap: 12,
  },
  bracketColumn: {
    flex: 1,
    gap: 10,
  },
  bracketSlot: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  bracketLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bracketTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bracketTeamName: {
    flex: 1,
    fontSize: 13,
    color: "#a1a1aa",
  },
  bracketScore: {
    fontSize: 14,
    fontWeight: "500",
    color: "#a1a1aa",
    fontVariant: ["tabular-nums"],
  },
  bracketTeamLoser: {
    opacity: 0.4,
  },
  bracketTeamWinner: {
    fontWeight: "700",
    color: "#fafafa",
  },
  bracketScoreWinner: {
    fontWeight: "700",
    color: "#fafafa",
  },

  // Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fafafa",
  },
  sheetSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
  },
  sheetButton: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonPrimary: {
    backgroundColor: "#3b82f6",
  },
  sheetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  sheetButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fafafa",
  },
  sheetButtonDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    marginTop: 12,
  },
  sheetButtonDangerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },

  // Picker & Night modal
  picker: {
    color: "#fafafa",
    marginBottom: 16,
  },
  newNightButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
  },
  newNightButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#09090b",
  },
});
