import { Match, MatchStage, TableRow, Team, GameNight } from '@/types/tournament';

const pointsConfig = {
  win: 3,
  draw: 1,
  loss: 0,
};

const randomId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const isKnockoutStage = (stage: MatchStage) => stage !== 'roundRobin';

const isComplete = (match: Match) => {
  if (match.homeScore === undefined || match.awayScore === undefined) return false;
  const tied = (match.homeScore ?? 0) === (match.awayScore ?? 0);
  if (!isKnockoutStage(match.stage)) return true;
  if (!tied) return true;
  if (match.resolvedBy === 'extraTime') {
    if (
      match.extraTimeHome !== undefined &&
      match.extraTimeAway !== undefined &&
      match.extraTimeHome !== match.extraTimeAway
    ) {
      return true;
    }
    return false;
  }
  if (match.resolvedBy === 'penalties') {
    return (
      match.penHome !== undefined &&
      match.penAway !== undefined &&
      match.penHome !== match.penAway
    );
  }
  return false;
};

const winnerId = (match: Match): string | undefined => {
  if (!isComplete(match)) return undefined;
  const baseHome = match.homeScore ?? 0;
  const baseAway = match.awayScore ?? 0;
  if (!isKnockoutStage(match.stage)) {
    if (baseHome === baseAway) return undefined;
    return baseHome > baseAway ? match.homeId : match.awayId;
  }
  if (baseHome !== baseAway) return baseHome > baseAway ? match.homeId : match.awayId;
  if (match.resolvedBy === 'extraTime' && match.extraTimeHome !== undefined && match.extraTimeAway !== undefined) {
    return match.extraTimeHome > match.extraTimeAway ? match.homeId : match.awayId;
  }
  if (match.resolvedBy === 'penalties' && match.penHome !== undefined && match.penAway !== undefined) {
    return match.penHome > match.penAway ? match.homeId : match.awayId;
  }
  return undefined;
};

const loserId = (match: Match): string | undefined => {
  const winner = winnerId(match);
  if (!winner) return undefined;
  return winner === match.homeId ? match.awayId : match.homeId;
};

export const matchWinnerId = (match: Match) => winnerId(match);

