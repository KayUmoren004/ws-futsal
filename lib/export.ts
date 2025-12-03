import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { matchWinnerId } from './tournament';
import { GameNight } from '@/types/tournament';

const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const exportNightsToCsv = async (nights: GameNight[]) => {
  const header = ['Title', 'Date', 'Teams', 'Winner', 'Final Score'];
  const rows = [header];

  nights.forEach((night) => {
    const final = night.matches.find((m) => m.stage === 'final');
    const winnerId = final ? matchWinnerId(final) : undefined;
    const winnerName = night.teams.find((t) => t.id === winnerId)?.name ?? '';
    const score =
      final && final.homeScore !== undefined && final.awayScore !== undefined
        ? `${final.homeScore}-${final.awayScore}${final.resolvedBy ? ` (${final.resolvedBy})` : ''}`
        : '';
    rows.push([
      night.title,
      new Date(night.createdAt).toLocaleString(),
      night.teams.length,
      winnerName,
      score,
    ]);
  });

  const csv = rows.map((r) => r.map(quote).join(',')).join('\n');
  const uri = `${FileSystem.cacheDirectory ?? ''}futsal-nights.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Share futsal nights',
  });
  return uri;
};
