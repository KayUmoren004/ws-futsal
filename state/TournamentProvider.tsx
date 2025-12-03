import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { createGameNight, generateRoundRobin, syncKnockouts } from '@/lib/tournament';
import { GameNight, Match, Player, Team } from '@/types/tournament';

type State = {
  nights: GameNight[];
  currentNightId?: string;
  loading: boolean;
  globalPlayers: Player[];
};

type Action =
  | { type: 'setNights'; payload: GameNight[] }
  | { type: 'setGlobalPlayers'; payload: Player[] }
  | { type: 'setCurrentNight'; payload: string }
  | { type: 'updateNight'; payload: GameNight }
  | { type: 'addNight'; payload: GameNight }
  | { type: 'loading'; payload: boolean };

const TournamentContext = createContext<{
  state: State;
  currentNight?: GameNight;
  addTeam: (team: { name: string; color: string }) => void;
  updateTeam: (id: string, data: Partial<Pick<Team, 'name' | 'color'>>) => void;
  addPlayer: (teamId: string, name: string) => void;
  addExistingPlayer: (teamId: string, playerId: string) => void;
  transferPlayer: (playerId: string, fromTeamId: string, toTeamId: string) => void;
  updateMatchScore: (matchId: string, homeScore?: number, awayScore?: number) => void;
  resolveTie: (
    matchId: string,
    method: 'extraTime' | 'penalties',
    home: number,
    away: number,
  ) => void;
  setMatchDuration: (matchId: string, seconds: number) => void;
  resetNight: () => void;
  renameNight: (title: string) => void;
  setCurrentNight: (id: string) => void;
  attachMatchToTimer: (matchId?: string) => void;
  startNight: (title?: string) => void;
  resetAllData: () => void | Promise<void>;
  addGlobalPlayer: (name: string) => Player | undefined;
  addGlobalPlayers: (names: string[]) => Player[];
  removeGlobalPlayer: (playerId: string) => void;
  globalPlayers: Player[];
}>({
  state: { nights: [], loading: true, globalPlayers: [] },
  addTeam: () => {},
  updateTeam: () => {},
  addPlayer: () => {},
  addExistingPlayer: () => {},
  transferPlayer: () => {},
  updateMatchScore: () => {},
  resolveTie: () => {},
  setMatchDuration: () => {},
  resetNight: () => {},
  renameNight: () => {},
  setCurrentNight: () => {},
  attachMatchToTimer: () => {},
  startNight: () => {},
  resetAllData: () => {},
  addGlobalPlayer: () => undefined,
  addGlobalPlayers: () => [],
  removeGlobalPlayer: () => {},
  globalPlayers: [],
});

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'setNights':
      return { ...state, nights: action.payload };
    case 'setGlobalPlayers':
      return { ...state, globalPlayers: action.payload };
    case 'setCurrentNight':
      return { ...state, currentNightId: action.payload };
    case 'updateNight': {
      const nights = state.nights.map((n) => (n.id === action.payload.id ? action.payload : n));
      return { ...state, nights };
    }
    case 'addNight':
      return { ...state, nights: [action.payload, ...state.nights], currentNightId: action.payload.id };
    case 'loading':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const STORAGE_KEY = 'futsal:data';

const randomId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const uniqueColor = (preferred: string, teams: Team[]) => {
  const used = new Set(teams.map((t) => t.color));
  if (!used.has(preferred)) return preferred;
  const palette = ['#2563EB', '#22C55E', '#FACC15', '#EC4899', '#F97316', '#EF4444'];
  const free = palette.find((color) => !used.has(color));
  return free ?? preferred;
};

const findPlayer = (team: Team, playerId: string) => team.players.find((p) => p.id === playerId);

const formatName = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',');
    const firstClean = (first ?? '').trim();
    const lastClean = (last ?? '').trim();
    return `${firstClean} ${lastClean}`.trim();
  }
  return trimmed;
};

