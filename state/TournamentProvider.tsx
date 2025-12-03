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
  resetNight: () => void;
  renameNight: (title: string) => void;
  setCurrentNight: (id: string) => void;
  attachMatchToTimer: (matchId?: string) => void;
  startNight: (title?: string) => void;
}>({
  state: { nights: [], loading: true },
  addTeam: () => {},
  updateTeam: () => {},
  addPlayer: () => {},
  transferPlayer: () => {},
  updateMatchScore: () => {},
  resetNight: () => {},
  renameNight: () => {},
  setCurrentNight: () => {},
  attachMatchToTimer: () => {},
  startNight: () => {},
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
      const newTeam: Team = {
        id: randomId('team'),
        name: team.name,
        color: team.color,
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
      const teams = currentNight.teams.map((team) =>
        team.id === id ? { ...team, ...data } : team,
      );
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
      const matches: Match[] = currentNight.matches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              homeScore,
              awayScore,
              status:
                homeScore === undefined || awayScore === undefined ? 'scheduled' : 'completed',
            }
          : match,
      );
      const synced = syncKnockouts(currentNight.teams, matches);
      updateNight({ ...currentNight, matches: synced });
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
      resetNight,
      renameNight,
      setCurrentNight,
      attachMatchToTimer,
      startNight,
    }),
    [
      state,
      currentNight,
      addTeam,
      updateTeam,
      addPlayer,
      transferPlayer,
      updateMatchScore,
      resetNight,
      renameNight,
      setCurrentNight,
      attachMatchToTimer,
      startNight,
    ],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

export const useTournament = () => useContext(TournamentContext);