export const generateRoundRobin = (teams: Team[]): Match[] => {
  if (teams.length < 2) return [];
  const teamIds = teams.map((t) => t.id);
  const hasBye = teamIds.length % 2 === 1;
  const roster = hasBye ? [...teamIds, 'BYE'] : [...teamIds];
  const rounds = roster.length - 1;
  let rotating = [...roster];
  const matches: Match[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const half = rotating.length / 2;
    for (let i = 0; i < half; i += 1) {
      const home = rotating[i];
      const away = rotating[rotating.length - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      matches.push({
        id: `rr-${home}-${away}-${round}-${i}-${randomId('m')}`,
        stage: 'roundRobin',
        slot: round * half + i + 1,
        homeId: home,
        awayId: away,
        status: 'scheduled',
      });
    }
    const [anchor, ...rest] = rotating;
    const tail = rest.pop();
    rotating = [anchor, ...(tail ? [tail, ...rest] : rest)];
  }
  return matches;
};

const effectiveScores = (match: Match) => {
  const regularHome = match.homeScore ?? 0;
  const regularAway = match.awayScore ?? 0;
  const etHome =
    match.resolvedBy === 'extraTime' && match.extraTimeHome !== undefined
      ? match.extraTimeHome
      : 0;
  const etAway =
    match.resolvedBy === 'extraTime' && match.extraTimeAway !== undefined
      ? match.extraTimeAway
      : 0;
  const penHome =
    match.resolvedBy === 'penalties' && match.penHome !== undefined ? match.penHome : 0;
  const penAway =
    match.resolvedBy === 'penalties' && match.penAway !== undefined ? match.penAway : 0;
  const totalHome = regularHome + etHome;
  const totalAway = regularAway + etAway;
  const decisionHome =
    match.resolvedBy === 'penalties' ? penHome : match.resolvedBy === 'extraTime' ? etHome : regularHome;
  const decisionAway =
    match.resolvedBy === 'penalties' ? penAway : match.resolvedBy === 'extraTime' ? etAway : regularAway;
  return { regularHome, regularAway, totalHome, totalAway, decisionHome, decisionAway };
};

export const calculateTable = (teams: Team[], matches: Match[]): TableRow[] => {
  const base: Record<string, TableRow> = {};
  teams.forEach((team) => {
    base[team.id] = {
      teamId: team.id,
      name: team.name,
      color: team.color,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  matches.forEach((match) => {
    if (!isComplete(match)) return;
    const homeRow = base[match.homeId];
    const awayRow = base[match.awayId];
    if (!homeRow || !awayRow) return;
    const { totalHome, totalAway } = effectiveScores(match);
    const homeGoals = totalHome;
    const awayGoals = totalAway;
    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += homeGoals;
    homeRow.goalsAgainst += awayGoals;
    awayRow.goalsFor += awayGoals;
    awayRow.goalsAgainst += homeGoals;
    homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
    awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;
    if (homeGoals > awayGoals) {
      homeRow.wins += 1;
      awayRow.losses += 1;
      homeRow.points += pointsConfig.win;
      awayRow.points += pointsConfig.loss;
    } else if (awayGoals > homeGoals) {
      awayRow.wins += 1;
      homeRow.losses += 1;
      awayRow.points += pointsConfig.win;
      homeRow.points += pointsConfig.loss;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;
      homeRow.points += pointsConfig.draw;
      awayRow.points += pointsConfig.draw;
    }
  });

  const headToHead = (a: TableRow, b: TableRow) => {
    let aPoints = 0;
    let bPoints = 0;
    let aDiff = 0;
    matches.forEach((match) => {
      if (!isComplete(match)) return;
      const involvesA = match.homeId === a.teamId || match.awayId === a.teamId;
      const involvesB = match.homeId === b.teamId || match.awayId === b.teamId;
      if (!(involvesA && involvesB)) return;
      const { decisionHome, decisionAway } = effectiveScores(match);
      const homeScore = decisionHome;
      const awayScore = decisionAway;
      const aIsHome = match.homeId === a.teamId;
      const aGoals = aIsHome ? homeScore : awayScore;
      const bGoals = aIsHome ? awayScore : homeScore;
      aDiff += aGoals - bGoals;
      if (aGoals > bGoals) aPoints += pointsConfig.win;
      else if (bGoals > aGoals) bPoints += pointsConfig.win;
      else {
        aPoints += pointsConfig.draw;
        bPoints += pointsConfig.draw;
      }
    });
    return { aPoints, bPoints, aDiff };
  };

  return Object.values(base).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gd = b.goalDifference - a.goalDifference;
    if (gd !== 0) return gd;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const { aPoints, bPoints, aDiff } = headToHead(a, b);
    if (aPoints !== bPoints) return bPoints - aPoints;
    if (aDiff !== 0) return aDiff > 0 ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
};

const upsertMatch = (matches: Match[], incoming: Match) => {
  const idx = matches.findIndex((m) => m.id === incoming.id);
  if (idx >= 0) {
    matches[idx] = { ...matches[idx], ...incoming };
  } else {
    matches.push(incoming);
  }
};

export const syncKnockouts = (teams: Team[], matches: Match[]): Match[] => {
  const next: Match[] = [...matches.filter((m) => m.stage === 'roundRobin')];
  const rrMatches = next.filter((m) => m.stage === 'roundRobin').sort((a, b) => a.slot - b.slot);
  const rrComplete = rrMatches.length > 0 && rrMatches.every(isComplete);
  const teamCount = teams.length;
  const needQualification = rrComplete && teamCount >= 3 && teamCount % 2 === 1;
  const tableAfterRR = calculateTable(teams, rrMatches);
  const bottomTwo = tableAfterRR.slice(-2);
  const existingQualification = matches.find((m) => m.stage === 'qualification');
  let qualification: Match | undefined = existingQualification;

  if (needQualification && bottomTwo.length === 2) {
    const base: Match = {
      id: 'qualification',
      stage: 'qualification',
      slot: rrMatches.length + 1,
      homeId: bottomTwo[0].teamId,
      awayId: bottomTwo[1].teamId,
      status: 'scheduled',
      homeScore: existingQualification?.homeScore,
      awayScore: existingQualification?.awayScore,
    };
    if (existingQualification && existingQualification.status === 'completed') {
      qualification = existingQualification;
    } else {
      qualification = { ...base };
    }
    upsertMatch(next, qualification);
  } else if (existingQualification && existingQualification.status === 'completed') {
    upsertMatch(next, existingQualification);
  }

  const qualificationComplete = !needQualification || (qualification && isComplete(qualification));

  const tableForSeeds = calculateTable(
    teams,
    [...rrMatches, ...(qualification ? [qualification] : [])].filter(Boolean),
  );

  const seedSemiFinals = () => {
    if (teamCount < 4) return;
    if (!rrComplete || !qualificationComplete) return;
    const seeds: TableRow[] = [];
    if (teamCount % 2 === 0) {
      seeds.push(...tableForSeeds.slice(0, 4));
    } else {
      const qualifierWinnerId = qualification ? winnerId(qualification) : undefined;
      const qualifierWinner = tableForSeeds.find((row) => row.teamId === qualifierWinnerId);
      if (!qualifierWinner) return;
      seeds.push(tableForSeeds[0], tableForSeeds[1], tableForSeeds[2], qualifierWinner);
    }
    if (seeds.length < 4) return;
    const semi1: Match = {
      id: 'semiFinal1',
      stage: 'semiFinal1',
      slot: rrMatches.length + (qualification ? 2 : 1),
      homeId: seeds[0].teamId,
      awayId: seeds[3].teamId,
      status: 'scheduled',
      ...matches.find((m) => m.id === 'semiFinal1'),
    };
    semi1.status = isComplete(semi1) ? 'completed' : 'scheduled';
    const semi2: Match = {
      id: 'semiFinal2',
      stage: 'semiFinal2',
      slot: semi1.slot + 1,
      homeId: seeds[1].teamId,
      awayId: seeds[2].teamId,
      status: 'scheduled',
      ...matches.find((m) => m.id === 'semiFinal2'),
    };
    semi2.status = isComplete(semi2) ? 'completed' : 'scheduled';
    upsertMatch(next, semi1);
    upsertMatch(next, semi2);
  };

  const seedThreeTeamKnockout = () => {
    if (teamCount !== 3 || !rrComplete) return;
    if (!qualification) {
      if (bottomTwo.length === 2) {
        const qual: Match = {
          id: 'qualification',
          stage: 'qualification',
          slot: rrMatches.length + 1,
          homeId: bottomTwo[0].teamId,
          awayId: bottomTwo[1].teamId,
          status: 'scheduled',
        };
        upsertMatch(next, qual);
        qualification = qual;
      }
      return;
    }
    if (!isComplete(qualification)) return;
    const topSeed = tableAfterRR[0];
    if (!topSeed) return;
    const finalMatch: Match = {
      id: 'final',
      stage: 'final',
      slot: rrMatches.length + 2,
      homeId: topSeed.teamId,
      awayId: winnerId(qualification) ?? qualification.awayId,
      status: 'scheduled',
      ...matches.find((m) => m.id === 'final'),
    };
    finalMatch.status = isComplete(finalMatch) ? 'completed' : 'scheduled';
    upsertMatch(next, finalMatch);
  };

  const seedTwoTeamFinal = () => {
    if (teamCount !== 2 || !rrComplete) return;
    const sorted = tableAfterRR.slice(0, 2);
    if (sorted.length < 2) return;
    const finalMatch: Match = {
      id: 'final',
      stage: 'final',
      slot: rrMatches.length + 1,
      homeId: sorted[0].teamId,
      awayId: sorted[1].teamId,
      status: 'scheduled',
      ...matches.find((m) => m.id === 'final'),
    };
    finalMatch.status = isComplete(finalMatch) ? 'completed' : 'scheduled';
    upsertMatch(next, finalMatch);
  };

  seedSemiFinals();
  seedThreeTeamKnockout();
  seedTwoTeamFinal();

  const semi1 = next.find((m) => m.id === 'semiFinal1');
  const semi2 = next.find((m) => m.id === 'semiFinal2');
  const semisComplete =
    !!semi1 && !!semi2 && isComplete(semi1) && isComplete(semi2) && teamCount >= 4;

  if (semisComplete) {
    const winner1 = winnerId(semi1!);
    const winner2 = winnerId(semi2!);
    const loser1 = loserId(semi1!);
    const loser2 = loserId(semi2!);
    if (winner1 && winner2) {
      const finalMatch: Match = {
        id: 'final',
        stage: 'final',
        slot: Math.max(semi1!.slot, semi2!.slot) + 1,
        homeId: winner1,
        awayId: winner2,
        status: 'scheduled',
        ...matches.find((m) => m.id === 'final'),
      };
      finalMatch.status = isComplete(finalMatch) ? 'completed' : 'scheduled';
      upsertMatch(next, finalMatch);
    }
    if (loser1 && loser2) {
      const consolation: Match = {
        id: 'consolation',
        stage: 'consolation',
        slot: Math.max(semi1!.slot, semi2!.slot) + 2,
        homeId: loser1,
        awayId: loser2,
        status: 'scheduled',
        ...matches.find((m) => m.id === 'consolation'),
      };
      consolation.status = isComplete(consolation) ? 'completed' : 'scheduled';
      upsertMatch(next, consolation);
    }
  }

  return next.sort((a, b) => a.slot - b.slot);
};

export const createGameNight = (title?: string, teams: Team[] = []): GameNight => ({
  id: randomId('night'),
  title: title ?? 'Futsal Night',
  createdAt: new Date().toISOString(),
  teams,
  matches: generateRoundRobin(teams),
});

export const stageLabel: Record<MatchStage, string> = {
  roundRobin: 'Round Robin',
  qualification: 'Qualification',
  semiFinal1: 'Semi-final 1',
  semiFinal2: 'Semi-final 2',
  consolation: 'Consolation',
  final: 'Final',
};
