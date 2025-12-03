import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { createGameNight, generateRoundRobin, syncKnockouts } from '@/lib/tournament';
import { GameNight, Match, Player, Team } from '@/types/tournament';

type State = {
  nights: GameNight[];
  currentNightId?: string;
  loading: boolean;
};

type Action =
  | { type: 'setNights'; payload: GameNight[] }
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
}>({
  state: { nights: [], loading: true },
  addTeam: () => {},
  updateTeam: () => {},
  addPlayer: () => {},
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
});

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'setNights':
      return { ...state, nights: action.payload };
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

const STORAGE_KEY = 'futsal:nights';

const randomId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const uniqueColor = (preferred: string, teams: Team[]) => {
  const used = new Set(teams.map((t) => t.color));
  if (!used.has(preferred)) return preferred;
  const palette = ['#F97316', '#2563EB', '#0EA5E9', '#22C55E', '#F43F5E', '#8B5CF6'];
  const free = palette.find((color) => !used.has(color));
  return free ?? preferred;
};

const findPlayer = (team: Team, playerId: string) => team.players.find((p) => p.id === playerId);

export const TournamentProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, {
    nights: [],
    currentNightId: undefined,
    loading: true,
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
          const parsed = JSON.parse(raw) as GameNight[];
          const hydrated = parsed.map((night) => ({
            ...night,
            matches: syncKnockouts(night.teams, night.matches ?? []),
          }));
          dispatch({ type: 'setNights', payload: hydrated });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.nights)).catch((err) =>
      console.warn('Failed saving nights', err),
    );
  }, [state.nights, state.loading]);

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
      const teams = currentNight.teams.map((team) =>
        team.id === teamId
          ? { ...team, players: [...team.players, { id: randomId('player'), name }] }
          : team,
      );
      updateNight({ ...currentNight, teams });
    },
    [currentNight, updateNight],
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
    dispatch({ type: 'setCurrentNight', payload: night.id });
  }, []);

  const renameNight = useCallback(
    (title: string) => {
      if (!currentNight) return;
      updateNight({ ...currentNight, title });
    },
    [currentNight, updateNight],
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
    }),
    [
      state,
      currentNight,
      addTeam,
      updateTeam,
      addPlayer,
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
    ],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

export const useTournament = () => useContext(TournamentContext);
