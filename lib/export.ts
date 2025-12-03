import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { GameNight } from "@/types/tournament";
import { matchWinnerId } from "./tournament";

const quote = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

export const exportNightsToCsv = async (nights: GameNight[]) => {
  const header = ["Title", "Date", "Teams", "Winner", "Final Score"];
  const rows = [header];

  nights.forEach((night) => {
    const final = night.matches.find((m) => m.stage === "final");
    const winnerId = final ? matchWinnerId(final) : undefined;
    const winnerName = night.teams.find((t) => t.id === winnerId)?.name ?? "";
    const score =
      final && final.homeScore !== undefined && final.awayScore !== undefined
        ? `${final.homeScore}-${final.awayScore}${
            final.resolvedBy ? ` (${final.resolvedBy})` : ""
          }`
        : "";
    rows.push([
      night.title,
      new Date(night.createdAt).toLocaleString(),
      String(night.teams.length),
      winnerName,
      score,
    ]);
  });

  const csv = rows.map((r) => r.map(quote).join(",")).join("\n");

  // Use the new File API from expo-file-system v19+
  const file = new File(Paths.cache, "futsal-nights.csv");
  file.create({ overwrite: true });
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Share futsal nights",
  });
  return file.uri;
};
