import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';

import { Colors } from '@/constants/theme';
import { calculateTable, stageLabel } from '@/lib/tournament';
import { useTournament } from '@/state/TournamentProvider';
import { Match, MatchStage, Team } from '@/types/tournament';

const COLOR_OPTIONS = ['#F97316', '#2563EB', '#0EA5E9', '#22C55E', '#F43F5E', '#8B5CF6'];

const stageOrder: MatchStage[] = [
  'roundRobin',
  'qualification',
  'semiFinal1',
  'semiFinal2',
  'consolation',
  'final',
];

type TransferState = { playerId: string; fromTeamId: string } | null;

const chipStyle = (color: string) => ({
  backgroundColor: color,
  width: 16,
  height: 16,
  borderRadius: 12,
  marginRight: 8,
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const TeamCard = ({
  team,
  onRename,
  onAddPlayer,
  onTransfer,
}: {
  team: Team;
  onRename: (name: string) => void;
  onAddPlayer: (name: string) => void;
  onTransfer: (playerId: string) => void;
}) => {
  const [draftName, setDraftName] = useState(team.name);
  const [playerName, setPlayerName] = useState('');

  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHeader}>
        <View style={[chipStyle(team.color)]} />
        <TextInput
          style={styles.teamName}
          value={draftName}
          onChangeText={setDraftName}
          onBlur={() => onRename(draftName)}
          placeholder="Team name"
        />
      </View>
      <View style={styles.playerList}>
        {team.players.map((player) => (
          <TouchableOpacity
            key={player.id}
            style={styles.playerTag}
            onPress={() => onTransfer(player.id)}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.transferHint}>↦</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput
          placeholder="Add player"
          value={playerName}
          onChangeText={setPlayerName}
          style={[styles.input, styles.flex]}
          onSubmitEditing={() => {
            onAddPlayer(playerName);
            setPlayerName('');
          }}
        />
        <Pressable
          style={styles.smallButton}
          onPress={() => {
            onAddPlayer(playerName);
            setPlayerName('');
          }}>
          <Text style={styles.smallButtonText}>Add</Text>
        </Pressable>
      </View>
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
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  onSave: (home: number | undefined, away: number | undefined) => void;
  attachToTimer: () => void;
  isAttached: boolean;
}) => {
  const [home, setHome] = useState(match.homeScore?.toString() ?? '');
  const [away, setAway] = useState(match.awayScore?.toString() ?? '');

  useEffect(() => {
    setHome(match.homeScore?.toString() ?? '');
    setAway(match.awayScore?.toString() ?? '');
  }, [match.homeScore, match.awayScore]);

  return (
    <View style={styles.matchRow}>
      <View style={styles.matchTeams}>
        <View style={styles.matchTeam}>
          <View style={chipStyle(homeTeam?.color ?? '#94a3b8')} />
          <Text style={styles.teamLabel}>{homeTeam?.name ?? 'TBD'}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.matchTeam}>
          <View style={chipStyle(awayTeam?.color ?? '#94a3b8')} />
          <Text style={styles.teamLabel}>{awayTeam?.name ?? 'TBD'}</Text>
        </View>
      </View>
      <View style={styles.matchInputs}>
        <TextInput
          value={home}
          onChangeText={setHome}
          keyboardType="numeric"
          placeholder="-"
          style={[styles.scoreInput, styles.flex]}
        />
        <TextInput
          value={away}
          onChangeText={setAway}
          keyboardType="numeric"
          placeholder="-"
          style={[styles.scoreInput, styles.flex]}
        />
        <Pressable
          style={styles.saveButton}
          onPress={() => {
            const homeScore = home === '' ? undefined : Number(home);
            const awayScore = away === '' ? undefined : Number(away);
            onSave(homeScore, awayScore);
          }}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
      <TouchableOpacity style={styles.timerTag} onPress={attachToTimer}>
        <Text style={[styles.timerTagText, isAttached && styles.timerTagTextActive]}>
          {isAttached ? 'Timing' : 'Tag to timer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Bracket = ({ matches, teams }: { matches: Match[]; teams: Team[] }) => {
  const findTeam = (id?: string) => teams.find((t) => t.id === id);
  const semi1 = matches.find((m) => m.stage === 'semiFinal1');
  const semi2 = matches.find((m) => m.stage === 'semiFinal2');
  const consolation = matches.find((m) => m.stage === 'consolation');
  const finalMatch = matches.find((m) => m.stage === 'final');
  const renderSlot = (label: string, match?: Match) => {
    if (!match) return null;
    const home = findTeam(match.homeId);
    const away = findTeam(match.awayId);
    return (
      <View style={styles.bracketCard} key={label}>
        <Text style={styles.bracketTitle}>{label}</Text>
        <Text style={styles.bracketLine}>
          <Text style={styles.bold}>{home?.name ?? 'TBD'}</Text> ({match.homeScore ?? '-'})
        </Text>
        <Text style={styles.bracketLine}>
          <Text style={styles.bold}>{away?.name ?? 'TBD'}</Text> ({match.awayScore ?? '-'})
        </Text>
      </View>
    );
  };
  return (
    <View style={styles.bracketGrid}>
      <View style={styles.bracketColumn}>
        {renderSlot('Semi 1', semi1)}
        {renderSlot('Semi 2', semi2)}
      </View>
      <View style={styles.bracketColumn}>{renderSlot('Consolation', consolation)}</View>
      <View style={styles.bracketColumn}>{renderSlot('Final', finalMatch)}</View>
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
                }}>
                <View style={chipStyle(item.color)} />
                <Text style={styles.teamLabel}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Add another team to transfer.</Text>}
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
    addPlayer,
    transferPlayer,
    updateMatchScore,
    resetNight,
    renameNight,
    attachMatchToTimer,
    setCurrentNight,
    startNight,
  } = useTournament();
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(COLOR_OPTIONS[0]);
  const [transferState, setTransferState] = useState<TransferState>(null);
  const loading = state.loading || !currentNight;

  const table = useMemo(
    () => (currentNight ? calculateTable(currentNight.teams, currentNight.matches) : []),
    [currentNight],
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
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    addTeam({ name: newTeamName.trim(), color: newTeamColor });
    setNewTeamName('');
  };

  const findTeam = (id?: string) => currentNight?.teams.find((t) => t.id === id);
  const needQualification = currentNight.teams.length >= 3 && currentNight.teams.length % 2 === 1;
  const bottomTwo = needQualification ? table.slice(-2).map((r) => r.teamId) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Tonight">
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {state.nights.map((night) => (
                <Pressable
                  key={night.id}
                  style={[
                    styles.nightChip,
                    currentNight.id === night.id && styles.nightChipActive,
                  ]}
                  onPress={() => setCurrentNight(night.id)}>
                  <Text
                    style={[
                      styles.nightChipText,
                      currentNight.id === night.id && styles.nightChipTextActive,
                    ]}>
                    {night.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.smallButton, { marginLeft: 8 }]}
              onPress={() => startNight(`Night ${state.nights.length + 1}`)}>
              <Text style={styles.smallButtonText}>New night</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.titleInput}
            value={currentNight.title}
            onChangeText={renameNight}
            placeholder="Game night name"
          />
          <View style={styles.row}>
            <Text style={styles.subtle}>
              {new Date(currentNight.createdAt).toLocaleString()} · {currentNight.teams.length} teams
            </Text>
            <Pressable style={styles.linkButton} onPress={resetNight}>
              <Text style={styles.linkText}>Reset night</Text>
            </Pressable>
          </View>
        </Section>

        <Section title="Teams & Players">
          <View style={styles.row}>
            <TextInput
              placeholder="Team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              style={[styles.input, styles.flex]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {COLOR_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color, borderWidth: newTeamColor === color ? 2 : 0 },
                  ]}
                  onPress={() => setNewTeamColor(color)}
                />
              ))}
            </ScrollView>
            <Pressable style={styles.smallButton} onPress={handleAddTeam}>
              <Text style={styles.smallButtonText}>Add</Text>
            </Pressable>
          </View>
          {currentNight.teams.length === 0 ? (
            <Text style={styles.empty}>Add between 2–6 teams to generate fixtures.</Text>
          ) : (
            currentNight.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onRename={(name) => updateTeam(team.id, { name })}
                onAddPlayer={(name) => addPlayer(team.id, name)}
                onTransfer={(playerId) => setTransferState({ playerId, fromTeamId: team.id })}
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
            const inSemiWindow = currentNight.teams.length >= 4 ? index < 4 : index === 0;
            const isBottomQual = bottomTwo.includes(row.teamId);
            return (
              <View
                key={row.teamId}
                style={[
                  styles.tableRow,
                  inSemiWindow && styles.tableSemi,
                  isBottomQual && styles.tableQual,
                ]}>
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
            <Text style={styles.empty}>Fixtures will appear once you add at least 2 teams.</Text>
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
            transferPlayer(transferState.playerId, transferState.fromTeamId, teamId);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  section: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 6,
  },
  subtle: {
    color: '#475569',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  nightChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  nightChipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  nightChipText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  nightChipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  flex: { flex: 1 },
  colorRow: { maxWidth: 140 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 4,
    borderColor: '#0f172a',
  },
  smallButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  teamCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  playerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  playerTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  playerName: { fontWeight: '600' },
  transferHint: { color: '#64748b' },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableCell: { width: 40, fontVariant: ['tabular-nums'] },
  wide: { flex: 1, width: 'auto' },
  teamLabel: {
    fontWeight: '600',
  },
  tableSemi: { backgroundColor: '#ecfeff' },
  tableQual: { backgroundColor: '#fff7ed' },
  empty: { color: '#94a3b8', paddingVertical: 6 },
  stageBlock: { marginBottom: 10, gap: 6 },
  stageTitle: { fontWeight: '700', fontSize: 16 },
  matchRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vs: { fontWeight: '700', color: '#334155' },
  matchInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveText: { color: '#fff', fontWeight: '700' },
  timerTag: { alignSelf: 'flex-start' },
  timerTagText: { color: '#475569' },
  timerTagTextActive: { color: Colors.light.tint, fontWeight: '700' },
  bracketGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  bracketColumn: { flex: 1, gap: 8 },
  bracketCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  bracketTitle: { fontWeight: '700', marginBottom: 4 },
  bracketLine: { color: '#0f172a' },
  bold: { fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontWeight: '700', fontSize: 16 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  modalClose: { alignSelf: 'flex-end' },
  modalCloseText: { color: Colors.light.tint, fontWeight: '700' },
});