export const TournamentProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, {
    nights: [],
    currentNightId: undefined,
    loading: true,
    globalPlayers: [],
  });

  const currentNight = useMemo(
    () => state.nights.find((night) => night.id === state.currentNightId),
    [state.currentNightId, state.nights],
  );

  useEffect(() => {
    const load = async () => {
      dispatch({ type: 'loading', payload: true });
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { nights: GameNight[]; globalPlayers?: Player[] } | GameNight[];
          const nightsArr = Array.isArray(parsed) ? parsed : parsed.nights;
          const globalPlayers = Array.isArray(parsed) ? [] : parsed.globalPlayers ?? [];
          const hydrated = nightsArr.map((night) => ({
            ...night,
            matches: syncKnockouts(night.teams, night.matches ?? []),
          }));
          dispatch({ type: 'setNights', payload: hydrated });
          dispatch({ type: 'setGlobalPlayers', payload: globalPlayers });
          if (hydrated[0]) {
            dispatch({ type: 'setCurrentNight', payload: hydrated[0].id });
          }
        } else {
          const night = createGameNight('Game Night', []);
          dispatch({ type: 'addNight', payload: night });
        }
      } catch (err) {
        console.warn('Failed to load stored game nights', err);
      } finally {
        dispatch({ type: 'loading', payload: false });
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (state.loading) return;
    const payload = JSON.stringify({
      nights: state.nights,
      globalPlayers: state.globalPlayers,
    });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch((err) =>
      console.warn('Failed saving nights', err),
    );
  }, [state.nights, state.globalPlayers, state.loading]);

  const updateNight = useCallback(
    (nextNight: GameNight) => {
      dispatch({ type: 'updateNight', payload: nextNight });
    },
    [dispatch],
  );

  const addTeam = useCallback(
    (team: { name: string; color: string }) => {
      if (!currentNight) return;
      if (currentNight.teams.length >= 6) return;
      const safeColor = uniqueColor(team.color, currentNight.teams);
      const newTeam: Team = {
        id: randomId('team'),
        name: team.name,
        color: safeColor,
        players: [],
      };
      const teams = [...currentNight.teams, newTeam];
      const matches = generateRoundRobin(teams);
      updateNight({ ...currentNight, teams, matches });
    },
    [currentNight, updateNight],
  );

  const updateTeam = useCallback(
    (id: string, data: Partial<Pick<Team, 'name' | 'color'>>) => {
      if (!currentNight) return;
      const teams = currentNight.teams.map((team) => {
        if (team.id !== id) return team;
        const incomingColor =
          data.color && data.color !== team.color
            ? uniqueColor(data.color, currentNight.teams.filter((t) => t.id !== id))
            : data.color ?? team.color;
        return { ...team, ...data, color: incomingColor };
      });
      updateNight({ ...currentNight, teams });
    },
    [currentNight, updateNight],
  );

  const addPlayer = useCallback(
    (teamId: string, name: string) => {
      if (!currentNight || !name.trim()) return;
      const formatted = formatName(name);
      if (!formatted) return;
      const player: Player = { id: randomId('player'), name: formatted };
      const teams = currentNight.teams.map((team) =>
        team.id === teamId
          ? { ...team, players: [...team.players, player] }
          : team,
      );
      const globalPlayers = state.globalPlayers.some((p) => p.name === name.trim())
        ? state.globalPlayers
        : [...state.globalPlayers, player];
      dispatch({ type: 'setGlobalPlayers', payload: globalPlayers });
      updateNight({ ...currentNight, teams });
    },
    [currentNight, updateNight, state.globalPlayers],
  );

  const addExistingPlayer = useCallback(
    (teamId: string, playerId: string) => {
      if (!currentNight) return;
      const player =
        currentNight.teams.flatMap((t) => t.players).find((p) => p.id === playerId) ||
        state.globalPlayers.find((p) => p.id === playerId);
      if (!player) return;
      const already = currentNight.teams
        .find((t) => t.id === teamId)
        ?.players.some((p) => p.id === playerId);
      if (already) return;
      const teams = currentNight.teams.map((team) =>
        team.id === teamId ? { ...team, players: [...team.players, player] } : team,
      );
      updateNight({ ...currentNight, teams });
    },
    [currentNight, updateNight, state.globalPlayers],
  );

  const transferPlayer = useCallback(
    (playerId: string, fromTeamId: string, toTeamId: string) => {
      if (!currentNight || fromTeamId === toTeamId) return;
      const source = currentNight.teams.find((t) => t.id === fromTeamId);
      if (!source) return;
      const player = findPlayer(source, playerId);
      if (!player) return;
      const teams = currentNight.teams.map((team) => {
        if (team.id === fromTeamId) {
          return { ...team, players: team.players.filter((p) => p.id !== playerId) };
        }
        if (team.id === toTeamId) {
          return { ...team, players: [...team.players, player] };
        }
        return team;
      });
      updateNight({ ...currentNight, teams });
    },
    [currentNight, updateNight],
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore?: number, awayScore?: number) => {
      if (!currentNight) return;
      const matches: Match[] = currentNight.matches.map((match) => {
        if (match.id !== matchId) return match;
        const tie =
          homeScore !== undefined &&
          awayScore !== undefined &&
          homeScore === awayScore &&
          match.stage !== 'roundRobin';
        const status =
          homeScore === undefined || awayScore === undefined || tie ? 'scheduled' : 'completed';
        return {
          ...match,
          homeScore,
          awayScore,
          extraTimeHome: tie ? undefined : match.extraTimeHome,
          extraTimeAway: tie ? undefined : match.extraTimeAway,
          penHome: tie ? undefined : match.penHome,
          penAway: tie ? undefined : match.penAway,
          resolvedBy: tie ? undefined : match.resolvedBy,
          status,
        };
      });
      const synced = syncKnockouts(currentNight.teams, matches);
      updateNight({ ...currentNight, matches: synced });
    },
    [currentNight, updateNight],
  );

  const resolveTie = useCallback(
    (matchId: string, method: 'extraTime' | 'penalties', home: number, away: number) => {
      if (!currentNight) return;
      if (home === away) return;
      const matches: Match[] = currentNight.matches.map((match) => {
        if (match.id !== matchId) return match;
        const next: Match = {
          ...match,
          status: 'completed',
          resolvedBy: method,
        };
        if (method === 'extraTime') {
          next.extraTimeHome = home;
          next.extraTimeAway = away;
          next.penHome = undefined;
          next.penAway = undefined;
        } else {
          next.penHome = home;
          next.penAway = away;
        }
        return next;
      });
      const synced = syncKnockouts(currentNight.teams, matches);
      updateNight({ ...currentNight, matches: synced });
    },
    [currentNight, updateNight],
  );

  const setMatchDuration = useCallback(
    (matchId: string, seconds: number) => {
      if (!currentNight) return;
      const matches = currentNight.matches.map((match) =>
        match.id === matchId ? { ...match, durationSeconds: seconds } : match,
      );
      updateNight({ ...currentNight, matches });
    },
    [currentNight, updateNight],
  );

  const resetNight = useCallback(() => {
    if (!currentNight) return;
    const reset = createGameNight(currentNight.title, currentNight.teams);
    updateNight(reset);
  }, [currentNight, updateNight]);

  const startNight = useCallback(
    (title?: string) => {
      const clonedTeams =
        currentNight?.teams.map((team) => ({
          ...team,
          players: [...team.players],
        })) ?? [];
      const night = createGameNight(title ?? 'Game Night', clonedTeams);
      dispatch({ type: 'addNight', payload: night });
    },
    [currentNight],
  );

  const resetAllData = useCallback(async () => {
    const night = createGameNight('Game Night', []);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear storage', err);
    }
    dispatch({ type: 'setNights', payload: [night] });
    dispatch({ type: 'setGlobalPlayers', payload: [] });
    dispatch({ type: 'setCurrentNight', payload: night.id });
  }, []);

  const renameNight = useCallback(
    (title: string) => {
      if (!currentNight) return;
      updateNight({ ...currentNight, title });
    },
    [currentNight, updateNight],
  );

  const addGlobalPlayer = useCallback(
    (name: string) => {
      const formatted = formatName(name);
      if (!formatted) return undefined;
      const existing = state.globalPlayers.find((p) => p.name.toLowerCase() === formatted.toLowerCase());
      if (existing) return existing;
      const player: Player = { id: randomId('player'), name: formatted };
      const next = [...state.globalPlayers, player];
      dispatch({ type: 'setGlobalPlayers', payload: next });
      return player;
    },
    [state.globalPlayers],
  );

  const addGlobalPlayers = useCallback(
    (names: string[]) => {
      const norm = names
        .map((n) => formatName(n))
        .filter(Boolean) as string[];
      if (!norm.length) return [];
      const existingSet = new Set(state.globalPlayers.map((p) => p.name.toLowerCase()));
      const newPlayers: Player[] = [];
      norm.forEach((n) => {
        const lower = n.toLowerCase();
        if (existingSet.has(lower)) return;
        const player: Player = { id: randomId('player'), name: n };
        existingSet.add(lower);
        newPlayers.push(player);
      });
      if (newPlayers.length) {
        dispatch({ type: 'setGlobalPlayers', payload: [...state.globalPlayers, ...newPlayers] });
      }
      return newPlayers;
    },
    [state.globalPlayers],
  );

  const removeGlobalPlayer = useCallback(
    (playerId: string) => {
      const nextGlobal = state.globalPlayers.filter((p) => p.id !== playerId);
      const nights = state.nights.map((night) => ({
        ...night,
        teams: night.teams.map((team) => ({
          ...team,
          players: team.players.filter((p) => p.id !== playerId),
        })),
      }));
      dispatch({ type: 'setGlobalPlayers', payload: nextGlobal });
      dispatch({ type: 'setNights', payload: nights });
    },
    [state.globalPlayers, state.nights],
  );

  const setCurrentNight = useCallback(
    (id: string) => {
      dispatch({ type: 'setCurrentNight', payload: id });
    },
    [dispatch],
  );

  const attachMatchToTimer = useCallback(
    (matchId?: string) => {
      if (!currentNight) return;
      updateNight({ ...currentNight, currentMatchId: matchId });
    },
    [currentNight, updateNight],
  );

  const value = useMemo(
    () => ({
      state,
      currentNight,
      addTeam,
      updateTeam,
      addPlayer,
      addExistingPlayer,
      transferPlayer,
      updateMatchScore,
      resolveTie,
      setMatchDuration,
      resetNight,
      renameNight,
      setCurrentNight,
      attachMatchToTimer,
      startNight,
      resetAllData,
      addGlobalPlayer,
      addGlobalPlayers,
      removeGlobalPlayer,
      globalPlayers: state.globalPlayers,
    }),
    [
      state,
      currentNight,
      addTeam,
      updateTeam,
      addPlayer,
      addExistingPlayer,
      transferPlayer,
      updateMatchScore,
      resolveTie,
      setMatchDuration,
      resetNight,
      renameNight,
      setCurrentNight,
      attachMatchToTimer,
      startNight,
      resetAllData,
      addGlobalPlayer,
      addGlobalPlayers,
      removeGlobalPlayer,
    ],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

export const useTournament = () => useContext(TournamentContext);
